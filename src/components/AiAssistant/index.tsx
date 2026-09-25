import React, { useState, useEffect, useRef, useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import styles from './styles.module.css';
import { refreshOnce } from '../../utils/authRefresh';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AiConfig {
  aiEndpoint?: string;
  aiModel?: string;
  aiTemperature?: string;
  aiMaxTokens?: string;
  aiSystemPrompt?: string;
  accountApiUrl?: string;
}

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful assistant for the awesome-node-auth library documentation. ' +
  'Help users understand and use the awesome-node-auth JWT authentication library for Node.js. ' +
  'When sharing code examples, use TypeScript and provide complete, runnable snippets.';

const PANEL_MIN = 280;
const PANEL_MAX = 800;
/** Must be slightly longer than the CSS slide-out transition (0.28s) */
const PANEL_TRANSITION_MS = 290;
const PANEL_MAX_VW_RATIO = 0.75;

/**
 * Decode a JWT (without verifying signature) and return true when it still has
 * more than 60 seconds until expiry.  Returns false for any invalid/missing token.
 * Used to skip the /auth/mcp-token re-fetch only when we already have a fresh JWT.
 */
function jwtIsValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    // base64url → base64 padding
    const pad = (s: string) => s + '==='.slice(0, (4 - s.length % 4) % 4);
    const payload = JSON.parse(atob(pad(parts[1].replace(/-/g, '+').replace(/_/g, '/'))));
    return typeof payload.exp === 'number' && Date.now() / 1000 < payload.exp - 60;
  } catch {
    return false;
  }
}

/**
 * Extract assistant text from multiple provider-compatible response shapes.
 * Some Responses-compatible backends may return an empty first content chunk
 * while the real answer is in subsequent chunks or in `output_text`.
 */
function extractAssistantText(data: unknown): string {
  const payload = data as Record<string, unknown> | null;
  if (!payload || typeof payload !== 'object') return '';

  const maybeUnwrapStringifiedResponse = (text: string): string | null => {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const objectType = parsed.object;
      if (objectType === 'response' || objectType === 'chat.completion' || Array.isArray(parsed.output)) {
        const nested = extractAssistantText(parsed);
        return nested && nested.trim() ? nested : null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const outputText = payload.output_text;
  if (typeof outputText === 'string' && outputText.trim()) {
    const unwrapped = maybeUnwrapStringifiedResponse(outputText);
    return unwrapped ?? outputText;
  }
  if (Array.isArray(outputText)) {
    const joined = outputText.filter((v): v is string => typeof v === 'string').join('');
    if (joined.trim()) {
      const unwrapped = maybeUnwrapStringifiedResponse(joined);
      return unwrapped ?? joined;
    }
  }

  const output = payload.output;
  if (Array.isArray(output)) {
    const chunks: string[] = [];
    let hasFunctionCall = false;
    for (const item of output) {
      if (!item || typeof item !== 'object') continue;
      const itemType = (item as Record<string, unknown>).type;
      if (itemType === 'functioncall' || itemType === 'function_call') {
        hasFunctionCall = true;
      }
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!part || typeof part !== 'object') continue;
        const text = (part as Record<string, unknown>).text;
        if (typeof text === 'string' && text.length > 0) {
          chunks.push(text);
        }
      }
    }
    const joined = chunks.join('');
    if (joined.trim()) return joined;
    if (hasFunctionCall) {
      return 'The model issued a tool call but no final assistant text was returned. The proxy attempted to complete the tool-call loop — if this message persists, try increasing AI_MAX_TOOL_ROUNDS or switching to a model with better tool support.';
    }
  }

  const choices = payload.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const firstChoice = choices[0] as Record<string, unknown>;
    const msg = firstChoice.message;
    if (msg && typeof msg === 'object') {
      const msgContent = (msg as Record<string, unknown>).content;
      if (typeof msgContent === 'string' && msgContent.trim()) return msgContent;
      if (Array.isArray(msgContent)) {
        const joined = msgContent
          .map((p) => {
            if (typeof p === 'string') return p;
            if (p && typeof p === 'object') {
              const txt = (p as Record<string, unknown>).text;
              return typeof txt === 'string' ? txt : '';
            }
            return '';
          })
          .join('');
        if (joined.trim()) return joined;
      }
    }
  }

  const message = payload.message;
  if (message && typeof message === 'object') {
    const msgContent = (message as Record<string, unknown>).content;
    if (typeof msgContent === 'string' && msgContent.trim()) return msgContent;
  }

  if (typeof payload.content === 'string' && payload.content.trim()) {
    return payload.content;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return '';
  }
}

