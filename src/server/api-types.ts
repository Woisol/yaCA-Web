import type { AgentEvent, ChatMessage, MessagePart, SessionMeta, ToolCall, YacaConfig } from '@woisol-g/yaca/web-runtime.js';

export type { AgentEvent, ChatMessage, MessagePart, SessionMeta, ToolCall, YacaConfig };

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
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

export type CreateSessionRequest = {
  name?: string;
};

export type UpdateSessionRequest = {
  name?: string;
};

export type UpdateConfigRequest = {
  model?: string;
  baseUrl?: string;
  trustMode?: boolean;
  allowTools?: string[];
  allowCommands?: string[];
};

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
  | { type: 'chat.send'; id: string; sessionId?: string; text: string; content?: string | MessagePart[] }
  | { type: 'chat.abort'; id: string; sessionId?: string }
  | { type: 'session.resume'; id: string; sessionId: string }
  | { type: 'tool.confirm'; id: string; callId: string; approved: boolean };

export type ServerWsMessage =
  | { type: 'chat.messages'; id: string; sessionId?: string; messages: ChatMessage[] }
  | { type: 'chat.done'; id: string; sessionId?: string }
  | { type: 'chat.line'; id: string; kind: ChatMessage['kind']; text: string }
  | { type: 'agent.event'; id: string; event: AgentEvent }
  | { type: 'tool.confirm_request'; id: string; callId: string; call: ToolCall; kind: 'tool' | 'command' }
  | { type: 'session.list'; id: string; sessions: SessionMeta[] }
  | { type: 'config'; id: string; config: YacaConfig; runtime: RuntimeInfo }
  | { type: 'error'; id: string; error: ApiError };
