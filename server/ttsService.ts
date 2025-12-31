/**
 * TTS Service - Text-to-Speech Engine with Multiple Provider Support
 * Supports Google Cloud TTS, ElevenLabs, Azure, Amazon Polly, and OpenAI
 */

import { TtsProvider } from "../drizzle/schema";

// TTS Provider Interface
interface TTSRequest {
  text: string;
  voiceId?: string;
  languageCode?: string;
  speakingRate?: number;
  pitch?: number;
}

interface TTSResponse {
  audioContent: string; // Base64 encoded audio
  audioUrl?: string;
  duration?: number;
  format: string;
}

// Provider-specific implementations
abstract class BaseTTSProvider {
  protected config: TtsProvider;
  
  constructor(config: TtsProvider) {
    this.config = config;
  }
  
  abstract synthesize(request: TTSRequest): Promise<TTSResponse>;
  abstract listVoices(): Promise<Voice[]>;
}

interface Voice {
  id: string;
  name: string;
  languageCode: string;
  gender?: string;
  preview?: string;
}

// Google Cloud TTS Provider
class GoogleTTSProvider extends BaseTTSProvider {
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const config = this.config.config as Record<string, unknown> || {};
    const apiKey = this.config.apiKey;
    
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: request.text },
          voice: {
            languageCode: request.languageCode || config.languageCode || "en-US",
            name: request.voiceId || config.voiceId || "en-US-Neural2-J",
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: request.speakingRate || config.speakingRate || 1.0,
            pitch: request.pitch || config.pitch || 0,
          },
        }),
      }
    );
    
    const data = await response.json();
    return {
      audioContent: data.audioContent,
      format: "mp3",
    };
  }
  
  async listVoices(): Promise<Voice[]> {
    const apiKey = this.config.apiKey;
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`
    );
    const data = await response.json();
    
    return (data.voices || []).map((v: any) => ({
      id: v.name,
      name: v.name,
      languageCode: v.languageCodes[0],
      gender: v.ssmlGender,
    }));
  }
}

// ElevenLabs TTS Provider
class ElevenLabsTTSProvider extends BaseTTSProvider {
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const config = this.config.config as Record<string, unknown> || {};
    const apiKey = this.config.apiKey;
    const voiceId = request.voiceId || config.voiceId || "21m00Tcm4TlvDq8ikWAM";
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey || "",
        },
        body: JSON.stringify({
          text: request.text,
          model_id: (config.model as string) || "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );
    
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    
    return {
      audioContent: base64Audio,
      format: "mp3",
    };
  }
  
  async listVoices(): Promise<Voice[]> {
    const apiKey = this.config.apiKey;
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey || "" },
    });
    const data = await response.json();
    
    return (data.voices || []).map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      languageCode: "en",
      preview: v.preview_url,
    }));
  }
}

// Azure TTS Provider
class AzureTTSProvider extends BaseTTSProvider {
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const config = this.config.config as Record<string, unknown> || {};
    const apiKey = this.config.apiKey;
    const endpoint = this.config.apiEndpoint || "eastus";
    const voiceName = request.voiceId || config.voiceId || "en-US-JennyNeural";
    const langCode = request.languageCode || config.languageCode || "en-US";
    
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${langCode}">
        <voice name="${voiceName}">
          <prosody rate="${request.speakingRate || 1.0}" pitch="${request.pitch || 0}%">
            ${request.text}
          </prosody>
        </voice>
      </speak>
    `;
    
    const response = await fetch(
      `https://${endpoint}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/ssml+xml",
          "Ocp-Apim-Subscription-Key": apiKey || "",
          "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        },
        body: ssml,
      }
    );
    
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    
    return {
      audioContent: base64Audio,
      format: "mp3",
    };
  }
  
  async listVoices(): Promise<Voice[]> {
    const apiKey = this.config.apiKey;
    const endpoint = this.config.apiEndpoint || "eastus";
    
    const response = await fetch(
      `https://${endpoint}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
      {
        headers: { "Ocp-Apim-Subscription-Key": apiKey || "" },
      }
    );
    const data = await response.json();
    
    return (data || []).map((v: any) => ({
      id: v.ShortName,
      name: v.DisplayName,
      languageCode: v.Locale,
      gender: v.Gender,
    }));
  }
}