function sanitizeAssistantContentForInput(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return content;

  // Strip <think>…</think> blocks so that reasoning-model chain-of-thought
  // does not accumulate in conversation history sent back to the LLM on
  // subsequent turns (Problem 4).  We use a simple linear string scan to
  // avoid ReDoS risks from regex backtracking on large or malformed inputs.
  // Segments of non-think text are collected and joined once at the end to
  // avoid O(n²) string allocation from repeated concatenation.
  const segments: string[] = [];
  let remaining = content;
  let openIdx: number;
  while ((openIdx = remaining.indexOf('<think>')) !== -1) {
    if (openIdx > 0) segments.push(remaining.slice(0, openIdx));
    const closeIdx = remaining.indexOf('</think>', openIdx + '<think>'.length);
    if (closeIdx === -1) {
      // Unclosed <think> tag: drop everything from the opening tag to end of string.
      remaining = '';
      break;
    }
    remaining = remaining.slice(closeIdx + '</think>'.length);
  }
  if (remaining) segments.push(remaining);
  let sanitized = segments.join('').trim();

  // If the result is now empty (the whole message was thinking), fall back to
  // the original content so we don't drop the turn entirely.
  if (!sanitized) sanitized = content;

  // If a previous assistant turn is a raw, stringified provider envelope,
  // collapse it to plain assistant text so it does not poison follow-up turns.
  const sanitizedTrimmed = sanitized.trim();
  if (sanitizedTrimmed.startsWith('{') && sanitizedTrimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(sanitizedTrimmed) as Record<string, unknown>;
      const objectType = parsed.object;
      if (objectType === 'response' || objectType === 'chat.completion' || Array.isArray(parsed.output)) {
        const extracted = extractAssistantText(parsed).trim();
        if (extracted) return extracted;
        return 'Previous assistant turn contained only tool-call metadata and no final text.';
      }
    } catch {
      return sanitized;
    }
  }

  return sanitized;
}

