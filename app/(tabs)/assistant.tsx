import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  FlatList,
  Keyboard,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Send, Loader2, Check, X, AlertTriangle, Key } from 'lucide-react-native';
import { getSettings } from '../../db/settings';
import { getSessions } from '../../db/sessions';
import { getCategories, addCategory } from '../../db/categories';
import { addExercise } from '../../db/exercises';
import {
  executeAiProviderCall,
  getAiProviderOption,
  getApiKeyForProvider,
  normalizeAiProvider,
  type AiChatMessage,
  type AiFunctionCall,
  type AiProvider,
} from '../../utils/aiProviders';
import { getStableTutorialLink } from '../../utils/tutorialLinks';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { useAppTheme } from '../../contexts/ThemeContext';

// Infinitely rotating loader icon
const SpinningLoader = ({ color = '#8b5cf6', size = 20 }: { color?: string; size?: number }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Loader2 color={color} size={size} />
    </Animated.View>
  );
};

type MarkdownStyle = TextStyle | ViewStyle | ImageStyle;

// Markdown styling for model messages
const markdownStyles: Record<string, MarkdownStyle> = {
  body: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  strong: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: '#a78bfa',
    textDecorationLine: 'underline',
  },
  list_item: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 4,
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  hr: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    height: 1,
    marginVertical: 12,
  },
  code_inline: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#a78bfa',
  },
  code_block: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#ffffff',
  },
  fence: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#ffffff',
  },
  heading1: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  heading2: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: 'bold',
    marginVertical: 6,
  },
  heading3: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
    marginVertical: 4,
  },
};

type ChatMessage = AiChatMessage;

interface CategoryMap {
  [id: number]: string;
}

