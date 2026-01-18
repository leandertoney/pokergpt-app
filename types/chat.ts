// Chat persistence types for storing conversations like ChatGPT/Claude

import type { ChatMessage } from '@/services/pokerAI';

export type { ChatMessage } from '@/services/pokerAI';

export type ChatConversation = {
  id: string;
  sessionId?: string; // Links to Session for organization
  title: string; // Auto-generated or user-defined
  messages: ChatMessage[];
  createdAt: number; // Unix timestamp
  updatedAt: number; // Last message timestamp
  messageCount: number;
  preview: string; // First ~100 chars for display
};

// Helper type for chat list display (lighter weight)
export type ChatListItem = Pick<
  ChatConversation,
  'id' | 'title' | 'preview' | 'createdAt' | 'updatedAt' | 'messageCount' | 'sessionId'
>;
