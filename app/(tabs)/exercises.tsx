import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dumbbell, Edit2, ExternalLink, FolderClosed, Plus, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { deleteExercise, Exercise, getExercises } from '../../db/exercises';
import { addCategory, Category, deleteCategory, getCategories, updateCategory } from '../../db/categories';
import { useCustomDialog } from '../../components/CustomDialog';
import { getStableTutorialLink } from '../../utils/tutorialLinks';

export default function ExercisesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showDialog } = useCustomDialog();
  const [activeTab, setActiveTab] = useState<'exercises' | 'categories'>('exercises');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [exData, catData] = await Promise.all([getExercises(), getCategories()]);
      setExercises(exData);
      setCategories(catData);
    } catch (error) {
      console.error('Failed to load exercises/categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOpenExerciseLink = async (exercise: Exercise) => {
    if (!exercise.link) {
      return;
    }

    const url = getStableTutorialLink(exercise.name, exercise.link);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showDialog({
          title: 'Error',
          message: "Can't open this link. Please verify it is a valid URL.",
        });
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const handleAddExercisePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/exercise-form' as any);
  };

  const handleEditExercisePress = (exercise: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/exercise-form',
      params: { id: String(exercise.id) },
    } as any);
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
        } catch (error: any) {
          showDialog({
            title: 'Error',
            message: error.message || 'Failed to delete exercise',
          });
        }
      },
    });
  };

  const handleAddCategoryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryModalVisible(true);
  };

  const handleEditCategoryPress = (category: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryModalVisible(true);
  };

  const handleCloseCategoryModal = () => {
    setCategoryModalVisible(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      showDialog({
        title: 'Required',
        message: 'Please enter a category name.',
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
      handleCloseCategoryModal();
      loadData();
    } catch (error: any) {
      showDialog({
        title: 'Error',
        message: error.message || 'Failed to save category.',
      });
    }
  };

  const handleDeleteCategoryPress = (category: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showDialog({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete category "${category.name}"?`,
      showCancel: true,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: () => performDeleteCategory(category.id, false),
    });
  };

  const performDeleteCategory = async (id: number, force: boolean) => {
    try {
      const result = await deleteCategory(id, force);
      if (result.warning) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showDialog({
          title: 'Warning',
          message: result.message || 'This category has exercises associated with it.',
          showCancel: true,
          confirmText: 'Delete Cascade',
          isDestructive: true,
          onConfirm: () => performDeleteCategory(id, true),
        });
      } else if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
      }
    } catch (error: any) {
      showDialog({
        title: 'Error',
        message: error.message || 'Failed to delete category',
      });
    }
  };

  const groupedExercises = categories
    .map((category) => ({
      category,
      exercises: exercises.filter((exercise) => exercise.category_id === category.id),
    }))
    .filter((group) => group.exercises.length > 0 || activeTab === 'categories');

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8fafc] dark:bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-[#475569] dark:text-text-secondary-dark font-medium text-base mt-4">
          Opening Exercise Vault...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#f8fafc] dark:bg-[#050510]">
      <View className="flex-row mx-5 my-5 p-1.5 bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-3xl">
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
              activeTab === 'exercises' ? 'text-white' : 'text-[#475569] dark:text-text-secondary-dark'
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
              activeTab === 'categories' ? 'text-white' : 'text-[#475569] dark:text-text-secondary-dark'
            }`}
          >
            Categories ({categories.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'exercises' ? (
          <View>
            {groupedExercises.length > 0 ? (
              groupedExercises.map((group) => (
                <View key={group.category.id} className="mb-6">
                  <View className="flex-row items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-borderColor-dark/20 mb-3">
                    <Text className="text-brand-400 font-extrabold text-base uppercase tracking-wider">
                      {group.category.name}
                    </Text>
                    <Text className="text-[#475569] dark:text-text-secondary-dark text-xs font-bold">
                      {group.exercises.length} {group.exercises.length === 1 ? 'exercise' : 'exercises'}
                    </Text>
                  </View>

                  <View className="gap-3 flex-col">
                    {group.exercises.map((exercise) => (
                      <View
                        key={exercise.id}
                        className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/30 rounded-3xl p-5 shadow-md"
                      >
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1 mr-3">
                            <Text className="text-[#0f172a] dark:text-text-primary-dark font-bold text-base">
                              {exercise.name}
                            </Text>
                            {exercise.link ? (
                              <TouchableOpacity
                                onPress={() => handleOpenExerciseLink(exercise)}
                                className="flex-row items-center gap-1 mt-2.5 bg-brand-900/10 border border-brand-500/10 self-start px-2.5 py-1 rounded-lg"
                              >
                                <ExternalLink color="#a78bfa" size={14} />
                                <Text className="text-brand-400 font-semibold text-xs">
                                  Tutorial Guide
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>

                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() => handleEditExercisePress(exercise)}
                              className="p-2.5 bg-[#f1f5f9] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl"
                            >
                              <Edit2 color="#94a3b8" size={16} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteExercise(exercise.id)}
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
                <Text className="text-[#0f172a] dark:text-text-primary-dark font-semibold text-base mt-3">
                  No Exercises Logged Yet
                </Text>
                <Text className="text-[#475569] dark:text-text-secondary-dark text-sm text-center mt-1">
                  Tap the floating button below to create your very first exercise!
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="gap-3 flex-col">
            {categories.length > 0 ? (
              categories.map((category) => (
                <View
                  key={category.id}
                  className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/30 rounded-3xl p-5 flex-row items-center justify-between shadow-md"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-3 h-3 rounded-full bg-brand-500" />
                    <View>
                      <Text className="text-[#0f172a] dark:text-text-primary-dark font-bold text-base">
                        {category.name}
                      </Text>
                      <Text className="text-[#475569] dark:text-text-secondary-dark text-sm mt-0.5">
                        {category.exercise_count || 0} {category.exercise_count === 1 ? 'exercise' : 'exercises'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleEditCategoryPress(category)}
                      className="p-2.5 bg-[#f1f5f9] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl"
                    >
                      <Edit2 color="#94a3b8" size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCategoryPress(category)}
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
                <Text className="text-[#0f172a] dark:text-text-primary-dark font-semibold text-base mt-3">
                  No Categories Found
                </Text>
                <Text className="text-[#475569] dark:text-text-secondary-dark text-sm text-center mt-1">
                  Tap the floating button below to create your very first category!
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

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

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseCategoryModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 bg-black/60 justify-center px-5">
            <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-3xl p-5 gap-5 flex-col shadow-lg">
              <View>
                <Text className="text-[#0f172a] dark:text-text-primary-dark font-extrabold text-xl">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </Text>
                <Text className="text-[#475569] dark:text-text-secondary-dark text-sm mt-1">
                  Categories keep your exercise library organized.
                </Text>
              </View>

              <View className="gap-1.5 flex-col">
                <Text className="text-sm font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">
                  Category Name *
                </Text>
                <TextInput
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder="e.g. Legs"
                  placeholderTextColor="#475569"
                  autoFocus
                  className="bg-[#f8fafc] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl px-5 py-3.5 text-[#0f172a] dark:text-text-primary-dark text-base"
                />
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleCloseCategoryModal}
                  className="flex-1 py-4 rounded-2xl items-center justify-center bg-[#f1f5f9] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark"
                >
                  <Text className="text-[#475569] dark:text-text-secondary-dark font-bold text-base">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveCategory}
                  className="flex-1 rounded-2xl overflow-hidden shadow-lg shadow-brand-500/20"
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#06b6d4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-4 items-center justify-center"
                  >
                    <Text className="text-white font-bold text-base">Save</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
