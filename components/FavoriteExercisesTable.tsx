import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { FavoriteExercise } from '../db/stats';
import * as Haptics from 'expo-haptics';

export function FavoriteExercisesTable({ exercises }: { exercises: FavoriteExercise[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5; // Better for mobile screen size
  const totalPages = Math.ceil(exercises.length / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentExercises = exercises.slice(startIndex, startIndex + rowsPerPage);

  if (exercises.length === 0) return null;

  const handlePrevPage = () => {
    if (currentPage > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentPage((p) => p + 1);
    }
  };

  return (
    <View className="bg-surface-dark border border-borderColor-dark/40 rounded-2xl p-4 shadow-md space-y-4">
      {/* Title */}
      <View className="flex-row items-center gap-2 mb-2">
        <Trophy color="#eab308" size={22} />
        <Text className="text-text-primary-dark font-bold text-lg">Favorite Exercises</Text>
      </View>

      {/* Exercises List */}
      <View className="space-y-3">
        {currentExercises.map((ex, i) => (
          <View
            key={ex.id}
            className="flex-row items-center justify-between p-3 bg-surface-light-dark/40 border border-borderColor-dark/20 rounded-xl"
          >
            <View className="flex-1 mr-3">
              <View className="flex-row items-center flex-wrap mb-1.5">
                <Text className="text-text-primary-dark font-semibold text-sm mr-2">
                  {startIndex + i + 1}. {ex.name}
                </Text>
                {ex.category_name && (
                  <View className="bg-brand-900/30 border border-brand-500/20 rounded-full px-2 py-0.5">
                    <Text className="text-brand-400 font-medium text-[9px] uppercase tracking-wider">
                      {ex.category_name}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-text-secondary-dark text-xs font-medium">
                Logs: <Text className="text-brand-400 font-bold">{ex.log_count}</Text>  •  Max Reps: <Text className="text-text-primary-dark font-semibold">{ex.max_reps || '-'}</Text>  •  Max Weight: <Text className="text-text-primary-dark font-semibold">{ex.max_weight != null ? `${ex.max_weight} kg` : 'BW'}</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <View className="flex-row justify-between items-center pt-3 border-t border-borderColor-dark/30 mt-2">
          <Text className="text-xs text-text-secondary-dark">
            Page {currentPage} of {totalPages}
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handlePrevPage}
              disabled={currentPage === 1}
              className={`p-2 bg-surface-light-dark border border-borderColor-dark rounded-xl ${currentPage === 1 ? 'opacity-40' : ''}`}
            >
              <ChevronLeft color="#94a3b8" size={16} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNextPage}
              disabled={currentPage === totalPages}
              className={`p-2 bg-surface-light-dark border border-borderColor-dark rounded-xl ${currentPage === totalPages ? 'opacity-40' : ''}`}
            >
              <ChevronRight color="#94a3b8" size={16} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
