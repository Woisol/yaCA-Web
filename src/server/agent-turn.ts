import {
  appendAssistantDelta,
  appendChatLine,
  applyAssistantEventPatch,
  applyToolCall,
  applyToolResult,
  applySxmlPatch,
  collectAssistantText,
  createStoredAgentEventMessage,
  formatStoredMessageContent,
  parseUserInput,
  reduceMessageFile,
  renderSessionMessages,
  storedChatMessagesToModelMessages,
  type AgentEvent,
  type ChatMessage,
  type StoredChatMessage,
  type YacaSxmlEvent
} from '@woisol-g/yaca/web-runtime.js';
import type { YacaWebRuntime } from './types.js';

export async function runWebAgentTurn(
  text: string,
  runtime: YacaWebRuntime,
  options: {
    sessionId?: string;
    content?: StoredChatMessage['content'];
    signal?: AbortSignal;
    onMessages(messages: ChatMessage[], sessionId: string): void;
    onEvent(event: AgentEvent): void;
  }
): Promise<{ sessionId: string; messages: ChatMessage[] }> {
  await runtime.toolPermissions?.refreshConfigIfChanged();
  if (options.sessionId) {
    runtime.state.sessionId = options.sessionId;
  }
  if (!runtime.state.sessionId) {
    runtime.state.sessionId = (await runtime.store.createSession(text.slice(0, 80))).id;
  }

  const sessionId = runtime.state.sessionId;
  const content = options.content ?? await parseUserInput(text, runtime.cwd);
  await runtime.store.appendMessage(sessionId, { role: 'user', content });

  let messages = appendChatLine(
    renderSessionMessages(await runtime.store.readMessages(sessionId)).slice(0, -1),
    'user',
    reduceMessageFile(formatStoredMessageContent(content))
  );
  options.onMessages(messages, sessionId);

  const assistantEvents: YacaSxmlEvent[] = [];
  const assistantTextEvents: string[] = [];
  const storedHistory = await runtime.store.readMessages(sessionId);
  const initialMessages = storedChatMessagesToModelMessages(storedHistory, runtime.state.config.tool_call.tool_call_compatible);

  for await (const event of runtime.createAgent().runStream(initialMessages, { signal: options.signal })) {
    options.onEvent(event);
    if (event.type === 'assistant_delta') {
      assistantTextEvents.push(event.text);
      messages = appendAssistantDelta(messages, event.text);
    } else if (event.type === 'assistant_replace') {
      continue;
    } else if (event.type === 'assistant_event') {
      applySxmlPatch(assistantEvents, event.patch);
      messages = applyAssistantEventPatch(messages, event.patch);
    } else if (event.type === 'tool_call') {
      await appendStoredAgentEvent(runtime, event);
      messages = applyToolCall(messages, event);
    } else if (event.type === 'tool_result') {
      await appendStoredAgentEvent(runtime, event);
      messages = applyToolResult(messages, event, false);
    } else {
      await appendStoredAgentEvent(runtime, event);
      if (event.type === 'assistant_text') {
        assistantTextEvents.push(event.text);
        messages = appendChatLine(messages, 'assistant', event.text);
      } else if (event.type === 'error') {
        messages = appendChatLine(messages, 'error', event.message);
      }
    }
    options.onMessages(messages, sessionId);
  }

  const assistantText = [collectAssistantText(assistantEvents), ...assistantTextEvents].filter(Boolean).join('');
  if (assistantText) {
    await runtime.store.appendMessage(sessionId, { role: 'assistant', content: assistantText });
  }
  return { sessionId, messages };
}

async function appendStoredAgentEvent(runtime: YacaWebRuntime, event: AgentEvent): Promise<void> {
  if (!runtime.state.sessionId) return;
  const message = createStoredAgentEventMessage(event);
  if (!message) return;
  await runtime.store.appendMessage(runtime.state.sessionId, message);
}
