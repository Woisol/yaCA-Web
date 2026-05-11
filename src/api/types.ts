import type { YacaConfig } from '@yaca/agent-core/storage/config-store.js';
import type { SessionMeta } from '@yaca/agent-core/storage/session-store.js';
import type { AgentEvent, ToolCall } from '@yaca/types';
import type { ChatMessage } from '@yaca/ui/chat/types.js';

export type { AgentEvent, ChatMessage, ToolCall };
export type { SessionMeta, YacaConfig };

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiErrorResponse = {
  error: ApiError;
};

export type ToolDefinitionView = {
  name: string;
  description: string;
  parameters: Record<string, string>;
};

export type RuntimeInfo = {
  model: string;
  baseUrl?: string;
  cwd: string;
  trustMode: boolean;
};

export type ListSessionsResponse = {
  sessions: SessionMeta[];
};

export type CreateSessionRequest = {
  name?: string;
};

export type CreateSessionResponse = {
  session: SessionMeta;
};

export type GetSessionResponse = {
  session: SessionMeta | null;
};

export type GetMessagesResponse = {
  messages: ChatMessage[];
};

export type RewindRequest = {
  selectedIndex: number;
};

export type RewindResponse = {
  messages: ChatMessage[];
  input: string;
};

export type GetConfigResponse = {
  config: YacaConfig;
  runtime: RuntimeInfo;
};

export type UpdateConfigRequest = {
  model?: string;
  baseUrl?: string;
  trustMode?: boolean;
  allowTools?: string[];
  allowCommands?: string[];
};

export type UpdateConfigResponse = GetConfigResponse;

export type ListToolsResponse = {
  tools: ToolDefinitionView[];
  allowTools: string[];
  allowCommands: string[];
};

export type UpdateAllowToolsRequest = {
  allowTools?: string[];
  allowCommands?: string[];
};

export type ClientWsMessage =
  | { type: 'chat.send'; id: string; sessionId?: string; text: string }
  | { type: 'chat.abort'; id: string; sessionId?: string }
  | { type: 'session.resume'; id: string; sessionId: string }
  | { type: 'tool.confirm'; id: string; callId: string; approved: boolean };

export type ServerWsMessage =
  | { type: 'chat.messages'; id: string; sessionId?: string; messages: ChatMessage[] }
  | { type: 'chat.line'; id: string; kind: ChatMessage['kind']; text: string }
  | { type: 'agent.event'; id: string; event: AgentEvent }
  | { type: 'tool.confirm_request'; id: string; callId: string; call: ToolCall; kind: 'tool' | 'command' }
  | { type: 'session.list'; id: string; sessions: SessionMeta[] }
  | { type: 'config'; id: string; config: YacaConfig; runtime: RuntimeInfo }
  | { type: 'error'; id: string; error: ApiError };