// OpenAI TTS Provider
class OpenAITTSProvider extends BaseTTSProvider {
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const config = this.config.config as Record<string, unknown> || {};
    const apiKey = this.config.apiKey;
    const voice = request.voiceId || config.voiceId || "alloy";
    
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: (config.model as string) || "tts-1",
        input: request.text,
        voice: voice,
        speed: request.speakingRate || 1.0,
      }),
    });
    
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    
    return {
      audioContent: base64Audio,
      format: "mp3",
    };
  }
  
  async listVoices(): Promise<Voice[]> {
    // OpenAI has fixed voices
    return [
      { id: "alloy", name: "Alloy", languageCode: "en" },
      { id: "echo", name: "Echo", languageCode: "en" },
      { id: "fable", name: "Fable", languageCode: "en" },
      { id: "onyx", name: "Onyx", languageCode: "en" },
      { id: "nova", name: "Nova", languageCode: "en" },
      { id: "shimmer", name: "Shimmer", languageCode: "en" },
    ];
  }
}

// Amazon Polly Provider
class AmazonPollyProvider extends BaseTTSProvider {
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    // Note: In production, use AWS SDK
    const config = this.config.config as Record<string, unknown> || {};
    
    // Placeholder - would use AWS SDK in production
    return {
      audioContent: "",
      format: "mp3",
    };
  }
  
  async listVoices(): Promise<Voice[]> {
    // Common Polly voices
    return [
      { id: "Joanna", name: "Joanna", languageCode: "en-US", gender: "Female" },
      { id: "Matthew", name: "Matthew", languageCode: "en-US", gender: "Male" },
      { id: "Amy", name: "Amy", languageCode: "en-GB", gender: "Female" },
      { id: "Brian", name: "Brian", languageCode: "en-GB", gender: "Male" },
      { id: "Mizuki", name: "Mizuki", languageCode: "ja-JP", gender: "Female" },
      { id: "Takumi", name: "Takumi", languageCode: "ja-JP", gender: "Male" },
    ];
  }
}

// TTS Service Factory
export class TTSService {
  private provider: BaseTTSProvider;
  
  constructor(config: TtsProvider) {
    switch (config.provider) {
      case "google":
        this.provider = new GoogleTTSProvider(config);
        break;
      case "elevenlabs":
        this.provider = new ElevenLabsTTSProvider(config);
        break;
      case "azure":
        this.provider = new AzureTTSProvider(config);
        break;
      case "openai":
        this.provider = new OpenAITTSProvider(config);
        break;
      case "amazon":
        this.provider = new AmazonPollyProvider(config);
        break;
      default:
        throw new Error(`Unsupported TTS provider: ${config.provider}`);
    }
  }
  
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    return this.provider.synthesize(request);
  }
  
  async listVoices(): Promise<Voice[]> {
    return this.provider.listVoices();
  }
}

// Available TTS providers info
export const TTS_PROVIDERS = [
  {
    id: "google",
    name: "Google Cloud TTS",
    description: "High-quality neural voices with WaveNet technology",
    features: ["200+ voices", "40+ languages", "SSML support", "Neural voices"],
    requiresApiKey: true,
    docsUrl: "https://cloud.google.com/text-to-speech/docs",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    description: "AI-powered voice synthesis with emotional range",
    features: ["Voice cloning", "Emotional control", "Ultra-realistic", "Custom voices"],
    requiresApiKey: true,
    docsUrl: "https://docs.elevenlabs.io",
  },
  {
    id: "azure",
    name: "Azure Speech Service",
    description: "Microsoft's enterprise-grade speech synthesis",
    features: ["400+ voices", "140+ languages", "Custom neural voice", "SSML support"],
    requiresApiKey: true,
    docsUrl: "https://docs.microsoft.com/azure/cognitive-services/speech-service",
  },
  {
    id: "openai",
    name: "OpenAI TTS",
    description: "Simple, high-quality text-to-speech from OpenAI",
    features: ["6 voices", "Natural sounding", "Fast generation", "HD quality"],
    requiresApiKey: true,
    docsUrl: "https://platform.openai.com/docs/guides/text-to-speech",
  },
  {
    id: "amazon",
    name: "Amazon Polly",
    description: "AWS text-to-speech service with neural voices",
    features: ["60+ voices", "30+ languages", "Neural TTS", "SSML support"],
    requiresApiKey: true,
    docsUrl: "https://docs.aws.amazon.com/polly",
  },
];

export type { TTSRequest, TTSResponse, Voice };
