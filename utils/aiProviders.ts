export type AiProvider = 'gemini' | 'openai' | 'claude';

export interface AiProviderOption {
  id: AiProvider;
  label: string;
  apiKeySetting: string;
  model: string;
  placeholder: string;
}

export interface AiFunctionCall {
  id?: string;
  name: string;
  args: any;
}

export interface AiFunctionResponse {
  id?: string;
  name: string;
  response: any;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'model' | 'tool';
  text?: string;
  functionCall?: AiFunctionCall;
  functionResponse?: AiFunctionResponse;
  isSystemMessage?: boolean;
}

interface AiProviderResponse {
  text?: string;
  functionCall?: AiFunctionCall;
}

export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    apiKeySetting: 'gemini_api_key',
    model: 'gemini-2.5-flash',
    placeholder: 'Enter your Gemini API key...',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    apiKeySetting: 'openai_api_key',
    model: 'gpt-5-mini',
    placeholder: 'Enter your OpenAI API key...',
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    apiKeySetting: 'claude_api_key',
    model: 'claude-sonnet-4-20250514',
    placeholder: 'Enter your Claude API key...',
  },
];

const geminiFunctionDeclarations = [
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
        name: { type: 'STRING', description: 'Name of the exercise, for example "Barbell Bench Press".' },
        category_id: { type: 'INTEGER', description: 'ID of the category. This must use an existing category ID.' },
        description: { type: 'STRING', description: 'Optional explanation of form, muscle target, and how to execute it.' },
        link: { type: 'STRING', description: 'Optional stable instructional or reference URL.' },
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
    description: 'Propose adding a new exercise category. The user must confirm this before it is saved.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Name of the category.' },
      },
      required: ['name'],
    },
  },
];

const jsonToolSchemas = [
  {
    name: 'get_sessions',
    description: 'Fetch the user\'s authentic workout sessions and logged exercises. Use this whenever the user asks about workout history, progress, streaks, summaries, trends, or performance. It returns only recorded data, so do not invent sessions or exercises that are not present in the result.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_categories',
    description: 'Fetch the user\'s existing exercise categories. Use this before suggesting or proposing new exercises so category IDs are valid and recommendations match the user\'s library. If no suitable category exists, propose a new category first instead of guessing an ID.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'add_exercise',
    description: 'Propose a new exercise for the user to approve. This does not immediately save anything; the app will show an approval card first. Include a useful description with proper form, target muscles, and concise coaching cues. Include a stable reference link such as a reputable exercise directory or a YouTube search results URL, not a direct individual YouTube video.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Exercise name, for example "Dumbbell Shoulder Press".' },
        category_id: { type: 'integer', description: 'Existing category ID from get_categories.' },
        description: { type: 'string', description: 'Proper form, target muscles, setup, and execution tips.' },
        link: { type: 'string', description: 'Stable instructional/reference URL.' },
      },
      required: ['name', 'category_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_category',
    description: 'Propose a new exercise category for the user to approve. This does not immediately save anything; the app will show an approval card first. Use it when the user explicitly asks for a category or when a suggested exercise does not fit any existing category.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Category name, for example "Mobility" or "Olympic Lifts".' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
];

const openAiTools = jsonToolSchemas.map((tool) => ({
  type: 'function',
  function: tool,
}));

const claudeTools = jsonToolSchemas.map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.parameters,
}));

export function normalizeAiProvider(provider?: string | null): AiProvider {
  if (provider === 'openai' || provider === 'claude') {
    return provider;
  }

  return 'gemini';
}

export function getAiProviderOption(provider: AiProvider): AiProviderOption {
  return AI_PROVIDER_OPTIONS.find((option) => option.id === provider) ?? AI_PROVIDER_OPTIONS[0];
}

export function getApiKeyForProvider(settings: Record<string, string>, provider: AiProvider): string {
  const option = getAiProviderOption(provider);
  return settings[option.apiKeySetting] || '';
}

export async function executeAiProviderCall(
  provider: AiProvider,
  apiKey: string,
  history: AiChatMessage[]
): Promise<AiProviderResponse> {
  if (!apiKey.trim()) {
    throw new Error(`${getAiProviderOption(provider).label} API key is missing`);
  }

  if (provider === 'openai') {
    return executeOpenAiCall(apiKey, history);
  }

  if (provider === 'claude') {
    return executeClaudeCall(apiKey, history);
  }

  return executeGeminiCall(apiKey, history);
}

function getSystemInstruction(provider: AiProvider): string {
  const providerGuidance = {
    gemini: 'Use Gemini function calls whenever app data or write proposals are needed. Keep natural language concise before function calls.',
    openai: 'Use OpenAI tool calls for app data and write proposals. When a tool call is needed, provide the tool call cleanly and avoid pretending that local app data is available without calling the appropriate tool.',
    claude: 'Use Claude tool use deliberately. It is fine to briefly explain what you are checking before using a read tool, but never claim an item is saved until the app returns a successful tool result.',
  }[provider];

  return `You are Fitly Coach, an elite personal training assistant inside a workout tracking app.

When communicating, use polished Markdown formatting: bold labels, short sections, and clean bullet lists when helpful.

Provider-specific instruction:
- ${providerGuidance}

Critical capabilities:
1. Exercise suggestions and brainstorming
- If the user asks for exercise suggestions or brainstorming, first call get_categories to see existing categories.
- Match suggestions to the user's existing categories. If none fit, propose a new category with add_category.
- When proposing a new exercise, use add_exercise. The user will approve or reject it in the app before anything is saved.

2. Exercise enrichment
- When calling add_exercise, include a helpful description with proper form, target muscles, setup, and execution tips.
- Include a stable educational/reference link. Do not use direct individual YouTube video URLs because videos can disappear. Prefer a YouTube search results URL or a reputable fitness directory page.
- Explain the exercise benefit in the visible response.

3. Workout history and analytics
- When the user asks about progress, history, stats, sessions, exercises logged, or workouts, call get_sessions.
- Summarize only authentic returned records. Do not invent dates, session counts, exercises, reps, weights, or streaks.

Style:
- Be encouraging, direct, and professional.
- Do not mention internal terms like database, JSON, function call, or tool in user-facing responses.
- If required data is missing, ask a short clarifying question.`;
}

