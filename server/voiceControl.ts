/**
 * Voice Control System for ADELE
 * Full hands-free voice commands and conversational coding
 * Supports English and Japanese languages
 */

import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import * as db from "./db";

export interface VoiceCommandResult {
  intent: string;
  action: {
    type: string;
    params: Record<string, unknown>;
  };
  response: string;
  confidence: number;
}

export interface VoiceInteractionContext {
  projectId: number;
  projectName: string;
  currentFile?: string;
  recentCommands?: string[];
  language: "en" | "ja";
}

// Voice command patterns for different intents
const COMMAND_PATTERNS = {
  // Navigation commands
  navigation: [
    { pattern: /^(go to|open|navigate to|show) (.+)$/i, intent: "navigate" },
    { pattern: /^(back|go back|return)$/i, intent: "go_back" },
    { pattern: /^(home|dashboard|main)$/i, intent: "go_home" },
  ],
  
  // Code generation commands
  coding: [
    { pattern: /^(create|add|generate|make) (a |an )?(.+)$/i, intent: "create" },
    { pattern: /^(edit|modify|change|update) (.+)$/i, intent: "edit" },
    { pattern: /^(delete|remove) (.+)$/i, intent: "delete" },
    { pattern: /^(add|include) (.+) (to|in) (.+)$/i, intent: "add_to" },
  ],
  
  // Project commands
  project: [
    { pattern: /^(save|commit) (project|changes|version)$/i, intent: "save_version" },
    { pattern: /^(deploy|publish) (project|app|application)$/i, intent: "deploy" },
    { pattern: /^(download|export) (code|project|files)$/i, intent: "download" },
    { pattern: /^(preview|show preview|run)$/i, intent: "preview" },
  ],
  
  // UI commands
  ui: [
    { pattern: /^(scroll) (up|down)$/i, intent: "scroll" },
    { pattern: /^(zoom) (in|out)$/i, intent: "zoom" },
    { pattern: /^(toggle|switch) (theme|dark mode|light mode)$/i, intent: "toggle_theme" },
    { pattern: /^(show|hide) (sidebar|panel|code|preview)$/i, intent: "toggle_panel" },
  ],
  
  // Help commands
  help: [
    { pattern: /^(help|what can you do|commands)$/i, intent: "help" },
    { pattern: /^(how to|how do I) (.+)$/i, intent: "how_to" },
  ],
  
  // Japanese commands
  japanese: [
    { pattern: /^(作成|作って|生成) (.+)$/i, intent: "create" },
    { pattern: /^(編集|変更|修正) (.+)$/i, intent: "edit" },
    { pattern: /^(削除|消して) (.+)$/i, intent: "delete" },
    { pattern: /^(保存|セーブ)$/i, intent: "save_version" },
    { pattern: /^(デプロイ|公開)$/i, intent: "deploy" },
    { pattern: /^(ヘルプ|助けて|コマンド)$/i, intent: "help" },
  ],
};

/**
 * Transcribe audio to text
 */
