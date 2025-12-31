/**
 * Auto-Learning Feedback System for AppForge
 * Collects user feedback and improves code generation quality over time
 */

import { invokeLLM } from "./_core/llm";
import * as db from "./db";

export interface FeedbackEntry {
  projectId: number;
  userId: number;
  rating: number; // 1-5
  feedbackType: "code_quality" | "ui_design" | "functionality" | "performance" | "general";
  comment?: string;
  context?: {
    agentType?: string;
    fileId?: number;
    taskId?: number;
  };
}

export interface FeedbackAnalysis {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  trends: {
    category: string;
    score: number;
    change: number;
  }[];
}

export interface LearningInsight {
  pattern: string;
  frequency: number;
  recommendation: string;
  priority: "high" | "medium" | "low";
}

/**
 * Submit feedback for a project
 */
export async function submitFeedback(feedback: FeedbackEntry): Promise<void> {
  await db.createFeedback({
    projectId: feedback.projectId,
    userId: feedback.userId,
    rating: feedback.rating,
    feedbackType: feedback.feedbackType,
    comment: feedback.comment,
    context: feedback.context
  });
}

/**
 * Analyze feedback for a project
 */
export async function analyzeFeedback(projectId: number): Promise<FeedbackAnalysis> {
  const feedbackList = await db.getFeedbackByProjectId(projectId);
  
  if (!feedbackList || feedbackList.length === 0) {
    return {
      overallScore: 0,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      trends: []
    };
  }

  // Calculate overall score
  const totalRating = feedbackList.reduce((sum, f) => sum + (f.rating || 0), 0);
  const overallScore = totalRating / feedbackList.length;

  // Group by feedback type
  const byType: Record<string, number[]> = {};
  feedbackList.forEach(f => {
    if (!byType[f.feedbackType]) {
      byType[f.feedbackType] = [];
    }
    if (f.rating) {
      byType[f.feedbackType].push(f.rating);
    }
  });

  // Calculate trends
  const trends = Object.entries(byType).map(([category, ratings]) => ({
    category,
    score: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    change: 0 // Would calculate from historical data
  }));

  // Use LLM to analyze comments
  const comments = feedbackList
    .filter(f => f.comment)
    .map(f => f.comment)
    .join('\n');

  if (comments) {
    const analysisResponse = await invokeLLM({
      messages: [
        { 
          role: "system", 
          content: "You are a feedback analyst. Analyze user feedback and identify patterns." 
        },
        { 
          role: "user", 
          content: `Analyze these user feedback comments and identify strengths, weaknesses, and suggestions:\n\n${comments}\n\nProvide JSON response with: {"strengths": [], "weaknesses": [], "suggestions": []}` 
        }
      ]
    });

    const content = analysisResponse.choices[0]?.message?.content;
    try {
      const analysis = typeof content === 'string' ? JSON.parse(content) : {};
      return {
        overallScore,
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        suggestions: analysis.suggestions || [],
        trends
      };
    } catch {
      // If parsing fails, return basic analysis
    }
  }

  return {
    overallScore,
    strengths: overallScore >= 4 ? ["Generally positive feedback"] : [],
    weaknesses: overallScore < 3 ? ["Room for improvement"] : [],
    suggestions: ["Continue collecting feedback"],
    trends
  };
}

/**
 * Extract learning insights from feedback patterns
 */
export async function extractLearningInsights(): Promise<LearningInsight[]> {
  // This would analyze patterns across all projects
  // For now, return sample insights
  const insights: LearningInsight[] = [
    {
      pattern: "Users prefer TypeScript over JavaScript",
      frequency: 85,
      recommendation: "Default to TypeScript for all frontend code generation",
      priority: "high"
    },
    {
      pattern: "Authentication is frequently requested",
      frequency: 72,
      recommendation: "Include auth scaffolding by default for SaaS apps",
      priority: "high"
    },
    {
      pattern: "Docker deployment is most popular",
      frequency: 68,
      recommendation: "Always generate Docker configuration files",
      priority: "medium"
    },
    {
      pattern: "Users want more inline documentation",
      frequency: 45,
      recommendation: "Increase code comments and JSDoc annotations",
      priority: "medium"
    },
    {
      pattern: "API documentation is valued",
      frequency: 40,
      recommendation: "Auto-generate OpenAPI specs for all backends",
      priority: "low"
    }
  ];

  return insights;
}

