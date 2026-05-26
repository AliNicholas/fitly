import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, Edit2, Trash2, Calendar, ClipboardList } from 'lucide-react-native';
import { getSessions, addSession, updateSession, deleteSession, Session, SessionExercise } from '../../db/sessions';
import { getExercises, Exercise } from '../../db/exercises';
import { ExerciseRow } from '../../components/ExerciseRow';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import * as Haptics from 'expo-haptics';

export default function SessionsScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionDate, setSessionDate] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionExercises, setSessionExercises] = useState<
    { exercise_id: number; sets: string; reps: string; weight: string; isBodyweight: boolean }[]
  >([]);

  const loadData = useCallback(async () => {
    try {
      const sessData = await getSessions();
      const exData = await getExercises();
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
      Alert.alert(
        'No Exercises',
        'You must create at least one exercise in the Exercises tab before logging a session!'
      );
      return;
    }
    setEditingSession(null);
    setSessionDate(getTodayDateString());
    setSessionNotes('');
    setSessionExercises([
      { exercise_id: availableExercises[0].id, sets: '3', reps: '10', weight: '', isBodyweight: false },
    ]);
    setModalVisible(true);
  };

  const handleEditSessionPress = (sess: Session) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingSession(sess);
    setSessionDate(sess.date);
    setSessionNotes(sess.notes || '');

    // Map database session_exercises to our form structure
    const formExercises = sess.exercises.map((se) => ({
      exercise_id: se.exercise_id,
      sets: se.sets != null ? se.sets.toString() : '',
      reps: se.reps != null ? se.reps.toString() : '',
      weight: se.weight != null ? se.weight.toString() : '',
      isBodyweight: se.weight === null || se.weight === 0, // 0 or null represents Bodyweight (BW)
    }));

    setSessionExercises(formExercises);
    setModalVisible(true);
  };

  const handleAddExerciseRow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionExercises([
      ...sessionExercises,
      { exercise_id: availableExercises[0]?.id || 0, sets: '3', reps: '10', weight: '', isBodyweight: false },
    ]);
  };

  const handleRemoveExerciseRow = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sessionExercises.length === 1) {
      Alert.alert('Required', 'A session must have at least one logged exercise.');
      return;
    }
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
      Alert.alert('Required', 'Please enter a date in YYYY-MM-DD format.');
      return;
    }

    if (sessionExercises.some((ex) => !ex.exercise_id)) {
      Alert.alert('Required', 'Please make sure all rows have an exercise selected.');
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
      Alert.alert('Error', e.message || 'Failed to save session.');
    }
  };

  const handleDeleteSession = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this workout log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSession(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete session');
          }
        },
      },
    ]);
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

  if (loading) {
    return (
      <View className="flex-1 bg-[#020617] justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-[#94a3b8] font-medium mt-4">Opening Workout Vault...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#020617]">
      {/* Sessions Feed */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {sessions.length > 0 ? (
          sessions.map((sess) => (
            <View
              key={sess.id}
              className="bg-surface-dark border border-borderColor-dark/40 rounded-2xl p-4 mb-4 shadow-sm space-y-3"
            >
              {/* Card Header */}
              <View className="flex-row justify-between items-start">
                <View className="flex-row items-center space-x-2 flex-1 mr-3">
                  <Calendar color="#3b82f6" size={16} />
                  <Text className="text-text-primary-dark font-bold text-sm">
                    {formatDateLabel(sess.date)}
                  </Text>
                </View>

                {/* Actions */}
                <View className="flex-row space-x-2.5">
                  <TouchableOpacity
                    onPress={() => handleEditSessionPress(sess)}
                    className="p-1.5 bg-surface-light-dark border border-borderColor-dark/40 rounded-xl"
                  >
                    <Edit2 color="#94a3b8" size={12} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSession(sess.id)}
                    className="p-1.5 bg-red-950/10 border border-red-500/20 rounded-xl"
                  >
                    <Trash2 color="#f87171" size={12} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notes */}
              {sess.notes ? (
                <View className="bg-surface-light-dark/30 rounded-xl p-3 border border-borderColor-dark/10">
                  <Text className="text-text-secondary-dark text-xs italic leading-4">{sess.notes}</Text>
                </View>
              ) : null}

              {/* Exercises in Session */}
              <View className="border-t border-borderColor-dark/20 pt-2 space-y-2">
                {sess.exercises.map((se, i) => (
                  <View key={se.id || i} className="flex-row justify-between items-center py-1">
                    <View className="flex-1 mr-3">
                      <Text className="text-text-primary-dark font-medium text-xs">
                        {i + 1}. {se.name}
                      </Text>
                      {se.category_name && (
                        <Text className="text-text-secondary-dark text-[9px] uppercase font-bold tracking-wider mt-0.5">
                          {se.category_name}
                        </Text>
                      )}
                    </View>
                    <Text className="text-brand-400 font-bold text-xs text-right">
                      {se.sets} sets × {se.reps} reps @ {se.weight != null && se.weight > 0 ? `${se.weight} kg` : 'BW'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View className="py-24 justify-center items-center">
            <ClipboardList color="#475569" size={40} />
            <Text className="text-text-primary-dark font-semibold mt-3">No Workouts Logged Yet</Text>
            <Text className="text-text-secondary-dark text-xs text-center mt-1">
              Tap the floating button below to record your first session!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Session Button */}
      <TouchableOpacity
        onPress={handleAddSessionPress}
        className="absolute bottom-6 right-6 bg-brand-500 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30"
      >
        <Plus color="#ffffff" size={24} />
      </TouchableOpacity>

      {/* Bottom Sheet Modal: Session Entry Form */}
      <BottomSheetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editingSession ? 'Edit Workout Session' : 'Record Workout'}
      >
        <View className="space-y-4">
          {/* Date */}
          <View className="space-y-1">
            <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">
              Workout Date (YYYY-MM-DD) *
            </Text>
            <TextInput
              value={sessionDate}
              onChangeText={setSessionDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#475569"
              className="bg-surface-dark border border-borderColor-dark rounded-xl px-4 py-3 text-text-primary-dark text-sm"
            />
          </View>

          {/* Notes */}
          <View className="space-y-1">
            <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">
              Workout Notes
            </Text>
            <TextInput
              value={sessionNotes}
              onChangeText={setSessionNotes}
              placeholder="e.g. Smashed Bench Press PR! Felt amazing today."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={2}
              className="bg-surface-dark border border-borderColor-dark rounded-xl px-4 py-3 text-text-primary-dark text-sm min-h-[60px]"
            />
          </View>

          {/* Exercises Header */}
          <View className="flex-row justify-between items-center pt-2 border-t border-borderColor-dark/20 mt-2">
            <Text className="text-xs font-bold text-text-primary-dark uppercase tracking-wider">
              Logged Exercises ({sessionExercises.length})
            </Text>
            <TouchableOpacity
              onPress={handleAddExerciseRow}
              className="bg-brand-900/30 border border-brand-500/20 px-3 py-1.5 rounded-lg flex-row items-center space-x-1"
            >
              <Plus color="#60a5fa" size={12} />
              <Text className="text-brand-400 font-bold text-[10px] uppercase tracking-wider">
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
                onUpdate={(field, val) => handleUpdateExerciseRow(i, field, val)}
                onRemove={() => handleRemoveExerciseRow(i)}
              />
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSaveSession}
            className="bg-brand-500 py-3.5 rounded-xl flex items-center justify-center mt-6 shadow shadow-brand-500/10"
          >
            <Text className="text-white font-bold text-sm">Save Workout Session</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    </View>
  );
}
