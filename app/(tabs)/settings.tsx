import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Key, Save, Check, Eye, EyeOff } from 'lucide-react-native';
import { getSettings, saveSettings } from '../../db/settings';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCustomDialog } from '../../components/CustomDialog';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { showDialog } = useCustomDialog();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const data = await getSettings();
      setApiKey(data.gemini_api_key || '');
      setLoading(false);
    } catch (e) {
      console.error('Failed to load settings:', e);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSaving(true);
    try {
      await saveSettings({
        gemini_api_key: apiKey,
        api_provider: 'gemini'
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 3000);
    } catch (error) {
      showDialog({
        title: 'Error',
        message: 'Failed to save settings'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-text-secondary-dark font-medium text-base mt-4">Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#050510]">

      <View className="flex-1 bg-[#050510] p-5 gap-5">

        {/* Settings Card */}
        <View className="bg-surface-dark border border-borderColor-dark/40 rounded-3xl p-5 gap-6 shadow-md">
          {/* Title row */}
          <View className="flex-row items-center gap-3 pb-3.5 border-b border-borderColor-dark/20">
            <View className="p-3 bg-brand-900/40 border border-brand-500/30 rounded-3xl">
              <Key color="#8b5cf6" size={24} />
            </View>
            <View>
              <Text className="text-text-primary-dark font-bold text-lg">AI Assistant API</Text>
              <Text className="text-text-secondary-dark text-sm mt-0.5">Configure your provider keys</Text>
            </View>
          </View>

          {/* Provider Option */}
          <View className="gap-1">
            <Text className="text-sm font-semibold text-text-secondary-dark uppercase tracking-wider">
              AI Provider
            </Text>
            <View className="bg-surface-light-dark border border-borderColor-dark/40 rounded-2xl p-4 flex-row items-center justify-between">
              <Text className="text-text-primary-dark font-semibold text-base">Google Gemini</Text>
              <View className="bg-brand-900 border border-brand-500 rounded-full px-2 py-0.5">
                <Text className="text-brand-400 font-bold text-xs uppercase tracking-wider">Active</Text>
              </View>
            </View>
          </View>

          {/* API Key Input */}
          <View className="gap-1">
            <Text className="text-sm font-semibold text-text-secondary-dark uppercase tracking-wider">
              Gemini API Key
            </Text>
            <View className="flex-row items-center bg-surface-dark border border-borderColor-dark rounded-3xl px-5">
              <TextInput
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry={!showApiKey}
                placeholder="Enter your Gemini API key..."
                placeholderTextColor="#475569"
                className="flex-1 text-text-primary-dark text-base py-3.5"
              />
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowApiKey(!showApiKey);
                }}
                className="p-1 pl-3"
              >
                {showApiKey ? (
                  <EyeOff color="#94a3b8" size={22} />
                ) : (
                  <Eye color="#94a3b8" size={22} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Save button */}
          {savedStatus ? (
            <TouchableOpacity
              disabled={true}
              className="py-4 rounded-2xl flex-row items-center justify-center gap-2 bg-green-600 shadow-sm"
            >
              <Check color="#ffffff" size={20} />
              <Text className="text-white font-bold text-base">Settings Saved</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className="shadow-lg shadow-brand-500/20"
            >
              <LinearGradient
                colors={['#8b5cf6', '#06b6d4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 rounded-2xl flex-row items-center justify-center gap-2"
              >
                <Save color="#ffffff" size={20} />
                <Text className="text-white font-bold text-base">
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
