/**
 * Real-time Collaboration System for ADELE
 * WebSocket-based collaboration with cursor presence and live updates
 */

import * as db from "./db";

export interface CollaboratorInfo {
  sessionId: string;
  userId: number;
  userName: string;
  userColor: string;
  cursorPosition?: {
    file?: string;
    line?: number;
    column?: number;
  };
  lastActivity: Date;
}

export interface CollaborationEvent {
  type: "join" | "leave" | "cursor_move" | "file_change" | "chat" | "typing";
  projectId: number;
  sessionId: string;
  userId: number;
  userName: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

// Color palette for collaborator cursors
const COLLABORATOR_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Gold
  "#BB8FCE", // Purple
  "#85C1E9", // Sky Blue
];

// In-memory store for active collaborators (in production, use Redis)
const activeCollaborators = new Map<number, Map<string, CollaboratorInfo>>();
const eventListeners = new Map<number, Set<(event: CollaborationEvent) => void>>();

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get a color for a collaborator based on their position
 */
function getCollaboratorColor(projectId: number): string {
  const projectCollaborators = activeCollaborators.get(projectId);
  const usedColors = new Set(
    Array.from(projectCollaborators?.values() || []).map(c => c.userColor)
  );
  
  for (const color of COLLABORATOR_COLORS) {
    if (!usedColors.has(color)) {
      return color;
    }
  }
  
  // If all colors are used, return a random one
  return COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)];
}

/**
 * Join a collaboration session
 */
export async function joinCollaboration(
  projectId: number,
  userId: number,
  userName: string
): Promise<{ sessionId: string; collaborators: CollaboratorInfo[] }> {
  const sessionId = generateSessionId();
  const userColor = getCollaboratorColor(projectId);
  
  // Initialize project collaborators map if needed
  if (!activeCollaborators.has(projectId)) {
    activeCollaborators.set(projectId, new Map());
  }
  
  const projectCollaborators = activeCollaborators.get(projectId)!;
  
  const collaboratorInfo: CollaboratorInfo = {
    sessionId,
    userId,
    userName,
    userColor,
    lastActivity: new Date(),
  };
  
  projectCollaborators.set(sessionId, collaboratorInfo);
  
  // Save to database
  await db.createCollaborationSession({
    projectId,
    userId,
    sessionId,
    isActive: true,
  });
  
  // Broadcast join event
  broadcastEvent(projectId, {
    type: "join",
    projectId,
    sessionId,
    userId,
    userName,
    payload: { userColor },
    timestamp: new Date(),
  });
  
  return {
    sessionId,
    collaborators: Array.from(projectCollaborators.values()),
  };
}

/**
 * Leave a collaboration session
 */
export async function leaveCollaboration(
  projectId: number,
  sessionId: string
): Promise<void> {
  const projectCollaborators = activeCollaborators.get(projectId);
  if (!projectCollaborators) return;
  
  const collaborator = projectCollaborators.get(sessionId);
  if (!collaborator) return;
  
  projectCollaborators.delete(sessionId);
  
  // Update database
  await db.endCollaborationSession(sessionId);
  
  // Broadcast leave event
  broadcastEvent(projectId, {
    type: "leave",
    projectId,
    sessionId,
    userId: collaborator.userId,
    userName: collaborator.userName,
    payload: {},
    timestamp: new Date(),
  });
  
  // Clean up empty project maps
  if (projectCollaborators.size === 0) {
    activeCollaborators.delete(projectId);
    eventListeners.delete(projectId);
  }
}

/**
 * Update cursor position
 */
export async function updateCursorPosition(
  projectId: number,
  sessionId: string,
  cursorPosition: { file?: string; line?: number; column?: number }
): Promise<void> {
  const projectCollaborators = activeCollaborators.get(projectId);
  if (!projectCollaborators) return;
  
  const collaborator = projectCollaborators.get(sessionId);
  if (!collaborator) return;
  
  collaborator.cursorPosition = cursorPosition;
  collaborator.lastActivity = new Date();
  
  // Update database
  await db.updateCollaboratorCursor(sessionId, cursorPosition);
  
  // Broadcast cursor move event
  broadcastEvent(projectId, {
    type: "cursor_move",
    projectId,
    sessionId,
    userId: collaborator.userId,
    userName: collaborator.userName,
    payload: { cursorPosition, userColor: collaborator.userColor },
    timestamp: new Date(),
  });
}

/**
 * Broadcast a file change event
 */
export function broadcastFileChange(
  projectId: number,
  sessionId: string,
  userId: number,
  userName: string,
  fileChange: {
    filePath: string;
    changeType: "create" | "update" | "delete";
    content?: string;
  }
): void {
  broadcastEvent(projectId, {
    type: "file_change",
    projectId,
    sessionId,
    userId,
    userName,
    payload: fileChange,
    timestamp: new Date(),
  });
}

/**
 * Broadcast a chat message
 */
export function broadcastChatMessage(
  projectId: number,
  sessionId: string,
  userId: number,
  userName: string,
  message: string
): void {
  broadcastEvent(projectId, {
    type: "chat",
    projectId,
    sessionId,
    userId,
    userName,
    payload: { message },
    timestamp: new Date(),
  });
}

/**
 * Broadcast typing indicator
 */
export function broadcastTypingIndicator(
  projectId: number,
  sessionId: string,
  userId: number,
  userName: string,
  isTyping: boolean
): void {
  broadcastEvent(projectId, {
    type: "typing",
    projectId,
    sessionId,
    userId,
    userName,
    payload: { isTyping },
    timestamp: new Date(),
  });
}

/**
 * Get active collaborators for a project
 */
export function getActiveCollaborators(projectId: number): CollaboratorInfo[] {
  const projectCollaborators = activeCollaborators.get(projectId);
  if (!projectCollaborators) return [];
  return Array.from(projectCollaborators.values());
}

/**
 * Subscribe to collaboration events
 */
export function subscribeToEvents(
  projectId: number,
  callback: (event: CollaborationEvent) => void
): () => void {
  if (!eventListeners.has(projectId)) {
    eventListeners.set(projectId, new Set());
  }
  
  eventListeners.get(projectId)!.add(callback);
  
  // Return unsubscribe function
  return () => {
    const listeners = eventListeners.get(projectId);
    if (listeners) {
      listeners.delete(callback);
    }
  };
}

/**
 * Broadcast an event to all listeners
 */
function broadcastEvent(projectId: number, event: CollaborationEvent): void {
  const listeners = eventListeners.get(projectId);
  if (!listeners) return;
  
  listeners.forEach(callback => {
    try {
      callback(event);
    } catch (error) {
      console.error("[Collaboration] Error in event listener:", error);
    }
  });
}

/**
 * Clean up inactive sessions (run periodically)
 */
export async function cleanupInactiveSessions(maxInactiveMs: number = 5 * 60 * 1000): Promise<void> {
  const now = new Date();
  
  const projectIds = Array.from(activeCollaborators.keys());
  for (const projectId of projectIds) {
    const collaborators = activeCollaborators.get(projectId);
    if (!collaborators) continue;
    
    const sessionIds = Array.from(collaborators.keys());
    for (const sessionId of sessionIds) {
      const collaborator = collaborators.get(sessionId);
      if (!collaborator) continue;
      
      const inactiveTime = now.getTime() - collaborator.lastActivity.getTime();
      if (inactiveTime > maxInactiveMs) {
        await leaveCollaboration(projectId, sessionId);
      }
    }
  }
}

// Start cleanup interval (every minute)
setInterval(() => {
  cleanupInactiveSessions().catch(console.error);
}, 60 * 1000);
