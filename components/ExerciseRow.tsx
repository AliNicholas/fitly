import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Trash2, ChevronDown } from 'lucide-react-native';
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
  isTime: boolean;
  onUpdate: (field: string | Record<string, any>, value?: any) => void;
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
  isTime,
  onUpdate,
  onRemove,
}: ExerciseRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedExercise = availableExercises.find(ex => ex.id === selectedExerciseId);

  const handleSelect = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate('exercise_id', id);
    setDropdownOpen(false);
  };

  return (
    <View className="bg-[#f1f5f9] dark:bg-surface-light-dark/40 border border-[#e2e8f0] dark:border-[#2a2a4a]/50 rounded-3xl p-5 mb-4 gap-4 flex-col">
      {/* Header and selector */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-brand-400">Exercise #{index + 1}</Text>
        <TouchableOpacity onPress={onRemove} className="p-1">
          <Trash2 color="#ef4444" size={20} />
        </TouchableOpacity>
      </View>

      {/* Inline Exercise Dropdown Trigger */}
      <View className="gap-1.5 flex-col">
        <Text className="text-xs font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">Exercise Name</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setDropdownOpen(!dropdownOpen);
          }}
          className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl flex-row items-center justify-between px-4 py-3.5"
        >
          <Text className={`text-base flex-1 ${selectedExercise ? 'text-[#0f172a] dark:text-text-primary-dark font-medium' : 'text-[#475569] dark:text-text-secondary-dark font-medium'}`}>
            {selectedExercise ? `${selectedExercise.name} (${selectedExercise.category_name})` : '-- Select Exercise --'}
          </Text>
          <ChevronDown color="#94a3b8" size={20} style={{ transform: [{ rotate: dropdownOpen ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
      </View>

      {/* Inline Scrollable List dropdown */}
      {dropdownOpen && (
        <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-[#2a2a4a]/80 rounded-2xl p-2 max-h-48 mt-1 shadow-inner shadow-black/40">
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {availableExercises.length === 0 ? (
              <View className="py-6 items-center justify-center">
                <Text className="text-[#475569] dark:text-text-secondary-dark text-sm text-center">No exercises found.</Text>
                <Text className="text-[#475569] dark:text-text-secondary-dark text-xs mt-1 text-center">Add exercises first in the Exercises tab!</Text>
              </View>
            ) : (
              availableExercises.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleSelect(item.id)}
                  className={`py-3 px-3 border-b border-[#e2e8f0] dark:border-[#2a2a4a]/20 flex-row items-center justify-between ${
                    item.id === selectedExerciseId ? 'bg-[#f1f5f9] dark:bg-surface-light-dark/40 rounded-xl' : ''
                  }`}
                >
                  <Text className={`text-sm ${item.id === selectedExerciseId ? 'text-brand-400 font-semibold' : 'text-[#0f172a] dark:text-text-primary-dark font-medium'}`}>
                    {item.name}
                  </Text>
                  {item.category_name && (
                    <View className="bg-[#f1f5f9] dark:bg-surface-light-dark px-2.5 py-0.5 rounded-lg border border-[#e2e8f0] dark:border-[#2a2a4a]/30">
                      <Text className="text-[#475569] dark:text-text-secondary-dark text-[10px] font-bold uppercase tracking-wider">
                        {item.category_name}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      <View className="gap-3 flex-col">
        <View className="gap-1.5 flex-col">
          <Text className="text-xs font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">Measure</Text>
          <View className="flex-row bg-[#e2e8f0] dark:bg-[#151530] rounded-2xl p-1 border border-[#e2e8f0] dark:border-[#2a2a4a]/50 gap-1">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onUpdate('isTime', false);
              }}
              activeOpacity={0.75}
              className={`flex-1 py-3 rounded-xl items-center justify-center border ${
                !isTime
                  ? 'bg-brand-600 border-brand-500'
                  : 'bg-transparent border-transparent'
              }`}
            >
              <Text className={`text-sm font-bold ${!isTime ? 'text-white' : 'text-[#475569] dark:text-text-secondary-dark'}`}>
                Reps
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onUpdate('isTime', true);
              }}
              activeOpacity={0.75}
              className={`flex-1 py-3 rounded-xl items-center justify-center border ${
                isTime
                  ? 'bg-cyan-600 border-cyan-500'
                  : 'bg-transparent border-transparent'
              }`}
            >
              <Text className={`text-sm font-bold ${isTime ? 'text-white' : 'text-[#475569] dark:text-text-secondary-dark'}`}>
                Seconds
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row gap-3 w-full">
          <View className="flex-1 gap-1.5 flex-col">
            <Text className="text-xs font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">Sets</Text>
            <TextInput
              value={sets}
              onChangeText={(val) => onUpdate('sets', val)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#475569"
              className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl px-4 py-3 text-[#0f172a] dark:text-text-primary-dark font-medium text-base text-center"
            />
          </View>
          <View className="flex-1 gap-1.5 flex-col">
            <Text className="text-xs font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">
              {isTime ? 'Seconds' : 'Reps'}
            </Text>
            <TextInput
              value={reps}
              onChangeText={(val) => onUpdate('reps', val)}
              keyboardType="numeric"
              placeholder={isTime ? '45' : '10'}
              placeholderTextColor="#475569"
              className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl px-4 py-3 text-[#0f172a] dark:text-text-primary-dark font-medium text-base text-center"
            />
          </View>
        </View>
        <View className="gap-1.5 flex-col">
          <Text className="text-xs font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">Load Type</Text>
          <View className="flex-row bg-[#e2e8f0] dark:bg-[#151530] rounded-2xl p-1 border border-[#e2e8f0] dark:border-[#2a2a4a]/50 gap-1">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onUpdate('isBodyweight', false);
              }}
              activeOpacity={0.75}
              className={`flex-1 py-3 rounded-xl items-center justify-center border ${
                !isBodyweight
                  ? 'bg-brand-600 border-brand-500'
                  : 'bg-transparent border-transparent'
              }`}
            >
              <Text className={`text-sm font-bold ${!isBodyweight ? 'text-white' : 'text-[#475569] dark:text-text-secondary-dark'}`}>
                Weighted
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onUpdate({ isBodyweight: true, weight: '' });
              }}
              activeOpacity={0.75}
              className={`flex-1 py-3 rounded-xl items-center justify-center border ${
                isBodyweight
                  ? 'bg-cyan-600 border-cyan-500'
                  : 'bg-transparent border-transparent'
              }`}
            >
              <Text className={`text-sm font-bold ${isBodyweight ? 'text-white' : 'text-[#475569] dark:text-text-secondary-dark'}`}>
                Bodyweight
              </Text>
            </TouchableOpacity>
          </View>

          {!isBodyweight && (
            <View className="gap-1.5 flex-col mt-2">
              <Text className="text-xs font-semibold text-[#475569] dark:text-text-secondary-dark uppercase tracking-wider">Weight (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={(val) => onUpdate('weight', val)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#475569"
                className="w-full bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl px-4 py-3 text-[#0f172a] dark:text-text-primary-dark font-medium text-base text-center"
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
