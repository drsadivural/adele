/**
 * Biometric Service - Voice and Face Recognition
 * Supports voice sample registration and face photo registration
 * Uses embeddings for recognition matching
 */

import { UserBiometric } from "../drizzle/schema";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";

// Biometric Types
interface VoiceSample {
  audioData: Buffer;
  format: string;
  duration: number;
}

interface FacePhoto {
  imageData: Buffer;
  format: string;
  dimensions: { width: number; height: number };
}

interface BiometricMatch {
  userId: number;
  confidence: number;
  biometricType: "voice" | "face";
}

// Voice Processing Service
export class VoiceRecognitionService {
  /**
   * Process voice sample and generate embedding
   */
  async processVoiceSample(sample: VoiceSample): Promise<{
    url: string;
    embedding: number[];
    quality: number;
  }> {
    // Upload to S3
    const fileName = `voice-samples/${Date.now()}-${Math.random().toString(36).substring(7)}.${sample.format}`;
    const { url } = await storagePut(fileName, sample.audioData, `audio/${sample.format}`);
    
    // Generate voice embedding using audio features
    // In production, use a proper voice embedding model (e.g., SpeechBrain, Resemblyzer)
    const embedding = await this.generateVoiceEmbedding(sample.audioData);
    
    // Calculate quality score based on audio properties
    const quality = this.calculateVoiceQuality(sample);
    
    return { url, embedding, quality };
  }
  
  /**
   * Generate voice embedding vector
   * In production, use a dedicated voice embedding model
   */
  private async generateVoiceEmbedding(audioData: Buffer): Promise<number[]> {
    // Placeholder: Generate a 256-dimensional embedding
    // In production, use models like:
    // - SpeechBrain's speaker verification
    // - Resemblyzer
    // - ECAPA-TDNN
    const embedding: number[] = [];
    for (let i = 0; i < 256; i++) {
      // Use audio data to seed pseudo-random embedding
      const seed = audioData[i % audioData.length] || 0;
      embedding.push((seed / 255) * 2 - 1 + Math.random() * 0.1);
    }
    return embedding;
  }
  
  /**
   * Calculate voice sample quality score
   */
  private calculateVoiceQuality(sample: VoiceSample): number {
    // Quality factors:
    // - Duration (3-10 seconds optimal)
    // - Format (wav/flac better than mp3)
    // - Size (indicates bitrate)
    
    let score = 0.5;
    
    // Duration score
    if (sample.duration >= 3 && sample.duration <= 10) {
      score += 0.3;
    } else if (sample.duration >= 1 && sample.duration <= 15) {
      score += 0.15;
    }
    
    // Format score
    if (sample.format === "wav" || sample.format === "flac") {
      score += 0.2;
    } else if (sample.format === "webm" || sample.format === "ogg") {
      score += 0.1;
    }
    
    return Math.min(score, 1);
  }
  
