import React from 'react';
import { View, Text } from 'react-native';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <View className="flex-1 bg-surface-dark border border-borderColor-dark/40 rounded-2xl p-4 flex-row items-center space-x-3 shadow-md">
      <View className="p-2.5 bg-surface-light-dark border border-borderColor-dark rounded-xl shadow-inner">
        {icon}
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-[10px] font-bold text-text-secondary-dark uppercase tracking-wider" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-xl font-bold text-text-primary-dark mt-0.5" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}
