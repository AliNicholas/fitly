import React, { useRef } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Dumbbell, Calendar, MessageSquare, Settings, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../contexts/ThemeContext';

function AnimatedTabBarButton({ children, onPress, ...props }: any) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleValue, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ flex: 1 }}
      {...props}
    >
      <Animated.View style={{ flex: 1, transform: [{ scale: scaleValue }], alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  
  // Dynamic bottom layout calculation (increased spacing to lift elements further)
  const bottomInset = insets.bottom > 0 ? (insets.bottom + 8) : 18;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8b5cf6', // brand-500 violet
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? (64 + bottomInset) : (62 + bottomInset),
          paddingBottom: bottomInset,
          paddingTop: 10,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          color: colors.textPrimary,
          fontFamily: 'Inter_600SemiBold',
          fontSize: 20,
        },
        headerTitleAlign: 'center',
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 9.5,
          marginTop: 2,
          letterSpacing: -0.2,
        },
        tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <LayoutDashboard color={color} size={19} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercise Library',
          tabBarLabel: 'Exercises',
          tabBarIcon: ({ color }) => (
            <Dumbbell color={color} size={19} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Workout Log',
          tabBarLabel: 'Sessions',
          tabBarIcon: ({ color }) => (
            <Calendar color={color} size={19} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Fitly AI Coach',
          tabBarLabel: 'Coach',
          tabBarIcon: ({ color }) => (
            <MessageSquare color={color} size={19} />
          ),
        }}
      />
      <Tabs.Screen
        name="calories"
        options={{
          title: 'Calorie Tracker',
          tabBarLabel: 'Calories',
          tabBarIcon: ({ color }) => (
            <Flame color={color} size={19} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <Settings color={color} size={19} />
          ),
        }}
      />
    </Tabs>
  );
}
