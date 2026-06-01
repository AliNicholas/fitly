import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Flame, ChevronLeft, ChevronRight, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CalorieHeatmapProps {
  calorieData: Record<string, number>; // Mapping of YYYY-MM-DD -> total calories
  targetCalories: number;
}

export function CalorieHeatmap({ calorieData, targetCalories }: CalorieHeatmapProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const prevMonth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const nextMonth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0-6

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Helper to format YYYY-MM-DD safely
    const formatDateKey = (y: number, m: number, d: number) => {
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };

    // Pad previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        calories: 0,
        hasEntry: false,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = formatDateKey(year, month, i);
      const hasEntry = dateKey in calorieData;
      const calories = calorieData[dateKey] || 0;

      days.push({
        day: i,
        isCurrentMonth: true,
        calories,
        hasEntry,
      });
    }

    // Pad next month
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        calories: 0,
        hasEntry: false,
      });
    }

    return days;
  }, [currentDate, calorieData]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calculate quick month stats
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    let onTrackDays = 0;
    let overDays = 0;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(i).padStart(2, '0');
      const dateKey = `${year}-${mm}-${dd}`;
      if (dateKey in calorieData) {
        if (calorieData[dateKey] > targetCalories) {
          overDays++;
        } else {
          onTrackDays++;
        }
      }
    }

    return { onTrackDays, overDays };
  }, [currentDate, calorieData, targetCalories]);

  return (
    <View className="bg-white dark:bg-surface border border-borderColor-light dark:border-borderColor-dark rounded-3xl p-5 shadow-lg gap-4 flex-col">
      {/* Header Controls */}
      <View className="flex-row justify-between items-center mb-2 flex-wrap gap-y-2.5">
        <View className="flex-row items-center gap-2">
          <Flame color="#fb7185" size={24} />
          <Text className="text-text-primary-light dark:text-text-primary-dark font-bold text-lg">Goal Heatmap</Text>
        </View>
        <View className="flex-row items-center bg-surface-light-light dark:bg-surface-light border border-borderColor-light dark:border-borderColor-dark rounded-2xl px-1 py-1">
          <TouchableOpacity onPress={prevMonth} className="p-1.5 rounded-xl">
            <ChevronLeft color="#94a3b8" size={18} />
          </TouchableOpacity>
          <Text className="text-text-primary-light dark:text-text-primary-dark font-bold text-xs w-28 text-center px-1">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={nextMonth} className="p-1.5 rounded-xl">
            <ChevronRight color="#94a3b8" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid Calendar */}
      <View className="w-full">
        {/* Week Days Headers */}
        <View className="flex-row justify-between mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <Text key={i} className="text-center text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark w-[13.5%] uppercase">
              {day}
            </Text>
          ))}
        </View>

        {/* Days Grid */}
        <View className="flex-row flex-wrap justify-between">
          {calendarDays.map((day, i) => {
            const isOver = day.hasEntry && day.calories > targetCalories;
            const isUnder = day.hasEntry && day.calories <= targetCalories;

            let bgClass = 'bg-surface-light-light dark:bg-surface-light border-borderColor-light dark:border-borderColor-dark/30';
            let textClass = 'text-text-primary-light dark:text-text-primary-dark';

            if (!day.isCurrentMonth) {
              bgClass = 'border-transparent opacity-10';
              textClass = 'text-text-secondary-light dark:text-text-secondary-dark';
            } else if (isOver) {
              bgClass = 'bg-[#f43f5e] border-[#e11d48] shadow-sm shadow-red-500/25';
              textClass = 'text-white';
            } else if (isUnder) {
              bgClass = 'bg-[#10b981] border-[#059669] shadow-sm shadow-emerald-500/25';
              textClass = 'text-white';
            }

            return (
              <View
                key={i}
                className={`
                  w-[13.5%] aspect-square flex items-center justify-center rounded-2xl mb-2 border
                  ${bgClass}
                `}
              >
                <Text className={`text-xs font-bold ${textClass}`}>
                  {day.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Legend & Stats */}
      <View className="border-t border-borderColor-light dark:border-borderColor-dark/40 pt-4 flex-row justify-between items-center flex-wrap gap-2">
        <View className="flex-row gap-3">
          <View className="flex-row items-center gap-1">
            <View className="w-3.5 h-3.5 rounded-md bg-[#10b981]" />
            <Text className="text-[11px] font-medium text-text-secondary-light dark:text-text-secondary-dark">Under Target</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="w-3.5 h-3.5 rounded-md bg-[#f43f5e]" />
            <Text className="text-[11px] font-medium text-text-secondary-light dark:text-text-secondary-dark">Over Target</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="w-3.5 h-3.5 rounded-md bg-surface-light-light dark:bg-surface-light border border-borderColor-light dark:border-borderColor-dark/30" />
            <Text className="text-[11px] font-medium text-text-secondary-light dark:text-text-secondary-dark">No Entry</Text>
          </View>
        </View>

        {(monthStats.onTrackDays > 0 || monthStats.overDays > 0) && (
          <View className="flex-row items-center gap-1 bg-[#ede9fe] dark:bg-[#4c1d95]/30 px-2.5 py-1 rounded-full border border-brand-500/20">
            <Info size={11} color="#8b5cf6" />
            <Text className="text-[10px] font-bold text-brand-600 dark:text-brand-400">
              {monthStats.onTrackDays} On Track / {monthStats.overDays} Over
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
