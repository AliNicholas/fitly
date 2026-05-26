import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  isTime,
  onUpdate,
  onRemove,
}: ExerciseRowProps) {
  const insets = useSafeAreaInsets();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedExercise = availableExercises.find(ex => ex.id === selectedExerciseId);

  const handleSelect = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate('exercise_id', id);
    setDropdownOpen(false);
  };

  return (
    <View className="bg-surface-light-dark/40 border border-borderColor-dark/20 rounded-3xl p-5 mb-4 gap-4 flex-col">
      {/* Header and selector */}
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-brand-400">Exercise #{index + 1}</Text>
        <TouchableOpacity onPress={onRemove} className="p-1">
          <Trash2 color="#ef4444" size={20} />
        </TouchableOpacity>
      </View>

      {/* Inline Exercise Dropdown Trigger */}
      <View className="gap-1.5 flex-col">
        <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">Exercise Name</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setDropdownOpen(!dropdownOpen);
          }}
          className="bg-surface-dark border border-borderColor-dark rounded-2xl flex-row items-center justify-between px-4 py-3.5"
        >
          <Text className={`text-base flex-1 ${selectedExercise ? 'text-text-primary-dark font-medium' : 'text-text-secondary-dark font-medium'}`}>
            {selectedExercise ? `${selectedExercise.name} (${selectedExercise.category_name})` : '-- Select Exercise --'}
          </Text>
          <ChevronDown color="#94a3b8" size={20} style={{ transform: [{ rotate: dropdownOpen ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
      </View>

      {/* Inline Scrollable List dropdown */}
      {dropdownOpen && (
        <View className="bg-surface-dark border border-borderColor-dark/50 rounded-2xl p-2 max-h-48 mt-1 shadow-inner shadow-black/40">
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {availableExercises.length === 0 ? (
              <View className="py-6 items-center justify-center">
                <Text className="text-text-secondary-dark text-sm text-center">No exercises found.</Text>
                <Text className="text-text-secondary-dark text-xs mt-1 text-center">Add exercises first in the Exercises tab!</Text>
              </View>
            ) : (
              availableExercises.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleSelect(item.id)}
                  className={`py-3 px-3 border-b border-borderColor-dark/20 flex-row items-center justify-between ${
                    item.id === selectedExerciseId ? 'bg-surface-light-dark/40 rounded-xl' : ''
                  }`}
                >
                  <Text className={`text-sm ${item.id === selectedExerciseId ? 'text-brand-400 font-semibold' : 'text-text-primary-dark font-medium'}`}>
                    {item.name}
                  </Text>
                  {item.category_name && (
                    <View className="bg-surface-light-dark px-2.5 py-0.5 rounded-lg border border-borderColor-dark/30">
                      <Text className="text-text-secondary-dark text-[10px] font-bold uppercase tracking-wider">
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

      {/* Two-row Spacious Layout for Sets/Reps and Weight/Bodyweight */}
      <View className="gap-3 flex-col">
        {/* Row 1: Sets & Reps side by side */}
        <View className="flex-row gap-3">
          {/* Sets */}
          <View className="flex-1 gap-1.5 flex-col">
            <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">Sets</Text>
            <TextInput
              value={sets}
              onChangeText={(val) => onUpdate('sets', val)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#475569"
              className="bg-surface-dark border border-borderColor-dark rounded-2xl px-4 py-3 text-text-primary-dark font-medium text-base text-center"
            />
          </View>

          {/* Reps / Seconds */}
          <View className="flex-1 gap-1 flex-col">
            <View className="flex-row justify-between items-center h-5">
              <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">
                {isTime ? 'Secs' : 'Reps'}
              </Text>
              {/* Segmented Toggle Control */}
              <View className="flex-row bg-[#151530] rounded-lg p-0.5 border border-borderColor-dark/15 gap-0.5">
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onUpdate('isTime', false);
                  }}
                  className={`px-1.5 py-0.5 rounded-md ${!isTime ? 'bg-brand-600' : ''}`}
                >
                  <Text className={`text-[9px] font-bold uppercase tracking-wider ${!isTime ? 'text-white' : 'text-text-secondary-dark'}`}>
                    Rep
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onUpdate('isTime', true);
                  }}
                  className={`px-1.5 py-0.5 rounded-md ${isTime ? 'bg-brand-600' : ''}`}
                >
                  <Text className={`text-[9px] font-bold uppercase tracking-wider ${isTime ? 'text-white' : 'text-text-secondary-dark'}`}>
                    Sec
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              value={reps}
              onChangeText={(val) => onUpdate('reps', val)}
              keyboardType="numeric"
              placeholder={isTime ? '0s' : '0'}
              placeholderTextColor="#475569"
              className="bg-surface-dark border border-borderColor-dark rounded-2xl px-4 py-3 text-text-primary-dark font-medium text-base text-center"
            />
          </View>
        </View>

        {/* Row 2: Weight + BW Toggle taking full width */}
        <View className="gap-1.5 flex-col">
          <Text className="text-xs font-semibold text-text-secondary-dark uppercase tracking-wider">Weight</Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              value={isBodyweight ? 'BW' : weight}
              onChangeText={(val) => onUpdate('weight', val)}
              keyboardType="numeric"
              editable={!isBodyweight}
              placeholder="kg"
              placeholderTextColor="#475569"
              className={`flex-1 bg-surface-dark border border-borderColor-dark rounded-2xl px-4 py-3 text-text-primary-dark font-medium text-base text-center ${
                isBodyweight ? 'text-brand-400 opacity-60 font-bold' : ''
              }`}
            />
            {/* BW Toggle Button */}
            <TouchableOpacity
              onPress={() => onUpdate('isBodyweight', !isBodyweight)}
              className={`px-5 py-3 rounded-2xl border flex-row items-center justify-center min-h-[48px] ${
                isBodyweight
                  ? 'bg-brand-900 border-brand-500 shadow-md shadow-brand-500/10'
                  : 'bg-surface-dark border-borderColor-dark'
              }`}
            >
              <Text className={`text-sm font-bold ${isBodyweight ? 'text-brand-400' : 'text-text-secondary-dark'}`}>
                Bodyweight (BW)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
