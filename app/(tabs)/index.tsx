import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Site {
  id: string;
  name: string;
  address: string;
}

export default function HomeScreen() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('name');

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSites();
  };

  const handleSitePress = (siteId: string) => {
    router.push({
      pathname: '/record/select-meter',
      params: { siteId },
    });
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
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-400 text-sm font-medium">ようこそ</Text>
            <Text className="text-white text-3xl font-bold">拠点一覧</Text>
          </View>
          <TouchableOpacity 
            className="w-12 h-12 bg-slate-800 rounded-2xl items-center justify-center border border-slate-700"
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="person-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="bg-blue-600/20 border border-blue-500/30 rounded-2xl p-4 flex-row items-center">
          <View className="w-10 h-10 bg-blue-500 rounded-xl items-center justify-center mr-4">
            <Ionicons name="information-circle" size={24} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-blue-100 font-bold">本日の点検</Text>
            <Text className="text-blue-200/70 text-xs">
              記録対象の拠点を選択して開始してください
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View className="px-6 -mt-4 pb-12">
        {sites.length === 0 ? (
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-12 items-center mt-8">
            <Ionicons name="business-outline" size={48} color="#475569" />
            <Text className="text-slate-400 text-lg mt-4 text-center">
              登録されている拠点がありません
            </Text>
            <Text className="text-slate-500 text-sm mt-2 text-center">
              管理者に連絡して拠点を追加してください
            </Text>
          </View>
        ) : (
          sites.map((site) => (
            <TouchableOpacity
              key={site.id}
              onPress={() => handleSitePress(site.id)}
              activeOpacity={0.7}
              className="mt-4"
            >
              <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex-row items-center shadow-sm">
                <View className="w-14 h-14 bg-slate-800 rounded-2xl items-center justify-center mr-4">
                  <Ionicons name="location" size={28} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold mb-1">
                    {site.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#475569" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}
