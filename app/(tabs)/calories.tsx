import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Flame,
  Plus,
  Trash2,
  Scale,
  Calendar,
  Settings,
  ChevronUp,
  ChevronDown,
  Info,
  Sparkles,
  Utensils,
  Clock,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '../../contexts/ThemeContext';
import {
  CalorieEntry,
  getCalorieEntries,
  getCalorieStatsForDate,
  deleteCalorieEntry,
  updateCalorieEntry,
} from '../../db/calories';
import { getSettings, saveSetting } from '../../db/settings';
import { CalorieHeatmap } from '../../components/CalorieHeatmap';
import { LinearGradient } from 'expo-linear-gradient';

export default function CaloriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  // Scroll / Paging State
  const scrollRef = useRef<ScrollView>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeSection, setActiveSection] = useState(0);

  // Global Calorie Data State
  const [loading, setLoading] = useState(true);
  const [dailyTarget, setDailyTarget] = useState(2000);
  const [todayStats, setTodayStats] = useState({ calories: 0, protein: 0, fat: 0, carbohydrates: 0 });
  const [allEntries, setAllEntries] = useState<CalorieEntry[]>([]);
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});

  // Calculator form state
  const [calcGender, setCalcGender] = useState<'male' | 'female'>('male');
  const [calcAge, setCalcAge] = useState('25');
  const [calcWeight, setCalcWeight] = useState('70');
  const [calcHeight, setCalcHeight] = useState('175');
  const [calcActivity, setCalcActivity] = useState('1.55'); // Moderately active
  const [calcTargetWeight, setCalcTargetWeight] = useState('65');
  const [calcProgress, setCalcProgress] = useState<'slow' | 'moderate' | 'extreme'>('moderate');
  
  // Calculator result state
  const [calcResult, setCalcResult] = useState<{
    bmr: number;
    tdee: number;
    target: number;
    daysToGoal: number;
    goalDate: string;
    goalType: 'loss' | 'gain' | 'maintain';
  } | null>(null);

  // Detail Modal State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CalorieEntry | null>(null);

  // Reusable dynamic input modal state
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [modalField, setModalField] = useState<'age' | 'height' | 'weight' | 'targetWeight' | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalUnit, setModalUnit] = useState('');
  const [modalValue, setModalValue] = useState('');

  const handleOpenInputModal = (
    field: 'age' | 'height' | 'weight' | 'targetWeight',
    currentVal: string,
    title: string,
    unit: string
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalField(field);
    setModalValue(currentVal);
    setModalTitle(title);
    setModalUnit(unit);
    setInputModalVisible(true);
  };

  const handleSaveModalInput = () => {
    if (!modalValue.trim() || isNaN(parseFloat(modalValue))) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid Entry', 'Please enter a valid number.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (modalField === 'age') setCalcAge(modalValue);
    else if (modalField === 'height') setCalcHeight(modalValue);
    else if (modalField === 'weight') setCalcWeight(modalValue);
    else if (modalField === 'targetWeight') setCalcTargetWeight(modalValue);

    setInputModalVisible(false);
    setModalField(null);
  };

  // Format today's date key YYYY-MM-DD
  const getTodayKey = () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${mm}-${dd}`;
  };

  // Re-fetch calorie data
  const loadCalorieData = useCallback(async () => {
    try {
      const settings = await getSettings();
      const target = settings.daily_calorie_target ? Number(settings.daily_calorie_target) : 2000;
      setDailyTarget(target);

      const entries = await getCalorieEntries();
      setAllEntries(entries);

      // Compile stats for today
      const todayKey = getTodayKey();
      const stats = await getCalorieStatsForDate(todayKey);
      setTodayStats(stats);

      // Compile heatmap data: mapping date -> total calories for completed entries
      const heatMap: Record<string, number> = {};
      entries.forEach((e) => {
        if (e.status === 'completed') {
          heatMap[e.date] = (heatMap[e.date] || 0) + e.calories;
        }
      });
      setHeatmapData(heatMap);

      setLoading(false);
    } catch (err) {
      console.error('Failed to load calorie data:', err);
      setLoading(false);
    }
  }, []);

  // Fetch when page focused
  useFocusEffect(
    useCallback(() => {
      loadCalorieData();
    }, [loadCalorieData])
  );

  // Automated background scan simulation
  useEffect(() => {
    // Check if there are processing entries
    const processingItem = allEntries.find((e) => e.status === 'processing');
    if (processingItem) {
      const timer = setTimeout(async () => {
        // Complete the scanning state by changing status to completed
        await updateCalorieEntry(processingItem.id, { status: 'completed' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadCalorieData();
      }, 1500); // 1.5 seconds simulated processing delay

      return () => clearTimeout(timer);
    }
  }, [allEntries, loadCalorieData]);

  // Handle section scrolling
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerHeight === 0) return;
    const yOffset = event.nativeEvent.contentOffset.y;
    const sectionIndex = Math.round(yOffset / containerHeight);
    if (sectionIndex !== activeSection) {
      setActiveSection(sectionIndex);
      Haptics.selectionAsync();
    }
  };

  const scrollToSection = (index: number) => {
    if (containerHeight === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollRef.current?.scrollTo({
      y: index * containerHeight,
      animated: true,
    });
    setActiveSection(index);
  };

  // Entry detail popup handler
  const handleOpenDetail = (entry: CalorieEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEntry(entry);
    setDetailModalVisible(true);
  };

  // Delete entry
  const handleDeleteEntry = async (id: number) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await deleteCalorieEntry(id);
      setDetailModalVisible(false);
      setSelectedEntry(null);
      loadCalorieData();
    } catch (err) {
      console.error(err);
    }
  };

  // Goal & Timeline Calculator Logic
  const handleCalculateGoal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const w = parseFloat(calcWeight);
    const h = parseFloat(calcHeight);
    const a = parseFloat(calcAge);
    const targetW = parseFloat(calcTargetWeight);
    const actVal = parseFloat(calcActivity);

    if (isNaN(w) || isNaN(h) || isNaN(a) || isNaN(targetW)) {
      Alert.alert('Incomplete Fields', 'Please complete all numerical inputs before calculating.');
      return;
    }

    // 1. Calculate BMR (Mifflin-St Jeor)
    let bmr = 0;
    if (calcGender === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    }

    // 2. Calculate TDEE
    const tdee = bmr * actVal;

    // 3. Define Calorie adjustments based on Progress Rate & Goal Type
    let dailyTargetCalories = tdee;
    let deficitRate = 0; // deficit or surplus calories/day
    let goalType: 'loss' | 'gain' | 'maintain' = 'maintain';

    if (targetW < w) {
      // Weight loss
      goalType = 'loss';
      if (calcProgress === 'slow') deficitRate = 300;
      else if (calcProgress === 'moderate') deficitRate = 500;
      else if (calcProgress === 'extreme') deficitRate = 800;

      dailyTargetCalories = Math.max(1200, tdee - deficitRate); // clamping to safe 1200 kcal minimum
    } else if (targetW > w) {
      // Weight gain
      goalType = 'gain';
      if (calcProgress === 'slow') deficitRate = 200;
      else if (calcProgress === 'moderate') deficitRate = 400;
      else if (calcProgress === 'extreme') deficitRate = 600;

      dailyTargetCalories = tdee + deficitRate;
    }

    // 4. Calculate Timeline (1 kg of body fat = 7,700 kcal energy)
    const weightDiff = Math.abs(w - targetW);
    const totalCalorieDiff = weightDiff * 7700;
    
    let daysToGoal = 0;
    if (deficitRate > 0) {
      daysToGoal = Math.round(totalCalorieDiff / deficitRate);
    }

    // Formulate Goal Date
    const goalDate = new Date();
    goalDate.setDate(goalDate.getDate() + daysToGoal);
    const dateFormatted = goalDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    setCalcResult({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target: Math.round(dailyTargetCalories),
      daysToGoal,
      goalDate: dateFormatted,
      goalType,
    });
  };

  const handleApplyDailyTarget = async () => {
    if (!calcResult) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await saveSetting('daily_calorie_target', String(calcResult.target));
      setDailyTarget(calcResult.target);
      Alert.alert('Daily Target Saved!', `Your daily target calorie intake has been updated to ${calcResult.target} kcal.`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8fafc] dark:bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-[#475569] dark:text-[#94a3b8] font-medium text-base mt-4">
          Consulting dietary vault...
        </Text>
      </View>
    );
  }

  // Ring styling calculations
  const ringSize = 180;
  const strokeWidth = 14;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(1, todayStats.calories / dailyTarget);
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Macro limits based on daily target
  const targetMacros = {
    protein: Math.round((dailyTarget * 0.25) / 4), // 25% of calories
    carbs: Math.round((dailyTarget * 0.50) / 4),   // 50% of calories
    fat: Math.round((dailyTarget * 0.25) / 9),     // 25% of calories
  };

  const macroProgress = {
    protein: Math.min(1, todayStats.protein / targetMacros.protein),
    carbs: Math.min(1, todayStats.carbohydrates / targetMacros.carbs),
    fat: Math.min(1, todayStats.fat / targetMacros.fat),
  };

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="flex-1 bg-[#f8fafc] dark:bg-[#050510]"
    >
      <View
        className="flex-1"
        onLayout={(e) => {
          const height = e.nativeEvent.layout.height;
          setContainerHeight((current) => (height > current ? height : current));
        }}
      >
      {/* Side Dots Indicator overlay */}
      {containerHeight > 0 && (
        <View className="absolute right-3.5 top-[40%] z-50 bg-black/5 dark:bg-white/5 rounded-full py-2.5 px-1 gap-2 items-center">
          {[0, 1, 2, 3].map((idx) => {
            const isSel = idx === activeSection;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => scrollToSection(idx)}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isSel
                    ? '#8b5cf6'
                    : isDark
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(15, 23, 42, 0.18)',
                  transform: [{ scale: isSel ? 1.25 : 1.0 }],
                }}
              />
            );
          })}
        </View>
      )}

      {containerHeight > 0 && (
        <ScrollView
          ref={scrollRef}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          className="flex-1"
        >
          {/* ======================================================== */}
          {/* SECTION 1: DAILY CALORIE BALANCE RING */}
          {/* ======================================================== */}
          <View style={{ height: containerHeight }} className="px-5 py-5 justify-center gap-5 flex-col">
            <View className="flex-col gap-1">
              <Text className="text-xs font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                Daily Balance
              </Text>
              <Text className="text-2xl font-black text-text-primary-light dark:text-text-primary-dark">
                Energy Intake
              </Text>
            </View>

            {/* Integrated Svg Ring + Macronutrients Row Card */}
            <View className="bg-white dark:bg-[#0f0f23] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-3xl p-5 flex-row gap-5 items-center shadow-sm">
              {/* Left Side: Svg Progress Ring */}
              <View className="items-center justify-center relative" style={{ width: 120, height: 120 }}>
                <Svg width={120} height={120} viewBox="0 0 120 120">
                  {/* Background loop */}
                  <Circle
                    cx={60}
                    cy={60}
                    r={50}
                    stroke={isDark ? '#1a1a38' : '#e2e8f0'}
                    strokeWidth={10}
                    fill="none"
                  />
                  {/* Progress bar loop */}
                  <Circle
                    cx={60}
                    cy={60}
                    r={50}
                    stroke="#8b5cf6"
                    strokeWidth={10}
                    fill="none"
                    strokeDasharray={314.16}
                    strokeDashoffset={314.16 - Math.min(1, todayStats.calories / dailyTarget) * 314.16}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </Svg>

                {/* Inner ring info */}
                <View className="absolute items-center justify-center">
                  <Text className="text-lg font-black text-text-primary-light dark:text-text-primary-dark">
                    {todayStats.calories}
                  </Text>
                  <Text className="text-[8px] font-extrabold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wide mt-0.5">
                    / {dailyTarget}
                  </Text>
                  <Text className="text-[7px] font-bold text-brand-500 uppercase tracking-wide mt-0.5">
                    kcal
                  </Text>
                </View>
              </View>

              {/* Right Side: Macronutrients Stack */}
              <View className="flex-1 gap-2.5 flex-col justify-center">
                {/* Calories Remaining Pill */}
                <View className="bg-brand-900/10 dark:bg-brand-500/15 border border-brand-500/20 px-3 py-1 rounded-2xl items-center justify-center">
                  <Text className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider text-center">
                    {dailyTarget - todayStats.calories >= 0
                      ? `${dailyTarget - todayStats.calories} kcal left`
                      : `${Math.abs(dailyTarget - todayStats.calories)} kcal over`}
                  </Text>
                </View>

                {/* Protein */}
                <View className="gap-0.5 flex-col">
                  <View className="flex-row justify-between items-center text-[10px]">
                    <Text className="font-bold text-text-primary-light dark:text-text-primary-dark">Protein</Text>
                    <Text className="font-semibold text-text-secondary-light dark:text-text-secondary-dark text-[9px]">
                      {todayStats.protein}g/{targetMacros.protein}g
                    </Text>
                  </View>
                  <View className="h-1.5 rounded-full bg-[#f1f5f9] dark:bg-[#1a1a38] overflow-hidden">
                    <View
                      style={{ width: `${macroProgress.protein * 100}%` }}
                      className="h-full bg-brand-500 rounded-full"
                    />
                  </View>
                </View>

                {/* Carbohydrates */}
                <View className="gap-0.5 flex-col">
                  <View className="flex-row justify-between items-center text-[10px]">
                    <Text className="font-bold text-text-primary-light dark:text-text-primary-dark">Carbs</Text>
                    <Text className="font-semibold text-text-secondary-light dark:text-text-secondary-dark text-[9px]">
                      {todayStats.carbohydrates}g/{targetMacros.carbs}g
                    </Text>
                  </View>
                  <View className="h-1.5 rounded-full bg-[#f1f5f9] dark:bg-[#1a1a38] overflow-hidden">
                    <View
                      style={{ width: `${macroProgress.carbs * 100}%` }}
                      className="h-full bg-accent-500 rounded-full"
                    />
                  </View>
                </View>

                {/* Fat */}
                <View className="gap-0.5 flex-col">
                  <View className="flex-row justify-between items-center text-[10px]">
                    <Text className="font-bold text-text-primary-light dark:text-text-primary-dark">Fat</Text>
                    <Text className="font-semibold text-text-secondary-light dark:text-text-secondary-dark text-[9px]">
                      {todayStats.fat}g/{targetMacros.fat}g
                    </Text>
                  </View>
                  <View className="h-1.5 rounded-full bg-[#f1f5f9] dark:bg-[#1a1a38] overflow-hidden">
                    <View
                      style={{ width: `${macroProgress.fat * 100}%` }}
                      className="h-full bg-energy-500 rounded-full"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Swipe helper */}
            <TouchableOpacity onPress={() => scrollToSection(1)} className="items-center py-1 gap-0.5 flex-col">
              <Text className="text-[9px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest">
                Swipe UP to Food Log
              </Text>
              <ChevronDown color="#94a3b8" size={14} />
            </TouchableOpacity>
          </View>

          {/* ======================================================== */}
          {/* SECTION 2: FOOD ENTRIES LIST & FAB */}
          {/* ======================================================== */}
          <View style={{ height: containerHeight }} className="px-5 py-5 justify-center gap-5 flex-col relative">
            <View className="flex-col gap-1">
              <Text className="text-xs font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                Diary Entries
              </Text>
              <Text className="text-2xl font-black text-text-primary-light dark:text-text-primary-dark">
                Food Diary
              </Text>
            </View>

            {/* Diary Items scroll container - Fixed percentage height */}
            <View 
              style={{ height: containerHeight * 0.52 }} 
              className="bg-white dark:bg-[#0f0f23] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-3xl p-4 overflow-hidden relative shadow-sm"
            >
              {allEntries.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                  <View className="w-14 h-14 rounded-full bg-[#f1f5f9] dark:bg-[#1a1a38] items-center justify-center mb-3">
                    <Utensils color="#94a3b8" size={24} />
                  </View>
                  <Text className="text-text-primary-light dark:text-text-primary-dark font-extrabold text-sm text-center">
                    No Food Logged Yet
                  </Text>
                  <Text className="text-text-secondary-light dark:text-text-secondary-dark text-[10px] text-center mt-1">
                    Tap the floating action button below to scan or enter your meal!
                  </Text>
                </View>
              ) : (
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} className="w-full">
                  <View className="gap-3 flex-col">
                    {allEntries.map((item) => {
                      const isProc = item.status === 'processing';
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => !isProc && handleOpenDetail(item)}
                          disabled={isProc}
                          className="flex-row items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a]/40 rounded-2xl"
                        >
                          <View className="flex-row items-center gap-3.5 flex-1">
                            {/* Icon or Photo emoji placeholder */}
                            <View className="w-11 h-11 rounded-xl bg-white dark:bg-[#0f0f23] items-center justify-center border border-[#e2e8f0] dark:border-[#2a2a4a]">
                              {isProc ? (
                                <ActivityIndicator size="small" color="#8b5cf6" />
                              ) : (
                                <Text className="text-xl">{item.photo_uri || '🍽️'}</Text>
                              )}
                            </View>
                            <View className="flex-1 gap-0.5">
                              <Text className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark" numberOfLines={1}>
                                {isProc ? 'AI Scanning Food...' : item.food_name}
                              </Text>
                              <View className="flex-row items-center gap-1.5 flex-wrap">
                                <View className="flex-row items-center gap-0.5">
                                  <Calendar size={8} color="#94a3b8" />
                                  <Text className="text-[9px] font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                                    {item.date}
                                  </Text>
                                </View>
                                {!isProc && (
                                  <>
                                    <Text className="text-text-secondary-light dark:text-text-secondary-dark/60 text-[8px]">•</Text>
                                    <Text className="text-[9px] font-bold text-brand-500">
                                      P: {item.protein}g • F: {item.fat}g • C: {item.carbohydrates}g
                                    </Text>
                                  </>
                                )}
                              </View>
                            </View>
                          </View>

                          {/* Calories Badge */}
                          {isProc ? (
                            <View className="bg-brand-100 dark:bg-brand-900/30 px-2.5 py-0.5 rounded-full border border-brand-500/20">
                              <Text className="text-[9px] font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-wider animate-pulse">
                                Analyzing
                              </Text>
                            </View>
                          ) : (
                            <View className="bg-[#ede9fe] dark:bg-brand-900/20 px-2.5 py-0.5 rounded-full border border-brand-500/20">
                              <Text className="text-xs font-black text-brand-600 dark:text-brand-400">
                                +{item.calories} kcal
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Section FAB - Positioned beautifully inside the safe padding area */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/add-calorie-entry');
              }}
              style={{ bottom: 25, right: 25 }}
              className="absolute z-50 w-12 h-12 rounded-full bg-brand-500 shadow-md shadow-brand-500/30 items-center justify-center border border-brand-600 active:scale-95"
            >
              <Plus color="white" size={22} strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Bottom Swipe helper */}
            <TouchableOpacity onPress={() => scrollToSection(2)} className="items-center py-1 gap-0.5 flex-col">
              <Text className="text-[9px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest">
                Swipe UP for Heatmap
              </Text>
              <ChevronDown color="#94a3b8" size={14} />
            </TouchableOpacity>
          </View>

          {/* ======================================================== */}
          {/* SECTION 3: CALORIE HEATMAP SCREEN */}
          {/* ======================================================== */}
          <View style={{ height: containerHeight }} className="px-5 py-5 justify-center gap-5 flex-col">
            <View className="flex-col gap-1">
              <Text className="text-xs font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                Calorie Heatmap
              </Text>
              <Text className="text-2xl font-black text-text-primary-light dark:text-text-primary-dark">
                Achievement Calendar
              </Text>
            </View>

            {/* Calorie Heatmap Core */}
            <View className="py-2">
              <CalorieHeatmap calorieData={heatmapData} targetCalories={dailyTarget} />
            </View>

            {/* Bottom Swipe helper */}
            <TouchableOpacity onPress={() => scrollToSection(3)} className="items-center py-1 gap-0.5 flex-col">
              <Text className="text-[9px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest">
                Swipe UP for Calculator
              </Text>
              <ChevronDown color="#94a3b8" size={14} />
            </TouchableOpacity>
          </View>

          {/* ======================================================== */}
          {/* SECTION 4: GOAL & TIMELINE CALCULATOR */}
          {/* ======================================================== */}
          <View style={{ height: containerHeight }} className="px-5 py-5 justify-center gap-5 flex-col">
            <View className="flex-col gap-1">
              <Text className="text-xs font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                Goal Calculator
              </Text>
              <Text className="text-2xl font-black text-text-primary-light dark:text-text-primary-dark">
                Target & Timeline
              </Text>
            </View>

            {/* Calculator Card Container - Fixed percentage height */}
            <View 
              style={{ height: containerHeight * 0.62 }} 
              className="bg-white dark:bg-[#0f0f23] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-3xl p-5 overflow-hidden shadow-sm"
            >
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} className="w-full">
                <View className="gap-4 flex-col pb-6">
                  
                  {/* Gender row */}
                  <View className="gap-1.5">
                    <Text className="text-[10px] font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">Gender</Text>
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => setCalcGender('male')}
                        className={`flex-1 py-3 rounded-2xl border items-center justify-center ${
                          calcGender === 'male'
                            ? 'bg-brand-500 border-brand-600'
                            : 'bg-[#f8fafc] dark:bg-[#1a1a38] border-[#e2e8f0] dark:border-[#2a2a4a]'
                        }`}
                      >
                        <Text className={`font-bold text-sm ${calcGender === 'male' ? 'text-white' : 'text-[#0f172a] dark:text-[#f8fafc]'}`}>
                          Male
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setCalcGender('female')}
                        className={`flex-1 py-3 rounded-2xl border items-center justify-center ${
                          calcGender === 'female'
                            ? 'bg-brand-500 border-brand-600'
                            : 'bg-[#f8fafc] dark:bg-[#1a1a38] border-[#e2e8f0] dark:border-[#2a2a4a]'
                        }`}
                      >
                        <Text className={`font-bold text-sm ${calcGender === 'female' ? 'text-white' : 'text-[#0f172a] dark:text-[#f8fafc]'}`}>
                          Female
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Age & Height & Weight grid */}
                  <View className="flex-row gap-3">
                    {/* Age Button */}
                    <TouchableOpacity
                      onPress={() => handleOpenInputModal('age', calcAge, 'Age', 'years')}
                      className="flex-1 bg-[#f8fafc] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl p-3 items-center flex-col gap-0.5"
                    >
                      <Text className="text-[9px] font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">Age</Text>
                      <Text className="text-sm font-black text-brand-500">{calcAge} yrs</Text>
                    </TouchableOpacity>

                    {/* Height Button */}
                    <TouchableOpacity
                      onPress={() => handleOpenInputModal('height', calcHeight, 'Height', 'cm')}
                      className="flex-1 bg-[#f8fafc] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl p-3 items-center flex-col gap-0.5"
                    >
                      <Text className="text-[9px] font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">Height</Text>
                      <Text className="text-sm font-black text-brand-500">{calcHeight} cm</Text>
                    </TouchableOpacity>

                    {/* Weight Button */}
                    <TouchableOpacity
                      onPress={() => handleOpenInputModal('weight', calcWeight, 'Weight', 'kg')}
                      className="flex-1 bg-[#f8fafc] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl p-3 items-center flex-col gap-0.5"
                    >
                      <Text className="text-[9px] font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">Weight</Text>
                      <Text className="text-sm font-black text-brand-500">{calcWeight} kg</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 1. Activity Level Selector */}
                  <View className="gap-1.5">
                    <Text className="text-[10px] font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">Activity Level</Text>
                    <View className="border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl overflow-hidden bg-[#f8fafc] dark:bg-[#1a1a38] flex-col">
                      {[
                        { label: 'Sedentary (mostly sitting, desk job)', val: '1.2' },
                        { label: 'Lightly Active (exercise 1-3 days/week)', val: '1.375' },
                        { label: 'Moderately Active (exercise 3-5 days/week)', val: '1.55' },
                        { label: 'Very Active (hard training 6-7 days/week)', val: '1.725' },
                        { label: 'Extra Active (athlete level, physical labor)', val: '1.9' },
                      ].map((item) => {
                        const isSel = calcActivity === item.val;
                        return (
                          <TouchableOpacity
                            key={item.val}
                            onPress={() => setCalcActivity(item.val)}
                            className={`py-2 px-4 flex-row justify-between items-center border-b border-[#e2e8f0]/40 dark:border-[#2a2a4a]/20 ${
                              isSel ? 'bg-brand-500/10' : ''
                            }`}
                          >
                            <Text className={`text-xs font-bold ${isSel ? 'text-brand-500' : 'text-[#475569] dark:text-[#94a3b8]'}`}>
                              {item.label}
                            </Text>
                            {isSel && <Check size={14} color="#8b5cf6" strokeWidth={3} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* 2. Target bodyweight */}
                  <View className="gap-1.5">
                    <Text className="text-[10px] font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">Target bodyweight (kg)</Text>
                    <TouchableOpacity
                      onPress={() => handleOpenInputModal('targetWeight', calcTargetWeight, 'Target Bodyweight', 'kg')}
                      className="bg-[#f8fafc] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl flex-row items-center justify-between px-5 py-3.5"
                    >
                      <Text className="text-text-primary-light dark:text-text-primary-dark text-base font-bold">
                        {calcTargetWeight} kg
                      </Text>
                      <Scale color="#8b5cf6" size={18} />
                    </TouchableOpacity>
                  </View>

                  {/* 3. Speed Selector */}
                  <View className="gap-1.5">
                    <Text className="text-[10px] font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">Speed</Text>
                    <View className="flex-row border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl overflow-hidden bg-[#f8fafc] dark:bg-[#1a1a38] h-12">
                      {['slow', 'moderate', 'extreme'].map((rate) => {
                        const isSel = calcProgress === rate;
                        return (
                          <TouchableOpacity
                            key={rate}
                            onPress={() => setCalcProgress(rate as any)}
                            className={`flex-1 items-center justify-center ${
                              isSel ? 'bg-brand-500' : ''
                            }`}
                          >
                            <Text className={`text-xs font-extrabold uppercase ${isSel ? 'text-white' : 'text-[#475569] dark:text-[#94a3b8]'}`}>
                              {rate}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Calculate Button */}
                  <TouchableOpacity onPress={handleCalculateGoal} className="shadow-lg shadow-brand-500/10 mt-2">
                    <LinearGradient
                      colors={['#8b5cf6', '#06b6d4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="py-3 rounded-2xl items-center justify-center"
                    >
                      <Text className="text-white font-black text-sm uppercase tracking-widest">
                        Calculate Target & Timeline
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Calculation Result Drawer */}
                  {calcResult && (
                    <View className="mt-4 bg-[#ede9fe]/40 dark:bg-brand-900/10 border border-brand-500/20 rounded-2xl p-4 gap-4 flex-col">
                      <View className="flex-col gap-1">
                        <Text className="text-brand-600 dark:text-brand-400 font-extrabold text-[10px] uppercase tracking-wider">
                          Result Assessment
                        </Text>
                        <Text className="text-text-primary-light dark:text-text-primary-dark font-extrabold text-base">
                          {calcResult.goalType === 'loss'
                            ? 'Calorie Deficit Routine'
                            : calcResult.goalType === 'gain'
                            ? 'Lean Bulking Routine'
                            : 'Maintenance Routine'}
                        </Text>
                      </View>

                      <View className="flex-row justify-between items-center border-b border-brand-500/10 pb-3 flex-wrap">
                        <View className="flex-col gap-0.5">
                          <Text className="text-text-secondary-light dark:text-text-secondary-dark text-[10px] font-bold uppercase">Target Calories</Text>
                          <Text className="text-2xl font-black text-brand-600 dark:text-brand-400">{calcResult.target} kcal</Text>
                        </View>
                        <View className="flex-col items-end gap-0.5">
                          <Text className="text-text-secondary-light dark:text-text-secondary-dark text-[10px] font-bold uppercase">Estimated Timeline</Text>
                          {calcResult.goalType === 'maintain' ? (
                            <Text className="text-sm font-bold text-emerald-500">Already at target!</Text>
                          ) : (
                            <Text className="text-sm font-black text-text-primary-light dark:text-text-primary-dark">
                              {calcResult.daysToGoal} days
                            </Text>
                          )}
                        </View>
                      </View>

                      {calcResult.goalType !== 'maintain' && (
                        <View className="flex-row items-start gap-2 border-b border-brand-500/10 pb-3">
                          <Info size={14} color="#8b5cf6" style={{ marginTop: 2 }} />
                          <Text className="text-[11px] leading-4 text-text-secondary-light dark:text-text-secondary-dark flex-1">
                            At your selected pace, you will reach your target weight of{' '}
                            <Text className="font-extrabold text-text-primary-light dark:text-text-primary-dark">{calcTargetWeight} kg</Text> on{' '}
                            <Text className="font-extrabold text-brand-600 dark:text-brand-400">{calcResult.goalDate}</Text>.
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={handleApplyDailyTarget}
                        className="py-2.5 rounded-xl bg-brand-500 active:bg-brand-600 flex-row gap-1.5 items-center justify-center shadow-md shadow-brand-500/15"
                      >
                        <Check color="white" size={14} strokeWidth={2.5} />
                        <Text className="text-white text-xs font-extrabold uppercase tracking-wider">
                          Apply Daily Target
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                </View>
              </ScrollView>
            </View>

            {/* Bottom Swipe helper */}
            <TouchableOpacity onPress={() => scrollToSection(0)} className="items-center py-1 gap-0.5 flex-col">
              <ChevronUp color="#94a3b8" size={14} />
              <Text className="text-[9px] font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-widest">
                Back to Daily Ring
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ======================================================== */}
      {/* 5. FOOD ENTRY DETAILS MODAL POPUP */}
      {/* ======================================================== */}
      {selectedEntry && (
        <Modal
          animationType="fade"
          transparent
          visible={detailModalVisible}
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center px-5">
            <View className="bg-white dark:bg-[#0f0f23] rounded-3xl border border-[#e2e8f0] dark:border-[#2a2a4a] w-full p-6 shadow-2xl gap-5 flex-col max-h-[85%]">
              
              {/* Modal Header */}
              <View className="flex-row justify-between items-center border-b border-[#e2e8f0]/60 dark:border-[#2a2a4a]/40 pb-3 flex-wrap">
                <View className="flex-col gap-0.5 flex-1">
                  <Text className="text-[#0f172a] dark:text-[#f8fafc] font-black text-xl leading-5">
                    {selectedEntry.food_name}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-1">
                    <Clock size={10} color="#94a3b8" />
                    <Text className="text-[10px] font-bold text-[#475569] dark:text-[#94a3b8]">
                      Logged: {selectedEntry.date}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setDetailModalVisible(false)}
                  className="w-8 h-8 rounded-full bg-[#f1f5f9] dark:bg-[#1a1a38] items-center justify-center"
                >
                  <X color="#94a3b8" size={16} />
                </TouchableOpacity>
              </View>

              {/* Modal Scroll Container */}
              <ScrollView showsVerticalScrollIndicator={false} className="w-full">
                <View className="gap-5 flex-col pb-4">
                  {/* Photo Emoji display */}
                  <View className="w-full aspect-[2/1] bg-[#f8fafc] dark:bg-[#1a1a38] rounded-2xl items-center justify-center border border-[#e2e8f0] dark:border-[#2a2a4a]/40 relative overflow-hidden">
                    <Text className="text-7xl">{selectedEntry.photo_uri || '🍽️'}</Text>
                    {selectedEntry.text_input && (
                      <View className="absolute bottom-2 left-2 right-2 bg-black/60 px-3 py-1.5 rounded-xl border border-white/5">
                        <Text className="text-white text-[10px] italic leading-3 text-center" numberOfLines={2}>
                          "{selectedEntry.text_input}"
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Calories Banner */}
                  <View className="bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/30 rounded-2xl p-4 flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <Flame color="#fb7185" size={20} />
                      <Text className="text-xs font-bold text-[#0f172a] dark:text-[#f8fafc]">Estimated Calories</Text>
                    </View>
                    <Text className="text-2xl font-black text-brand-600 dark:text-brand-400">
                      {selectedEntry.calories} kcal
                    </Text>
                  </View>

                  {/* Macronutrients Grid cards */}
                  <View className="gap-1.5 flex-col">
                    <Text className="text-[10px] font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">Macronutrients Breakdown</Text>
                    <View className="flex-row justify-between gap-3">
                      {/* Protein */}
                      <View className="flex-1 bg-[#ede9fe]/40 dark:bg-brand-900/10 border border-brand-500/10 rounded-2xl p-3.5 items-center flex-col gap-0.5">
                        <Text className="text-xs font-bold text-[#0f172a] dark:text-[#f8fafc]">Protein</Text>
                        <Text className="text-lg font-black text-brand-500">{selectedEntry.protein}g</Text>
                      </View>
                      {/* Carbs */}
                      <View className="flex-1 bg-[#ecfdf5] dark:bg-emerald-950/10 border border-emerald-500/10 rounded-2xl p-3.5 items-center flex-col gap-0.5">
                        <Text className="text-xs font-bold text-[#0f172a] dark:text-[#f8fafc]">Carbs</Text>
                        <Text className="text-lg font-black text-emerald-500">{selectedEntry.carbohydrates}g</Text>
                      </View>
                      {/* Fat */}
                      <View className="flex-1 bg-[#fff1f2] dark:bg-rose-950/10 border border-rose-500/10 rounded-2xl p-3.5 items-center flex-col gap-0.5">
                        <Text className="text-xs font-bold text-[#0f172a] dark:text-[#f8fafc]">Fat</Text>
                        <Text className="text-lg font-black text-rose-500">{selectedEntry.fat}g</Text>
                      </View>
                    </View>
                  </View>

                  {/* Ingredients List */}
                  {selectedEntry.ingredients && (
                    <View className="gap-2.5 flex-col">
                      <Text className="text-[10px] font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">
                        AI-Extracted Ingredients
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {JSON.parse(selectedEntry.ingredients).map((ing: string, idx: number) => (
                          <View
                            key={idx}
                            className="bg-[#f1f5f9] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a]/85 rounded-full px-3 py-1 flex-row gap-1 items-center"
                          >
                            <Sparkles size={9} color="#8b5cf6" />
                            <Text className="text-xs font-semibold text-[#0f172a] dark:text-[#f8fafc]">
                              {ing}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Delete Button footer */}
              <TouchableOpacity
                onPress={() => handleDeleteEntry(selectedEntry.id)}
                className="mt-2 py-3 rounded-2xl bg-[#fff1f2] dark:bg-[#4c0519]/40 border border-[#fecdd3]/60 dark:border-rose-900/40 items-center justify-center flex-row gap-1.5"
              >
                <Trash2 color="#f43f5e" size={15} />
                <Text className="text-[#f43f5e] font-extrabold text-xs uppercase tracking-wider">
                  Delete Meal Log
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 6. DEDICATED INPUT MODAL DIALOG FOR CALCULATOR FIELDS */}
      {/* ======================================================== */}
      <Modal
        animationType="fade"
        transparent
        visible={inputModalVisible}
        onRequestClose={() => setInputModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="w-full"
          >
            <View className="bg-white dark:bg-[#0f0f23] border border-[#e2e8f0] dark:border-[#2a2a4a] w-full p-6 shadow-2xl gap-5 flex-col">
              
              {/* Modal Header */}
              <View className="flex-row justify-between items-center border-b border-[#e2e8f0]/60 dark:border-[#2a2a4a]/40 pb-3">
                <Text className="text-text-primary-light dark:text-text-primary-dark font-extrabold text-lg">
                  Enter {modalTitle}
                </Text>
                <TouchableOpacity
                  onPress={() => setInputModalVisible(false)}
                  className="w-8 h-8 rounded-full bg-[#f1f5f9] dark:bg-[#1a1a38] items-center justify-center"
                >
                  <X color="#94a3b8" size={16} />
                </TouchableOpacity>
              </View>

              {/* Text Input Row */}
              <View className="flex-row items-center gap-3 bg-[#f8fafc] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl px-4 py-2">
                <TextInput
                  value={modalValue}
                  onChangeText={setModalValue}
                  keyboardType="numeric"
                  autoFocus
                  placeholder={`e.g. ${modalField === 'age' ? '25' : modalField === 'height' ? '175' : '70'}`}
                  placeholderTextColor="#64748b"
                  className="flex-1 text-[#0f172a] dark:text-[#f8fafc] font-black text-2xl py-2"
                />
                <Text className="text-base font-extrabold text-[#8b5cf6]">{modalUnit}</Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setInputModalVisible(false)}
                  className="flex-1 py-3 rounded-2xl bg-[#f1f5f9] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a] items-center justify-center"
                >
                  <Text className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                    Cancel
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleSaveModalInput}
                  className="flex-1"
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#06b6d4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-3 rounded-2xl items-center justify-center"
                  >
                    <Text className="text-white text-xs font-extrabold uppercase tracking-wider">
                      Save Value
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      </View>
    </View>
  );
}
