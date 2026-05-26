import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Settings, Key, Save, Check } from 'lucide-react-native';
import { getSettings, saveSettings } from '../../db/settings';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const data = await getSettings();
      setApiKey(data.gemini_api_key || '');
      setProvider(data.api_provider || 'gemini');
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
        api_provider: provider
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 3000);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#020617] justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-[#94a3b8] font-medium mt-4">Loading settings...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#020617] p-4">
      {/* Header */}
      <View className="mb-6">
        <Text className="text-[#94a3b8] text-sm leading-5">
          Manage your app configuration and assistant credentials below.
        </Text>
      </View>

      {/* Settings Card */}
      <View className="bg-surface-dark border border-borderColor-dark/40 rounded-2xl p-4 space-y-5 shadow-sm">
        {/* Title row */}
        <View className="flex-row items-center space-x-3 pb-3.5 border-b border-borderColor-dark/20">
          <View className="p-2 bg-brand-900/30 border border-brand-500/20 rounded-xl">
            <Key color="#60a5fa" size={20} />
          </View>
          <View>
            <Text className="text-text-primary-dark font-bold text-base">AI Assistant API</Text>
            <Text className="text-text-secondary-dark text-xs mt-0.5">Configure your provider keys</Text>
          </View>
        </View>

        {/* Provider Option */}
        <View className="space-y-1">
          <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">
            AI Provider
          </Text>
          <View className="bg-surface-light-dark border border-borderColor-dark/40 rounded-xl p-3 flex-row items-center justify-between">
            <Text className="text-text-primary-dark font-medium text-sm">Google Gemini</Text>
            <View className="bg-brand-900 border border-brand-500 rounded-full px-2 py-0.5">
              <Text className="text-brand-400 font-bold text-[9px] uppercase tracking-wider">Active</Text>
            </View>
          </View>
        </View>

        {/* API Key Input */}
        <View className="space-y-1">
          <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">
            Gemini API Key
          </Text>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry={true}
            placeholder="Enter your Gemini API key..."
            placeholderTextColor="#475569"
            className="bg-surface-dark border border-borderColor-dark rounded-xl px-4 py-3.5 text-text-primary-dark text-sm"
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          className={`py-3.5 rounded-xl flex-row items-center justify-center space-x-2 shadow-sm ${
            savedStatus ? 'bg-green-600' : 'bg-brand-500 shadow-brand-500/20'
          }`}
        >
          {savedStatus ? (
            <>
              <Check color="#ffffff" size={16} />
              <Text className="text-white font-bold text-sm">Settings Saved</Text>
            </>
          ) : (
            <>
              <Save color="#ffffff" size={16} />
              <Text className="text-white font-bold text-sm">
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
