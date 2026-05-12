// 又把类型内嵌回来了……行吧
export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string }; meta?: { path?: string } };

export type ChatMessage = {
  kind: 'user' | 'assistant' | 'tool' | 'status' | 'error';
  text?: string;
  callId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  status?: 'running' | 'success' | 'error';
  result?: string;
  expanded?: boolean;
  rawResponse?: string;
  orphan?: boolean;
};

export type ToolCall = {
  call_id?: string;
  name: string;
  args: Record<string, unknown>;
};

export type AgentEvent =
  | { type: 'assistant_delta'; text: string }
  | { type: 'assistant_replace'; text: string }
  | { type: 'assistant_text'; text: string }
  | { type: 'assistant_event'; patch: unknown }
  | { type: 'tool_call'; call: ToolCall; rawResponse: string }
  | { type: 'tool_result'; call_id?: string; result: { ok: boolean; content: string }; rawResponse: string }
  | { type: 'error'; message: string };

export type SessionMeta = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};

export type YacaConfig = {
  model: string;
  base_url?: string;
  api_key?: string;
  max_turns: number;
  max_tool_retry: number;
  tool_call: {
    tool_call_compatible: boolean;
    postpone_tool_calls: number;
    try_fallback: boolean;
    allow: {
      tools: string[];
      commands: string[];
    };
  };
};

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
