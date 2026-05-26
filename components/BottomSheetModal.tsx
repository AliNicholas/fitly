import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheetModal({ visible, onClose, title, children }: BottomSheetModalProps) {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        {/* Tap outside to close (background) */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="absolute top-0 left-0 right-0 bottom-0"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="w-full max-h-[90%] bg-surface-dark border-t border-borderColor-dark rounded-t-3xl shadow-2xl"
        >
          <SafeAreaView className="w-full">
            {/* Header / Drag indicator simulation */}
            <View className="items-center py-2">
              <View className="w-12 h-1.5 bg-borderColor-dark/40 rounded-full" />
            </View>

            {/* Header Content */}
            <View className="flex-row items-center justify-between px-4 pb-3 border-b border-borderColor-dark/20">
              <Text className="text-text-primary-dark font-bold text-lg">{title}</Text>
              <TouchableOpacity
                onPress={handleClose}
                className="p-1 bg-surface-light-dark border border-borderColor-dark rounded-full"
              >
                <X color="#94a3b8" size={16} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView
              className="px-4 py-3"
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
