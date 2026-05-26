import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, SafeAreaView } from 'react-native';
import { Trash2, ChevronDown, X } from 'lucide-react-native';
import { Exercise } from '../db/exercises';
import * as Haptics from 'expo-haptics';

interface ExerciseRowProps {
  index: number;
  availableExercises: Exercise[];
  selectedExerciseId: number;
  sets: string;
  reps: string;
  weight: string;
  isBodyweight: boolean;
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
}

export function ExerciseRow({
  index,
  availableExercises,
  selectedExerciseId,
  sets,
  reps,
  weight,
  isBodyweight,
  onUpdate,
  onRemove,
}: ExerciseRowProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedExercise = availableExercises.find(ex => ex.id === selectedExerciseId);

  const handleSelect = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate('exercise_id', id);
    setModalVisible(false);
  };

  return (
    <View className="bg-surface-light-dark/40 border border-borderColor-dark/20 rounded-xl p-3 mb-3 space-y-3">
      {/* Header and selector */}
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold text-brand-400">Exercise #{index + 1}</Text>
        <TouchableOpacity onPress={onRemove} className="p-1">
          <Trash2 color="#ef4444" size={16} />
        </TouchableOpacity>
      </View>

      {/* Modern Exercise Picker using standard Modal */}
      <View className="space-y-1">
        <Text className="text-[10px] font-semibold text-text-secondary-dark uppercase tracking-wider">Exercise Name</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setModalVisible(true);
          }}
          className="bg-surface-dark border border-borderColor-dark rounded-lg flex-row items-center justify-between px-3 py-2.5"
        >
          <Text className={`text-sm ${selectedExercise ? 'text-text-primary-dark font-medium' : 'text-text-secondary-dark font-medium'}`}>
            {selectedExercise ? `${selectedExercise.name} (${selectedExercise.category_name})` : '-- Select Exercise --'}
          </Text>
          <ChevronDown color="#94a3b8" size={16} />
        </TouchableOpacity>
      </View>

      {/* Grid for Sets, Reps, Weight */}
      <View className="flex-row space-x-2">
        {/* Sets */}
        <View className="flex-1 space-y-1">
          <Text className="text-[10px] font-semibold text-text-secondary-dark uppercase tracking-wider">Sets</Text>
          <TextInput
            value={sets}
            onChangeText={(val) => onUpdate('sets', val)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#475569"
            className="bg-surface-dark border border-borderColor-dark rounded-lg px-2 py-1.5 text-text-primary-dark font-medium text-xs text-center"
          />
        </View>

        {/* Reps */}
        <View className="flex-1 space-y-1">
          <Text className="text-[10px] font-semibold text-text-secondary-dark uppercase tracking-wider">Reps</Text>
          <TextInput
            value={reps}
            onChangeText={(val) => onUpdate('reps', val)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#475569"
            className="bg-surface-dark border border-borderColor-dark rounded-lg px-2 py-1.5 text-text-primary-dark font-medium text-xs text-center"
          />
        </View>

        {/* Weight */}
        <View className="flex-1 space-y-1">
          <Text className="text-[10px] font-semibold text-text-secondary-dark uppercase tracking-wider">Weight</Text>
          <View className="flex-row items-center space-x-1">
            <TextInput
              value={isBodyweight ? 'BW' : weight}
              onChangeText={(val) => onUpdate('weight', val)}
              keyboardType="numeric"
              editable={!isBodyweight}
              placeholder="kg"
              placeholderTextColor="#475569"
              className={`flex-1 bg-surface-dark border border-borderColor-dark rounded-lg px-1.5 py-1.5 text-text-primary-dark font-medium text-[11px] text-center ${
                isBodyweight ? 'text-brand-400 opacity-60' : ''
              }`}
            />
            {/* BW Toggle */}
            <TouchableOpacity
              onPress={() => onUpdate('isBodyweight', !isBodyweight)}
              className={`px-1.5 py-1.5 rounded-lg border flex-row items-center justify-center ${
                isBodyweight
                  ? 'bg-brand-900 border-brand-500'
                  : 'bg-surface-dark border-borderColor-dark'
              }`}
            >
              <Text className={`text-[10px] font-bold ${isBodyweight ? 'text-brand-400' : 'text-text-secondary-dark'}`}>
                BW
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Custom Selector Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <SafeAreaView className="flex-1 bg-[#020617]/95 justify-end">
          <View className="bg-surface-dark border-t border-borderColor-dark rounded-t-3xl h-[60%] p-4">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-borderColor-dark mb-3">
              <Text className="text-text-primary-dark font-bold text-base">Select Exercise</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setModalVisible(false);
                }}
                className="p-1"
              >
                <X color="#94a3b8" size={20} />
              </TouchableOpacity>
            </View>

            {/* Modal Body: List of exercises */}
            <FlatList
              data={availableExercises}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item.id)}
                  className={`py-3.5 px-3 border-b border-borderColor-dark/20 flex-row items-center justify-between ${
                    item.id === selectedExerciseId ? 'bg-surface-light-dark/40 rounded-xl' : ''
                  }`}
                >
                  <Text className={`text-sm ${item.id === selectedExerciseId ? 'text-brand-400 font-semibold' : 'text-text-primary-dark font-medium'}`}>
                    {item.name}
                  </Text>
                  {item.category_name && (
                    <View className="bg-surface-light-dark px-2 py-0.5 rounded-md">
                      <Text className="text-text-secondary-dark text-[10px] uppercase font-bold tracking-wider">
                        {item.category_name}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View className="flex-1 justify-center items-center py-10">
                  <Text className="text-text-secondary-dark text-sm">No exercises found.</Text>
                  <Text className="text-text-secondary-dark text-xs mt-1">Add exercises first in the Exercises tab!</Text>
                </View>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
