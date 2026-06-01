import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ClipboardList, Edit2, Plus, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { deleteSession, getSessions, Session } from '../../db/sessions';
import { useCustomDialog } from '../../components/CustomDialog';

function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export default function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showDialog } = useCustomDialog();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const sessData = await getSessions();
      setSessions(sessData);
    } catch (error) {
      console.error('Failed to load sessions data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddSessionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/session-form' as any);
  };

  const handleEditSessionPress = (session: Session) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/session-form',
      params: { id: String(session.id) },
    } as any);
  };

  const handleDeleteSession = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showDialog({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this workout log?',
      showCancel: true,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteSession(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        } catch (error: any) {
          showDialog({
            title: 'Error',
            message: error.message || 'Failed to delete session',
          });
        }
      },
    });
  };

  const formatDateLabel = (dateStr: string) => {
    const date = parseDateKey(dateStr);

    if (date) {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    return dateStr;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8fafc] dark:bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-[#475569] dark:text-text-secondary-dark font-medium text-base mt-4">
          Opening Workout Vault...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#f8fafc] dark:bg-[#050510]">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <View
              key={session.id}
              className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-5 mb-5 shadow-md gap-4 flex-col"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1 mr-3">
                  <View className="p-3 bg-brand-900/40 border border-brand-500/30 rounded-3xl">
                    <Calendar color="#8b5cf6" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#0f172a] dark:text-text-primary-dark font-bold text-base" numberOfLines={1}>
                      {formatDateLabel(session.date)}
                    </Text>
                    {session.notes ? (
                      <Text className="text-[#475569] dark:text-text-secondary-dark text-sm mt-0.5" numberOfLines={1}>
                        {session.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    onPress={() => handleEditSessionPress(session)}
                    className="p-2 bg-[#f1f5f9] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-2xl"
                  >
                    <Edit2 color="#94a3b8" size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSession(session.id)}
                    className="p-2 bg-red-950/10 border border-red-500/20 rounded-2xl"
                  >
                    <Trash2 color="#f87171" size={16} />
                  </TouchableOpacity>
                </View>
              </View>

              {session.notes ? (
                <View className="bg-[#f1f5f9] dark:bg-surface-light-dark/30 rounded-3xl p-4 border border-[#e2e8f0] dark:border-borderColor-dark/10">
                  <Text className="text-[#475569] dark:text-text-secondary-dark text-sm italic leading-5">
                    {session.notes}
                  </Text>
                </View>
              ) : null}

              <View className="border-t border-[#e2e8f0] dark:border-borderColor-dark/20 pt-3 gap-2.5 flex-col">
                {session.exercises.map((exercise, index) => (
                  <View key={exercise.id || index} className="flex-row justify-between items-center py-1.5">
                    <View className="flex-1 mr-3">
                      <Text className="text-[#0f172a] dark:text-text-primary-dark font-semibold text-sm">
                        {index + 1}. {exercise.name}
                      </Text>
                      {exercise.category_name ? (
                        <Text className="text-[#475569] dark:text-text-secondary-dark text-xs uppercase font-bold tracking-wider mt-0.5">
                          {exercise.category_name}
                        </Text>
                      ) : null}
                    </View>
                    <Text className="text-brand-400 font-bold text-sm text-right">
                      {exercise.sets} sets x {exercise.reps}
                      {exercise.is_time === 1 ? 's' : ' reps'} @{' '}
                      {exercise.weight != null && exercise.weight > 0 ? `${exercise.weight} kg` : 'BW'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View className="py-28 justify-center items-center">
            <ClipboardList color="#475569" size={48} />
            <Text className="text-[#0f172a] dark:text-text-primary-dark font-semibold text-base mt-3">
              No Workouts Logged Yet
            </Text>
            <Text className="text-[#475569] dark:text-text-secondary-dark text-sm text-center mt-1">
              Tap the floating button below to record your first session!
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        onPress={handleAddSessionPress}
        className="absolute bottom-6 right-6 rounded-[22px] overflow-hidden shadow-lg shadow-brand-500/40"
      >
        <LinearGradient
          colors={['#8b5cf6', '#06b6d4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-16 h-16 items-center justify-center"
        >
          <Plus color="#ffffff" size={28} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}
