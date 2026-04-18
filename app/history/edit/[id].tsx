import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function EditHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [readingValue, setReadingValue] = useState('');
  const [note, setNote] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState<any>(null);
  
  const router = useRouter();

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const { data, error } = await supabase
          .from('meter_readings')
          .select('*, meters(name)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setReading(data);
        setReadingValue(data.reading_value.toString());
        setNote(data.note || '');
      } catch (error) {
        console.error('Error fetching detail:', error);
        Alert.alert('エラー', 'データの取得に失敗しました。');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleUpdate = async () => {
    if (!readingValue) {
      if (typeof window !== 'undefined') window.alert('メーター値を入力してください。');
      else Alert.alert('エラー', 'メーター値を入力してください。');
      return;
    }

    setSaving(true);
    try {
      const currentVal = parseFloat(readingValue);
      let newUsageVal = null;
      let newIsAnomaly = false;

      // 使用量の再計算
      if (reading.prev_value !== null) {
        newUsageVal = currentVal - reading.prev_value;
        
        // 異常値判定
        if (newUsageVal < 0) {
          newIsAnomaly = true;
        } else {
          // 前回の使用量と比較 (もし参照できるデータがあれば)
          // 完全な再現のためには prev_reading_id からさらに前回の usage_value を引く必要がありますが
          // 簡易的にマイナス値のみ異常と判断するか、既存の is_anomaly を引き継ぎます
          newIsAnomaly = newUsageVal < 0; 
        }
      }

      const { error } = await supabase
        .from('meter_readings')
        .update({
          reading_value: currentVal,
          usage_value: newUsageVal,
          is_anomaly: newIsAnomaly,
          note: note,
          is_manual: true,
        })
        .eq('id', id);

      if (error) throw error;

      if (typeof window !== 'undefined') {
         window.alert('修正が完了しました。');
         router.back();
      } else {
         Alert.alert('完了', 'データを修正しました。', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (error: any) {
      console.error('Update failed:', error);
      if (typeof window !== 'undefined') window.alert(error.message);
      else Alert.alert('エラー', 'データの更新に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <ScrollView className="flex-1">
        <LinearGradient
          colors={['#1e293b', '#0f172a']}
          className="pt-16 px-6 pb-8"
        >
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View className="flex-row items-center mb-1">
            <Ionicons name="build" size={20} color="#f59e0b" className="mr-2" />
            <Text className="text-amber-500 font-bold tracking-widest ml-1">管理者専用</Text>
          </View>
          <Text className="text-white text-3xl font-bold">データ修正</Text>
          <Text className="text-slate-400 mt-1">{reading?.meters?.name} の記録</Text>
        </LinearGradient>

        <View className="px-6 mt-8 space-y-6">
          <View>
            <Text className="text-slate-300 text-sm font-medium mb-2 ml-1">正しいメーター値 (m³)</Text>
            <TextInput
              className="bg-slate-900 border border-slate-700 text-emerald-400 rounded-2xl px-5 py-4 text-2xl font-bold"
              placeholder="0.0"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={readingValue}
              onChangeText={setReadingValue}
            />
            {reading?.prev_value !== null && (
              <Text className="text-slate-500 text-xs mt-2 ml-1">
                前回値 ({reading.prev_value} m³) との差分が新しい使用量として再計算されます
              </Text>
            )}
          </View>

          <View className="mt-6">
            <Text className="text-slate-300 text-sm font-medium mb-2 ml-1">修正理由・メモ</Text>
            <TextInput
              className="bg-slate-900 border border-slate-700 text-white rounded-2xl px-5 py-4 h-24"
              placeholder="修正の理由を入力してください"
              placeholderTextColor="#475569"
              multiline
              numberOfLines={3}
              value={note}
              onChangeText={setNote}
            />
          </View>

          <TouchableOpacity
            onPress={handleUpdate}
            disabled={saving}
            className={`mt-8 bg-amber-600 py-5 rounded-3xl shadow-lg shadow-amber-500/30 items-center ${
              saving ? 'opacity-70' : ''
            }`}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-xl font-bold">データを上書き保存する</Text>
            )}
          </TouchableOpacity>
          
          <Text className="text-slate-500 text-xs text-center mt-4 pb-12">
            ※上書きすると元のデータには戻せません
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
