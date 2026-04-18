import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('入力エラー', 'メールアドレスとパスワードを入力してください。');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showAlert('ログイン失敗', 'メールアドレスまたはパスワードが正しくありません。');
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      showAlert('入力エラー', 'メールアドレスとパスワードを入力してください。');
      return;
    }

    setLoading(true);
    const { data: { session }, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: email.split('@')[0],
        },
      },
    });

    if (error) {
      showAlert('登録失敗', error.message);
    } else {
      if (!session) {
        showAlert('確認メール送信', '登録したメールアドレスに確認メールを送信しました。');
      } else {
        // セッションがあれば自動ログインとなる（自動画面遷移が行われる）
      }
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        className="flex-1 px-8 justify-center"
      >
        <View className="mb-12 items-center">
          <View className="w-20 h-20 bg-blue-500 rounded-3xl items-center justify-center shadow-lg shadow-blue-500/50 mb-6">
            <Text className="text-white text-4xl font-bold">M</Text>
          </View>
          <Text className="text-white text-4xl font-extrabold tracking-tight">
            MeterSnap
          </Text>
          <Text className="text-slate-400 text-lg mt-2">
            施設管理をスマートに、正確に
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-slate-300 text-sm font-medium mb-2 ml-1">
              メールアドレス
            </Text>
            <TextInput
              className="bg-slate-800/50 border border-slate-700 text-white rounded-2xl px-5 py-4 text-lg"
              placeholder="example@meter-snap.com"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View className="mt-4">
            <Text className="text-slate-300 text-sm font-medium mb-2 ml-1">
              パスワード
            </Text>
            <TextInput
              className="bg-slate-800/50 border border-slate-700 text-white rounded-2xl px-5 py-4 text-lg"
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className={`mt-8 bg-blue-600 py-4 rounded-2xl shadow-lg shadow-blue-600/30 items-center ${
              loading ? 'opacity-70' : ''
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-xl font-bold">ログイン</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignUp}
            className="mt-4 py-2 items-center"
          >
            <Text className="text-slate-400 text-sm">
              アカウントをお持ちでない場合は <Text className="text-blue-400 font-bold">新規登録</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View className="absolute bottom-12 left-0 right-0 items-center">
          <Text className="text-slate-500 text-xs">
            © 2026 MeterSnap Application. All rights reserved.
          </Text>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