  /**
   * Match voice against registered samples
   */
  async matchVoice(
    sample: VoiceSample,
    registeredBiometrics: UserBiometric[]
  ): Promise<BiometricMatch | null> {
    const sampleEmbedding = await this.generateVoiceEmbedding(sample.audioData);
    
    let bestMatch: BiometricMatch | null = null;
    let highestSimilarity = 0;
    
    for (const biometric of registeredBiometrics) {
      if (biometric.biometricType !== "voice" || !biometric.embedding) continue;
      
      const similarity = this.cosineSimilarity(
        sampleEmbedding,
        biometric.embedding as number[]
      );
      
      if (similarity > highestSimilarity && similarity > 0.7) {
        highestSimilarity = similarity;
        bestMatch = {
          userId: biometric.userId,
          confidence: similarity,
          biometricType: "voice",
        };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Face Recognition Service
export class FaceRecognitionService {
  /**
   * Process face photo and generate embedding
   * Uses InsightFace detection and ArcFace for recognition
   */
  async processFacePhoto(photo: FacePhoto): Promise<{
    url: string;
    embedding: number[];
    quality: number;
    faceDetected: boolean;
  }> {
    // Upload to S3
    const fileName = `face-photos/${Date.now()}-${Math.random().toString(36).substring(7)}.${photo.format}`;
    const { url } = await storagePut(fileName, photo.imageData, `image/${photo.format}`);
    
    // Detect face and generate embedding
    // In production, use InsightFace + ArcFace
    const faceResult = await this.detectAndEmbed(photo.imageData);
    
    // Calculate quality score
    const quality = this.calculateFaceQuality(photo, faceResult.faceDetected);
    
    return {
      url,
      embedding: faceResult.embedding,
      quality,
      faceDetected: faceResult.faceDetected,
    };
  }
  
  /**
   * Detect face and generate embedding
   * In production, use InsightFace + ArcFace
   */
  private async detectAndEmbed(imageData: Buffer): Promise<{
    embedding: number[];
    faceDetected: boolean;
  }> {
    // Placeholder: Generate a 512-dimensional embedding (ArcFace standard)
    // In production, use:
    // - InsightFace for face detection
    // - ArcFace for face embedding
    
    // Simulate face detection based on image size
    const faceDetected = imageData.length > 10000; // Simple heuristic
    
    const embedding: number[] = [];
    for (let i = 0; i < 512; i++) {
      const seed = imageData[i % imageData.length] || 0;
      embedding.push((seed / 255) * 2 - 1 + Math.random() * 0.05);
    }
    
    return { embedding, faceDetected };
  }
  
  /**
   * Calculate face photo quality score
   */
  private calculateFaceQuality(photo: FacePhoto, faceDetected: boolean): number {
    if (!faceDetected) return 0;
    
    let score = 0.5;
    
    // Resolution score
    const minDim = Math.min(photo.dimensions.width, photo.dimensions.height);
    if (minDim >= 256) score += 0.2;
    if (minDim >= 512) score += 0.1;
    
    // Aspect ratio score (prefer square-ish)
    const aspectRatio = photo.dimensions.width / photo.dimensions.height;
    if (aspectRatio >= 0.7 && aspectRatio <= 1.4) score += 0.1;
    
    // Format score
    if (photo.format === "png" || photo.format === "webp") {
      score += 0.1;
    }
    
    return Math.min(score, 1);
  }
  
  /**
   * Match face against registered photos
   */
  async matchFace(
    photo: FacePhoto,
    registeredBiometrics: UserBiometric[]
  ): Promise<BiometricMatch | null> {
    const result = await this.detectAndEmbed(photo.imageData);
    if (!result.faceDetected) return null;
    
    let bestMatch: BiometricMatch | null = null;
    let highestSimilarity = 0;
    
    for (const biometric of registeredBiometrics) {
      if (biometric.biometricType !== "face" || !biometric.embedding) continue;
      
      const similarity = this.cosineSimilarity(
        result.embedding,
        biometric.embedding as number[]
      );
      
      // ArcFace typically uses 0.4-0.5 threshold
      if (similarity > highestSimilarity && similarity > 0.5) {
        highestSimilarity = similarity;
        bestMatch = {
          userId: biometric.userId,
          confidence: similarity,
          biometricType: "face",
        };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Combined Biometric Service
export class BiometricService {
  private voiceService: VoiceRecognitionService;
  private faceService: FaceRecognitionService;
  
  constructor() {
    this.voiceService = new VoiceRecognitionService();
    this.faceService = new FaceRecognitionService();
  }
  
  async registerVoice(userId: number, sample: VoiceSample) {
    return this.voiceService.processVoiceSample(sample);
  }
  
  async registerFace(userId: number, photo: FacePhoto) {
    return this.faceService.processFacePhoto(photo);
  }
  
  async matchVoice(sample: VoiceSample, biometrics: UserBiometric[]) {
    return this.voiceService.matchVoice(sample, biometrics);
  }
  
  async matchFace(photo: FacePhoto, biometrics: UserBiometric[]) {
    return this.faceService.matchFace(photo, biometrics);
  }
  
  /**
   * Multi-modal biometric matching
   * Combines voice and face recognition for higher accuracy
   */
  async matchMultiModal(
    voiceSample: VoiceSample | null,
    facePhoto: FacePhoto | null,
    biometrics: UserBiometric[]
  ): Promise<BiometricMatch | null> {
    const matches: BiometricMatch[] = [];
    
    if (voiceSample) {
      const voiceMatch = await this.matchVoice(voiceSample, biometrics);
      if (voiceMatch) matches.push(voiceMatch);
    }
    
    if (facePhoto) {
      const faceMatch = await this.matchFace(facePhoto, biometrics);
      if (faceMatch) matches.push(faceMatch);
    }
    
    if (matches.length === 0) return null;
    
    // If both match the same user, boost confidence
    if (matches.length === 2 && matches[0].userId === matches[1].userId) {
      return {
        userId: matches[0].userId,
        confidence: Math.min((matches[0].confidence + matches[1].confidence) / 1.5, 1),
        biometricType: "face", // Primary
      };
    }
    
    // Return highest confidence match
    return matches.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }
}

export const biometricService = new BiometricService();
