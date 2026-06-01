import React, { useCallback, useEffect, useState } from 'react';
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
import { ArrowLeft, ChevronDown, Dumbbell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { addExercise, Exercise, getExercises, updateExercise } from '../db/exercises';
import { Category, getCategories } from '../db/categories';
import { useCustomDialog } from '../components/CustomDialog';

export default function ExerciseFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showDialog } = useCustomDialog();

  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const editingId = idParam ? Number(idParam) : 0;
  const isEditing = Number.isFinite(editingId) && editingId > 0;

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseCategoryId, setExerciseCategoryId] = useState<number>(0);
  const [exerciseLink, setExerciseLink] = useState('');

  const loadFormData = useCallback(async () => {
    try {
      const [catData, exData] = await Promise.all([getCategories(), getExercises()]);
      setCategories(catData);

      if (isEditing) {
        const exercise = exData.find((item: Exercise) => item.id === editingId);
        if (!exercise) {
          showDialog({
            title: 'Not Found',
            message: 'This exercise could not be found.',
          });
          router.back();
          return;
        }

        setExerciseName(exercise.name);
        setExerciseCategoryId(exercise.category_id);
        setExerciseLink(exercise.link || '');
      } else {
        setExerciseName('');
        setExerciseCategoryId(catData[0]?.id || 0);
        setExerciseLink('');
      }
    } catch (error) {
      console.error('Failed to load exercise form data:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to load exercise data.',
      });
    } finally {
      setLoading(false);
    }
  }, [editingId, isEditing, router, showDialog]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) {
      showDialog({
        title: 'Required',
        message: 'Please enter an exercise name.',
      });
      return;
    }

    if (!exerciseCategoryId) {
      showDialog({
        title: 'Required',
        message: 'Please select a category first.',
      });
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isEditing) {
        await updateExercise(editingId, exerciseName, exerciseCategoryId, null, exerciseLink);
      } else {
        await addExercise(exerciseName, exerciseCategoryId, null, exerciseLink);
      }
      router.back();
    } catch (error: any) {
      showDialog({
        title: 'Error',
        message: error.message || 'Failed to save exercise.',
      });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8fafc] dark:bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-[#475569] dark:text-text-secondary-dark font-medium text-base mt-4">
          Loading Exercise Form...
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
              {isEditing ? 'Edit Exercise' : 'Create Exercise'}
            </Text>
            <Text className="text-[#475569] dark:text-text-secondary-dark text-sm mt-0.5">
              Set name, category, and tutorial guide.
            </Text>
          </View>
          <View className="w-11 h-11 rounded-2xl bg-brand-900/40 border border-brand-500/30 items-center justify-center">
            <Dumbbell color="#a78bfa" size={21} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-5 gap-5 flex-col shadow-md">
            <View className="gap-1.5 flex-col">
              <Text className="text-sm font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">
                Exercise Name *
              </Text>
              <TextInput
                value={exerciseName}
                onChangeText={setExerciseName}
                placeholder="e.g. Bench Press"
                placeholderTextColor="#475569"
                className="bg-[#f8fafc] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl px-5 py-3.5 text-[#0f172a] dark:text-text-primary-dark text-base"
              />
            </View>

            <View className="gap-1.5 flex-col">
              <Text className="text-sm font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">
                Category *
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCategoryDropdownOpen((current) => !current);
                }}
                className="bg-[#f8fafc] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl flex-row items-center justify-between px-5 py-3.5"
              >
                <Text className="text-[#0f172a] dark:text-text-primary-dark text-base font-semibold flex-1">
                  {categories.find((cat) => cat.id === exerciseCategoryId)?.name || '-- Select Category --'}
                </Text>
                <ChevronDown
                  color="#94a3b8"
                  size={20}
                  style={{ transform: [{ rotate: categoryDropdownOpen ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>
            </View>

            {categoryDropdownOpen && (
              <View className="bg-[#f8fafc] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark/50 rounded-2xl p-2 max-h-52 shadow-inner shadow-black/30">
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {categories.length === 0 ? (
                    <View className="py-5 items-center justify-center">
                      <Text className="text-[#475569] dark:text-text-secondary-dark text-sm text-center">
                        No categories found.
                      </Text>
                      <Text className="text-[#475569] dark:text-text-secondary-dark text-xs mt-1 text-center">
                        Create a category before adding exercises.
                      </Text>
                    </View>
                  ) : (
                    categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setExerciseCategoryId(cat.id);
                          setCategoryDropdownOpen(false);
                        }}
                        className={`py-3 px-3 border-b border-[#e2e8f0] dark:border-borderColor-dark/20 flex-row items-center justify-between ${
                          cat.id === exerciseCategoryId ? 'bg-white dark:bg-surface-dark rounded-xl' : ''
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            cat.id === exerciseCategoryId
                              ? 'text-brand-400 font-semibold'
                              : 'text-[#0f172a] dark:text-text-primary-dark font-medium'
                          }`}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            )}

            <View className="gap-1.5 flex-col">
              <Text className="text-sm font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">
                Tutorial Link / URL
              </Text>
              <TextInput
                value={exerciseLink}
                onChangeText={setExerciseLink}
                placeholder="e.g. https://youtube.com/..."
                placeholderTextColor="#475569"
                autoCapitalize="none"
                keyboardType="url"
                className="bg-[#f8fafc] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl px-5 py-3.5 text-[#0f172a] dark:text-text-primary-dark text-base"
              />
            </View>

            <TouchableOpacity onPress={handleSaveExercise} className="mt-2 shadow-lg shadow-brand-500/20">
              <LinearGradient
                colors={['#8b5cf6', '#06b6d4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 rounded-2xl items-center justify-center"
              >
                <Text className="text-white font-bold text-base">Save Exercise</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
