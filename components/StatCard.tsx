import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <LinearGradient
      colors={['#1a1a38', '#0f0f23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      className="flex-1 border border-borderColor-dark/40 rounded-3xl p-5 flex-col shadow-md gap-3.5"
    >
      <View className="flex-row justify-between items-center">
        <View className="p-3 bg-surface-light-dark border border-borderColor-dark rounded-2xl shadow-inner">
          {icon}
        </View>
      </View>
      <View className="min-w-0">
        <Text className="text-[11px] font-bold text-text-secondary-dark uppercase tracking-wider" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-2xl font-black text-text-primary-dark mt-1" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </LinearGradient>
  );
}
