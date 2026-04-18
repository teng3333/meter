import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

interface Meter {
  id: string;
  name: string;
  type: 'water_in' | 'water_out';
}

export default function SelectMeterScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const [meters, setMeters] = useState<Meter[]>([]);
  const [siteName, setSiteName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 拠点名の取得
        const { data: siteData } = await supabase
          .from('sites')
          .select('name')
          .eq('id', siteId)
          .single();
        
        if (siteData) setSiteName(siteData.name);

        // メーター一覧の取得
        const { data: meterData, error } = await supabase
          .from('meters')
          .select('*')
          .eq('site_id', siteId)
          .order('name');

        if (error) throw error;
        setMeters(meterData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId]);

  const handleMeterPress = (meter: Meter) => {
    router.push({
      pathname: '/record/camera',
      params: { 
        siteId, 
        meterId: meter.id,
        meterName: meter.name,
        meterType: meter.type 
      },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <LinearGradient
        colors={['#1e293b', '#0f172a']}
        className="pt-16 pb-8 px-6 rounded-b-[40px]"
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mb-4 flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color="#64748b" />
          <Text className="text-slate-400 ml-2">ホームへ戻る</Text>
        </TouchableOpacity>
        
        <Text className="text-slate-400 text-sm font-medium">{siteName}</Text>
        <Text className="text-white text-3xl font-bold">メーター選択</Text>
      </LinearGradient>

      <View className="px-6 -mt-4 pb-12">
        {meters.length === 0 ? (
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-12 items-center mt-8">
            <Ionicons name="speedometer-outline" size={48} color="#475569" />
            <Text className="text-slate-400 text-lg mt-4 text-center">
              登録されているメーターがありません
            </Text>
            <TouchableOpacity 
              onPress={() => router.back()}
              className="mt-6 bg-slate-800 px-6 py-3 rounded-2xl"
            >
              <Text className="text-white font-bold">戻る</Text>
            </TouchableOpacity>
          </View>
        ) : (
          meters.map((meter) => (
            <TouchableOpacity
              key={meter.id}
              onPress={() => handleMeterPress(meter)}
              activeOpacity={0.7}
              className="mt-4"
            >
              <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex-row items-center shadow-sm">
                <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${
                  meter.type === 'water_in' ? 'bg-blue-500/10' : 'bg-emerald-500/10'
                }`}>
                  <Ionicons 
                    name={meter.type === 'water_in' ? 'water' : 'exit'} 
                    size={28} 
                    color={meter.type === 'water_in' ? '#3b82f6' : '#10b981'} 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold mb-1">
                    {meter.name}
                  </Text>
                  <Text className="text-slate-500 text-sm">
                    {meter.type === 'water_in' ? '上水 (入水)' : '下水 (排水)'}
                  </Text>
                </View>
                <View className="bg-slate-800 px-4 py-2 rounded-xl">
                  <Text className="text-blue-400 font-bold">記録開始</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}
