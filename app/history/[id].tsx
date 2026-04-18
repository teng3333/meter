import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ReadingDetail {
  id: string;
  reading_value: number;
  prev_value: number | null;
  usage_value: number | null;
  is_anomaly: boolean;
  image_url: string;
  read_at: string;
  note: string;
  user_id: string;
  meters: {
    name: string;
    type: string;
    sites: {
      name: string;
      address: string;
    }
  };
  profiles?: {
    display_name: string;
  }
}

const { width } = Dimensions.get('window');

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reading, setReading] = useState<ReadingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const { data, error } = await supabase
          .from('meter_readings')
          .select(`
            *,
            meters (
              name,
              type,
              sites (
                name,
                address
              )
            ),
            profiles:user_id (
              display_name
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setReading(data as any);
      } catch (error) {
        console.error('Error fetching detail:', error);
        Alert.alert('エラー', 'データの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id) {
        const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (data && data.role === 'admin') {
          setIsAdmin(true);
        }
      }
    };

    fetchDetail();
    fetchRole();
  }, [id]);

  const downloadImage = async () => {
    if (!reading?.image_url) return;
    
    if (typeof document !== 'undefined') {
      try {
        const response = await fetch(reading.image_url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const dateStr = format(new Date(reading.read_at), 'yyyyMMdd_HHmm');
        const safeMeterName = reading.meters.name.replace(/[/\\?%*:|"<>]/g, '_');
        link.setAttribute('download', `${safeMeterName}_${dateStr}.jpg`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Image download failed:', error);
        window.alert('画像のダウンロードに失敗しました。');
      }
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!reading) return null;

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="relative">
        <Image
          source={{ uri: reading.image_url }}
          className="w-full h-[450px]"
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.7)', 'transparent']}
          className="absolute top-0 left-0 right-0 h-32 pt-16 px-6 flex-row justify-between"
        >
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-12 h-12 bg-black/30 rounded-full items-center justify-center backdrop-blur-md"
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          {typeof document !== 'undefined' && (
            <TouchableOpacity 
              onPress={downloadImage}
              className="w-12 h-12 bg-black/30 rounded-full items-center justify-center backdrop-blur-md"
            >
              <Ionicons name="download" size={24} color="white" />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      <View className="px-6 -mt-12">
        <View className="bg-slate-900 rounded-[40px] p-6 shadow-2xl border border-slate-800">
          <View className="flex-row items-center justify-between mb-4">
            <View className="bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/30">
              <Text className="text-blue-400 text-xs font-bold uppercase tracking-widest">
                {reading.meters.type === 'water_in' ? '上水 (入水)' : '下水 (排水)'}
              </Text>
            </View>
            <Text className="text-slate-500 text-xs">
              {format(new Date(reading.read_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
            </Text>
          </View>

          <Text className="text-white text-3xl font-extrabold mb-1">
            {reading.meters.name}
          </Text>
          <Text className="text-slate-400 text-sm mb-6">
            {reading.meters.sites.name}
          </Text>

          {/* メイン数値 */}
          <View className="flex-row space-x-3 mb-8">
            <View className="flex-1 bg-slate-800/50 rounded-3xl p-5 border border-slate-800">
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">今回のメーター値</Text>
              <Text className="text-white text-3xl font-black">
                {reading.reading_value.toLocaleString()} <Text className="text-slate-400 text-base">m³</Text>
              </Text>
            </View>
            <View className={`flex-1 rounded-3xl p-5 border ${
              reading.is_anomaly ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">使用量 (前回比)</Text>
              <Text className={`text-3xl font-black ${reading.is_anomaly ? 'text-red-400' : 'text-blue-400'}`}>
                {reading.usage_value !== null ? `+${reading.usage_value.toLocaleString()}` : '--'} <Text className="text-slate-400 text-base">m³</Text>
              </Text>
            </View>
          </View>

          {/* 追加情報セクション */}
          <View className="space-y-6">
            <View>
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">点検データ</Text>
              <View className="flex-row justify-between mb-3">
                <Text className="text-slate-400">前回メーター値</Text>
                <Text className="text-white font-medium">{reading.prev_value?.toLocaleString() ?? '--'} m³</Text>
              </View>
              <View className="flex-row justify-between mb-3">
                <Text className="text-slate-400">担当者</Text>
                <Text className="text-white font-medium">{reading.profiles?.display_name ?? '不明'}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-slate-400">ステータス</Text>
                <Text className={reading.is_anomaly ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {reading.is_anomaly ? '異常検知 (要確認)' : '正常'}
                </Text>
              </View>
            </View>

            <View>
              <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">メモ</Text>
              <Text className="text-slate-300 italic leading-relaxed">
                {reading.note || 'メモはありません'}
              </Text>
            </View>
          </View>
        </View>

        {/* 下部ボタン */}
        <View className="mt-8 mb-12 space-y-4">
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push(`/history/edit/${reading.id}`)}
              className="bg-blue-600 py-4 rounded-3xl items-center shadow-lg shadow-blue-500/30"
            >
              <View className="flex-row items-center">
                <Ionicons name="pencil" size={18} color="white" />
                <Text className="text-white font-bold ml-2 text-lg">データを修正する</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-slate-900 border border-slate-800 py-4 rounded-3xl items-center"
          >
            <Text className="text-white font-bold">一覧に戻る</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
