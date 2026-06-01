import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../contexts/ThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

export function StatCard({ title, value, icon }: StatCardProps) {
  const { isDark } = useAppTheme();
  const gradientColors: [string, string] = isDark ? ['#1a1a38', '#0f0f23'] : ['#ffffff', '#f8fafc'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      className="flex-1 border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-5 flex-col shadow-md gap-3.5"
    >
      <View className="flex-row justify-between items-center">
        <View className="p-3 bg-[#f1f5f9] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl shadow-inner">
          {icon}
        </View>
      </View>
      <View className="min-w-0">
        <Text className="text-[11px] font-bold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-2xl font-black text-[#0f172a] dark:text-text-primary-dark mt-1" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </LinearGradient>
  );
}
