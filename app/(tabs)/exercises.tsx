import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, Edit2, Trash2, ExternalLink, Dumbbell, FolderClosed, ChevronDown, X } from 'lucide-react-native';
import { getExercises, addExercise, updateExercise, deleteExercise, Exercise } from '../../db/exercises';
import { getCategories, addCategory, updateCategory, deleteCategory, Category } from '../../db/categories';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import * as Haptics from 'expo-haptics';

export default function ExercisesScreen() {
  const [activeTab, setActiveTab] = useState<'exercises' | 'categories'>('exercises');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals visibility
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  // Form states
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseCategoryId, setExerciseCategoryId] = useState<number>(0);
  const [exerciseDescription, setExerciseDescription] = useState('');
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

  const handleOpenExerciseLink = async (url: string | null) => {
    if (!url) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', "Can't open this link. Please verify it is a valid URL.");
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
    setExerciseDescription('');
    setExerciseLink('');
    setExerciseModalVisible(true);
  };

  const handleEditExercisePress = (ex: Exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingExercise(ex);
    setExerciseName(ex.name);
    setExerciseCategoryId(ex.category_id);
    setExerciseDescription(ex.description || '');
    setExerciseLink(ex.link || '');
    setExerciseModalVisible(true);
  };

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) {
      Alert.alert('Required', 'Please enter an exercise name.');
      return;
    }
    if (!exerciseCategoryId) {
      Alert.alert('Required', 'Please select a category.');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (editingExercise) {
        await updateExercise(
          editingExercise.id,
          exerciseName,
          exerciseCategoryId,
          exerciseDescription,
          exerciseLink
        );
      } else {
        await addExercise(exerciseName, exerciseCategoryId, exerciseDescription, exerciseLink);
      }
      setExerciseModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save exercise.');
    }
  };

  const handleDeleteExercise = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this exercise?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExercise(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadData();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete exercise');
          }
        },
      },
    ]);
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
      Alert.alert('Required', 'Please enter a category name.');
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
      Alert.alert('Error', error.message || 'Failed to save category.');
    }
  };

  const handleDeleteCategoryPress = (cat: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete category "${cat.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDeleteCategory(cat.id, false),
        },
      ]
    );
  };

  const performDeleteCategory = async (id: number, force: boolean) => {
    try {
      const res = await deleteCategory(id, force);
      if (res.warning) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Warning',
          res.message || 'This category has exercises associated with it.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete Cascade',
              style: 'destructive',
              onPress: () => performDeleteCategory(id, true),
            },
          ]
        );
      } else if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete category');
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
      <View className="flex-1 bg-[#020617] justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-[#94a3b8] font-medium mt-4">Opening Exercise Vault...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#020617]">
      {/* Sub tabs Selector */}
      <View className="flex-row mx-4 my-4 p-1 bg-surface-dark border border-borderColor-dark rounded-xl">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('exercises');
          }}
          className={`flex-1 py-2 rounded-lg flex-row items-center justify-center space-x-2 ${
            activeTab === 'exercises' ? 'bg-[#1e293b] border border-borderColor-dark/40 shadow' : ''
          }`}
        >
          <Dumbbell color={activeTab === 'exercises' ? '#3b82f6' : '#94a3b8'} size={16} />
          <Text
            className={`font-semibold text-xs ${
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
          className={`flex-1 py-2 rounded-lg flex-row items-center justify-center space-x-2 ${
            activeTab === 'categories' ? 'bg-[#1e293b] border border-borderColor-dark/40 shadow' : ''
          }`}
        >
          <FolderClosed color={activeTab === 'categories' ? '#3b82f6' : '#94a3b8'} size={16} />
          <Text
            className={`font-semibold text-xs ${
              activeTab === 'categories' ? 'text-white' : 'text-text-secondary-dark'
            }`}
          >
            Categories ({categories.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'exercises' ? (
          // Exercises Tab
          groupedExercises.length > 0 ? (
            groupedExercises.map((group) => (
              <View key={group.category.id} className="mb-6">
                {/* Category Header */}
                <View className="flex-row items-center justify-between pb-2 border-b border-borderColor-dark/20 mb-3">
                  <Text className="text-brand-400 font-bold text-sm uppercase tracking-wider">
                    {group.category.name}
                  </Text>
                  <Text className="text-text-secondary-dark text-[10px] font-bold">
                    {group.exercises.length} {group.exercises.length === 1 ? 'exercise' : 'exercises'}
                  </Text>
                </View>

                {/* Exercises Cards */}
                <View className="space-y-3">
                  {group.exercises.map((ex) => (
                    <View
                      key={ex.id}
                      className="bg-surface-dark border border-borderColor-dark/30 rounded-2xl p-4 shadow-sm"
                    >
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1 mr-3">
                          <Text className="text-text-primary-dark font-semibold text-sm">
                            {ex.name}
                          </Text>
                          {ex.description && (
                            <Text className="text-text-secondary-dark text-xs mt-1 leading-4">
                              {ex.description}
                            </Text>
                          )}
                          {ex.link && (
                            <TouchableOpacity
                              onPress={() => handleOpenExerciseLink(ex.link)}
                              className="flex-row items-center space-x-1 mt-2 bg-brand-900/10 border border-brand-500/10 self-start px-2 py-0.5 rounded-md"
                            >
                              <ExternalLink color="#60a5fa" size={10} />
                              <Text className="text-brand-400 font-semibold text-[10px]">
                                Tutorial Guide
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Actions */}
                        <View className="flex-row space-x-2">
                          <TouchableOpacity
                            onPress={() => handleEditExercisePress(ex)}
                            className="p-2 bg-surface-light-dark border border-borderColor-dark rounded-xl"
                          >
                            <Edit2 color="#94a3b8" size={13} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteExercise(ex.id)}
                            className="p-2 bg-red-950/10 border border-red-500/20 rounded-xl"
                          >
                            <Trash2 color="#f87171" size={13} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View className="py-20 justify-center items-center">
              <Dumbbell color="#475569" size={40} />
              <Text className="text-text-primary-dark font-semibold mt-3">No Exercises Logged Yet</Text>
              <Text className="text-text-secondary-dark text-xs text-center mt-1">
                Tap the floating button below to create your very first exercise!
              </Text>
            </View>
          )
        ) : (
          // Categories Tab
          <View className="space-y-3">
            {categories.map((cat) => (
              <View
                key={cat.id}
                className="bg-surface-dark border border-borderColor-dark/30 rounded-2xl p-4 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-row items-center space-x-3">
                  <View className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                  <View>
                    <Text className="text-text-primary-dark font-semibold text-sm">
                      {cat.name}
                    </Text>
                    <Text className="text-text-secondary-dark text-xs mt-0.5">
                      {cat.exercise_count || 0} {cat.exercise_count === 1 ? 'exercise' : 'exercises'}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    onPress={() => handleEditCategoryPress(cat)}
                    className="p-2 bg-surface-light-dark border border-borderColor-dark rounded-xl"
                  >
                    <Edit2 color="#94a3b8" size={13} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteCategoryPress(cat)}
                    className="p-2 bg-red-950/10 border border-red-500/20 rounded-xl"
                  >
                    <Trash2 color="#f87171" size={13} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB Floating Action Button */}
      <TouchableOpacity
        onPress={activeTab === 'exercises' ? handleAddExercisePress : handleAddCategoryPress}
        className="absolute bottom-6 right-6 bg-brand-500 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30"
      >
        <Plus color="#ffffff" size={24} />
      </TouchableOpacity>

      {/* Bottom Sheet: Exercise Form */}
      <BottomSheetModal
        visible={exerciseModalVisible}
        onClose={() => setExerciseModalVisible(false)}
        title={editingExercise ? 'Edit Exercise' : 'Create Exercise'}
      >
        <View className="space-y-4">
          <View className="space-y-1">
            <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">
              Exercise Name *
            </Text>
            <TextInput
              value={exerciseName}
              onChangeText={setExerciseName}
              placeholder="e.g. Bench Press"
              placeholderTextColor="#475569"
              className="bg-surface-dark border border-borderColor-dark rounded-xl px-4 py-3 text-text-primary-dark text-sm"
            />
          </View>

          <View className="space-y-1">
            <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">
              Category *
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCategoryPickerVisible(true);
              }}
              className="bg-surface-dark border border-borderColor-dark rounded-xl flex-row items-center justify-between px-4 py-3"
            >
              <Text className="text-text-primary-dark text-sm font-medium">
                {categories.find(c => c.id === exerciseCategoryId)?.name || '-- Select Category --'}
              </Text>
              <ChevronDown color="#94a3b8" size={16} />
            </TouchableOpacity>
          </View>

          <View className="space-y-1">
            <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">
              Description
            </Text>
            <TextInput
              value={exerciseDescription}
              onChangeText={setExerciseDescription}
              placeholder="e.g. Focus on keeping elbows tucked and squeezing chest."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={3}
              className="bg-surface-dark border border-borderColor-dark rounded-xl px-4 py-3 text-text-primary-dark text-sm min-h-[80px]"
            />
          </View>

          <View className="space-y-1">
            <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">
              Tutorial Link / URL
            </Text>
            <TextInput
              value={exerciseLink}
              onChangeText={setExerciseLink}
              placeholder="e.g. https://youtube.com/..."
              placeholderTextColor="#475569"
              autoCapitalize="none"
              keyboardType="url"
              className="bg-surface-dark border border-borderColor-dark rounded-xl px-4 py-3 text-text-primary-dark text-sm"
            />
          </View>

          <TouchableOpacity
            onPress={handleSaveExercise}
            className="bg-brand-500 py-3 rounded-xl flex items-center justify-center mt-4"
          >
            <Text className="text-white font-bold text-sm">Save Exercise</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      {/* Bottom Sheet: Category Form */}
      <BottomSheetModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
      >
        <View className="space-y-4">
          <View className="space-y-1">
            <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">
              Category Name *
            </Text>
            <TextInput
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="e.g. Legs"
              placeholderTextColor="#475569"
              className="bg-surface-dark border border-borderColor-dark rounded-xl px-4 py-3 text-text-primary-dark text-sm"
            />
          </View>

          <TouchableOpacity
            onPress={handleSaveCategory}
            className="bg-brand-500 py-3 rounded-xl flex items-center justify-center mt-4"
          >
            <Text className="text-white font-bold text-sm">Save Category</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      {/* Category Modal Picker */}
      <Modal visible={categoryPickerVisible} animationType="slide" transparent={true}>
        <SafeAreaView className="flex-1 bg-[#020617]/95 justify-end">
          <View className="bg-surface-dark border-t border-borderColor-dark rounded-t-3xl h-[45%] p-4">
            <View className="flex-row items-center justify-between pb-3 border-b border-borderColor-dark mb-3">
              <Text className="text-text-primary-dark font-bold text-base">Select Category</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCategoryPickerVisible(false);
                }}
                className="p-1"
              >
                <X color="#94a3b8" size={20} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExerciseCategoryId(item.id);
                    setCategoryPickerVisible(false);
                  }}
                  className={`py-3.5 px-3 border-b border-borderColor-dark/20 flex-row items-center justify-between ${
                    item.id === exerciseCategoryId ? 'bg-surface-light-dark/40 rounded-xl' : ''
                  }`}
                >
                  <Text className={`text-sm ${item.id === exerciseCategoryId ? 'text-brand-400 font-semibold' : 'text-text-primary-dark font-medium'}`}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
