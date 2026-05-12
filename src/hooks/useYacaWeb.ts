import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppendMessage, ExternalStoreAdapter, ThreadMessage } from '@assistant-ui/react';
import type { ChatMessage, MessagePart, SessionMeta, ToolCall, YacaConfig, RuntimeInfo, ToolDefinitionView, ServerWsMessage } from '../api/types.js';
import { rest } from '../api/rest-client.js';
import { createWsClient, type WsClient } from '../api/ws-client.js';
import { appendMessageText, toThreadMessages } from '../lib/assistant.js';
import { readCurrentSessionRoute, writeSessionRoute } from '../lib/session-route.js';

export type PendingToolConfirm = {
  id: string;
  callId: string;
  call: ToolCall;
  kind: 'tool' | 'command';
};

// 其实就是 cli 中 state 的生态位
export function useYacaWeb() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [config, setConfig] = useState<YacaConfig | undefined>();
  const [runtime, setRuntime] = useState<RuntimeInfo | undefined>();
  const [tools, setTools] = useState<ToolDefinitionView[]>([]);
  const [allowTools, setAllowTools] = useState<string[]>([]);
  const [allowCommands, setAllowCommands] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pendingToolConfirm, setPendingToolConfirm] = useState<PendingToolConfirm | null>(null);
  const wsRef = useRef<WsClient | null>(null);
  const sessionsRef = useRef<SessionMeta[]>([]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const loadSession = useCallback(async (id: string, options: { updateRoute?: 'push' | 'replace' | false } = {}) => {
    setSessionId(id);
    setMessages((await rest.getMessages(id)).messages);
    if (options.updateRoute) writeSessionRoute(id, options.updateRoute);
    wsRef.current?.send({ type: 'session.resume', id: crypto.randomUUID(), sessionId: id });
  }, []);

  const loadInitial = useCallback(async () => {
    const [sessionResponse, configResponse, toolsResponse] = await Promise.all([
      rest.listSessions(),
      rest.getConfig(),
      rest.listTools()
    ]);
    setSessions(sessionResponse.sessions);
    setConfig(configResponse.config);
    setRuntime(configResponse.runtime);
    setTools(toolsResponse.tools);
    setAllowTools(toolsResponse.allowTools);
    setAllowCommands(toolsResponse.allowCommands);
    const routedSessionId = readCurrentSessionRoute();
    const first = routedSessionId && sessionResponse.sessions.some((session) => session.id === routedSessionId)
      ? sessionResponse.sessions.find((session) => session.id === routedSessionId)
      : sessionResponse.sessions[0];
    if (first) {
      setSessionId(first.id);
      writeSessionRoute(first.id, 'replace');
      setMessages((await rest.getMessages(first.id)).messages);
    } else {
      writeSessionRoute(undefined, 'replace');
    }
  }, []);

  useEffect(() => {
    void loadInitial().catch((cause: unknown) => setError(formatError(cause)));
  }, [loadInitial]);

  useEffect(() => {
    const onPopState = () => {
      const id = readCurrentSessionRoute();
      if (!id) {
        setSessionId(undefined);
        setMessages([]);
        return;
      }
      if (!sessionsRef.current.some((session) => session.id === id)) return;
      void loadSession(id, { updateRoute: false }).catch((cause: unknown) => setError(formatError(cause)));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loadSession]);

  useEffect(() => {
    const client = createWsClient({
      onOpen: () => setConnected(true),
      onClose: () => {
        setConnected(false);
        setBusy(false);
      },
      onError: () => {
        setConnected(false);
        setBusy(false);
      },
      onMessage: handleWsMessage
    });
    wsRef.current = client;
    return () => {
      client.close();
      wsRef.current = null;
    };
  }, []);

  const threadMessages = useMemo(() => toThreadMessages(messages, runtime?.cwd), [messages, runtime?.cwd]);

  const sendUserMessage = useCallback(async (text: string, content?: string | MessagePart[]) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    let nextSessionId = sessionId;
    if (!nextSessionId) {
      try {
        const created = await rest.createSession({ name: trimmed.slice(0, 80) });
        nextSessionId = created.session.id;
        setSessionId(nextSessionId);
        // setSessions((current) => [created.session, ...current]);
        writeSessionRoute(nextSessionId);
      } catch (cause) {
        setBusy(false);
        setError(formatError(cause));
        return;
      }
    } else {
      const currentSession = sessions.find((session) => session.id === nextSessionId);
      if (currentSession && shouldRenameSessionFromFirstMessage(currentSession, messages)) {
        const nextName = trimmed.slice(0, 80);
        setSessions((current) => current.map((session) => session.id === nextSessionId ? { ...session, name: nextName } : session));
        try {
          const response = await rest.updateSession(nextSessionId, { name: nextName });
          setSessions((current) => current.map((session) => session.id === response.session.id ? response.session : session));
        } catch (cause) {
          setError(formatError(cause));
        }
      }
    }
    setMessages((current) => [...current, { kind: 'user', text: trimmed }]);
    wsRef.current?.send({ type: 'chat.send', id: crypto.randomUUID(), sessionId: nextSessionId, text: trimmed, content });
  }, [messages, sessionId, sessions]);

  const sendText = useCallback(async (text: string) => {
    await sendUserMessage(text);
  }, [sendUserMessage]);

  const sendContent = useCallback(async (text: string, content: string | MessagePart[]) => {
    await sendUserMessage(text, content);
  }, [sendUserMessage]);

  const assistantStore = useMemo<ExternalStoreAdapter<ThreadMessage>>(() => ({
    messages: threadMessages,
    isRunning: busy,
    onNew: async (message: AppendMessage) => {
      await sendUserMessage(appendMessageText(message));
    },
    onCancel: async () => {
      wsRef.current?.send({ type: 'chat.abort', id: crypto.randomUUID(), sessionId });
      setBusy(false);
    }
  }), [busy, sendUserMessage, sessionId, threadMessages]);

  const createSession = useCallback(async () => {
    const created = await rest.createSession({ name: 'New session' });
    // setSessions((current) => [created.session, ...current]);
    setSessionId(created.session.id);
    setMessages([]);
    writeSessionRoute(created.session.id);
  }, []);

  const selectSession = useCallback(async (id: string) => {
    await loadSession(id, { updateRoute: 'push' });
  }, [loadSession]);

  const renameSession = useCallback(async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSessions((current) => current.map((session) => session.id === id ? { ...session, name: trimmed.slice(0, 80) } : session));
    const response = await rest.updateSession(id, { name: trimmed });
    setSessions((current) => current.map((session) => session.id === response.session.id ? response.session : session));
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await rest.deleteSession(id);
    setSessions((current) => current.filter((session) => session.id !== id));
    if (id === sessionId) {
      setSessionId(undefined);
      setMessages([]);
      writeSessionRoute(undefined);
    }
  }, [sessionId]);

  const updateTrustMode = useCallback(async (trustMode: boolean) => {
    const response = await rest.updateConfig({ trustMode });
    setConfig(response.config);
    setRuntime(response.runtime);
  }, []);

  const updateAllow = useCallback(async (nextTools: string[], nextCommands: string[]) => {
    const response = await rest.updateAllow({ allowTools: nextTools, allowCommands: nextCommands });
    setAllowTools(response.allowTools);
    setAllowCommands(response.allowCommands);
  }, []);

  const rewindToMessage = useCallback(async (selectedIndex: number) => {
    if (!sessionId) return '';
    const response = await rest.rewind(sessionId, { selectedIndex });
    setMessages(response.messages);
    setBusy(false);
    return response.input;
  }, [sessionId]);

  const resolveToolConfirm = useCallback((approved: boolean) => {
    const pending = pendingToolConfirm;
    if (!pending) return;
    wsRef.current?.send({ type: 'tool.confirm', id: pending.id, callId: pending.callId, approved });
    setPendingToolConfirm(null);
  }, [pendingToolConfirm]);

  function handleWsMessage(message: ServerWsMessage): void {
    if (message.type === 'chat.messages') {
      setMessages(message.messages);
      if (message.sessionId) {
        setSessionId(message.sessionId);
        writeSessionRoute(message.sessionId, 'replace');
      }
      return;
    }
    if (message.type === 'chat.line') {
      setMessages((current) => [...current, { kind: message.kind, text: message.text }]);
      return;
    }
    if (message.type === 'chat.done') {
      if (message.sessionId) {
        setSessionId(message.sessionId);
        writeSessionRoute(message.sessionId, 'replace');
      }
      setBusy(false);
      return;
    }
    if (message.type === 'tool.confirm_request') {
      setPendingToolConfirm({ id: message.id, callId: message.callId, call: message.call, kind: message.kind });
      return;
    }
    if (message.type === 'session.list') {
      setSessions(message.sessions);
      return;
    }
    if (message.type === 'config') {
      setConfig(message.config);
      setRuntime(message.runtime);
      setAllowTools(message.config.tool_call.allow.tools);
      setAllowCommands(message.config.tool_call.allow.commands);
      return;
    }
    if (message.type === 'error') {
      setError(message.error.message);
      setBusy(false);
      return;
    }
    if (message.type === 'agent.event' && message.event.type !== 'assistant_delta') {
      return;
    }
  }

  return {
    assistantStore,
    sessions,
    sessionId,
    messages,
    config,
    runtime,
    tools,
    allowTools,
    allowCommands,
    connected,
    busy,
    error,
    pendingToolConfirm,
    createSession,
    selectSession,
    renameSession,
    deleteSession,
    sendText,
    sendContent,
    rewindToMessage,
    updateTrustMode,
    updateAllow,
    resolveToolConfirm
  };
}

function shouldRenameSessionFromFirstMessage(session: SessionMeta, messages: ChatMessage[]): boolean {
  return session.name === 'New session' && session.message_count === 0 && messages.length === 0;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
