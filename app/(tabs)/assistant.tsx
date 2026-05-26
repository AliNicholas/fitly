import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MessageSquare, Send, Loader2, Check, X, AlertTriangle, Key } from 'lucide-react-native';
import { getSettings } from '../../db/settings';
import { getSessions } from '../../db/sessions';
import { getCategories, addCategory } from '../../db/categories';
import { addExercise } from '../../db/exercises';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !((global as any)?.FabricUIManager)) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';

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

// Markdown styling for model messages
const markdownStyles = {
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

// Markdown styling for user messages
const userMarkdownStyles = {
  ...markdownStyles,
  body: {
    ...markdownStyles.body,
    color: '#ffffff',
  },
  strong: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  link: {
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
};

interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'tool';
  text?: string;
  functionCall?: {
    name: string;
    args: any;
  };
  functionResponse?: {
    name: string;
    response: any;
  };
  isSystemMessage?: boolean;
}

interface CategoryMap {
  [id: number]: string;
}

export default function AssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [pendingAction, setPendingAction] = useState<{ name: string; args: any } | null>(null);
  const [categories, setCategories] = useState<CategoryMap>({});

  const flatListRef = useRef<FlatList>(null);

  // Android keyboard height tracking - must be declared here (before early returns) to satisfy Rules of Hooks
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch settings & category mapping on focus
  const loadConfig = useCallback(async () => {
    try {
      const data = await getSettings();
      setApiKey(data.gemini_api_key || null);
      
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

  // Construct standard Gemini API payload from ChatMessage history
  const buildGeminiPayload = (history: ChatMessage[]) => {
    return history
      .filter((m) => !m.isSystemMessage) // skip system messages that are just visual confirmations
      .map((m) => {
        const parts: any[] = [];
        if (m.text) {
          parts.push({ text: m.text });
        }
        if (m.functionCall) {
          parts.push({
            functionCall: {
              name: m.functionCall.name,
              args: m.functionCall.args,
            },
          });
        }
        if (m.functionResponse) {
          parts.push({
            functionResponse: {
              name: m.functionResponse.name,
              response: m.functionResponse.response,
            },
          });
        }
        
        // Tool role is mapped to "function" in API, otherwise matches role
        return {
          role: m.role === 'tool' ? 'function' : m.role,
          parts,
        };
      });
  };

  // Central Gemini request executor
  const executeGeminiCall = async (currentHistory: ChatMessage[]): Promise<any> => {
    if (!apiKey) throw new Error('API key is missing');

    const payloadContents = buildGeminiPayload(currentHistory);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: payloadContents,
          systemInstruction: {
            parts: [
              {
                text: `You are Fitly Coach, an elite personal training assistant. 

When communicating, ALWAYS use rich Markdown formatting (bold, italics, headers, list items, code blocks) to make your messages look beautiful and highly engaging.

CRITICAL CAPABILITIES:
1. Exercise Suggestions & Brainstorming:
   - If the user asks for exercise suggestions or brainstorming, first call 'get_categories' to see the categories they already have.
   - Tailor your suggestions to match the existing categories in their database, or suggest new categories if they want to brainstorm.
   - When suggesting new exercises, you can directly propose adding them using the 'add_exercise' tool.
   - If you want to suggest a new category, use 'add_category' to propose it.
   - You can propose both in tandem (e.g., first propose 'add_category', then when they accept/ask, add exercises under it).

2. Enrichment of Exercises (Descriptions & Links):
   - When calling 'add_exercise', ALWAYS provide a helpful 'description' (proper form, target muscles, step-by-step tips) and an educational/instructional 'link' (e.g., a YouTube tutorial, a reputable fitness directory link, or reference article) to enrich the exercise, not just a name.
   - Explain why this exercise is beneficial for their fitness goals in your response.

3. Workout History & Analytics:
   - When the user asks about their progress, history, stats, or workouts, call 'get_sessions' to get authentic database records.
   - Give highly accurate summaries. Do not make up session numbers or exercises that aren't in the returned data.

Be encouraging, professional, and structured. Do not mention technical terms like "database", "function call", "JSON", or "tool" in your chat responses.`,
              },
            ],
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'get_sessions',
                  description: 'Get the list of all workout sessions and exercises to provide progress summary and insights.',
                  parameters: { type: 'OBJECT', properties: {} },
                },
                {
                  name: 'add_exercise',
                  description: 'Propose adding a new exercise with an optional description and instructional or reference link. IMPORTANT: The user will be asked to confirm this. Do not assume it is added until they confirm.',
                  parameters: {
                    type: 'OBJECT',
                    properties: {
                      name: { type: 'STRING', description: 'Name of the exercise (e.g., "Barbell Bench Press")' },
                      category_id: { type: 'INTEGER', description: 'ID of the category (must use an existing category ID)' },
                      description: { type: 'STRING', description: 'Optional explanation of form, muscle target, or how to execute it.' },
                      link: { type: 'STRING', description: 'Optional instructional video URL or reference link (e.g., YouTube link).' },
                    },
                    required: ['name', 'category_id'],
                  },
                },
                {
                  name: 'get_categories',
                  description: 'Get the list of all exercise categories.',
                  parameters: { type: 'OBJECT', properties: {} },
                },
                {
                  name: 'add_category',
                  description: 'Propose adding a new exercise category. The user must confirm this.',
                  parameters: {
                    type: 'OBJECT',
                    properties: {
                      name: { type: 'STRING', description: 'Name of the category' },
                    },
                    required: ['name'],
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  };

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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages(updatedHistory);
    setIsAiResponding(true);

    try {
      let keepCalling = true;
      let iterations = 0;
      const maxIterations = 8; // prevent infinite loops

      while (keepCalling && iterations < maxIterations) {
        iterations++;
        const apiResponse = await executeGeminiCall(updatedHistory);
        const candidate = apiResponse.candidates?.[0];
        const parts = candidate?.content?.parts;

        if (!parts || parts.length === 0) {
          throw new Error('Received empty response from AI model.');
        }

        // Search for text parts and function call parts
        const textPart = parts.find((p: any) => p.text);
        const functionCallPart = parts.find((p: any) => p.functionCall);

        // Group them into a single model message to avoid consecutive roles
        if (textPart?.text || functionCallPart?.functionCall) {
          const modelMsg: ChatMessage = {
            id: Math.random().toString(),
            role: 'model',
            text: textPart?.text || undefined,
            functionCall: functionCallPart?.functionCall
              ? {
                  name: functionCallPart.functionCall.name,
                  args: functionCallPart.functionCall.args,
                }
              : undefined,
          };
          updatedHistory = [...updatedHistory, modelMsg];
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setMessages(updatedHistory);
        }

        // 2. If there's a function call
        if (functionCallPart?.functionCall) {
          const call = functionCallPart.functionCall;

          if (call.name === 'get_sessions') {
            const sessionsData = await getSessions();
            const toolResponseMsg: ChatMessage = {
              id: Math.random().toString(),
              role: 'tool',
              functionResponse: {
                name: call.name,
                response: { sessions: sessionsData },
              },
            };
            updatedHistory = [...updatedHistory, toolResponseMsg];
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setMessages(updatedHistory);
            // Continue the loop to let Gemini process the sessions database
          } else if (call.name === 'get_categories') {
            const categoriesData = await getCategories();
            const toolResponseMsg: ChatMessage = {
              id: Math.random().toString(),
              role: 'tool',
              functionResponse: {
                name: call.name,
                response: { categories: categoriesData },
              },
            };
            updatedHistory = [...updatedHistory, toolResponseMsg];
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setMessages(updatedHistory);
            // Continue the loop to let Gemini process the categories database
          } else {
            // It is a WRITE call (add_exercise or add_category)
            // Halt the automatic loop, return the pending action card to user
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setPendingAction({
              name: call.name,
              args: call.args,
            });
            keepCalling = false;
          }
        } else {
          // No function calls, normal text response complete
          keepCalling = false;
        }
      }
    } catch (err: any) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'model',
          text: `⚠️ Error: ${err.message || 'Failed to communicate with AI Coach.'}`,
        },
      ]);
    } finally {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsAiResponding(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsAiResponding(true);

    const action = pendingAction;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPendingAction(null);

    let success = false;
    let errorMessage = '';

    try {
      if (action.name === 'add_exercise') {
        const { name, category_id, description, link } = action.args;
        await addExercise(name, category_id, description || null, link || null);
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
        name: action.name,
        response: success ? { success: true } : { success: false, error: errorMessage },
      },
    };

    const newMsgs = [...messages, systemResponseMsg];
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPendingAction(null);

    // Send cancel tool response
    const systemResponseMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'tool',
      functionResponse: {
        name: action.name,
        response: { success: false, error: 'User cancelled the action' },
      },
    };

    const newMsgs = [...messages, systemResponseMsg];
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
          <View className="bg-surface-light border border-borderColor-dark/15 px-4 py-2 rounded-2xl">
            <Text className="text-text-secondary-dark text-sm font-semibold uppercase tracking-wider text-center">
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
              : 'bg-surface-light border border-borderColor-dark/25 rounded-tl-none'
          }`}
        >
          <Markdown style={isUser ? userMarkdownStyles : markdownStyles}>
            {messageText}
          </Markdown>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#050510] justify-center items-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-text-secondary-dark font-medium text-base mt-4">Initializing Coach...</Text>
      </View>
    );
  }

  // Warning screen if Gemini key is missing
  if (!apiKey) {
    return (
      <View className="flex-1 bg-[#050510] px-6 justify-center items-center">
        <View className="bg-surface-dark border border-borderColor-dark/40 rounded-3xl p-7 items-center w-full shadow-xl">
          <View className="p-5 bg-brand-900/40 border border-brand-500/30 rounded-3xl mb-4">
            <Key color="#a78bfa" size={36} />
          </View>
          <Text className="text-text-primary-dark font-extrabold text-2xl text-center">API Key Required</Text>
          <Text className="text-text-secondary-dark text-base text-center mt-2.5 mb-6 leading-6">
            To chat with your Fitly AI Coach, please configure your Google Gemini API Key in the Settings tab.
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

  const bottomInset = insets.bottom > 0 ? (insets.bottom + 8) : 18;
  const tabBarHeight = Platform.OS === 'ios' ? (64 + bottomInset) : (62 + bottomInset);



  const chatContent = (
    <>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
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
                <View className="bg-surface-light border border-borderColor-dark/25 px-5 py-3.5 rounded-3xl rounded-tl-none flex-row items-center gap-2">
                  <SpinningLoader color="#8b5cf6" size={18} />
                  <Text className="text-text-secondary-dark text-sm font-medium">Coach is thinking...</Text>
                </View>
              </View>
            )}
          </>
        }
      />

      {/* Input bar */}
      <View className="p-5 border-t border-borderColor-dark/30 bg-[#0a0a1e]">
        <View className="flex-row gap-3.5 items-center w-full">
          <View className="flex-1">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask your coach or add an exercise..."
              placeholderTextColor="#475569"
              editable={!isAiResponding && !pendingAction}
              className="w-full bg-surface-dark border border-borderColor-dark/50 rounded-3xl px-5 py-3.5 text-text-primary-dark text-base max-h-24"
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
    </>
  );

  // iOS: use KeyboardAvoidingView with padding
  // Android: use manual bottom padding from keyboard event listener
  if (Platform.OS === 'ios') {
    return (
      <View style={{ paddingTop: insets.top }} className="flex-1 bg-[#050510]">
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={tabBarHeight}
          className="flex-1"
        >
          {chatContent}
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Android
  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: keyboardHeight > 0 ? keyboardHeight - tabBarHeight : 0,
        backgroundColor: '#050510',
      }}
    >
      {chatContent}
    </View>
  );
}

