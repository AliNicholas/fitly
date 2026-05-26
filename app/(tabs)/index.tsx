import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Calendar, Flame, Dumbbell } from 'lucide-react-native';
import { getDashboardStats, DashboardStats } from '../../db/stats';
import { CalendarHeatmap } from '../../components/CalendarHeatmap';
import { StatCard } from '../../components/StatCard';
import { FavoriteExercisesTable } from '../../components/FavoriteExercisesTable';

export default function DashboardScreen() {
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
      <View className="flex-1 bg-[#020617] justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-[#94a3b8] font-medium mt-4">Assembling dashboard...</Text>
      </View>
    );
  }

  const streakLabel = stats ? `${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}` : '0 days';

  return (
    <ScrollView
      className="flex-1 bg-[#020617]"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Header */}
      <View className="mb-6">
        <Text className="text-3xl font-extrabold text-white tracking-tight">Welcome back!</Text>
        <Text className="text-[#94a3b8] text-sm mt-1">Ready to crush your goals today?</Text>
      </View>

      {/* Main Grid Layout */}
      <View className="space-y-5">
        {/* Heatmap Section */}
        <CalendarHeatmap dates={stats?.activeDates || []} />

        {/* Stats Row 1: Side by Side Cards */}
        <View className="flex-row space-x-3">
          <StatCard
            title="Total Sessions"
            value={stats?.sessionCount || 0}
            icon={<Calendar color="#3b82f6" size={20} />}
          />
          <StatCard
            title="Current Streak"
            value={streakLabel}
            icon={<Flame color="#f97316" size={20} />}
          />
        </View>

        {/* Stats Row 2: Full Width Card */}
        <StatCard
          title="Exercises Logged"
          value={stats?.exerciseCount || 0}
          icon={<Dumbbell color="#3b82f6" size={20} />}
        />

        {/* Favorite Exercises section */}
        {stats && stats.favoriteExercises.length > 0 ? (
          <FavoriteExercisesTable exercises={stats.favoriteExercises} />
        ) : (
          <View className="bg-surface-dark border border-borderColor-dark/40 rounded-2xl p-6 items-center justify-center">
            <Dumbbell color="#475569" size={40} />
            <Text className="text-text-primary-dark font-semibold text-sm mt-3">No Exercises Logged Yet</Text>
            <Text className="text-text-secondary-dark text-xs text-center mt-1">
              Start logging your workouts in the Sessions tab to see your favorite exercises here!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
