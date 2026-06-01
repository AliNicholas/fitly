import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Image as ImageIcon, Calendar, X, Check, RefreshCw, Flame, HelpCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../contexts/ThemeContext';
import { addCalorieEntry } from '../db/calories';
import { useCustomDialog } from '../components/CustomDialog';
import { LinearGradient } from 'expo-linear-gradient';

// Premium preloaded dishes for the mock photo selection
const MOCK_DISHES = [
  {
    name: 'Grilled Salmon & Broccoli',
    emoji: '🍣',
    calories: 540,
    protein: 42,
    fat: 28,
    carbs: 18,
    ingredients: ['Fresh Atlantic Salmon', 'Steamed Broccoli Florets', 'Extra Virgin Olive Oil', 'Garlic Herb Butter', 'Lemon Vinaigrette'],
    description: 'A high-protein, heart-healthy meal rich in Omega-3 fatty acids and clean micronutrients.',
  },
  {
    name: 'Avocado Toast & Poached Eggs',
    emoji: '🥑',
    calories: 420,
    protein: 18,
    fat: 22,
    carbs: 28,
    ingredients: ['Sourdough Bread Toast', 'Hass Avocado Mash', 'Organic Poached Eggs', 'Red Pepper Flakes', 'Microgreens'],
    description: 'Sourdough toast topped with fresh crushed avocado, healthy fats, and perfectly runny poached eggs.',
  },
  {
    name: 'Berry Protein Smoothie Bowl',
    emoji: '🍓',
    calories: 350,
    protein: 28,
    fat: 6,
    carbs: 48,
    ingredients: ['Whey Isolate Protein', 'Mixed Organic Berries', 'Almond Milk', 'Chia Seeds', 'Granola Topping', 'Banana Slices'],
    description: 'A refreshing energy bowl loaded with antioxidants, fiber, and lean protein.',
  },
  {
    name: 'Lean Ribeye Steak & Asparagus',
    emoji: '🥩',
    calories: 680,
    protein: 54,
    fat: 38,
    carbs: 12,
    ingredients: ['Grass-Fed Ribeye Steak', 'Grilled Asparagus Spears', 'Sea Salt & Black Pepper', 'Rosemary Butter Garlic Infusion'],
    description: 'Savory grass-fed ribeye seared with butter and garlic, served with crisp grilled asparagus.',
  },
  {
    name: 'Fresh Tuna Sushi Roll Set',
    emoji: '🍣',
    calories: 490,
    protein: 26,
    fat: 8,
    carbs: 64,
    ingredients: ['Sashimi Grade Yellowfin Tuna', 'Vinegared Sushi Rice', 'Nori Seaweed', 'Cucumber Strips', 'Pickled Ginger & Wasabi'],
    description: 'Fresh sushi-grade tuna rolled with cucumber, providing clean, fast-digesting carbohydrates and lean protein.',
  },
  {
    name: 'Classic Acai Power Bowl',
    emoji: '🍧',
    calories: 380,
    protein: 12,
    fat: 10,
    carbs: 52,
    ingredients: ['Pure Acai Berry Puree', 'Organic Hemp Seeds', 'Sliced Strawberries', 'Blueberries', 'Toasted Coconut Flakes', 'Raw Clover Honey'],
    description: 'Energy-dense Brazilian acai topped with coconut flakes, fresh fruit, and premium raw honey.',
  },
];

