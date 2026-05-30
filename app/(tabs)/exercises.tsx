import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Plus, Edit2, Trash2, ExternalLink, Dumbbell, FolderClosed, ChevronDown } from 'lucide-react-native';
import { getExercises, addExercise, updateExercise, deleteExercise, Exercise } from '../../db/exercises';
import { getCategories, addCategory, updateCategory, deleteCategory, Category } from '../../db/categories';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCustomDialog } from '../../components/CustomDialog';
import { getStableTutorialLink } from '../../utils/tutorialLinks';

export default function ExercisesScreen() {
  const insets = useSafeAreaInsets();
  const { showDialog } = useCustomDialog();
  const [activeTab, setActiveTab] = useState<'exercises' | 'categories'>('exercises');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals visibility
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Form states
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseCategoryId, setExerciseCategoryId] = useState<number>(0);
  const [exerciseLink, setExerciseLink] = useState('');

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const loadData = useCallback(async () => {
    try {
      const exData = await getExercises();
      const catData = await getCategories();
      setExercises(exData);
      setCategories(catData);
      setLoading(false);
    } catch (e) {
      console.error('Failed to load exercises/categories:', e);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOpenExerciseLink = async (exercise: Exercise) => {
    if (!exercise.link) return;

    const url = getStableTutorialLink(exercise.name, exercise.link);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showDialog({
          title: 'Error',
          message: "Can't open this link. Please verify it is a valid URL."
        });
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  // CRUD — Exercises
  const handleAddExercisePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingExercise(null);
    setExerciseName('');
    setExerciseCategoryId(categories[0]?.id || 0);
    setExerciseLink('');
    setCategoryDropdownOpen(false);
    setExerciseModalVisible(true);
  };

  const handleEditExercisePress = (ex: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingExercise(ex);
    setExerciseName(ex.name);
    setExerciseCategoryId(ex.category_id);
    setExerciseLink(ex.link || '');
    setCategoryDropdownOpen(false);
    setExerciseModalVisible(true);
  };

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) {
      showDialog({
        title: 'Required',
        message: 'Please enter an exercise name.'
      });
      return;
    }
    if (!exerciseCategoryId) {
      showDialog({
        title: 'Required',
        message: 'Please select a category.'
      });
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (editingExercise) {
        await updateExercise(
          editingExercise.id,
          exerciseName,
          exerciseCategoryId,
          null, // omit description
          exerciseLink
        );
      } else {
        await addExercise(exerciseName, exerciseCategoryId, null, exerciseLink);
      }
      setExerciseModalVisible(false);
      loadData();
    } catch (error: any) {
      showDialog({
        title: 'Error',
        message: error.message || 'Failed to save exercise.'
      });
    }
  };

  const handleDeleteExercise = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showDialog({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this exercise?',
      showCancel: true,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteExercise(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        } catch (e: any) {
          showDialog({
            title: 'Error',
            message: e.message || 'Failed to delete exercise'
          });
        }
      }
    });
  };

  // CRUD — Categories
  const handleAddCategoryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryModalVisible(true);
  };

  const handleEditCategoryPress = (cat: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      showDialog({
        title: 'Required',
        message: 'Please enter a category name.'
      });
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryName);
      } else {
        await addCategory(categoryName);
      }
      setCategoryModalVisible(false);
      loadData();
    } catch (error: any) {
      showDialog({
        title: 'Error',
        message: error.message || 'Failed to save category.'
      });
    }
  };

  const handleDeleteCategoryPress = (cat: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showDialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete category "${cat.name}"?`,
      showCancel: true,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: () => performDeleteCategory(cat.id, false)
    });
  };

  const performDeleteCategory = async (id: number, force: boolean) => {
    try {
      const res = await deleteCategory(id, force);
      if (res.warning) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showDialog({
          title: 'Warning',
          message: res.message || 'This category has exercises associated with it.',
          showCancel: true,
          confirmText: 'Delete Cascade',
          isDestructive: true,
          onConfirm: () => performDeleteCategory(id, true)
        });
      } else if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
      }
    } catch (e: any) {
      showDialog({
        title: 'Error',
        message: e.message || 'Failed to delete category'
      });
    }
  };

  // Group Exercises by Category
  const groupedExercises = categories.map((cat) => {
    return {
      category: cat,
      exercises: exercises.filter((ex) => ex.category_id === cat.id),
    };
  }).filter((group) => group.exercises.length > 0 || activeTab === 'categories');

  if (loading) {
    return (
      <View className="flex-1 bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-text-secondary-dark font-medium text-base mt-4">Opening Exercise Vault...</Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#050510]">

      {/* Sub tabs Selector */}
      <View className="flex-row mx-5 my-5 p-1.5 bg-surface-dark border border-borderColor-dark rounded-3xl">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('exercises');
          }}
          style={{
            backgroundColor: activeTab === 'exercises' ? '#1a1a38' : 'transparent',
            borderColor: activeTab === 'exercises' ? '#2a2a4a' : 'transparent',
            borderWidth: 1,
          }}
          className="flex-1 py-2.5 rounded-2xl flex-row items-center justify-center gap-2"
        >
          <Dumbbell color={activeTab === 'exercises' ? '#8b5cf6' : '#94a3b8'} size={20} />
          <Text
            className={`font-semibold text-sm ${
              activeTab === 'exercises' ? 'text-white' : 'text-text-secondary-dark'
            }`}
          >
            Exercises ({exercises.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('categories');
          }}
          style={{
            backgroundColor: activeTab === 'categories' ? '#1a1a38' : 'transparent',
            borderColor: activeTab === 'categories' ? '#2a2a4a' : 'transparent',
            borderWidth: 1,
          }}
          className="flex-1 py-2.5 rounded-2xl flex-row items-center justify-center gap-2"
        >
          <FolderClosed color={activeTab === 'categories' ? '#8b5cf6' : '#94a3b8'} size={20} />
          <Text
            className={`font-semibold text-sm ${
              activeTab === 'categories' ? 'text-white' : 'text-text-secondary-dark'
            }`}
          >
            Categories ({categories.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'exercises' ? (
          // Exercises Tab
          <View key="exercises-tab-container">
            {groupedExercises.length > 0 ? (
              groupedExercises.map((group) => (
                <View key={group.category.id} className="mb-6">
                  {/* Category Header */}
                  <View className="flex-row items-center justify-between pb-2 border-b border-borderColor-dark/20 mb-3">
                    <Text className="text-brand-400 font-extrabold text-base uppercase tracking-wider">
                      {group.category.name}
                    </Text>
                    <Text className="text-text-secondary-dark text-xs font-bold">
                      {group.exercises.length} {group.exercises.length === 1 ? 'exercise' : 'exercises'}
                    </Text>
                  </View>

                  {/* Exercises Cards */}
                  <View className="gap-3 flex-col">
                    {group.exercises.map((ex) => (
                      <View
                        key={ex.id}
                        className="bg-surface-dark border border-borderColor-dark/30 rounded-3xl p-5 shadow-md"
                      >
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1 mr-3">
                            <Text className="text-text-primary-dark font-bold text-base">
                              {ex.name}
                            </Text>
                            {ex.link && (
                              <TouchableOpacity
                                onPress={() => handleOpenExerciseLink(ex)}
                                className="flex-row items-center gap-1 mt-2.5 bg-brand-900/10 border border-brand-500/10 self-start px-2.5 py-1 rounded-lg"
                              >
                                <ExternalLink color="#a78bfa" size={14} />
                                <Text className="text-brand-400 font-semibold text-xs">
                                  Tutorial Guide
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Actions */}
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() => handleEditExercisePress(ex)}
                              className="p-2.5 bg-surface-light-dark border border-borderColor-dark rounded-2xl"
                            >
                              <Edit2 color="#94a3b8" size={16} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteExercise(ex.id)}
                              className="p-2.5 bg-red-950/10 border border-red-500/20 rounded-2xl"
                            >
                              <Trash2 color="#f87171" size={16} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <View className="py-24 justify-center items-center">
                <Dumbbell color="#475569" size={48} />
                <Text className="text-text-primary-dark font-semibold text-base mt-3">No Exercises Logged Yet</Text>
                <Text className="text-text-secondary-dark text-sm text-center mt-1">
                  Tap the floating button below to create your very first exercise!
                </Text>
              </View>
            )}
          </View>
        ) : (
          // Categories Tab
          <View key="categories-tab-container" className="gap-3 flex-col">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <View
                  key={cat.id}
                  className="bg-surface-dark border border-borderColor-dark/30 rounded-3xl p-5 flex-row items-center justify-between shadow-md"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-3 h-3 rounded-full bg-brand-500" />
                    <View>
                      <Text className="text-text-primary-dark font-bold text-base">
                        {cat.name}
                      </Text>
                      <Text className="text-text-secondary-dark text-sm mt-0.5">
                        {cat.exercise_count || 0} {cat.exercise_count === 1 ? 'exercise' : 'exercises'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleEditCategoryPress(cat)}
                      className="p-2.5 bg-surface-light-dark border border-borderColor-dark rounded-2xl"
                    >
                      <Edit2 color="#94a3b8" size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCategoryPress(cat)}
                      className="p-2.5 bg-red-950/10 border border-red-500/20 rounded-2xl"
                    >
                      <Trash2 color="#f87171" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View className="py-24 justify-center items-center">
                <FolderClosed color="#475569" size={48} />
                <Text className="text-text-primary-dark font-semibold text-base mt-3">No Categories Found</Text>
                <Text className="text-text-secondary-dark text-sm text-center mt-1">
                  Tap the floating button below to create your very first category!
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB Floating Action Button */}
      <TouchableOpacity
        onPress={activeTab === 'exercises' ? handleAddExercisePress : handleAddCategoryPress}
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

      {/* Bottom Sheet: Exercise Form */}
      <BottomSheetModal
        visible={exerciseModalVisible}
        onClose={() => setExerciseModalVisible(false)}
        title={editingExercise ? 'Edit Exercise' : 'Create Exercise'}
      >
        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-sm font-semibold text-text-secondary-dark uppercase tracking-wider">
              Exercise Name *
            </Text>
            <TextInput
              value={exerciseName}
              onChangeText={setExerciseName}
              placeholder="e.g. Bench Press"
              placeholderTextColor="#475569"
              className="bg-surface-dark border border-borderColor-dark rounded-2xl px-5 py-3.5 text-text-primary-dark text-base"
            />
          </View>

          <View className="gap-1.5 flex-col">
            <Text className="text-sm font-semibold text-text-secondary-dark uppercase tracking-wider">
              Category *
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCategoryDropdownOpen(!categoryDropdownOpen);
              }}
              className="bg-surface-dark border border-borderColor-dark rounded-2xl flex-row items-center justify-between px-5 py-3.5"
            >
              <Text className="text-text-primary-dark text-base font-semibold">
                {categories.find(c => c.id === exerciseCategoryId)?.name || '-- Select Category --'}
              </Text>
              <ChevronDown color="#94a3b8" size={20} style={{ transform: [{ rotate: categoryDropdownOpen ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>
          </View>

          {/* Inline Dropdown for Category Selection */}
          {categoryDropdownOpen && (
            <View className="bg-surface-dark border border-borderColor-dark/50 rounded-2xl p-2 max-h-48 mt-1 shadow-inner shadow-black/40">
              <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                {categories.length === 0 ? (
                  <View className="py-4 items-center justify-center">
                    <Text className="text-text-secondary-dark text-sm text-center">No categories found.</Text>
                    <Text className="text-text-secondary-dark text-xs mt-1 text-center">Create a category first!</Text>
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
                      className={`py-3 px-3 border-b border-borderColor-dark/20 flex-row items-center justify-between ${
                        cat.id === exerciseCategoryId ? 'bg-surface-light-dark/40 rounded-lg' : ''
                      }`}
                    >
                      <Text className={`text-sm ${cat.id === exerciseCategoryId ? 'text-brand-400 font-semibold' : 'text-text-primary-dark font-medium'}`}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}



          <View className="gap-1">
            <Text className="text-sm font-semibold text-text-secondary-dark uppercase tracking-wider">
              Tutorial Link / URL
            </Text>
            <TextInput
              value={exerciseLink}
              onChangeText={setExerciseLink}
              placeholder="e.g. https://youtube.com/..."
              placeholderTextColor="#475569"
              autoCapitalize="none"
              keyboardType="url"
              className="bg-surface-dark border border-borderColor-dark rounded-2xl px-5 py-3.5 text-text-primary-dark text-base"
            />
          </View>

          <TouchableOpacity
            onPress={handleSaveExercise}
            className="mt-4 shadow-lg shadow-brand-500/20"
          >
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
      </BottomSheetModal>

      {/* Bottom Sheet: Category Form */}
      <BottomSheetModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
      >
        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-sm font-semibold text-text-secondary-dark uppercase tracking-wider">
              Category Name *
            </Text>
            <TextInput
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="e.g. Legs"
              placeholderTextColor="#475569"
              className="bg-surface-dark border border-borderColor-dark rounded-2xl px-5 py-3.5 text-text-primary-dark text-base"
            />
          </View>

          <TouchableOpacity
            onPress={handleSaveCategory}
            className="mt-4 shadow-lg shadow-brand-500/20"
          >
            <LinearGradient
              colors={['#8b5cf6', '#06b6d4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-4 rounded-2xl items-center justify-center"
            >
              <Text className="text-white font-bold text-base">Save Category</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    </View>
  );
}
