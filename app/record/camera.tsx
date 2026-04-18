import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const { siteId, meterId, meterName, meterType } = useLocalSearchParams();

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-8">
        <Text className="text-white text-center text-lg mb-8">
          メーターを撮影するために、カメラへのアクセス許可が必要です。
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-blue-600 px-8 py-4 rounded-2xl"
        >
          <Text className="text-white font-bold text-lg">許可する</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || loading) return;

    try {
      setLoading(true);
      
      // 写真撮影
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo) throw new Error('撮影に失敗しました');

      // 画像の圧縮とリサイズ (OCR用に容量削減)
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }], // 横幅を1200pxに制限
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // 確認画面へ遷移
      router.push({
        pathname: '/record/confirm',
        params: {
          siteId,
          meterId,
          meterName,
          meterType,
          imageUri: manipulatedImage.uri,
          imageBase64: manipulatedImage.base64 || '',
        },
      });
    } catch (error) {
      console.error('Take picture error:', error);
      if (typeof window !== 'undefined') {
        window.alert('写真の撮影または処理に失敗しました。');
      } else {
        Alert.alert('エラー', '写真の撮影または処理に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView 
        ref={cameraRef} 
        className="flex-1"
        facing="back"
      >
        {/* オーバーレイ UI */}
        <View className="flex-1 justify-between p-8">
          <View className="flex-row justify-between items-center mt-8">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-12 h-12 bg-black/40 rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <View className="bg-blue-600/80 px-4 py-2 rounded-full">
              <Text className="text-white font-bold text-sm">{meterName}</Text>
            </View>
            <View className="w-12" />
          </View>

          {/* メーター数値ガイド枠 */}
          <View className="items-center">
            <View className="w-full h-24 border-2 border-blue-500 rounded-2xl border-dashed items-center justify-center bg-blue-500/10">
              <Text className="text-blue-400 text-xs font-bold uppercase tracking-widest">
                数字をこの枠に合わせて撮影してください
              </Text>
            </View>
          </View>

          {/* 撮影ボタン */}
          <View className="items-center mb-8">
            <TouchableOpacity
              onPress={takePicture}
              disabled={loading}
              className="w-20 h-20 bg-white rounded-full items-center justify-center border-4 border-slate-300"
            >
              <View className="w-16 h-16 bg-white rounded-full border-2 border-slate-800" />
              {loading && (
                <View className="absolute">
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}
