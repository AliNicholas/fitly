import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export function CalendarHeatmap({ dates }: { dates: string[] }) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const activeDates = useMemo(() => {
    return new Set(dates.map((d) => {
      // Split YYYY-MM-DD to avoid timezone offset shifts
      const parts = d.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day, 12, 0, 0).toDateString();
      }
      return new Date(d + 'T12:00:00').toDateString();
    }));
  }, [dates]);

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

    // Pad previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        active: false,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i, 12, 0, 0);
      days.push({
        day: i,
        isCurrentMonth: true,
        active: activeDates.has(d.toDateString()),
      });
    }

    // Pad next month
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        active: false,
      });
    }

    return days;
  }, [currentDate, activeDates]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-5 shadow-lg gap-4 flex-col">
      {/* Header Controls */}
      <View className="flex-row justify-between items-center mb-4 flex-wrap gap-y-2.5">
        <View className="flex-row items-center gap-2">
          <Flame color="#f43f5e" size={24} />
          <Text className="text-[#0f172a] dark:text-text-primary-dark font-bold text-lg">Activity Calendar</Text>
        </View>
        <View className="flex-row items-center bg-[#f1f5f9] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl px-1 py-1">
          <TouchableOpacity onPress={prevMonth} className="p-1.5 rounded-xl">
            <ChevronLeft color="#94a3b8" size={18} />
          </TouchableOpacity>
          <Text className="text-[#0f172a] dark:text-text-primary-dark font-bold text-xs w-24 text-center px-1">
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
            <Text key={i} className="text-center text-sm font-semibold text-[#475569] dark:text-text-secondary-dark w-[13.5%] uppercase">
              {day}
            </Text>
          ))}
        </View>

        {/* Days Grid */}
        <View className="flex-row flex-wrap justify-between">
          {calendarDays.map((day, i) => (
            <View
              key={i}
              className={`
                w-[13.5%] aspect-square flex items-center justify-center rounded-2xl mb-2 border transition-all
                ${!day.isCurrentMonth ? 'border-transparent opacity-20' : 'border-[#e2e8f0] dark:border-borderColor-dark/10'}
                ${day.active
                  ? 'bg-brand-500 border-brand-600 shadow-sm shadow-brand-500/30'
                  : 'bg-[#f1f5f9] dark:bg-surface-light-dark border-[#e2e8f0] dark:border-borderColor-dark/30'}
              `}
            >
              <Text
                className={`
                  text-sm font-semibold
                  ${day.active ? 'text-white' : day.isCurrentMonth ? 'text-[#0f172a] dark:text-text-primary-dark' : 'text-[#475569] dark:text-text-secondary-dark'}
                `}
              >
                {day.day}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