export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const [aiProvider, setAiProvider] = useState<AiProvider>('gemini');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Chat stream
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi! I'm your Fitly AI Coach. I can help summarize your progress, give workout advice, or add new exercises/categories. What's on your mind today?",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [pendingAction, setPendingAction] = useState<AiFunctionCall | null>(null);
  const [categories, setCategories] = useState<CategoryMap>({});
  const [composerHeight, setComposerHeight] = useState(88);
  const [keyboardBottomOffset, setKeyboardBottomOffset] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const { height: windowHeight } = useWindowDimensions();
  const modelMarkdownStyles = useMemo<Record<string, MarkdownStyle>>(() => {
    const textColor = colors.textPrimary;
    const mutedSurface = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0';
    const codeSurface = isDark ? 'rgba(0, 0, 0, 0.3)' : '#f1f5f9';

    return {
      ...markdownStyles,
      body: {
        ...(markdownStyles.body as TextStyle),
        color: textColor,
      },
      strong: {
        ...(markdownStyles.strong as TextStyle),
        color: textColor,
      },
      list_item: {
        ...(markdownStyles.list_item as TextStyle),
        color: textColor,
      },
      hr: {
        ...(markdownStyles.hr as ViewStyle),
        backgroundColor: mutedSurface,
      },
      code_inline: {
        ...(markdownStyles.code_inline as TextStyle),
        backgroundColor: mutedSurface,
      },
      code_block: {
        ...(markdownStyles.code_block as TextStyle),
        backgroundColor: codeSurface,
        color: textColor,
      },
      fence: {
        ...(markdownStyles.fence as TextStyle),
        backgroundColor: codeSurface,
        color: textColor,
      },
      heading1: {
        ...(markdownStyles.heading1 as TextStyle),
        color: textColor,
      },
      heading2: {
        ...(markdownStyles.heading2 as TextStyle),
        color: textColor,
      },
      heading3: {
        ...(markdownStyles.heading3 as TextStyle),
        color: textColor,
      },
    };
  }, [colors.textPrimary, isDark]);

  const userMessageMarkdownStyles = useMemo<Record<string, MarkdownStyle>>(() => ({
    ...modelMarkdownStyles,
    body: {
      ...(modelMarkdownStyles.body as TextStyle),
      color: '#ffffff',
    },
    strong: {
      ...(modelMarkdownStyles.strong as TextStyle),
      fontWeight: 'bold',
      color: '#ffffff',
    },
    link: {
      ...(modelMarkdownStyles.link as TextStyle),
      color: '#ffffff',
      textDecorationLine: 'underline',
    },
  }), [modelMarkdownStyles]);

  useEffect(() => {
    const handleKeyboardShow = (event: { endCoordinates: { screenY: number } }) => {
      setKeyboardBottomOffset(Math.max(windowHeight - event.endCoordinates.screenY, 0));
    };

    const handleKeyboardHide = () => {
      setKeyboardBottomOffset(0);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow',
      handleKeyboardShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [windowHeight]);

  // Fetch settings & category mapping on focus
  const loadConfig = useCallback(async () => {
    try {
      const data = await getSettings();
      const provider = normalizeAiProvider(data.api_provider);
      setAiProvider(provider);
      setApiKey(getApiKeyForProvider(data, provider) || null);
      
      const cats = await getCategories();
      const mapping: CategoryMap = {};
      cats.forEach((c) => {
        mapping[c.id] = c.name;
      });
      setCategories(mapping);
      
      setLoading(false);
    } catch (e) {
      console.error('Failed to load assistant configuration:', e);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [loadConfig])
  );

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, pendingAction, isAiResponding]);

  const handleSendMessage = async (customText?: string, overrideHistory?: ChatMessage[]) => {
    const textToSend = customText !== undefined ? customText : inputText;
    if (!textToSend.trim()) return;

    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (customText === undefined) {
      setInputText('');
    }

    // Append new user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      text: textToSend,
      isSystemMessage: customText !== undefined && textToSend.startsWith('[System]'),
    };

    let updatedHistory = overrideHistory ? [...overrideHistory, userMsg] : [...messages, userMsg];
    setMessages(updatedHistory);
    setIsAiResponding(true);

    try {
      let keepCalling = true;
      let iterations = 0;
      const maxIterations = 8; // prevent infinite loops

      while (keepCalling && iterations < maxIterations) {
        iterations++;
        if (!apiKey) {
          throw new Error(`${getAiProviderOption(aiProvider).label} API key is missing`);
        }

        const aiResponse = await executeAiProviderCall(aiProvider, apiKey, updatedHistory);
        const functionCall = aiResponse.functionCall;

        if (!aiResponse.text && !functionCall) {
          throw new Error('Received empty response from AI model.');
        }

        // Group them into a single model message to avoid consecutive roles
        if (aiResponse.text || functionCall) {
          const modelMsg: ChatMessage = {
            id: Math.random().toString(),
            role: 'model',
            text: aiResponse.text,
            functionCall,
          };
          updatedHistory = [...updatedHistory, modelMsg];
          setMessages(updatedHistory);
        }

        if (functionCall) {
          if (functionCall.name === 'get_sessions') {
            const sessionsData = await getSessions();
            const toolResponseMsg: ChatMessage = {
              id: Math.random().toString(),
              role: 'tool',
              functionResponse: {
                id: functionCall.id,
                name: functionCall.name,
                response: { sessions: sessionsData },
              },
            };
            updatedHistory = [...updatedHistory, toolResponseMsg];
            setMessages(updatedHistory);
          } else if (functionCall.name === 'get_categories') {
            const categoriesData = await getCategories();
            const toolResponseMsg: ChatMessage = {
              id: Math.random().toString(),
              role: 'tool',
              functionResponse: {
                id: functionCall.id,
                name: functionCall.name,
                response: { categories: categoriesData },
              },
            };
            updatedHistory = [...updatedHistory, toolResponseMsg];
            setMessages(updatedHistory);
          } else if (functionCall.name === 'add_exercise' || functionCall.name === 'add_category') {
            // It is a WRITE call (add_exercise or add_category)
            // Halt the automatic loop, return the pending action card to user
            setPendingAction(functionCall);
            keepCalling = false;
          } else {
            throw new Error(`Unsupported AI action: ${functionCall.name}`);
          }
        } else {
          // No function calls, normal text response complete
          keepCalling = false;
        }
      }
    } catch (err: any) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'model',
          text: `⚠️ Error: ${err.message || 'Failed to communicate with AI Coach.'}`,
        },
      ]);
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsAiResponding(true);

    const action = pendingAction;
    setPendingAction(null);

    let success = false;
    let errorMessage = '';

    try {
      if (action.name === 'add_exercise') {
        const { name, category_id, description, link } = action.args;
        await addExercise(name, category_id, description || null, getStableTutorialLink(name, link));
        success = true;
      } else if (action.name === 'add_category') {
        const { name } = action.args;
        await addCategory(name);
        success = true;
      }
    } catch (e: any) {
      console.error(e);
      success = false;
      errorMessage = e.message || 'Unknown database write error';
    }

    // Append system status to messages history
    const systemResponseMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'tool',
      functionResponse: {
        id: action.id,
        name: action.name,
        response: success ? { success: true } : { success: false, error: errorMessage },
      },
    };

    const newMsgs = [...messages, systemResponseMsg];
    setMessages(newMsgs);

    if (success) {
      await handleSendMessage(
        `[System] 👍 Approved: Added ${action.name === 'add_exercise' ? 'exercise' : 'category'} "${action.args.name}"`,
        newMsgs
      );
    } else {
      await handleSendMessage(
        `[System] ⚠️ Error: Failed to add item: ${errorMessage}`,
        newMsgs
      );
    }
  };

  const handleCancelAction = async () => {
    if (!pendingAction) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const action = pendingAction;
    setPendingAction(null);

    // Send cancel tool response
    const systemResponseMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'tool',
      functionResponse: {
        id: action.id,
        name: action.name,
        response: { success: false, error: 'User cancelled the action' },
      },
    };

    const newMsgs = [...messages, systemResponseMsg];
    setMessages(newMsgs);

    await handleSendMessage(
      `[System] ❌ Rejected: Did not add ${action.name === 'add_exercise' ? 'exercise' : 'category'} "${action.args.name}"`,
      newMsgs
    );
  };

  // Rendering individual messages
  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'tool') {
      return null; // hide technical tool messages from chat bubble stream
    }

    // Hide intermediate functionCall model request messages only if they have no text to display
    if (item.role === 'model' && item.functionCall && !item.text) {
      return null;
    }

    if (item.isSystemMessage) {
      return (
        <View className="flex-row justify-center my-2.5 px-4">
          <View className="bg-white dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark/15 px-4 py-2 rounded-2xl">
            <Text className="text-[#475569] dark:text-text-secondary-dark text-sm font-semibold uppercase tracking-wider text-center">
              {item.text}
            </Text>
          </View>
        </View>
      );
    }

    const isUser = item.role === 'user';
    const messageText = item.text?.startsWith('[System] ') ? item.text.substring(9) : (item.text || '');

    return (
      <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'} my-2.5 px-1`}>
        <View
          className={`max-w-[85%] px-5 py-3.5 rounded-3xl ${
            isUser
              ? 'bg-brand-600 rounded-tr-none'
              : 'bg-white dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark/25 rounded-tl-none'
          }`}
        >
          <Markdown style={isUser ? userMessageMarkdownStyles : modelMarkdownStyles}>
            {messageText}
          </Markdown>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#f8fafc] dark:bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-[#475569] dark:text-text-secondary-dark font-medium text-base mt-4">Initializing Coach...</Text>
      </View>
    );
  }

  const activeProviderOption = getAiProviderOption(aiProvider);

  // Warning screen if the selected provider key is missing
  if (!apiKey) {
    return (
      <View className="flex-1 bg-[#f8fafc] dark:bg-[#050510] px-6 justify-center items-center">
        <View className="bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/40 rounded-3xl p-7 items-center w-full shadow-xl">
          <View className="p-5 bg-brand-900/40 border border-brand-500/30 rounded-3xl mb-4">
            <Key color="#a78bfa" size={36} />
          </View>
          <Text className="text-[#0f172a] dark:text-text-primary-dark font-extrabold text-2xl text-center">API Key Required</Text>
          <Text className="text-[#475569] dark:text-text-secondary-dark text-base text-center mt-2.5 mb-6 leading-6">
            To chat with your Fitly AI Coach, please configure your {activeProviderOption.label} API key in the Settings tab.
          </Text>
          <TouchableOpacity
            onPress={() => router.navigate('/(tabs)/settings' as any)}
            className="w-full shadow-lg shadow-brand-500/20"
          >
            <LinearGradient
              colors={['#8b5cf6', '#06b6d4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-4 rounded-2xl items-center justify-center"
            >
              <Text className="text-white font-bold text-base">Configure in Settings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const chatContent = (
    <View className="flex-1">
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        style={{ flex: 1, marginBottom: composerHeight + keyboardBottomOffset }}
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          <>
            {/* Show pending action proposal card */}
            {pendingAction && (
              <View className="my-4 bg-amber-950/20 border border-amber-500/30 rounded-3xl p-5 shadow-md">
                <View className="flex-row items-center gap-2 pb-2.5 mb-3 border-b border-amber-500/10">
                  <AlertTriangle color="#f59e0b" size={22} />
                  <Text className="text-amber-400 font-bold text-base uppercase tracking-wider">
                    Approval Required
                  </Text>
                </View>

                <Text className="text-amber-100/90 text-base leading-6 mb-4">
                  The AI coach wants to add a new{' '}
                  {pendingAction.name === 'add_exercise' ? 'exercise' : 'category'}:
                </Text>

                {/* Preformatted visual details table */}
                <View className="bg-black/40 border border-amber-500/15 rounded-3xl p-4 mb-4 gap-3 flex-col">
                  {pendingAction.name === 'add_category' ? (
                    <View className="flex-row justify-between py-1">
                      <Text className="text-amber-200/50 text-sm font-semibold uppercase">Name</Text>
                      <Text className="text-amber-100 font-medium text-sm">{pendingAction.args.name}</Text>
                    </View>
                  ) : (
                    <>
                      <View className="flex-row justify-between py-1 border-b border-amber-500/5">
                        <Text className="text-amber-200/50 text-sm font-semibold uppercase">Exercise Name</Text>
                        <Text className="text-amber-100 font-medium text-sm">{pendingAction.args.name}</Text>
                      </View>
                      <View className={`flex-row justify-between py-1 ${pendingAction.args.description || pendingAction.args.link ? 'border-b border-amber-500/5' : ''}`}>
                        <Text className="text-amber-200/50 text-sm font-semibold uppercase">Category</Text>
                        <Text className="text-amber-100 font-medium text-sm">
                          {categories[pendingAction.args.category_id] || `ID: ${pendingAction.args.category_id}`}
                        </Text>
                      </View>
                      {pendingAction.args.description && (
                        <View className={`flex-col py-1 gap-1 ${pendingAction.args.link ? 'border-b border-amber-500/5' : ''}`}>
                          <Text className="text-amber-200/50 text-xs font-semibold uppercase">Description</Text>
                          <Text className="text-amber-100 text-sm leading-5">{pendingAction.args.description}</Text>
                        </View>
                      )}
                      {pendingAction.args.link && (
                        <View className="flex-col py-1 gap-1">
                          <Text className="text-amber-200/50 text-xs font-semibold uppercase">Reference Link</Text>
                          <Text className="text-brand-400 font-medium text-sm underline" numberOfLines={1}>
                            {pendingAction.args.link}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {/* Action buttons */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleConfirmAction}
                    className="flex-1 shadow shadow-amber-500/10"
                  >
                    <LinearGradient
                      colors={['#8b5cf6', '#06b6d4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="py-4 rounded-2xl flex-row justify-center items-center gap-1.5"
                    >
                      <Check color="#ffffff" size={20} />
                      <Text className="text-white font-bold text-sm">Approve</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCancelAction}
                    className="flex-1 border border-red-500/30 bg-red-950/10 py-4 rounded-2xl flex-row justify-center items-center gap-1.5"
                  >
                    <X color="#f87171" size={20} />
                    <Text className="text-red-400 font-bold text-sm">Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Coach typing status */}
            {isAiResponding && !pendingAction && (
              <View className="flex-row justify-start my-2.5 px-1">
                <View className="bg-white dark:bg-surface-light-dark border border-[#e2e8f0] dark:border-borderColor-dark/25 px-5 py-3.5 rounded-3xl rounded-tl-none flex-row items-center gap-2">
                  <SpinningLoader color="#8b5cf6" size={18} />
                  <Text className="text-[#475569] dark:text-text-secondary-dark text-sm font-medium">Coach is thinking...</Text>
                </View>
              </View>
            )}
          </>
        }
      />

      {/* Input bar */}
      <View
        onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
        style={{ bottom: keyboardBottomOffset }}
        className="absolute left-0 right-0 p-5 border-t border-[#e2e8f0] dark:border-borderColor-dark/30 bg-white dark:bg-[#0a0a1e]"
      >
        <View className="flex-row gap-3.5 items-center w-full">
          <View className="flex-1">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask your coach or add an exercise..."
              placeholderTextColor="#475569"
              editable={!isAiResponding && !pendingAction}
              className="w-full bg-white dark:bg-surface-dark border border-[#e2e8f0] dark:border-borderColor-dark/50 rounded-3xl px-5 py-3.5 text-[#0f172a] dark:text-text-primary-dark text-base max-h-24"
              multiline={true}
            />
          </View>
          <TouchableOpacity
            onPress={() => handleSendMessage()}
            disabled={isAiResponding || !!pendingAction || !inputText.trim()}
            activeOpacity={0.7}
            style={{ width: 48, height: 48, borderRadius: 16, overflow: 'hidden' }}
          >
            {isAiResponding || !!pendingAction || !inputText.trim() ? (
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(26,26,56,0.6)', borderWidth: 1, borderColor: 'rgba(42,42,74,0.6)', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
                <Send color="#64648a" size={20} />
              </View>
            ) : (
              <LinearGradient
                colors={['#8b5cf6', '#06b6d4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
              >
                <Send color="#ffffff" size={20} />
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#f8fafc] dark:bg-[#050510]">
      {chatContent}
    </View>
  );
}
