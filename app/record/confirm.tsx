import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { detectText } from '../../lib/vision';
import { supabase } from '../../lib/supabase';
import { decode } from 'base64-arraybuffer';

export default function ConfirmScreen() {
  const { siteId, meterId, meterName, meterType, imageUri, imageBase64 } = useLocalSearchParams<{
    siteId: string;
    meterId: string;
    meterName: string;
    meterType: string;
    imageUri: string;
    imageBase64: string;
  }>();

  const [readingValue, setReadingValue] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(true);
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const runOCR = async () => {
      try {
        if (imageBase64) {
          const result = await detectText(imageBase64);
          setReadingValue(result.text);
          setOcrConfidence(result.confidence);
        }
      } catch (error) {
        console.error('OCR failed:', error);
        Alert.alert('OCR通知', '数値の自動読み取りに失敗しました。手動で入力してください。');
      } finally {
        setOcrProcessing(false);
      }
    };

    runOCR();
  }, [imageBase64]);

  const handleSubmit = async () => {
    if (!readingValue) {
      Alert.alert('入力エラー', 'メーター値を入力してください。');
      return;
    }

    try {
      setLoading(true);

      // 1. 画像のアップロード (Supabase Storage)
      const fileName = `${Date.now()}.jpg`;
      const filePath = `meters/${meterId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('meter-photos')
        .upload(filePath, decode(imageBase64!), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw new Error('画像の保存に失敗しました');

      const { data: { publicUrl } } = supabase.storage
        .from('meter-photos')
        .getPublicUrl(filePath);

      // 2. 前回の記録を取得
      const { data: prevReading } = await supabase
        .from('meter_readings')
        .select('*')
        .eq('meter_id', meterId)
        .order('read_at', { ascending: false })
        .limit(1)
        .single();

      const currentVal = parseFloat(readingValue);
      const prevVal = prevReading ? prevReading.reading_value : null;
      let usageVal = null;
      let isAnomaly = false;

      if (prevVal !== null) {
        usageVal = currentVal - prevVal;
        // 異常値判定 (逆転 または 200%増)
        if (usageVal < 0 || (prevReading.usage_value && usageVal > prevReading.usage_value * 2)) {
          isAnomaly = true;
        }
      }

      // 3. データの保存
      const { error: insertError } = await supabase.from('meter_readings').insert({
        meter_id: meterId,
        user_id: (await supabase.auth.getSession()).data.session?.user.id,
        reading_value: currentVal,
        prev_reading_id: prevReading?.id || null,
        prev_value: prevVal,
        usage_value: usageVal,
        is_anomaly: isAnomaly,
        image_url: publicUrl,
        image_path: filePath,
        read_at: new Date().toISOString(),
        note: note,
      });

      if (insertError) throw insertError;

      Alert.alert('完了', '記録を保存しました。', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('保存エラー', error.message || 'データの保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <ScrollView className="flex-1">
        <View className="pt-16 px-6 pb-6">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-white text-3xl font-bold">内容を確認</Text>
          <Text className="text-slate-400 mt-1">{meterName} の記録</Text>
        </View>

        <View className="px-6">
          {/* 写真プレビュー */}
          <View className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
            <Image
              source={{ uri: imageUri }}
              className="w-full h-80"
              resizeMode="cover"
            />
            {ocrProcessing && (
              <View className="absolute inset-0 bg-black/50 items-center justify-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-white mt-4 font-medium">数値を読み取っています...</Text>
              </View>
            )}
          </View>

          {/* 入力フォーム */}
          <View className="mt-8 space-y-6">
            <View>
              <View className="flex-row justify-between items-center mb-2 ml-1">
                <Text className="text-slate-300 text-sm font-medium">メーター値 (m³)</Text>
                {ocrProcessing && <ActivityIndicator size="small" color="#3b82f6" />}
              </View>
              <TextInput
                className="bg-slate-900 border border-slate-700 text-white rounded-2xl px-5 py-4 text-2xl font-bold"
                placeholder="0.0"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={readingValue}
                onChangeText={setReadingValue}
              />
              <Text className="text-slate-500 text-xs mt-2 ml-1">
                {ocrConfidence > 0
                  ? `AI読み取り信頼度: ${Math.round(ocrConfidence * 100)}% ・ 必要に応じて修正してください`
                  : '※OCRの読み取り結果が正しくない場合は手動で修正してください'}
              </Text>
            </View>

            <View className="mt-6">
              <Text className="text-slate-300 text-sm font-medium mb-2 ml-1">メモ (特記事項)</Text>
              <TextInput
                className="bg-slate-900 border border-slate-700 text-white rounded-2xl px-5 py-4 h-24"
                placeholder="特記事項があれば入力してください"
                placeholderTextColor="#475569"
                multiline
                numberOfLines={3}
                value={note}
                onChangeText={setNote}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || ocrProcessing}
              className={`mt-8 bg-blue-600 py-5 rounded-3xl shadow-lg shadow-blue-500/30 items-center ${
                (loading || ocrProcessing) ? 'opacity-70' : ''
              }`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-xl font-bold">データを送信する</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-4 mb-12 py-3 items-center"
            >
              <Text className="text-slate-500 font-medium">撮り直す</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
