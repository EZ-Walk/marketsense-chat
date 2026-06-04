import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccountButton, type AnimationFramework, type AttentionLevel } from './AccountButton';

type Role = 'user' | 'assistant' | 'system';

interface Message {
  id: string;
  role: Role;
  text: string;
  createdAt: number;
}

export default function StandaloneChat() {
  const [backendUrl, setBackendUrl] = useState(
    localStorage.getItem('ms_backend_url') || 'http://localhost:3006'
  );
  const [apiKey, setApiKey] = useState(localStorage.getItem('ms_api_key') || 'dev-api-key');
  const [anthropicKey, setAnthropicKey] = useState(localStorage.getItem('ms_anthropic_key') || '');
  const [conversationId, setConversationId] = useState(localStorage.getItem('ms_conversation_id') || 'dev');
  const [animFramework, setAnimFramework] = useState<AnimationFramework>(
    (localStorage.getItem('ms_anim_framework') as AnimationFramework) || 'framer-motion'
  );
  const [attention, setAttention] = useState<AttentionLevel>(
    (localStorage.getItem('ms_attention_level') as AttentionLevel) || 'idle'
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system_welcome',
      role: 'system',
      text: 'Standalone chat (repo backend mode). Set an Anthropic key to get real model responses.',
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ms_backend_url', backendUrl);
  }, [backendUrl]);

  useEffect(() => {
    localStorage.setItem('ms_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('ms_anthropic_key', anthropicKey);
  }, [anthropicKey]);

  useEffect(() => {
    localStorage.setItem('ms_conversation_id', conversationId);
  }, [conversationId]);

  useEffect(() => {
    localStorage.setItem('ms_anim_framework', animFramework);
  }, [animFramework]);

  useEffect(() => {
    localStorage.setItem('ms_attention_level', attention);
  }, [attention]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const status = useMemo(() => {
    try {
      // Basic sanity check; also avoids showing nonsense like blank URL.
      // eslint-disable-next-line no-new
      new URL(backendUrl);
      return 'ok';
    } catch {
      return 'bad_url';
    }
  }, [backendUrl]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      text,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch(`${backendUrl}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          ...(anthropicKey ? { 'x-anthropic-key': anthropicKey } : {}),
        },
        body: JSON.stringify({ text, conversationId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Request failed: ${res.status} ${res.statusText}`);
      }

      if (typeof data?.conversationId === 'string' && data.conversationId) {
        setConversationId(data.conversationId);
      }

      const replyText = typeof data?.reply === 'string' ? data.reply : '(no reply)';
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        text: replyText,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: `system_error_${Date.now()}`,
        role: 'system',
        text: err instanceof Error ? err.message : 'Unknown error',
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-200 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4 bg-slate-900/40 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold tracking-wide">Standalone Chat</div>
            <div className="text-xs text-slate-500">Repo backend mode (no event gateway)</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-widest text-slate-500">Anim</label>
              <select
                value={animFramework}
                onChange={(e) => setAnimFramework(e.target.value as AnimationFramework)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="framer-motion">Framer Motion</option>
                <option value="react-spring">React Spring</option>
                <option value="gsap">GSAP</option>
              </select>
              <label className="text-[10px] uppercase tracking-widest text-slate-500 ml-2">State</label>
              <select
                value={attention}
                onChange={(e) => setAttention(e.target.value as AttentionLevel)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="urgent">Urgent (flash)</option>
                <option value="actionable">Actionable (pulse)</option>
                <option value="idle">Idle (breathe)</option>
              </select>
            </div>

            <AccountButton framework={animFramework} attention={attention} onClick={() => setAttention((prev) => (prev === 'urgent' ? 'actionable' : prev === 'actionable' ? 'idle' : 'urgent'))} />

            <div className="text-xs text-slate-400 hidden md:block">
              Backend: <span className={status === 'ok' ? 'text-emerald-400' : 'text-red-400'}>{backendUrl}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Backend URL</label>
            <input
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="http://localhost:3006"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-500">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="dev-api-key"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Anthropic Key</label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sk-ant-..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Conversation ID</label>
            <input
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="dev"
            />
          </div>
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={[
                'max-w-[75%] rounded-2xl px-4 py-3 border',
                m.role === 'user'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : m.role === 'assistant'
                    ? 'bg-slate-900 border-slate-800 text-slate-100'
                    : 'bg-yellow-900/20 border-yellow-700/40 text-yellow-200',
              ].join(' ')}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</div>
              <div className="mt-2 text-[10px] opacity-60">
                {m.role} • {new Date(m.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </main>

      <footer className="border-t border-slate-800 p-4 bg-slate-900/30">
        <form onSubmit={send} className="max-w-4xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a message…"
            disabled={isSending || status !== 'ok'}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-5 rounded-xl text-sm font-semibold"
            disabled={isSending || !input.trim() || status !== 'ok'}
          >
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </footer>
    </div>
  );
}