function buildGeminiPayload(history: AiChatMessage[]) {
  return history
    .filter((message) => !message.isSystemMessage)
    .map((message) => {
      const parts: any[] = [];

      if (message.text) {
        parts.push({ text: message.text });
      }

      if (message.functionCall) {
        parts.push({
          functionCall: {
            name: message.functionCall.name,
            args: message.functionCall.args,
          },
        });
      }

      if (message.functionResponse) {
        parts.push({
          functionResponse: {
            name: message.functionResponse.name,
            response: message.functionResponse.response,
          },
        });
      }

      return {
        role: message.role === 'tool' ? 'function' : message.role,
        parts,
      };
    });
}

async function executeGeminiCall(apiKey: string, history: AiChatMessage[]): Promise<AiProviderResponse> {
  const option = getAiProviderOption('gemini');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${option.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: buildGeminiPayload(history),
        systemInstruction: {
          parts: [{ text: getSystemInstruction('gemini') }],
        },
        tools: [{ functionDeclarations: geminiFunctionDeclarations }],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    throw new Error('Received empty response from Gemini.');
  }

  const text = parts
    .filter((part: any) => typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('\n\n') || undefined;
  const functionCallPart = parts.find((part: any) => part.functionCall);

  return {
    text,
    functionCall: functionCallPart?.functionCall
      ? {
          name: functionCallPart.functionCall.name,
          args: functionCallPart.functionCall.args || {},
        }
      : undefined,
  };
}

function buildOpenAiMessages(history: AiChatMessage[]) {
  const messages: any[] = [
    {
      role: 'system',
      content: getSystemInstruction('openai'),
    },
  ];

  for (const message of history) {
    if (message.isSystemMessage) {
      continue;
    }

    if (message.role === 'user' && message.text) {
      messages.push({ role: 'user', content: message.text });
      continue;
    }

    if (message.role === 'model') {
      const assistantMessage: any = {
        role: 'assistant',
        content: message.text || null,
      };

      if (message.functionCall?.id) {
        assistantMessage.tool_calls = [
          {
            id: message.functionCall.id,
            type: 'function',
            function: {
              name: message.functionCall.name,
              arguments: JSON.stringify(message.functionCall.args || {}),
            },
          },
        ];
      }

      if (assistantMessage.content || assistantMessage.tool_calls) {
        messages.push(assistantMessage);
      }
      continue;
    }

    if (message.role === 'tool' && message.functionResponse?.id) {
      messages.push({
        role: 'tool',
        tool_call_id: message.functionResponse.id,
        content: JSON.stringify(message.functionResponse.response),
      });
    }
  }

  return messages;
}

async function executeOpenAiCall(apiKey: string, history: AiChatMessage[]): Promise<AiProviderResponse> {
  const option = getAiProviderOption('openai');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: option.model,
      messages: buildOpenAiMessages(history),
      tools: openAiTools,
      tool_choice: 'auto',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  const toolCall = message?.tool_calls?.[0];

  return {
    text: message?.content || undefined,
    functionCall: toolCall
      ? {
          id: toolCall.id,
          name: toolCall.function?.name,
          args: parseJsonObject(toolCall.function?.arguments),
        }
      : undefined,
  };
}

function buildClaudeMessages(history: AiChatMessage[]) {
  const messages: any[] = [];

  for (const message of history) {
    if (message.isSystemMessage) {
      continue;
    }

    if (message.role === 'user' && message.text) {
      messages.push({ role: 'user', content: message.text });
      continue;
    }

    if (message.role === 'model') {
      const content: any[] = [];

      if (message.text) {
        content.push({ type: 'text', text: message.text });
      }

      if (message.functionCall?.id) {
        content.push({
          type: 'tool_use',
          id: message.functionCall.id,
          name: message.functionCall.name,
          input: message.functionCall.args || {},
        });
      }

      if (content.length > 0) {
        messages.push({ role: 'assistant', content });
      }
      continue;
    }

    if (message.role === 'tool' && message.functionResponse?.id) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: message.functionResponse.id,
            content: JSON.stringify(message.functionResponse.response),
          },
        ],
      });
    }
  }

  return messages;
}

async function executeClaudeCall(apiKey: string, history: AiChatMessage[]): Promise<AiProviderResponse> {
  const option = getAiProviderOption('claude');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: option.model,
      max_tokens: 2048,
      system: getSystemInstruction('claude'),
      messages: buildClaudeMessages(history),
      tools: claudeTools,
      tool_choice: { type: 'auto' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = Array.isArray(data.content) ? data.content : [];
  const text = content
    .filter((block: any) => block.type === 'text' && typeof block.text === 'string')
    .map((block: any) => block.text)
    .join('\n\n') || undefined;
  const toolUse = content.find((block: any) => block.type === 'tool_use');

  return {
    text,
    functionCall: toolUse
      ? {
          id: toolUse.id,
          name: toolUse.name,
          args: toolUse.input || {},
        }
      : undefined,
  };
}

function parseJsonObject(value: unknown): Record<string, any> {
  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
