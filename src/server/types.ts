import type { AgentLoop, CliState, SessionStore, ToolCall, ToolDefinition, ToolPermissionController } from '@woisol-g/yaca/web-runtime.js';

export type ToolRegistryLike = {
  definitions?(): ToolDefinition[];
};

export type YacaWebRuntime = {
  cwd: string;
  state: CliState;
  store: SessionStore;
  tools?: ToolRegistryLike;
  toolPermissions?: ToolPermissionController;
  createAgent(): AgentLoop;
};

export type StartYacaWebServerOptions = YacaWebRuntime & {
  port: number;
  host?: string;
  serveStatic?: boolean;
};

export type PendingToolApproval = {
  call: ToolCall;
  kind: 'tool' | 'command';
  resolve(approved: boolean): void;
};
