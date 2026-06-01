import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  isDestructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface CustomDialogContextType {
  showDialog: (options: DialogOptions) => void;
  hideDialog: () => void;
}

const CustomDialogContext = createContext<CustomDialogContextType | undefined>(undefined);

export function CustomDialogProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);

  const showDialog = (newOptions: DialogOptions) => {
    // Trigger medium vibration for alerts, notification success/error as appropriate
    if (newOptions.isDestructive) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (newOptions.title.toLowerCase().includes('required') || newOptions.title.toLowerCase().includes('error')) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setOptions(newOptions);
    setVisible(true);
  };

  const hideDialog = () => {
    setVisible(false);
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(false);
    if (options?.onConfirm) {
      options.onConfirm();
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(false);
    if (options?.onCancel) {
      options.onCancel();
    }
  };

  const getIcon = () => {
    if (!options) return null;
    const titleLower = options.title.toLowerCase();
    const msgLower = options.message.toLowerCase();

    if (options.isDestructive || titleLower.includes('confirm delete') || msgLower.includes('delete')) {
      return (
        <View className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl mb-2 items-center justify-center">
          <AlertTriangle color="#f87171" size={28} />
        </View>
      );
    }
    if (titleLower.includes('required') || titleLower.includes('error')) {
      return (
        <View className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl mb-2 items-center justify-center">
          <AlertCircle color="#f87171" size={28} />
        </View>
      );
    }
    if (titleLower.includes('success') || msgLower.includes('saved') || msgLower.includes('successfully')) {
      return (
        <View className="p-3 bg-green-950/30 border border-green-500/25 rounded-2xl mb-2 items-center justify-center">
          <CheckCircle color="#4ade80" size={28} />
        </View>
      );
    }
    return (
      <View className="p-3 bg-brand-900/40 border border-brand-500/30 rounded-2xl mb-2 items-center justify-center">
        <Info color="#a78bfa" size={28} />
      </View>
    );
  };

  return (
    <CustomDialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      {options && (
        <Modal
          transparent
          visible={visible}
          animationType="fade"
          onRequestClose={handleCancel}
        >
          <View style={styles.backdrop}>
            <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-6 w-[88%] max-w-sm items-center shadow-2xl gap-4 flex-col">
              {/* Icon badge */}
              {getIcon()}

              {/* Text */}
              <View className="items-center text-center">
                <Text className="text-[#0f172a] dark:text-text-primary-dark font-extrabold text-lg text-center">
                  {options.title}
                </Text>
                <Text className="text-[#475569] dark:text-text-secondary-dark text-sm leading-5 mt-2 text-center px-1">
                  {options.message}
                </Text>
              </View>

              {/* Actions row */}
              <View className="w-full flex-row gap-3 mt-2">
                {options.showCancel && (
                  <TouchableOpacity
                    onPress={handleCancel}
                    className="flex-1 bg-[#f1f5f9] dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark rounded-2xl py-3.5 items-center justify-center"
                  >
                    <Text className="text-[#475569] dark:text-text-secondary-dark font-bold text-sm uppercase tracking-wider">
                      {options.cancelText || 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                )}

                {options.isDestructive ? (
                  <TouchableOpacity
                    onPress={handleConfirm}
                    className="flex-1 bg-red-600 rounded-2xl py-3.5 items-center justify-center shadow-md shadow-red-500/10"
                  >
                    <Text className="text-white font-bold text-sm uppercase tracking-wider">
                      {options.confirmText || 'Delete'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleConfirm}
                    className="flex-1 shadow shadow-brand-500/10"
                  >
                    <LinearGradient
                      colors={['#8b5cf6', '#06b6d4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="w-full rounded-2xl py-3.5 items-center justify-center"
                    >
                      <Text className="text-white font-bold text-sm uppercase tracking-wider">
                        {options.confirmText || 'OK'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </CustomDialogContext.Provider>
  );
}

export function useCustomDialog() {
  const context = useContext(CustomDialogContext);
  if (!context) {
    throw new Error('useCustomDialog must be used within a CustomDialogProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 16, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
