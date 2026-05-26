import React, { useRef } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Dumbbell, Calendar, MessageSquare, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

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
  
  // Dynamic bottom layout calculation (increased spacing to lift elements further)
  const bottomInset = insets.bottom > 0 ? (insets.bottom + 8) : 18;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8b5cf6', // brand-500 violet
        tabBarInactiveTintColor: '#64648a', // muted purple-grey
        tabBarStyle: {
          backgroundColor: '#0a0a1e', // darker navy
          borderTopColor: '#2a2a4a', // border-color
          height: Platform.OS === 'ios' ? (64 + bottomInset) : (62 + bottomInset),
          paddingBottom: bottomInset,
          paddingTop: 10,
        },
        headerStyle: {
          backgroundColor: '#0f0f23', // surface
          shadowColor: 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: '#2a2a4a',
        },
        headerTitleStyle: {
          color: '#f8fafc', // text-primary
          fontFamily: 'Inter_600SemiBold',
          fontSize: 20,
        },
        headerTitleAlign: 'center',
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 12,
          marginTop: 4,
        },
        tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercise Library',
          tabBarLabel: 'Exercises',
          tabBarIcon: ({ color, size }) => (
            <Dumbbell color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Workout Log',
          tabBarLabel: 'Sessions',
          tabBarIcon: ({ color, size }) => (
            <Calendar color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Fitly AI Coach',
          tabBarLabel: 'AI Assistant',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

