/**
 * Google Cloud Vision API を使用して水道メーターの数値を高精度で抽出するユーティリティ
 *
 * 改善ポイント:
 * 1. fullTextAnnotation を使用して、各単語の位置・サイズ情報を取得
 * 2. 画像の中央付近にある大きな文字を優先的に抽出
 * 3. メーター値らしい数値パターン（3〜6桁の整数）を優先選択
 * 4. 型番号やラベルなどのノイズを除外
 */

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY;
const API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`;

export interface OCRResult {
  text: string;
  confidence: number;
  allCandidates: string[]; // デバッグ用：検出された全候補
}

/**
 * バウンディングボックスの高さを計算する（文字の大きさの指標）
 */
function getBoundingBoxHeight(vertices: Array<{ x: number; y: number }>): number {
  if (!vertices || vertices.length < 4) return 0;
  const minY = Math.min(...vertices.map((v) => v.y || 0));
  const maxY = Math.max(...vertices.map((v) => v.y || 0));
  return maxY - minY;
}

/**
 * バウンディングボックスの中心Y座標を計算する（画像の上下のどこにあるか）
 */
function getBoundingBoxCenterY(vertices: Array<{ x: number; y: number }>): number {
  if (!vertices || vertices.length < 4) return 0;
  const minY = Math.min(...vertices.map((v) => v.y || 0));
  const maxY = Math.max(...vertices.map((v) => v.y || 0));
  return (minY + maxY) / 2;
}

/**
 * 数値候補のスコアリング
 * - メーター値として「もっともらしい」数値ほど高いスコアを返す
 */
function scoreMeterCandidate(
  text: string,
  height: number,
  centerY: number,
  imageHeight: number
): number {
  let score = 0;

  // 1. 文字の大きさ（高さ）が大きいほど高スコア（メーター表示は大きい文字）
  score += height * 2;

  // 2. 画像の中央付近にあると高スコア（メーターの数字は中央にある傾向）
  const normalizedCenterY = centerY / (imageHeight || 1);
  const distanceFromCenter = Math.abs(normalizedCenterY - 0.45); // 少し上寄りを中心と仮定
  score -= distanceFromCenter * 100;

  // 3. 桁数による判定（水道メーターは通常 3〜6 桁の整数）
  const digitCount = text.replace(/[^0-9]/g, '').length;
  if (digitCount >= 3 && digitCount <= 6) {
    score += 50; // 理想の桁数なら大幅加点
  } else if (digitCount >= 1 && digitCount <= 2) {
    score -= 30; // 1〜2桁は型番の一部の可能性が高い
  } else if (digitCount > 8) {
    score -= 50; // 8桁以上は長すぎ（ノイズの連結の可能性）
  }

  // 4. 純粋な数字列であるほど高スコア（文字が混在すると型番の可能性大）
  const numericRatio = (text.match(/[0-9]/g) || []).length / text.length;
  score += numericRatio * 30;

  return score;
}

/**
 * Base64 画像から水道メーターの数値を高精度で検出する
 */
export const detectText = async (base64Image: string): Promise<OCRResult> => {
  if (!API_KEY) {
    throw new Error('Google Cloud Vision API キーが設定されていません。');
  }

  const body = {
    requests: [
      {
        image: {
          content: base64Image,
        },
        features: [
          {
            type: 'TEXT_DETECTION',
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const apiResponse = data.responses[0];
    const annotations = apiResponse?.textAnnotations;

    if (!annotations || annotations.length === 0) {
      return { text: '', confidence: 0, allCandidates: [] };
    }

    // ---------- 戦略 A: 個別の単語アノテーションからスコアリング ----------
    // annotations[0] は全体テキスト、annotations[1..] は個別の単語
    const imageHeight = annotations[0]?.boundingPoly?.vertices
      ? Math.max(...annotations[0].boundingPoly.vertices.map((v: any) => v.y || 0))
      : 1000;

    const candidates: Array<{
      text: string;
      score: number;
      numericOnly: string;
    }> = [];

    for (let i = 1; i < annotations.length; i++) {
      const annotation = annotations[i];
      const rawText = annotation.description || '';
      const vertices = annotation.boundingPoly?.vertices || [];

      // 数字を含まない単語はスキップ
      if (!/[0-9]/.test(rawText)) continue;

      const height = getBoundingBoxHeight(vertices);
      const centerY = getBoundingBoxCenterY(vertices);
      const numericOnly = rawText.replace(/[^0-9]/g, '');

      const score = scoreMeterCandidate(rawText, height, centerY, imageHeight);

      candidates.push({
        text: rawText,
        score,
        numericOnly,
      });
    }

    // スコア順に並べる（高い方が先）
    candidates.sort((a, b) => b.score - a.score);

    // ---------- 戦略 B: 行ごとのテキスト解析（フォールバック） ----------
    const fullText = annotations[0].description || '';
    const lines = fullText.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);

    // 各行から最も大きな整数パターンを探す
    let bestLineCandidate = '';
    let bestLineDigits = 0;
    for (const line of lines) {
      // 行内の連続する数字列を抽出
      const matches = line.match(/\d+/g);
      if (matches) {
        for (const match of matches) {
          // 3〜6桁の整数を優先
          if (match.length >= 3 && match.length <= 6 && match.length > bestLineDigits) {
            bestLineCandidate = match;
            bestLineDigits = match.length;
          }
        }
      }
    }

    // ---------- 最終判定：戦略A と 戦略B の結果を統合 ----------
    let finalResult = '';
    const allCandidates = candidates.map((c) => `${c.numericOnly} (スコア:${c.score.toFixed(0)})`);

    if (candidates.length > 0) {
      const topCandidate = candidates[0];

      // 戦略A の最高スコア候補が 3〜6桁なら、それを採用
      if (topCandidate.numericOnly.length >= 3 && topCandidate.numericOnly.length <= 6) {
        finalResult = topCandidate.numericOnly;
      }
      // 戦略A がイマイチだったら、戦略B（行テキスト解析）を採用
      else if (bestLineCandidate) {
        finalResult = bestLineCandidate;
      }
      // どちらもなければ、トップ候補の数字部分をそのまま使う
      else {
        finalResult = topCandidate.numericOnly;
      }
    } else if (bestLineCandidate) {
      finalResult = bestLineCandidate;
    }

    // それでも見つからない場合は、全テキストから数字だけを抽出してフォールバック
    if (!finalResult) {
      finalResult = fullText.replace(/[^0-9]/g, '');
    }

    // 信頼度の推定（候補が明確であるほど高い）
    let confidence = 0.5;
    if (candidates.length > 0 && candidates[0].numericOnly === finalResult) {
      confidence = Math.min(0.95, 0.6 + candidates[0].score / 500);
    }
    if (bestLineCandidate === finalResult && bestLineDigits >= 3) {
      confidence = Math.max(confidence, 0.8);
    }

    console.log('[OCR] 全テキスト:', fullText);
    console.log('[OCR] 候補一覧:', allCandidates);
    console.log('[OCR] 行テキスト候補:', bestLineCandidate);
    console.log('[OCR] 最終結果:', finalResult, '信頼度:', confidence);

    return {
      text: finalResult,
      confidence,
      allCandidates,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
};
