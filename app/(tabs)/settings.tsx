import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Key, Save, Check, Eye, EyeOff, Moon, Sun, ChevronDown } from 'lucide-react-native';
import { getSettings, saveSettings } from '../../db/settings';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCustomDialog } from '../../components/CustomDialog';
import { useAppTheme } from '../../contexts/ThemeContext';
import {
  AI_PROVIDER_OPTIONS,
  getAiProviderOption,
  normalizeAiProvider,
  type AiProvider,
} from '../../utils/aiProviders';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { showDialog } = useCustomDialog();
  const { themeMode, isDark, colors, setThemeMode } = useAppTheme();
  const [apiProvider, setApiProvider] = useState<AiProvider>('gemini');
  const [apiKeys, setApiKeys] = useState<Record<AiProvider, string>>({
    gemini: '',
    openai: '',
    claude: '',
  });
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const data = await getSettings();
      setApiProvider(normalizeAiProvider(data.api_provider));
      setApiKeys({
        gemini: data.gemini_api_key || '',
        openai: data.openai_api_key || '',
        claude: data.claude_api_key || '',
      });
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
        api_provider: apiProvider,
        gemini_api_key: apiKeys.gemini,
        openai_api_key: apiKeys.openai,
        claude_api_key: apiKeys.claude,
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

  const handleProviderSelect = (provider: AiProvider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setApiProvider(provider);
    setProviderDropdownOpen(false);
    setShowApiKey(false);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [apiProvider]: value,
    }));
  };

  const handleThemeToggle = async (nextIsDark: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await setThemeMode(nextIsDark ? 'dark' : 'light');
    } catch (error) {
      showDialog({
        title: 'Error',
        message: 'Failed to save theme preference'
      });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8fafc] dark:bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-[#475569] dark:text-text-secondary-dark font-medium text-base mt-4">Loading settings...</Text>
      </View>
    );
  }

  const activeProvider = getAiProviderOption(apiProvider);
  const activeApiKey = apiKeys[apiProvider];

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#f8fafc] dark:bg-[#050510]">

      <ScrollView
        className="flex-1 bg-[#f8fafc] dark:bg-[#050510]"
        contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >

        <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-5 gap-5 shadow-md">
          <View className="flex-row items-center gap-3 pb-3.5 border-b border-[#e2e8f0] dark:border-borderColor-dark/20">
            <View className="p-3 bg-brand-900/10 dark:bg-brand-900/40 border border-brand-500/20 dark:border-brand-500/30 rounded-3xl">
              {isDark ? (
                <Moon color="#8b5cf6" size={24} />
              ) : (
                <Sun color="#8b5cf6" size={24} />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-[#0f172a] dark:text-text-primary-dark font-bold text-lg">Appearance</Text>
              <Text className="text-[#475569] dark:text-text-secondary-dark text-sm mt-0.5">
                Choose how Fitly looks
              </Text>
            </View>
          </View>

          <View className="bg-[#f1f5f9] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-2xl p-4 flex-row items-center justify-between gap-4">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="p-2.5 bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl">
                {isDark ? (
                  <Moon color="#a78bfa" size={20} />
                ) : (
                  <Sun color="#f59e0b" size={20} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[#0f172a] dark:text-text-primary-dark font-semibold text-base">
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Text>
                <Text className="text-[#475569] dark:text-text-secondary-dark text-xs mt-0.5">
                  Current theme: {themeMode}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleThemeToggle}
              trackColor={{ false: '#cbd5e1', true: '#4c1d95' }}
              thumbColor={isDark ? '#a78bfa' : '#ffffff'}
              ios_backgroundColor="#cbd5e1"
            />
          </View>
        </View>

        <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-5 gap-6 shadow-md">
          {/* Title row */}
          <View className="flex-row items-center gap-3 pb-3.5 border-b border-[#e2e8f0] dark:border-borderColor-dark/20">
            <View className="p-3 bg-brand-900/10 dark:bg-brand-900/40 border border-brand-500/20 dark:border-brand-500/30 rounded-3xl">
              <Key color="#8b5cf6" size={24} />
            </View>
            <View>
              <Text className="text-[#0f172a] dark:text-text-primary-dark font-bold text-lg">AI Assistant API</Text>
              <Text className="text-[#475569] dark:text-text-secondary-dark text-sm mt-0.5">Configure your provider keys</Text>
            </View>
          </View>

          {/* Provider Option */}
          <View className="gap-1.5">
            <Text className="text-sm font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">
              AI Provider
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setProviderDropdownOpen((open) => !open);
              }}
              activeOpacity={0.75}
              className="bg-[#f1f5f9] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-2xl p-4 flex-row items-center justify-between"
            >
              <View>
                <Text className="text-[#0f172a] dark:text-text-primary-dark font-semibold text-base">
                  {activeProvider.label}
                </Text>
                <Text className="text-[#475569] dark:text-text-secondary-dark text-xs mt-0.5">
                  {activeProvider.model}
                </Text>
              </View>
              <ChevronDown
                color="#94a3b8"
                size={20}
                style={{ transform: [{ rotate: providerDropdownOpen ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {providerDropdownOpen && (
              <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-2xl p-2 mt-1 gap-1">
                {AI_PROVIDER_OPTIONS.map((provider) => {
                  const isActive = provider.id === apiProvider;

                  return (
                    <TouchableOpacity
                      key={provider.id}
                      onPress={() => handleProviderSelect(provider.id)}
                      className={`p-3 rounded-xl border ${
                        isActive
                          ? 'bg-brand-900/10 dark:bg-brand-900/30 border-brand-500/30'
                          : 'bg-transparent border-transparent'
                      }`}
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text className={`font-semibold text-sm ${isActive ? 'text-brand-400' : 'text-[#0f172a] dark:text-text-primary-dark'}`}>
                            {provider.label}
                          </Text>
                          <Text className="text-[#475569] dark:text-text-secondary-dark text-xs mt-0.5">
                            {provider.model}
                          </Text>
                        </View>
                        {isActive && (
                          <View className="bg-brand-900 border border-brand-500 rounded-full px-2 py-0.5">
                            <Text className="text-brand-400 font-bold text-[10px] uppercase tracking-wider">Active</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* API Key Input */}
          <View className="gap-1">
            <Text className="text-sm font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">
              {activeProvider.label} API Key
            </Text>
            <View className="flex-row items-center bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-3xl px-5">
              <TextInput
                value={activeApiKey}
                onChangeText={handleApiKeyChange}
                secureTextEntry={!showApiKey}
                placeholder={activeProvider.placeholder}
                placeholderTextColor="#475569"
                className="flex-1 text-[#0f172a] dark:text-text-primary-dark text-base py-3.5"
                selectionColor={colors.textPrimary}
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
      </ScrollView>
    </View>
  );
}
