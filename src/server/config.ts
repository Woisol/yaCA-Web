import type { ListToolsResponse, RuntimeInfo, ToolDefinitionView, UpdateConfigRequest } from './api-types.js';
import type { YacaWebRuntime } from './types.js';

export async function updateRuntimeConfig(runtime: YacaWebRuntime, update: UpdateConfigRequest): Promise<void> {
  if (update.model !== undefined) {
    runtime.state.model = update.model;
    runtime.state.config.model = update.model;
  }
  if (update.baseUrl !== undefined) {
    runtime.state.baseUrl = update.baseUrl;
    runtime.state.config.base_url = update.baseUrl;
  }
  if (update.trustMode !== undefined) {
    runtime.state.trustMode = update.trustMode;
  }
  if (update.allowTools !== undefined) {
    runtime.state.config.tool_call.allow.tools = update.allowTools;
  }
  if (update.allowCommands !== undefined) {
    runtime.state.config.tool_call.allow.commands = update.allowCommands;
  }
  await runtime.state.configStore.save(runtime.state.config);
  runtime.state.configMtimeMs = await runtime.state.configStore.getMtimeMs();
}

export function listTools(runtime: YacaWebRuntime): ListToolsResponse {
  return {
    tools: listToolDefinitions(runtime),
    allowTools: runtime.state.config.tool_call.allow.tools,
    allowCommands: runtime.state.config.tool_call.allow.commands
  };
}

export function getRuntimeInfo(runtime: YacaWebRuntime): RuntimeInfo {
  return {
    model: runtime.state.model,
    baseUrl: runtime.state.baseUrl,
    cwd: runtime.cwd,
    trustMode: runtime.state.trustMode ?? false
  };
}

function listToolDefinitions(runtime: YacaWebRuntime): ToolDefinitionView[] {
  return runtime.tools?.definitions?.().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  })) ?? [];
}