/**
 * Apply learning insights to improve generation
 */
export async function applyLearnings(
  appType: string,
  requirements: string
): Promise<{
  enhancedRequirements: string;
  suggestedFeatures: string[];
  qualityChecks: string[];
}> {
  const insights = await extractLearningInsights();
  
  // Filter relevant insights
  const relevantInsights = insights.filter(i => i.priority !== "low");
  
  // Enhance requirements based on insights
  const enhancedRequirements = `${requirements}

Based on user feedback patterns:
${relevantInsights.map(i => `- ${i.recommendation}`).join('\n')}`;

  // Suggest features based on patterns
  const suggestedFeatures = [
    "TypeScript with strict mode",
    "JWT authentication scaffolding",
    "Docker and Docker Compose configuration",
    "Comprehensive inline documentation",
    "OpenAPI/Swagger documentation"
  ];

  // Quality checks to apply
  const qualityChecks = [
    "Verify TypeScript strict mode compliance",
    "Check authentication implementation completeness",
    "Validate Docker configuration",
    "Ensure code documentation coverage > 80%",
    "Verify API documentation completeness"
  ];

  return {
    enhancedRequirements,
    suggestedFeatures,
    qualityChecks
  };
}

/**
 * Generate quality report for generated code
 */
export async function generateQualityReport(
  projectId: number
): Promise<{
  score: number;
  metrics: Record<string, number>;
  issues: string[];
  recommendations: string[];
}> {
  const files = await db.getGeneratedFilesByProjectId(projectId);
  
  if (!files || files.length === 0) {
    return {
      score: 0,
      metrics: {},
      issues: ["No files generated"],
      recommendations: ["Start generating code"]
    };
  }

  // Calculate metrics
  const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
  const avgFileSize = files.reduce((sum, f) => sum + f.content.length, 0) / files.length;
  const hasTests = files.some(f => f.fileName.includes('test') || f.fileName.includes('spec'));
  const hasTypes = files.some(f => f.fileType === 'ts' || f.fileType === 'tsx');
  const hasDocumentation = files.some(f => f.fileType === 'md');

  const metrics = {
    totalFiles: files.length,
    totalLines,
    avgFileSize: Math.round(avgFileSize),
    hasTests: hasTests ? 1 : 0,
    hasTypes: hasTypes ? 1 : 0,
    hasDocumentation: hasDocumentation ? 1 : 0
  };

  // Calculate score
  let score = 50; // Base score
  if (hasTests) score += 15;
  if (hasTypes) score += 15;
  if (hasDocumentation) score += 10;
  if (files.length >= 5) score += 5;
  if (totalLines >= 500) score += 5;

  // Identify issues
  const issues: string[] = [];
  if (!hasTests) issues.push("No test files found");
  if (!hasTypes) issues.push("No TypeScript files found");
  if (!hasDocumentation) issues.push("No documentation files found");
  if (avgFileSize > 5000) issues.push("Some files may be too large");

  // Generate recommendations
  const recommendations: string[] = [];
  if (!hasTests) recommendations.push("Add unit tests for critical functionality");
  if (!hasTypes) recommendations.push("Consider using TypeScript for type safety");
  if (!hasDocumentation) recommendations.push("Add README and API documentation");
  if (avgFileSize > 5000) recommendations.push("Consider splitting large files");

  return {
    score: Math.min(100, score),
    metrics,
    issues,
    recommendations
  };
}

/**
 * Track user interaction patterns
 */
export interface InteractionPattern {
  userId: number;
  action: string;
  context: Record<string, unknown>;
  timestamp: Date;
}

const interactionBuffer: InteractionPattern[] = [];

export function trackInteraction(pattern: InteractionPattern): void {
  interactionBuffer.push(pattern);
  
  // Flush buffer periodically (in production, this would go to a database or analytics service)
  if (interactionBuffer.length >= 100) {
    flushInteractions();
  }
}

async function flushInteractions(): Promise<void> {
  // In production, this would save to database or send to analytics
  console.log(`Flushing ${interactionBuffer.length} interactions`);
  interactionBuffer.length = 0;
}

export default {
  submitFeedback,
  analyzeFeedback,
  extractLearningInsights,
  applyLearnings,
  generateQualityReport,
  trackInteraction
};
