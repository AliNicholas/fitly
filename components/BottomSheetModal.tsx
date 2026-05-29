import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheetModal({ visible, onClose, title, children }: BottomSheetModalProps) {
  const insets = useSafeAreaInsets();
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="w-full max-h-[90%] bg-surface-dark border-t border-[#2a2a4a] rounded-t-3xl shadow-2xl flex-col"
        >
          <View style={{ paddingBottom: Math.max(insets.bottom, 28) }} className="w-full flex-auto flex-col">
            {/* Header / Drag indicator simulation */}
            <View className="items-center py-2">
              <View className="w-14 h-1.5 bg-[#2a2a4a]/40 rounded-full" />
            </View>

            {/* Header Content */}
            <View className="flex-row items-center justify-between px-4 pb-3 border-b border-[#2a2a4a]/20">
              <Text className="text-text-primary-dark font-bold text-xl">{title}</Text>
              <TouchableOpacity
                onPress={handleClose}
                className="p-1 bg-surface-light-dark border border-[#2a2a4a] rounded-full"
              >
                <X color="#94a3b8" size={20} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Form Body */}
            <ScrollView
              className="px-5 py-4 flex-auto"
              contentContainerStyle={{ paddingBottom: 48 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

