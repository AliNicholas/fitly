import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, ClipboardList, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Exercise, getExercises } from '../db/exercises';
import { addSession, getSessions, SessionExercise, updateSession } from '../db/sessions';
import { ExerciseRow } from '../components/ExerciseRow';
import { useCustomDialog } from '../components/CustomDialog';

interface SessionExerciseFormRow {
  exercise_id: number;
  sets: string;
  reps: string;
  weight: string;
  isBodyweight: boolean;
  isTime: boolean;
}

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

function getPickerMonthDate(dateKey?: string): Date {
  const date = dateKey ? parseDateKey(dateKey) : null;
  const pickerMonth = date ?? new Date();
  pickerMonth.setDate(1);
  pickerMonth.setHours(0, 0, 0, 0);
  return pickerMonth;
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateStr: string) {
  const date = parseDateKey(dateStr);

  if (date) {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return dateStr || 'Select date';
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SessionFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showDialog } = useCustomDialog();

  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const editingId = idParam ? Number(idParam) : 0;
  const isEditing = Number.isFinite(editingId) && editingId > 0;

  const [loading, setLoading] = useState(true);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [sessionDate, setSessionDate] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseFormRow[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => getPickerMonthDate());

  const loadFormData = useCallback(async () => {
    try {
      const exercises = await getExercises();
      setAvailableExercises(exercises);

      if (isEditing) {
        const sessions = await getSessions();
        const session = sessions.find((item) => item.id === editingId);
        if (!session) {
          showDialog({
            title: 'Not Found',
            message: 'This workout session could not be found.',
          });
          router.back();
          return;
        }

        setSessionDate(session.date);
        setPickerDate(getPickerMonthDate(session.date));
        setSessionNotes(session.notes || '');
        setSessionExercises(
          session.exercises.map((exercise) => ({
            exercise_id: exercise.exercise_id,
            sets: exercise.sets != null ? exercise.sets.toString() : '',
            reps: exercise.reps != null ? exercise.reps.toString() : '',
            weight: exercise.weight != null ? exercise.weight.toString() : '',
            isBodyweight: exercise.weight == null || exercise.weight === 0,
            isTime: exercise.is_time === 1,
          }))
        );
      } else {
        const initialDate = getTodayDateString();
        setSessionDate(initialDate);
        setPickerDate(getPickerMonthDate(initialDate));
        setSessionNotes('');
        setSessionExercises(
          exercises.length > 0
            ? [{
              exercise_id: exercises[0].id,
              sets: '3',
              reps: '10',
              weight: '',
              isBodyweight: false,
              isTime: false,
            }]
            : []
        );
      }
    } catch (error) {
      console.error('Failed to load session form data:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to load workout data.',
      });
    } finally {
      setLoading(false);
    }
  }, [editingId, isEditing, router, showDialog]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const pickerDays = useMemo(() => {
    const year = pickerDate.getFullYear();
    const month = pickerDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(prevDate.getDate()).padStart(2, '0');
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateString: `${y}-${m}-${d}`,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const m = String(month + 1).padStart(2, '0');
      const d = String(i).padStart(2, '0');
      days.push({
        day: i,
        isCurrentMonth: true,
        dateString: `${year}-${m}-${d}`,
      });
    }

    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(nextDate.getDate()).padStart(2, '0');
      days.push({
        day: i,
        isCurrentMonth: false,
        dateString: `${y}-${m}-${d}`,
      });
    }

    return days;
  }, [pickerDate]);

  const handleAddExerciseRow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (availableExercises.length === 0) {
      showDialog({
        title: 'No Exercises',
        message: 'Create at least one exercise before logging a workout entry.',
      });
      return;
    }

    setSessionExercises((current) => [
      ...current,
      {
        exercise_id: availableExercises[0].id,
        sets: '3',
        reps: '10',
        weight: '',
        isBodyweight: false,
        isTime: false,
      },
    ]);
  };

  const handleRemoveExerciseRow = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sessionExercises.length === 1) {
      showDialog({
        title: 'Required',
        message: 'A session must have at least one logged exercise.',
      });
      return;
    }

    setSessionExercises((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleUpdateExerciseRow = (index: number, field: string | Record<string, any>, value?: any) => {
    setSessionExercises((current) => {
      const updated = [...current];
      if (!updated[index]) {
        return current;
      }

      if (typeof field === 'string') {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      } else {
        updated[index] = {
          ...updated[index],
          ...field,
        };
      }
      return updated;
    });
  };

  const handleSaveSession = async () => {
    if (!parseDateKey(sessionDate.trim())) {
      showDialog({
        title: 'Required',
        message: 'Please select a valid workout date.',
      });
      return;
    }

    if (sessionExercises.length === 0) {
      showDialog({
        title: 'Required',
        message: 'Please add at least one workout entry.',
      });
      return;
    }

    if (sessionExercises.some((exercise) => !exercise.exercise_id)) {
      showDialog({
        title: 'Required',
        message: 'Please make sure all rows have an exercise selected.',
      });
      return;
    }

    const dbExercises: Omit<SessionExercise, 'order'>[] = sessionExercises.map((exercise) => {
      const parsedSets = parseInt(exercise.sets.trim(), 10);
      const parsedReps = parseInt(exercise.reps.trim(), 10);
      const setsVal = Number.isNaN(parsedSets) ? null : parsedSets;
      const repsVal = Number.isNaN(parsedReps) ? null : parsedReps;

      let weightVal: number | null = null;
      if (!exercise.isBodyweight && exercise.weight.trim() !== '') {
        const parsedWeight = parseFloat(exercise.weight.trim());
        weightVal = Number.isNaN(parsedWeight) ? null : parsedWeight;
      }

      return {
        exercise_id: exercise.exercise_id,
        sets: setsVal,
        reps: repsVal,
        weight: weightVal,
        is_time: exercise.isTime ? 1 : 0,
      };
    });

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isEditing) {
        await updateSession(editingId, sessionDate.trim(), sessionNotes.trim(), dbExercises);
      } else {
        await addSession(sessionDate.trim(), sessionNotes.trim(), dbExercises);
      }
      router.back();
    } catch (error: any) {
      showDialog({
        title: 'Error',
        message: error.message || 'Failed to save session.',
      });
    }
  };

  const handleSelectPickerDate = (dateStr: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionDate(dateStr);
    setDatePickerOpen(false);
  };

  const handlePrevPickerMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextPickerMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8fafc] dark:bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-[#475569] dark:text-text-secondary-dark font-medium text-base mt-4">
          Loading Workout Form...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#f8fafc] dark:bg-[#050510]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="px-5 py-4 flex-row items-center gap-4 border-b border-[#e2e8f0] dark:border-borderColor-dark/40">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-11 h-11 rounded-2xl bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark items-center justify-center"
          >
            <ArrowLeft color="#94a3b8" size={22} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[#0f172a] dark:text-text-primary-dark font-extrabold text-xl">
              {isEditing ? 'Edit Workout Session' : 'Record Workout'}
            </Text>
            <Text className="text-[#475569] dark:text-text-secondary-dark text-sm mt-0.5">
              Log exercises, sets, reps, time, and load.
            </Text>
          </View>
          <View className="w-11 h-11 rounded-2xl bg-brand-900/40 border border-brand-500/30 items-center justify-center">
            <ClipboardList color="#a78bfa" size={21} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 36,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-4 flex-col">
            <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-5 gap-4 flex-col shadow-md">
              <View className="gap-1.5 flex-col">
                <Text className="text-sm font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">
                  Workout Date *
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDatePickerOpen((current) => !current);
                  }}
                  className="bg-[#f8fafc] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl flex-row items-center justify-between px-5 py-3.5"
                >
                  <Text className="text-[#0f172a] dark:text-text-primary-dark text-base font-semibold flex-1">
                    {formatDateLabel(sessionDate)}
                  </Text>
                  <Calendar color="#94a3b8" size={20} />
                </TouchableOpacity>
              </View>

              {datePickerOpen && (
                <View className="bg-[#f8fafc] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-5 shadow-lg gap-4 flex-col mt-1">
                  <View className="flex-row justify-between items-center mb-2">
                    <TouchableOpacity onPress={handlePrevPickerMonth} className="p-2 bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-2xl">
                      <ChevronLeft color="#94a3b8" size={18} />
                    </TouchableOpacity>
                    <Text className="text-[#0f172a] dark:text-text-primary-dark font-extrabold text-sm uppercase tracking-wider">
                      {monthNames[pickerDate.getMonth()]} {pickerDate.getFullYear()}
                    </Text>
                    <TouchableOpacity onPress={handleNextPickerMonth} className="p-2 bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-2xl">
                      <ChevronRight color="#94a3b8" size={18} />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row justify-between mb-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <Text key={idx} className="text-center text-xs font-bold text-[#475569] dark:text-text-secondary-dark w-[13.5%]">
                        {day}
                      </Text>
                    ))}
                  </View>

                  <View className="flex-row flex-wrap justify-between">
                    {pickerDays.map((day, idx) => {
                      const isSelected = day.dateString === sessionDate;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => handleSelectPickerDate(day.dateString)}
                          className={`
                            w-[13.5%] aspect-square flex items-center justify-center rounded-xl mb-1.5 border
                            ${!day.isCurrentMonth ? 'border-transparent opacity-20' : 'border-[#e2e8f0] dark:border-borderColor-dark/10'}
                            ${isSelected
                              ? 'bg-brand-500 border-brand-600 shadow-md shadow-brand-500/30'
                              : 'bg-white dark:bg-surface-dark border-[#e2e8f0] dark:border-borderColor-dark/30'}
                          `}
                        >
                          <Text
                            className={`
                              text-xs font-bold
                              ${isSelected ? 'text-white' : day.isCurrentMonth ? 'text-[#0f172a] dark:text-text-primary-dark' : 'text-[#475569] dark:text-text-secondary-dark'}
                            `}
                          >
                            {day.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View className="gap-1.5 flex-col">
                <Text className="text-sm font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">
                  Workout Notes
                </Text>
                <TextInput
                  value={sessionNotes}
                  onChangeText={setSessionNotes}
                  placeholder="e.g. Smashed Bench Press PR! Felt amazing today."
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="bg-[#f8fafc] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl px-5 py-3.5 text-[#0f172a] dark:text-text-primary-dark text-base min-h-[92px]"
                />
              </View>
            </View>

            <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-5 shadow-md">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-sm font-bold text-[#0f172a] dark:text-text-primary-dark uppercase tracking-wider">
                  Logged Exercises ({sessionExercises.length})
                </Text>
                <TouchableOpacity
                  onPress={handleAddExerciseRow}
                  className="bg-brand-900/40 border border-brand-500/30 px-3.5 py-2 rounded-3xl flex-row items-center gap-1"
                >
                  <Plus color="#a78bfa" size={16} />
                  <Text className="text-brand-400 font-bold text-xs uppercase tracking-wider">
                    Add Entry
                  </Text>
                </TouchableOpacity>
              </View>

              {availableExercises.length === 0 ? (
                <View className="py-8 justify-center items-center">
                  <ClipboardList color="#475569" size={42} />
                  <Text className="text-[#0f172a] dark:text-text-primary-dark font-semibold text-base mt-3">
                    No Exercises Available
                  </Text>
                  <Text className="text-[#475569] dark:text-text-secondary-dark text-sm text-center mt-1">
                    Add an exercise from the Exercises tab before recording a workout.
                  </Text>
                </View>
              ) : (
                <View>
                  {sessionExercises.map((exercise, index) => (
                    <ExerciseRow
                      key={index}
                      index={index}
                      availableExercises={availableExercises}
                      selectedExerciseId={exercise.exercise_id}
                      sets={exercise.sets}
                      reps={exercise.reps}
                      weight={exercise.weight}
                      isBodyweight={exercise.isBodyweight}
                      isTime={exercise.isTime}
                      onUpdate={(field, val) => handleUpdateExerciseRow(index, field, val)}
                      onRemove={() => handleRemoveExerciseRow(index)}
                    />
                  ))}
                </View>
              )}

              <TouchableOpacity onPress={handleSaveSession} className="mt-4 shadow-lg shadow-brand-500/20">
                <LinearGradient
                  colors={['#8b5cf6', '#06b6d4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="py-4 rounded-2xl items-center justify-center"
                >
                  <Text className="text-white font-bold text-base">Save Workout Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
