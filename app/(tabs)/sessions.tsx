import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Plus, Edit2, Trash2, Calendar, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getSessions, addSession, updateSession, deleteSession, Session, SessionExercise } from '../../db/sessions';
import { getExercises, Exercise } from '../../db/exercises';
import { ExerciseRow } from '../../components/ExerciseRow';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCustomDialog } from '../../components/CustomDialog';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !((global as any)?.FabricUIManager)) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const { showDialog } = useCustomDialog();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionDate, setSessionDate] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionExercises, setSessionExercises] = useState<
    { exercise_id: number; sets: string; reps: string; weight: string; isBodyweight: boolean; isTime: boolean }[]
  >([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const loadData = useCallback(async () => {
    try {
      const sessData = await getSessions();
      const exData = await getExercises();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSessions(sessData);
      setAvailableExercises(exData);
      setLoading(false);
    } catch (e) {
      console.error('Failed to load sessions data:', e);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleAddSessionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (availableExercises.length === 0) {
      showDialog({
        title: 'No Exercises',
        message: 'You must create at least one exercise in the Exercises tab before logging a session!'
      });
      return;
    }
    setEditingSession(null);
    const initialDate = getTodayDateString();
    setSessionDate(initialDate);
    
    // Sync picker date
    const d = new Date(initialDate);
    d.setDate(1);
    setPickerDate(d);
    setDatePickerOpen(false);

    setSessionNotes('');
    setSessionExercises([
      { exercise_id: availableExercises[0].id, sets: '3', reps: '10', weight: '', isBodyweight: false, isTime: false },
    ]);
    setModalVisible(true);
  };

  const handleEditSessionPress = (sess: Session) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingSession(sess);
    setSessionDate(sess.date);
    
    // Sync picker date
    const d = new Date(sess.date);
    d.setDate(1);
    setPickerDate(d);
    setDatePickerOpen(false);

    setSessionNotes(sess.notes || '');

    // Map database session_exercises to our form structure
    const formExercises = sess.exercises.map((se) => ({
      exercise_id: se.exercise_id,
      sets: se.sets != null ? se.sets.toString() : '',
      reps: se.reps != null ? se.reps.toString() : '',
      weight: se.weight != null ? se.weight.toString() : '',
      isBodyweight: se.weight === null || se.weight === 0, // 0 or null represents Bodyweight (BW)
      isTime: se.is_time === 1,
    }));

    setSessionExercises(formExercises);
    setModalVisible(true);
  };

  const handleAddExerciseRow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setSessionExercises([
      ...sessionExercises,
      { exercise_id: availableExercises[0]?.id || 0, sets: '3', reps: '10', weight: '', isBodyweight: false, isTime: false },
    ]);
  };

  const handleRemoveExerciseRow = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sessionExercises.length === 1) {
      showDialog({
        title: 'Required',
        message: 'A session must have at least one logged exercise.'
      });
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    const updated = [...sessionExercises];
    updated.splice(index, 1);
    setSessionExercises(updated);
  };

  const handleUpdateExerciseRow = (index: number, field: string, value: any) => {
    const updated = [...sessionExercises];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setSessionExercises(updated);
  };

  const handleSaveSession = async () => {
    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!sessionDate.trim() || !dateRegex.test(sessionDate.trim())) {
      showDialog({
        title: 'Required',
        message: 'Please enter a date in YYYY-MM-DD format.'
      });
      return;
    }

    if (sessionExercises.some((ex) => !ex.exercise_id)) {
      showDialog({
        title: 'Required',
        message: 'Please make sure all rows have an exercise selected.'
      });
      return;
    }

    // Map our form data back to Omit<SessionExercise, 'order'>
    const dbExercises: Omit<SessionExercise, 'order'>[] = sessionExercises.map((ex) => {
      const parsedSets = parseInt(ex.sets.trim(), 10);
      const setsVal = !isNaN(parsedSets) ? parsedSets : null;

      const parsedReps = parseInt(ex.reps.trim(), 10);
      const repsVal = !isNaN(parsedReps) ? parsedReps : null;

      // Body weight calculation
      let weightVal: number | null = null;
      if (!ex.isBodyweight && ex.weight.trim() !== '') {
        const parsedWeight = parseFloat(ex.weight.trim());
        weightVal = !isNaN(parsedWeight) ? parsedWeight : null;
      }

      return {
        exercise_id: ex.exercise_id,
        sets: setsVal,
        reps: repsVal,
        weight: weightVal,
        is_time: ex.isTime ? 1 : 0,
      };
    });

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (editingSession) {
        await updateSession(editingSession.id, sessionDate.trim(), sessionNotes.trim(), dbExercises);
      } else {
        await addSession(sessionDate.trim(), sessionNotes.trim(), dbExercises);
      }
      setModalVisible(false);
      loadData();
    } catch (e: any) {
      showDialog({
        title: 'Error',
        message: e.message || 'Failed to save session.'
      });
    }
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
        } catch (e: any) {
          showDialog({
            title: 'Error',
            message: e.message || 'Failed to delete session'
          });
        }
      }
    });
  };

  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const date = new Date(parseInt(year, 10), month, parseInt(day, 10));
      return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    return dateStr;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const pickerDays = React.useMemo(() => {
    const year = pickerDate.getFullYear();
    const month = pickerDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0-6

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Pad previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(prevDate.getDate()).padStart(2, '0');
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateString: `${y}-${m}-${d}`
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const m = String(month + 1).padStart(2, '0');
      const d = String(i).padStart(2, '0');
      days.push({
        day: i,
        isCurrentMonth: true,
        dateString: `${year}-${m}-${d}`
      });
    }

    // Pad next month
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(nextDate.getDate()).padStart(2, '0');
      days.push({
        day: i,
        isCurrentMonth: false,
        dateString: `${y}-${m}-${d}`
      });
    }

    return days;
  }, [pickerDate]);

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
      <View className="flex-1 bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-text-secondary-dark font-medium text-base mt-4">Opening Workout Vault...</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#050510]">
      {/* Sessions Feed */}
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {sessions.length > 0 ? (
          sessions.map((sess) => (
            <View
              key={sess.id}
              className="bg-surface-dark border border-borderColor-dark/40 rounded-3xl p-5 mb-5 shadow-md gap-4 flex-col"
            >
              {/* Card Header */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3 flex-1 mr-3">
                  <View className="p-3 bg-brand-900/40 border border-brand-500/30 rounded-3xl">
                    <Calendar color="#8b5cf6" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-primary-dark font-bold text-base" numberOfLines={1}>
                      {formatDateLabel(sess.date)}
                    </Text>
                    {sess.notes ? (
                      <Text className="text-text-secondary-dark text-sm mt-0.5" numberOfLines={1}>
                        {sess.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    onPress={() => handleEditSessionPress(sess)}
                    className="p-2 bg-surface-light-dark border border-borderColor-dark/40 rounded-2xl"
                  >
                    <Edit2 color="#94a3b8" size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSession(sess.id)}
                    className="p-2 bg-red-950/10 border border-red-500/20 rounded-2xl"
                  >
                    <Trash2 color="#f87171" size={16} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notes */}
              {sess.notes ? (
                <View className="bg-surface-light-dark/30 rounded-3xl p-4 border border-borderColor-dark/10">
                  <Text className="text-text-secondary-dark text-sm italic leading-5">{sess.notes}</Text>
                </View>
              ) : null}

              {/* Exercises List inside the card */}
              <View className="border-t border-borderColor-dark/20 pt-3 gap-2.5 flex-col">
                {sess.exercises.map((se, i) => (
                  <View key={se.id || i} className="flex-row justify-between items-center py-1.5">
                    <View className="flex-1 mr-3">
                      <Text className="text-text-primary-dark font-semibold text-sm">
                        {i + 1}. {se.name}
                      </Text>
                      {se.category_name && (
                        <Text className="text-text-secondary-dark text-xs uppercase font-bold tracking-wider mt-0.5">
                          {se.category_name}
                        </Text>
                      )}
                    </View>
                    <Text className="text-brand-400 font-bold text-sm text-right">
                      {se.sets} sets × {se.reps}{se.is_time === 1 ? 's' : ' reps'} @ {se.weight != null && se.weight > 0 ? `${se.weight} kg` : 'BW'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View className="py-28 justify-center items-center">
            <ClipboardList color="#475569" size={48} />
            <Text className="text-text-primary-dark font-semibold text-base mt-3">No Workouts Logged Yet</Text>
            <Text className="text-text-secondary-dark text-sm text-center mt-1">
              Tap the floating button below to record your first session!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Session Button */}
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

      {/* Bottom Sheet Modal: Session Entry Form */}
      <BottomSheetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingSession ? 'Edit Workout Session' : 'Record Workout'}
      >
        <View className="gap-4 flex-col">

          {/* Date Picker Button */}
          <View className="gap-1.5 flex-col">
            <Text className="text-sm font-semibold text-text-secondary-dark uppercase tracking-wider">
              Workout Date *
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setDatePickerOpen(!datePickerOpen);
              }}
              className="bg-surface-dark border border-borderColor-dark rounded-2xl flex-row items-center justify-between px-5 py-3.5"
            >
              <Text className="text-text-primary-dark text-base font-semibold">
                {formatDateLabel(sessionDate)}
              </Text>
              <Calendar color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>

          {/* Collapsible Calendar Date Picker Drawer */}
          {datePickerOpen && (
            <View className="bg-surface-dark border border-borderColor-dark/40 rounded-3xl p-5 shadow-lg gap-4 flex-col mt-1">
              {/* Header Month Navigation */}
              <View className="flex-row justify-between items-center mb-2">
                <TouchableOpacity onPress={handlePrevPickerMonth} className="p-2 bg-surface-light-dark border border-borderColor-dark/40 rounded-2xl">
                  <ChevronLeft color="#94a3b8" size={18} />
                </TouchableOpacity>
                <Text className="text-text-primary-dark font-extrabold text-sm uppercase tracking-wider">
                  {monthNames[pickerDate.getMonth()]} {pickerDate.getFullYear()}
                </Text>
                <TouchableOpacity onPress={handleNextPickerMonth} className="p-2 bg-surface-light-dark border border-borderColor-dark/40 rounded-2xl">
                  <ChevronRight color="#94a3b8" size={18} />
                </TouchableOpacity>
              </View>

              {/* Grid Header */}
              <View className="flex-row justify-between mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <Text key={idx} className="text-center text-xs font-bold text-text-secondary-dark w-[13.5%]">
                    {day}
                  </Text>
                ))}
              </View>

              {/* Grid Days */}
              <View className="flex-row flex-wrap justify-between">
                {pickerDays.map((day, idx) => {
                  const isSelected = day.dateString === sessionDate;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleSelectPickerDate(day.dateString)}
                      className={`
                        w-[13.5%] aspect-square flex items-center justify-center rounded-xl mb-1.5 border
                        ${!day.isCurrentMonth ? 'border-transparent opacity-20' : 'border-borderColor-dark/10'}
                        ${isSelected
                          ? 'bg-brand-500 border-brand-600 shadow-md shadow-brand-500/30'
                          : 'bg-surface-light-dark border-borderColor-dark/30'}
                      `}
                    >
                      <Text
                        className={`
                          text-xs font-bold
                          ${isSelected ? 'text-white' : day.isCurrentMonth ? 'text-text-primary-dark' : 'text-text-secondary-dark'}
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

          {/* Notes */}
          <View className="gap-1 flex-col">
            <Text className="text-sm font-semibold text-text-secondary-dark uppercase tracking-wider">
              Workout Notes
            </Text>
            <TextInput
              value={sessionNotes}
              onChangeText={setSessionNotes}
              placeholder="e.g. Smashed Bench Press PR! Felt amazing today."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={2}
              className="bg-surface-dark border border-borderColor-dark rounded-2xl px-5 py-3.5 text-text-primary-dark text-base min-h-[70px]"
            />
          </View>

          {/* Exercises Header */}
          <View className="flex-row justify-between items-center pt-2 border-t border-borderColor-dark/20 mt-2">
            <Text className="text-sm font-bold text-text-primary-dark uppercase tracking-wider">
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

          {/* Exercises entry list */}
          <View className="mt-2">
            {sessionExercises.map((se, i) => (
              <ExerciseRow
                key={i}
                index={i}
                availableExercises={availableExercises}
                selectedExerciseId={se.exercise_id}
                sets={se.sets}
                reps={se.reps}
                weight={se.weight}
                isBodyweight={se.isBodyweight}
                isTime={se.isTime}
                onUpdate={(field, val) => handleUpdateExerciseRow(i, field, val)}
                onRemove={() => handleRemoveExerciseRow(i)}
              />
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSaveSession}
            className="mt-6 shadow-lg shadow-brand-500/20"
          >
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
      </BottomSheetModal>
    </View>
  );
}