export default function AddCalorieEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showDialog } = useCustomDialog();
  const { colors, isDark } = useAppTheme();

  // Form Fields State
  const [textInput, setTextInput] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${mm}-${dd}`;
  });
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedDishIdx, setSelectedDishIdx] = useState<number | null>(null);

  // Modal Controllers
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [galleryModalVisible, setGalleryModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  // Camera simulation state
  const [isSnapping, setIsSnapping] = useState(false);

  // Handle snapping photo (camera simulation)
  const handleSnap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSnapping(true);

    setTimeout(() => {
      // Pick a random dish index
      const randomIdx = Math.floor(Math.random() * MOCK_DISHES.length);
      const dish = MOCK_DISHES[randomIdx];

      setSelectedPhoto(dish.emoji);
      setSelectedDishIdx(randomIdx);
      setTextInput(dish.name);
      setIsSnapping(false);
      setCameraModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1800); // 1.8s scanning animation
  };

  // Handle selecting a dish from mock gallery
  const handleSelectGalleryDish = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const dish = MOCK_DISHES[idx];
    setSelectedPhoto(dish.emoji);
    setSelectedDishIdx(idx);
    setTextInput(dish.name);
    setGalleryModalVisible(false);
  };

  // Custom Inline Calendar Generator
  const calendarDays = React.useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0-6
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Pad previous empty days
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    // Month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, []);

  const handleSelectDate = (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setDate(`${today.getFullYear()}-${mm}-${dd}`);
    setCalendarModalVisible(false);
  };

  // Save entry
  const handleSaveEntry = async () => {
    if (!textInput.trim() && !selectedPhoto) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showDialog({
        title: 'Input Required',
        message: 'Please provide either a food description text, a photo log, or both.',
      });
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      let finalFoodName = 'Custom Food Entry';
      let finalCalories = 350; // default mock
      let finalProtein = 20;
      let finalFat = 10;
      let finalCarbs = 40;
      let finalIngredients = ['Custom ingredients entered by user'];

      // If they picked one of the preloaded dishes, we can auto-fill nutrients!
      if (selectedDishIdx !== null && MOCK_DISHES[selectedDishIdx]) {
        const dish = MOCK_DISHES[selectedDishIdx];
        finalFoodName = dish.name;
        finalCalories = dish.calories;
        finalProtein = dish.protein;
        finalFat = dish.fat;
        finalCarbs = dish.carbs;
        finalIngredients = dish.ingredients;
      } else {
        // Auto-detect based on text keywords for fun extra fidelity!
        const txt = textInput.toLowerCase();
        if (txt.includes('banana')) {
          finalFoodName = 'Fresh Banana';
          finalCalories = 105; finalProtein = 1.3; finalFat = 0.3; finalCarbs = 27;
          finalIngredients = ['Fresh Ripe Banana'];
        } else if (txt.includes('egg') || txt.includes('eggs')) {
          finalFoodName = 'Scrambled Eggs & Butter';
          finalCalories = 220; finalProtein = 13; finalFat = 18; finalCarbs = 1.5;
          finalIngredients = ['Fresh Eggs', 'Creamy Butter', 'Pinch of Black Pepper'];
        } else if (txt.includes('chicken')) {
          finalFoodName = 'Grilled Chicken Breast & Rice';
          finalCalories = 580; finalProtein = 46; finalFat = 14; finalCarbs = 62;
          finalIngredients = ['Boneless Chicken Breast', 'Jasmine White Rice', 'Sesame Oil', 'Soy Glaze'];
        } else if (txt.includes('apple')) {
          finalFoodName = 'Organic Red Apple';
          finalCalories = 95; finalProtein = 0.5; finalFat = 0.3; finalCarbs = 25;
          finalIngredients = ['Gala Apple'];
        } else if (txt.includes('salad')) {
          finalFoodName = 'Mediterranean Salad';
          finalCalories = 280; finalProtein = 8; finalFat = 20; finalCarbs = 18;
          finalIngredients = ['Romaine Lettuce', 'Feta Cheese', 'Kalamata Olives', 'Cucumber', 'Vinaigrette'];
        } else {
          // Standard smart mock fallback
          finalFoodName = textInput.trim().substring(0, 32) || 'Log Entry';
          // Calculate generic numbers based on text length to make it variable
          const val = (textInput.length * 7) % 300 + 150;
          finalCalories = val;
          finalProtein = Math.round(val * 0.04);
          finalFat = Math.round(val * 0.02);
          finalCarbs = Math.round(val * 0.1);
          finalIngredients = [textInput.trim(), 'Trace olive oil', 'Herbal seasonings'];
        }
      }

      // Add to database
      await addCalorieEntry({
        date,
        photo_uri: selectedPhoto,
        text_input: textInput || null,
        food_name: finalFoodName,
        status: 'processing', // starts as processing, Section 2 will animate and complete it!
        ingredients: JSON.stringify(finalIngredients),
        calories: finalCalories,
        protein: finalProtein,
        fat: finalFat,
        carbohydrates: finalCarbs,
      });

      router.back();
    } catch (err) {
      console.error(err);
      showDialog({
        title: 'Error Saving',
        message: 'Could not write food entry to local vault.',
      });
    }
  };

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#f8fafc] dark:bg-[#050510]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {/* Top Navigation Header */}
        <View className="px-5 py-4 flex-row items-center gap-4 border-b border-[#e2e8f0] dark:border-[#2a2a4a]">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-11 h-11 rounded-2xl bg-white dark:bg-[#0f0f23] border border-[#e2e8f0] dark:border-[#2a2a4a] items-center justify-center"
          >
            <ArrowLeft color="#94a3b8" size={22} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[#0f172a] dark:text-[#f8fafc] font-extrabold text-xl">Log Food Meal</Text>
            <Text className="text-[#475569] dark:text-[#94a3b8] text-sm mt-0.5">Track calories & macronutrients.</Text>
          </View>
          <View className="w-11 h-11 rounded-2xl bg-brand-900/40 border border-brand-500/30 items-center justify-center">
            <Flame color="#fb7185" size={21} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Main Card */}
          <View className="bg-white dark:bg-[#0f0f23] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-3xl p-6 gap-6 shadow-md">
            
            {/* Visual Logger Section (Photo Upload/Take) */}
            <View className="gap-2.5">
              <Text className="text-xs font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">
                Photo Logger
              </Text>
              
              {selectedPhoto ? (
                <View className="bg-[#ede9fe] dark:bg-[#1a1a38] border border-brand-500/20 rounded-2xl p-6 items-center justify-center relative overflow-hidden flex-col gap-2 shadow-inner">
                  <Text className="text-6xl">{selectedPhoto}</Text>
                  <Text className="text-[#0f172a] dark:text-[#f8fafc] font-bold text-base mt-2">
                    {MOCK_DISHES[selectedDishIdx!]?.name || 'Photo Logged!'}
                  </Text>
                  <Text className="text-xs text-[#8b5cf6] font-bold uppercase tracking-widest">
                    Ready for AI recognition
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedPhoto(null);
                      setSelectedDishIdx(null);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white dark:bg-[#0f0f23] border border-[#e2e8f0] dark:border-[#2a2a4a] items-center justify-center shadow-sm"
                  >
                    <X color="#f43f5e" size={16} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCameraModalVisible(true);
                    }}
                    className="flex-1 bg-[#f8fafc] dark:bg-[#1a1a38] border border-dashed border-[#cbd5e1] dark:border-[#2a2a4a] rounded-2xl py-6 items-center justify-center gap-2"
                  >
                    <View className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 items-center justify-center">
                      <Camera color="#8b5cf6" size={20} />
                    </View>
                    <Text className="text-sm font-semibold text-[#0f172a] dark:text-[#f8fafc]">Take Photo</Text>
                    <Text className="text-[10px] text-[#475569] dark:text-[#94a3b8] text-center">Use simulated AI scanner</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGalleryModalVisible(true);
                    }}
                    className="flex-1 bg-[#f8fafc] dark:bg-[#1a1a38] border border-dashed border-[#cbd5e1] dark:border-[#2a2a4a] rounded-2xl py-6 items-center justify-center gap-2"
                  >
                    <View className="w-10 h-10 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/30 items-center justify-center">
                      <ImageIcon color="#10b981" size={20} />
                    </View>
                    <Text className="text-sm font-semibold text-[#0f172a] dark:text-[#f8fafc]">Upload Image</Text>
                    <Text className="text-[10px] text-[#475569] dark:text-[#94a3b8] text-center">Choose from food gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Description Text Input */}
            <View className="gap-2">
              <Text className="text-xs font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">
                What did you eat? *
              </Text>
              <TextInput
                value={textInput}
                onChangeText={setTextInput}
                multiline
                numberOfLines={3}
                placeholder="e.g. 2 fried eggs, a slice of whole wheat toast, and half an avocado..."
                placeholderTextColor="#64748b"
                className="bg-[#f8fafc] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl px-5 py-4 text-[#0f172a] dark:text-[#f8fafc] text-base leading-5"
                style={{ textAlignVertical: 'top' }}
              />
              <Text className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark italic mt-0.5">
                Note: Fitly AI automatically translates your text description or photos into accurate ingredients and macros!
              </Text>
            </View>

            {/* Calendar Date Selector */}
            <View className="gap-2">
              <Text className="text-xs font-extrabold text-[#475569] dark:text-[#94a3b8] uppercase tracking-wider">
                Logging Date *
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCalendarModalVisible(true);
                }}
                className="bg-[#f8fafc] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl flex-row items-center justify-between px-5 py-4"
              >
                <Text className="text-[#0f172a] dark:text-[#f8fafc] text-base font-semibold">
                  {date === new Date().toISOString().split('T')[0] ? `Today (${date})` : date}
                </Text>
                <Calendar color="#8b5cf6" size={20} />
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity onPress={handleSaveEntry} className="mt-4 shadow-lg shadow-brand-500/20">
              <LinearGradient
                colors={['#8b5cf6', '#06b6d4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 rounded-2xl items-center justify-center flex-row gap-2"
              >
                <Check color="white" size={20} strokeWidth={2.5} />
                <Text className="text-white font-extrabold text-base">Save Food Entry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ----------------- MODALS ----------------- */}

      {/* 1. Camera Viewfinder Simulator Modal */}
      <Modal animationType="slide" transparent={false} visible={cameraModalVisible}>
        <View className="flex-1 bg-black justify-between" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}>
          {/* Top Bar */}
          <View className="flex-row justify-between items-center px-5 py-4">
            <TouchableOpacity
              onPress={() => setCameraModalVisible(false)}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <X color="white" size={20} />
            </TouchableOpacity>
            <Text className="text-white/80 font-bold text-sm tracking-wider uppercase">Fitly AI Camera</Text>
            <View className="w-10 h-10" />
          </View>

          {/* Viewfinder Area */}
          <View className="flex-1 mx-4 bg-zinc-900 rounded-3xl relative overflow-hidden items-center justify-center border border-white/10">
            {isSnapping ? (
              <View className="absolute inset-0 bg-black/80 items-center justify-center gap-4 z-20">
                <ActivityIndicator size="large" color="#8b5cf6" />
                <View className="items-center">
                  <Text className="text-[#8b5cf6] font-extrabold text-lg uppercase tracking-widest animate-pulse">Scanning Food...</Text>
                  <Text className="text-white/60 text-xs mt-1">Extracting ingredients & macros</Text>
                </View>
              </View>
            ) : (
              <View className="w-full h-full items-center justify-center relative">
                {/* Viewfinder Target Overlays */}
                <View className="absolute w-72 h-72 border-2 border-dashed border-white/20 rounded-3xl" />
                <View className="absolute w-8 h-8 border-t-4 border-l-4 border-brand-500 top-[28%] left-[16%] rounded-tl-md" />
                <View className="absolute w-8 h-8 border-t-4 border-r-4 border-brand-500 top-[28%] right-[16%] rounded-tr-md" />
                <View className="absolute w-8 h-8 border-b-4 border-l-4 border-brand-500 bottom-[28%] left-[16%] rounded-bl-md" />
                <View className="absolute w-8 h-8 border-b-4 border-r-4 border-brand-500 bottom-[28%] right-[16%] rounded-br-md" />
                
                {/* Scanner Laser Animation simulated with clean static colors */}
                <View className="w-3/4 h-[2px] bg-brand-500 opacity-60 absolute top-[48%] shadow-lg shadow-brand-500" />
                
                {/* Helper Tips */}
                <View className="absolute bottom-6 bg-black/60 px-4 py-2 rounded-full border border-white/10 items-center justify-center flex-row gap-1.5">
                  <HelpCircle color="#a78bfa" size={13} />
                  <Text className="text-white text-[11px] font-semibold">Center food plate in the focus frame</Text>
                </View>

                {/* Viewfinder placeholder content */}
                <Text className="text-7xl opacity-45">🥗</Text>
                <Text className="text-white/40 text-xs mt-4 uppercase font-bold tracking-wider">Awaiting Capture</Text>
              </View>
            )}
          </View>

          {/* Bottom Control Bar */}
          <View className="px-10 py-6 items-center justify-center flex-row gap-8">
            <View className="w-12 h-12" />
            
            {/* Massive Shutter Button */}
            <TouchableOpacity
              onPress={handleSnap}
              disabled={isSnapping}
              className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
            >
              <View className="w-[62px] h-[62px] rounded-full bg-white active:bg-zinc-200" />
            </TouchableOpacity>
            
            <View className="w-12 h-12" />
          </View>
        </View>
      </Modal>

      {/* 2. Mock Gallery Picker Modal */}
      <Modal animationType="slide" transparent visible={galleryModalVisible}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-[#0f0f23] rounded-t-3xl max-h-[80%] border-t border-[#e2e8f0] dark:border-[#2a2a4a]">
            {/* Modal Header */}
            <View className="px-5 py-4 border-b border-[#e2e8f0] dark:border-[#2a2a4a] flex-row justify-between items-center">
              <Text className="text-[#0f172a] dark:text-[#f8fafc] font-extrabold text-lg">Select Food Item</Text>
              <TouchableOpacity
                onPress={() => setGalleryModalVisible(false)}
                className="w-8 h-8 rounded-full bg-[#f1f5f9] dark:bg-[#1a1a38] items-center justify-center"
              >
                <X color="#94a3b8" size={18} />
              </TouchableOpacity>
            </View>

            {/* Gallery Grid List */}
            <ScrollView contentContainerStyle={{ padding: 16 }} className="w-full">
              <View className="flex-row flex-wrap justify-between gap-y-4">
                {MOCK_DISHES.map((dish, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleSelectGalleryDish(i)}
                    className="w-[48%] bg-[#f8fafc] dark:bg-[#1a1a38] border border-[#e2e8f0] dark:border-[#2a2a4a] rounded-2xl p-4 items-center flex-col gap-2"
                  >
                    <Text className="text-4xl">{dish.emoji}</Text>
                    <Text className="text-sm font-bold text-center text-[#0f172a] dark:text-[#f8fafc] mt-1" numberOfLines={1}>
                      {dish.name}
                    </Text>
                    <View className="bg-[#ede9fe] dark:bg-[#8b5cf6]/20 px-2 py-0.5 rounded-full mt-0.5">
                      <Text className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400">
                        {dish.calories} kcal
                      </Text>
                    </View>
                    <Text className="text-[10px] text-[#475569] dark:text-[#94a3b8] text-center" numberOfLines={2}>
                      {dish.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. Custom Date Calendar Modal Drawer */}
      <Modal animationType="fade" transparent visible={calendarModalVisible}>
        <View className="flex-1 bg-black/50 items-center justify-center px-5">
          <View className="bg-white dark:bg-[#0f0f23] rounded-3xl border border-[#e2e8f0] dark:border-[#2a2a4a] w-full p-6 shadow-2xl gap-5 flex-col">
            
            {/* Header */}
            <View className="flex-row justify-between items-center border-b border-[#e2e8f0] dark:border-[#2a2a4a]/40 pb-3">
              <Text className="text-text-primary-light dark:text-text-primary-dark font-extrabold text-lg">
                Choose Logging Date
              </Text>
              <TouchableOpacity
                onPress={() => setCalendarModalVisible(false)}
                className="w-8 h-8 rounded-full bg-surface-light-light dark:bg-surface-light items-center justify-center"
              >
                <X color="#94a3b8" size={16} />
              </TouchableOpacity>
            </View>

            {/* Calendar Days */}
            <View className="w-full">
              {/* Week headers */}
              <View className="flex-row justify-between mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, idx) => (
                  <Text key={idx} className="w-[13.5%] text-center text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark">
                    {w}
                  </Text>
                ))}
              </View>

              {/* Day numbers */}
              <View className="flex-row flex-wrap justify-start">
                {calendarDays.map((day, idx) => {
                  const today = new Date();
                  const isToday = day === today.getDate();
                  const mm = String(today.getMonth() + 1).padStart(2, '0');
                  const dd = day !== null ? String(day).padStart(2, '0') : '';
                  const itemDateStr = day !== null ? `${today.getFullYear()}-${mm}-${dd}` : '';
                  const isSelected = date === itemDateStr;

                  if (day === null) {
                    return <View key={idx} className="w-[13.5%] aspect-square" />;
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleSelectDate(day)}
                      className={`w-[13.5%] aspect-square items-center justify-center rounded-xl mb-1 border ${
                        isSelected
                          ? 'bg-brand-500 border-brand-600'
                          : isToday
                          ? 'bg-[#ede9fe] dark:bg-brand-900/20 border-brand-500/30'
                          : 'bg-[#f8fafc] dark:bg-[#1a1a38] border-[#e2e8f0] dark:border-[#2a2a4a]/40'
                      }`}
                    >
                      <Text className={`text-xs font-bold ${
                        isSelected
                          ? 'text-white'
                          : isToday
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'text-[#0f172a] dark:text-[#f8fafc]'
                      }`}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
