import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Calendar, Flame, Dumbbell } from 'lucide-react-native';
import { getDashboardStats, DashboardStats } from '../../db/stats';
import { CalendarHeatmap } from '../../components/CalendarHeatmap';
import { StatCard } from '../../components/StatCard';
import { FavoriteExercisesTable } from '../../components/FavoriteExercisesTable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-fetch stats every time this tab is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadStats() {
        try {
          const data = await getDashboardStats();
          if (isMounted) {
            setStats(data);
            setLoading(false);
          }
        } catch (error) {
          console.error('Failed to load dashboard stats:', error);
          if (isMounted) {
            setLoading(false);
          }
        }
      }

      loadStats();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8fafc] dark:bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-[#475569] dark:text-text-secondary-dark font-medium text-base mt-4">Assembling dashboard...</Text>
      </View>
    );
  }

  const streakLabel = stats ? `${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}` : '0 days';

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#f8fafc] dark:bg-[#050510]">
      <ScrollView
        className="flex-1 bg-[#f8fafc] dark:bg-[#050510]"
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View className="mb-6">
          <Text className="text-4xl font-extrabold text-[#0f172a] dark:text-white tracking-tight">Welcome back!</Text>
          <Text className="text-[#475569] dark:text-text-secondary-dark text-base mt-1">Ready to crush your goals today?</Text>
        </View>

        {/* Main Grid Layout */}
        <View className="gap-5">
          {/* Heatmap Section */}
          <CalendarHeatmap dates={stats?.activeDates || []} />

          {/* Stats Row 1: Side by Side Cards */}
          <View className="flex-row gap-3">
            <StatCard
              title="Total Sessions"
              value={stats?.sessionCount || 0}
              icon={<Calendar color="#8b5cf6" size={24} />}
            />
            <StatCard
              title="Current Streak"
              value={streakLabel}
              icon={<Flame color="#f43f5e" size={24} />}
            />
          </View>

          {/* Stats Row 2: Full Width Card */}
          <StatCard
            title="Exercises Logged"
            value={stats?.exerciseCount || 0}
            icon={<Dumbbell color="#8b5cf6" size={24} />}
          />

          {/* Favorite Exercises section */}
          {stats && stats.favoriteExercises.length > 0 ? (
            <FavoriteExercisesTable exercises={stats.favoriteExercises} />
          ) : (
            <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-7 items-center justify-center">
              <Dumbbell color="#475569" size={48} />
              <Text className="text-[#0f172a] dark:text-text-primary-dark font-semibold text-base mt-3">No Exercises Logged Yet</Text>
              <Text className="text-[#475569] dark:text-text-secondary-dark text-sm text-center mt-1">
                Start logging your workouts in the Sessions tab to see your favorite exercises here!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
