import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Reading {
  id: string;
  reading_value: number;
  usage_value: number | null;
  is_anomaly: boolean;
  image_url: string;
  read_at: string;
  meters: {
    name: string;
    type: string;
    sites: {
      name: string;
    }
  }
}

export default function HistoryScreen() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchReadings = async () => {
    try {
      const { data, error } = await supabase
        .from('meter_readings')
        .select(`
          id,
          reading_value,
          usage_value,
          is_anomaly,
          image_url,
          read_at,
          meters (
            name,
            type,
            sites (
              name
            )
          )
        `)
        .order('read_at', { ascending: false });

      if (error) throw error;
      setReadings(data as any || []);
    } catch (error) {
      console.error('Error fetching readings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReadings();
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
      }
    >
      <LinearGradient
        colors={['#1e293b', '#0f172a']}
        className="pt-16 pb-8 px-6 rounded-b-[40px]"
      >
        <Text className="text-slate-400 text-sm font-medium">点検の記録</Text>
        <Text className="text-white text-3xl font-bold">履歴一覧</Text>
      </LinearGradient>

      <View className="px-6 -mt-4 pb-12">
        {readings.length === 0 ? (
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-12 items-center mt-8">
            <Ionicons name="time-outline" size={48} color="#475569" />
            <Text className="text-slate-400 text-lg mt-4 text-center">
              まだ記録がありません
            </Text>
            <Text className="text-slate-500 text-sm mt-2 text-center">
              メーターを撮影して最初の記録を残しましょう
            </Text>
          </View>
        ) : (
          readings.map((reading) => (
            <TouchableOpacity
              key={reading.id}
              onPress={() => router.push(`/history/${reading.id}`)}
              activeOpacity={0.7}
              className="mt-4"
            >
              <View className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <View className="flex-row p-4">
                  {/* サムネイル */}
                  <View className="w-20 h-20 bg-slate-800 rounded-2xl overflow-hidden mr-4 shadow-inner">
                    <Image
                      source={{ uri: reading.image_url }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>

                  <View className="flex-1 justify-center">
                    <View className="flex-row justify-between items-start">
                      <View>
                        <Text className="text-slate-400 text-xs mb-1">
                          {reading.meters.sites.name}
                        </Text>
                        <Text className="text-white text-lg font-bold">
                          {reading.meters.name}
                        </Text>
                      </View>
                      {reading.is_anomaly && (
                        <View className="bg-red-500/10 border border-red-500/50 px-2 py-1 rounded-lg">
                          <Ionicons name="warning" size={12} color="#ef4444" />
                        </View>
                      )}
                    </View>

                    <View className="flex-row items-center mt-2">
                      <Ionicons 
                        name={reading.meters.type === 'water_in' ? 'water' : 'exit'} 
                        size={14} 
                        color={reading.meters.type === 'water_in' ? '#3b82f6' : '#10b981'} 
                      />
                      <Text className="text-slate-300 text-xs ml-1 font-medium italic">
                        {format(new Date(reading.read_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 数値情報バー */}
                <View className="bg-slate-800/50 flex-row justify-between px-6 py-3 border-t border-slate-800/80">
                  <View>
                    <Text className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">メーター値</Text>
                    <Text className="text-white text-lg font-extrabold">{reading.reading_value.toLocaleString()} <Text className="text-slate-400 text-xs">m³</Text></Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">使用量 (前回比)</Text>
                    <Text className={`text-lg font-extrabold ${reading.is_anomaly ? 'text-red-400' : 'text-blue-400'}`}>
                      {reading.usage_value !== null ? `+${reading.usage_value.toLocaleString()}` : '--'} <Text className="text-slate-400 text-xs">m³</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}