export default function AiAssistant(): JSX.Element | null {
  const { siteConfig } = useDocusaurusContext();
  const {
    aiEndpoint,
    aiModel,
    aiTemperature,
    aiMaxTokens,
    aiSystemPrompt,
    accountApiUrl,
  } = (siteConfig.customFields ?? {}) as AiConfig;

  const apiBase = accountApiUrl ?? '';
  const accountPageUrl = `${siteConfig.baseUrl.replace(/\/$/, '')}/account`;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [panelWidth, setPanelWidth] = useState(520);
  const [isWide, setIsWide] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Auth state: undefined = checking, null = not logged in, AuthUser = logged in
  const [authUser, setAuthUser] = useState<AuthUser | null | undefined>(undefined);
  const [authChecked, setAuthChecked] = useState(false);
  // MCP token: the user's JWT for forwarding to the LLM's MCP tools config
  const [mcpToken, setMcpToken] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(520);

  useEffect(() => { setMounted(true); }, []);

  // Watch for the Docusaurus mobile sidebar open/close via MutationObserver.
  // Docusaurus adds `navbar-sidebar--show` to the `<nav>` element, not `<html>` or `<body>`.
  useEffect(() => {
    const check = () => {
      const isNavOpen = !!document.querySelector('.navbar-sidebar--show');
      setIsMobileSidebarOpen(isNavOpen);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // ── Auth check (runs always, not just when panel is open) ──────────────────
  // Separated into two effects:
  //   1. checkAuth — polls /auth/me and updates authUser; runs on mount, focus,
  //      and whenever the panel is opened (keeps the login wall reactive).
  //   2. mcpToken fetch — only triggered when authUser changes identity (once
  //      per login session, not on every auth re-check).
  //   3. SSE — established once we have a valid token; closed on logout or token
  //      expiry.

  const authUserRef = useRef<AuthUser | null | undefined>(undefined);

  const checkAuth = useCallback(() => {
    if (!apiBase) {
      setAuthUser({ id: '', email: '' });
      return;
    }
    // Mirrors the refresh-and-retry pattern from auth.js and account.tsx.
    // The library's global fetch interceptor deliberately excludes /auth/me from
    // auto-refresh (to prevent loops), so we handle it explicitly here.
    const run = async (isRetry = false): Promise<void> => {
      const res = await fetch(`${apiBase}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const user = await res.json() as AuthUser;
        setAuthUser(user);
        return;
      }
      // On 401/403, attempt one token refresh then retry /auth/me.
      // refreshOnce() deduplicates concurrent refresh calls (race condition guard)
      // — the same singleton pattern used by the library's auth.js interceptor.
      if ((res.status === 401 || res.status === 403) && !isRetry) {
        const refreshed = await refreshOnce(apiBase);
        if (refreshed) return run(true);
      }
      throw new Error('not authenticated');
    };
    run().catch(() => {
      setAuthUser(null);
      setMcpToken(null);
    });
  }, [apiBase]);

  // Run on mount + whenever the panel opens + on tab focus
  useEffect(() => {
    checkAuth();
    window.addEventListener('focus', checkAuth);
    return () => window.removeEventListener('focus', checkAuth);
  }, [checkAuth]);

  // Fetch mcpToken only when the logged-in user identity changes (not on every checkAuth call).
  // This prevents the recurring /auth/mcp-token calls observed in the network tab.
  // We use a ref to track the previous user ID so we can detect real identity changes
  // vs. mere re-renders, without adding mcpToken to the dependency array (which would
  // cause a re-fetch loop: fetchToken → setMcpToken → effect re-runs → fetchToken…).
  const mcpTokenRef = useRef<string | null>(null);
  useEffect(() => {
    mcpTokenRef.current = mcpToken;
  }, [mcpToken]);

  useEffect(() => {
    const prevId = authUserRef.current?.id ?? null;
    const nextId = authUser?.id ?? null;
    authUserRef.current = authUser;

    if (!authUser || !apiBase) return;                      // not logged in
    if (nextId === prevId && jwtIsValid(mcpTokenRef.current)) return;   // same user, token still valid

    fetch(`${apiBase}/auth/mcp-token`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.token) setMcpToken(d.token); else setMcpToken(null); })
      .catch(() => setMcpToken(null));
  }, [authUser, apiBase]);

  // Re-run auth check when panel is opened (so login wall reacts immediately)
  useEffect(() => {
    if (isOpen) checkAuth();
  }, [isOpen, checkAuth]);

  // SSE — connect once we have a token; reconnect if token rotates.
  // On SSE error (session expiry / logout from another tab) → re-check auth immediately.
  useEffect(() => {
    if (!mcpToken || !apiBase) return;

    const sseUrl = `${apiBase}/tools/stream?token=${encodeURIComponent(mcpToken)}`;
    const es = new EventSource(sseUrl);

    // SSE error is the signal that the session has ended; clear state immediately
    // so the UI reacts even when the panel is closed.
    es.addEventListener('error', () => {
      checkAuth();
    });

    return () => es.close();
  }, [mcpToken, apiBase, checkAuth]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 150);
  }, [isOpen]);

  // Detect wide viewport (≥1280px) for push-body behaviour
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Keep CSS variable in sync with panel width
  useEffect(() => {
    document.documentElement.style.setProperty('--ai-panel-width', `${panelWidth}px`);
  }, [panelWidth]);

  // Add/remove body class for the push-body effect at wide viewports.
  // Delay removal so the CSS padding-right transition plays out while the panel
  // slides away (transition duration = 280ms).
  useEffect(() => {
    if (isWide && isOpen) {
      document.body.classList.add('ai-panel-open');
      return undefined;
    }
    const timer = setTimeout(() => document.body.classList.remove('ai-panel-open'), PANEL_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [isOpen, isWide]);

  // Always remove the body class on unmount (safety net)
  useEffect(() => () => { document.body.classList.remove('ai-panel-open'); }, []);

  if (!mounted) return null;

  const configured = Boolean(aiEndpoint);
  const effectiveSystemPrompt = (aiSystemPrompt && aiSystemPrompt.trim())
    ? aiSystemPrompt.trim()
    : DEFAULT_SYSTEM_PROMPT;

  // ── Login wall (shown when panel is open and user is not authenticated) ────
  const loginWall = isOpen && authUser === null && (
    <div className={styles.loginWall}>
      <div className={styles.loginWallIcon}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h3 className={styles.loginWallTitle}>Sign in to start chatting</h3>
      <p className={styles.loginWallSub}>
        Access the AI assistant and manage your API keys and subscription.
      </p>
      <div className={styles.loginWallBtns}>
        {/* <a
          href={`${apiBase}/auth/oauth/google`}
          className={styles.oauthBtn}
          rel="noopener noreferrer"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8, flexShrink: 0 }}>
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </a> */}
        <a
          href={`${apiBase}/auth/oauth/github`}
          className={`${styles.oauthBtn} ${styles.oauthBtnGh}`}
          rel="noopener noreferrer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8, flexShrink: 0 }}>
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
          </svg>
          Continue with GitHub
        </a>
      </div>
      <button
        className={styles.loginWallRefresh}
        onClick={() => setAuthChecked(false)}
        title="Check again after signing in"
      >
        ↻ I've signed in — refresh
      </button>
    </div>
  );

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!configured) {
      setError('AI endpoint not configured. Set AI_LLM_ENDPOINT in the wiki .env file.');
      return;
    }

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Build the request body for the OpenAI Responses API (v1/responses).
      // System instructions are injected server-side by /tools/ai-proxy.
      const body: Record<string, unknown> = {
        // Only user/assistant turns go in `input`.
        input: newMessages.map((m) => ({
          role: m.role,
          content: m.role === 'assistant' ? sanitizeAssistantContentForInput(m.content) : m.content,
        })),
      };
      if (aiModel && aiModel.trim()) {
        body.model = aiModel.trim();
      }
      if (aiTemperature && aiTemperature.trim()) {
        const temp = parseFloat(aiTemperature);
        if (!isNaN(temp)) body.temperature = temp;
      }
      if (aiMaxTokens && aiMaxTokens.trim()) {
        const maxTok = parseInt(aiMaxTokens, 10);
        if (!isNaN(maxTok) && maxTok > 0) body.max_output_tokens = maxTok;
      }

      const res = await fetch(`${apiBase}/tools/ai-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Key is now handled by the server proxy
        },
        body: JSON.stringify(body),
        credentials: 'include' // Ensure session cookie is sent to MCP server
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();
      const content = extractAssistantText(data);

      // <think> blocks are handled by MarkdownRenderer (collapsible ThinkBlock UI).
      setMessages([...newMessages, { role: 'assistant', content }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => { setMessages([]); setError(null); };

  // ── Resize drag handler ───────────────────────────────────────────
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartX.current - ev.clientX;
      const newWidth = Math.min(
        Math.max(dragStartWidth.current + delta, PANEL_MIN),
        Math.min(PANEL_MAX, Math.floor(window.innerWidth * PANEL_MAX_VW_RATIO)),
      );
      // Direct DOM update for zero-lag visual feedback during drag
      if (panelRef.current) panelRef.current.style.width = `${newWidth}px`;
      document.documentElement.style.setProperty('--ai-panel-width', `${newWidth}px`);
      setPanelWidth(newWidth);
    };

    const onUp = () => {
      isDragging.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Build a compact config summary for the header tooltip
  const configSummary = [
    aiModel && `model: ${aiModel}`,
    aiTemperature && `temp: ${aiTemperature}`,
    aiMaxTokens && `max_tokens: ${aiMaxTokens}`,
  ].filter(Boolean).join(' · ');

  return (
    <>
      {!isMobileSidebarOpen && (
        <button
          className={`${styles.floatingButton} ${isOpen ? styles.floatingButtonOpen : ''}`}
          style={isOpen && isWide ? { right: panelWidth + 16 } : undefined}
          onClick={() => setIsOpen((o) => !o)}
          aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className={styles.fabLabel}>AI Setup</span>
            </>
          )}
        </button>
      )}

      {isOpen && !isWide && <div className={styles.backdrop} onClick={() => setIsOpen(false)} />}

      <div
        ref={panelRef}
        className={`${styles.offcanvas} ${isOpen ? styles.offcanvasOpen : ''}`}
        style={{ width: panelWidth }}
        aria-hidden={!isOpen}
      >
        <div className={styles.resizeHandle} onMouseDown={startResize} />
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <div className={styles.headerTitleGroup}>
              <span className={styles.headerTitle}>AI Assistant <span className={styles.headerMcpBadge}>✦ MCP</span></span>
              {configSummary && (
                <span className={styles.headerMeta}>{configSummary}</span>
              )}
            </div>
            {!configured && <span className={styles.headerBadge}>not configured</span>}
          </div>
          <div className={styles.headerButtons}>
            {messages.length > 0 && (
              <button className={styles.iconButton} onClick={clearChat} aria-label="Clear chat" title="Clear conversation">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
                </svg>
              </button>
            )}
            {authUser && (
              <a
                href={accountPageUrl}
                className={styles.iconButton}
                title="My Account"
                aria-label="My Account"
                style={{ textDecoration: 'none' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </a>
            )}
            <button className={styles.iconButton} onClick={() => setIsOpen(false)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Auth loading / Login wall ── */}
        {authUser === undefined && (
          <div className={styles.authLoading}>
            <div className={styles.authSpinner} />
          </div>
        )}

        {authUser === null && loginWall}

        {/* ── Normal chat UI (only when authenticated) ── */}
        {authUser !== null && authUser !== undefined && (
          <>
            {!configured ? (
              <div className={styles.configNotice}>
                <strong>Setup required:</strong> add <code>AI_LLM_ENDPOINT</code> to{' '}
                <code>wiki/.env</code> and rebuild. Set <code>AI_API_KEY</code> (and optionally{' '}
                <code>AI_MODEL</code>, <code>AI_TEMPERATURE</code>,{' '}
                <code>AI_MAX_TOKENS</code>, <code>AI_SYSTEM_PROMPT</code>) in{' '}
                <code>mcp-server/.env</code> -- these are kept on the server and never sent to the browser.
              </div>
            ) : (
              aiSystemPrompt && aiSystemPrompt.trim() && (
                <div className={styles.systemPromptBar} title={effectiveSystemPrompt}>
                  <span className={styles.systemPromptLabel}>System:</span>
                  <span className={styles.systemPromptText}>{effectiveSystemPrompt}</span>
                </div>
              )
            )}

            <div className={styles.messagesArea}>
              {messages.length === 0 && (
                <div className={styles.emptyState}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.7 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p>Ask me anything about <strong>awesome-node-auth</strong>.</p>
                  <p className={styles.emptyHint}>I can help with code snippets, configuration, and integration guides.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === 'user' ? styles.userMessage : styles.assistantMessage}>
                  <div className={styles.messageRole}>{msg.role === 'user' ? 'You' : 'Assistant'}</div>
                  <div className={styles.messageBubble}>
                    {msg.role === 'assistant'
                      ? <MarkdownRenderer content={msg.content} />
                      : msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className={styles.assistantMessage}>
                  <div className={styles.messageRole}>Assistant</div>
                  <div className={styles.loadingIndicator}>
                    <span /><span /><span />
                  </div>
                </div>
              )}
              {error && <div className={styles.errorMessage}>{error}</div>}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <div className={styles.inputWrapper}>
                <textarea
                  ref={textareaRef}
                  className={styles.inputTextarea}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={configured
                    ? 'Ask about awesome-node-auth…'
                    : 'Configure AI endpoint to start chatting'}
                  rows={2}
                  disabled={!configured}
                />
                <button
                  className={styles.sendButton}
                  onClick={sendMessage}
                  disabled={loading || !input.trim() || !configured}
                  aria-label="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              {configured && (
                <p className={styles.inputHint}>↵ send · ⇧↵ new line</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