export async function transcribeVoice(
  audioUrl: string,
  language: "en" | "ja" = "en"
): Promise<{ text: string; confidence: number }> {
  try {
    const result = await transcribeAudio({
      audioUrl,
      language,
      prompt: language === "ja" 
        ? "プログラミングとアプリ開発に関する音声コマンド"
        : "Voice commands for programming and app development",
    });
    
    // Check if result has text property (success case)
    if ('text' in result && typeof result.text === 'string') {
      return {
        text: result.text,
        confidence: 0.9, // Whisper doesn't return confidence, assume high
      };
    }
    
    throw new Error("Transcription failed");
  } catch (error) {
    console.error("[VoiceControl] Transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
}

/**
 * Parse voice command using pattern matching
 */
function parseCommandPattern(text: string): { intent: string; params: Record<string, unknown> } | null {
  const normalizedText = text.toLowerCase().trim();
  
  for (const [category, patterns] of Object.entries(COMMAND_PATTERNS)) {
    for (const { pattern, intent } of patterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        return {
          intent,
          params: {
            category,
            fullMatch: match[0],
            groups: match.slice(1).filter(Boolean),
          },
        };
      }
    }
  }
  
  return null;
}

/**
 * Process voice command using LLM for complex understanding
 */
export async function processVoiceCommand(
  transcription: string,
  context: VoiceInteractionContext
): Promise<VoiceCommandResult> {
  // First try pattern matching for simple commands
  const patternResult = parseCommandPattern(transcription);
  
  if (patternResult) {
    return {
      intent: patternResult.intent,
      action: {
        type: patternResult.intent,
        params: patternResult.params,
      },
      response: generateResponse(patternResult.intent, patternResult.params, context.language),
      confidence: 0.95,
    };
  }
  
  // Use LLM for complex commands
  const systemPrompt = `You are ADELE's voice command processor. Analyze the user's voice command and determine the intent and action.

Project Context:
- Project Name: ${context.projectName}
- Current File: ${context.currentFile || "None"}
- Language: ${context.language === "ja" ? "Japanese" : "English"}

Available intents:
- navigate: Go to a specific page or file
- create: Create a new component, page, or feature
- edit: Modify existing code
- delete: Remove code or files
- save_version: Save current state as a version
- deploy: Deploy the application
- download: Download the code
- preview: Show the preview
- help: Show help information
- chat: General conversation or question about coding

Respond in JSON format:
{
  "intent": "string",
  "action": {
    "type": "string",
    "params": {}
  },
  "response": "string (friendly response to user in their language)",
  "confidence": number (0-1)
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcription },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "voice_command_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              intent: { type: "string" },
              action: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  params: { type: "object", additionalProperties: true },
                },
                required: ["type", "params"],
                additionalProperties: false,
              },
              response: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["intent", "action", "response", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content && typeof content === 'string') {
      return JSON.parse(content) as VoiceCommandResult;
    }
  } catch (error) {
    console.error("[VoiceControl] LLM processing error:", error);
  }
  
  // Fallback response
  return {
    intent: "chat",
    action: { type: "chat", params: { message: transcription } },
    response: context.language === "ja" 
      ? "すみません、そのコマンドを理解できませんでした。もう一度お試しください。"
      : "I'm sorry, I didn't understand that command. Please try again.",
    confidence: 0.3,
  };
}

/**
 * Generate response based on intent
 */
function generateResponse(
  intent: string,
  params: Record<string, unknown>,
  language: "en" | "ja"
): string {
  const groups = params.groups as string[] | undefined;
  const target = groups?.[1] || groups?.[0] || "";
  const createTarget = groups?.[2] || groups?.[1] || "the requested item";
  const scrollDir = groups?.[0] || "down";
  
  const responses: Record<string, { en: string; ja: string }> = {
    navigate: {
      en: `Navigating to ${target || "the requested page"}...`,
      ja: `${target || "リクエストされたページ"}に移動しています...`,
    },
    go_back: {
      en: "Going back to the previous page...",
      ja: "前のページに戻っています...",
    },
    go_home: {
      en: "Going to the dashboard...",
      ja: "ダッシュボードに移動しています...",
    },
    create: {
      en: `Creating ${createTarget}...`,
      ja: `${createTarget}を作成しています...`,
    },
    edit: {
      en: `Editing ${target || "the selected item"}...`,
      ja: `${target || "選択されたアイテム"}を編集しています...`,
    },
    delete: {
      en: `Deleting ${target || "the selected item"}...`,
      ja: `${target || "選択されたアイテム"}を削除しています...`,
    },
    save_version: {
      en: "Saving a new version of your project...",
      ja: "プロジェクトの新しいバージョンを保存しています...",
    },
    deploy: {
      en: "Deploying your application...",
      ja: "アプリケーションをデプロイしています...",
    },
    download: {
      en: "Preparing your code for download...",
      ja: "コードのダウンロードを準備しています...",
    },
    preview: {
      en: "Opening the preview...",
      ja: "プレビューを開いています...",
    },
    help: {
      en: "Here are some commands you can use: 'create a login page', 'edit the header', 'save version', 'deploy', 'show preview'",
      ja: "使用できるコマンド: '作成 ログインページ', '編集 ヘッダー', '保存', 'デプロイ', 'プレビュー'",
    },
    scroll: {
      en: `Scrolling ${scrollDir}...`,
      ja: `${scrollDir === "up" ? "上" : "下"}にスクロールしています...`,
    },
    toggle_theme: {
      en: "Toggling the theme...",
      ja: "テーマを切り替えています...",
    },
  };
  
  const intentResponse = responses[intent];
  if (intentResponse) {
    return language === "ja" ? intentResponse.ja : intentResponse.en;
  }
  return "Processing your command...";
}

/**
 * Execute voice command action
 */
export async function executeVoiceAction(
  projectId: number,
  userId: number,
  result: VoiceCommandResult
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  // Log the voice command
  await db.createVoiceCommand({
    projectId,
    userId,
    transcription: result.response,
    intent: result.intent,
    action: result.action,
    status: "processing",
  });
  
  // Execute based on intent
  switch (result.action.type) {
    case "navigate":
      const navGroups = result.action.params.groups as string[] | undefined;
      return { success: true, data: { redirect: navGroups?.[1] || "/" } };
    
    case "go_back":
      return { success: true, data: { action: "history_back" } };
    
    case "go_home":
      return { success: true, data: { redirect: "/dashboard" } };
    
    case "save_version":
      return { success: true, data: { action: "create_version" } };
    
    case "deploy":
      return { success: true, data: { action: "deploy" } };
    
    case "download":
      return { success: true, data: { action: "download" } };
    
    case "preview":
      return { success: true, data: { action: "show_preview" } };
    
    case "toggle_theme":
      return { success: true, data: { action: "toggle_theme" } };
    
    case "scroll":
      const scrollGroups = result.action.params.groups as string[] | undefined;
      return { 
        success: true, 
        data: { 
          action: "scroll", 
          direction: scrollGroups?.[0] || "down" 
        } 
      };
    
    case "help":
      return { success: true, data: { action: "show_help" } };
    
    case "create":
    case "edit":
    case "delete":
    case "chat":
      // These require sending to the chat/agent system
      return { 
        success: true, 
        data: { 
          action: "send_to_chat", 
          message: result.action.params.message || result.response 
        } 
      };
    
    default:
      return { success: false, error: "Unknown action type" };
  }
}

/**
 * Get proactive suggestions based on context
 */
export function getProactiveSuggestions(
  context: VoiceInteractionContext
): string[] {
  const suggestions: string[] = [];
  
  if (context.language === "ja") {
    suggestions.push(
      "「新しいページを作成」と言ってみてください",
      "「プレビューを表示」でアプリを確認できます",
      "「保存」でバージョンを作成できます"
    );
  } else {
    suggestions.push(
      "Try saying 'create a new page'",
      "Say 'show preview' to see your app",
      "Say 'save version' to create a checkpoint"
    );
  }
  
  return suggestions;
}

/**
 * Generate proactive speech for user engagement
 */
export async function generateProactiveSpeech(
  context: VoiceInteractionContext,
  trigger: "idle" | "completion" | "error" | "greeting"
): Promise<string> {
  const prompts: Record<string, { en: string; ja: string }> = {
    idle: {
      en: "I notice you've been quiet for a while. Need any help with your project?",
      ja: "しばらく操作がないようですね。何かお手伝いしましょうか？",
    },
    completion: {
      en: `Great job! Your ${context.projectName} is looking good. What would you like to work on next?`,
      ja: `素晴らしい！${context.projectName}は順調に進んでいます。次は何をしましょうか？`,
    },
    error: {
      en: "I encountered an issue, but don't worry - I can help you fix it. Would you like me to explain what went wrong?",
      ja: "問題が発生しましたが、心配しないでください。修正のお手伝いをします。何が起きたか説明しましょうか？",
    },
    greeting: {
      en: `Welcome back! Ready to continue working on ${context.projectName}?`,
      ja: `おかえりなさい！${context.projectName}の作業を続けましょうか？`,
    },
  };
  
  return prompts[trigger]?.[context.language] || prompts[trigger]?.en || "";
}
