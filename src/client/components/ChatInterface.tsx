import React, { useState, useEffect, useRef } from 'react';
import { Send, FileUp, Terminal, Mail, MessageSquare, StickyNote, Bell, Activity } from 'lucide-react';

interface Event {
  id: string;
  type: string;
  actor: string;
  source: string;
  createdAt: number;
  context: {
    conversationId: string;
    assistantRequestId: string;
    invokeId: string;
    userId: string;
  };
  payload: any;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Event[]>([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('ms_api_key') || 'dev-api-key');
  const [anthropicKey, setAnthropicKey] = useState(localStorage.getItem('ms_anthropic_key') || '');
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ms_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('ms_anthropic_key', anthropicKey);
  }, [anthropicKey]);

  useEffect(() => {
    if (!apiKey) return;

    const source = new EventSource(`/api/stream?apiKey=${apiKey}`);
    
    source.onmessage = (event) => {
      const newEvent = JSON.parse(event.data);
      setMessages((prev) => {
        if (prev.find(m => m.id === newEvent.id)) return prev;
        return [...prev, newEvent];
      });
    };

    return () => source.close();
  }, [apiKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-anthropic-key': anthropicKey
        },
        body: JSON.stringify({ text: input })
      });
      setInput('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const triggerMockEvent = async (type: string, data: any) => {
    let endpoint = '';
    switch(type) {
      case 'email': endpoint = '/api/webhooks/email'; break;
      case 'notion': endpoint = '/api/webhooks/notion'; break;
      case 'sms': endpoint = '/api/webhooks/sms'; break;
    }

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error('Failed to trigger mock event', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: formData
      });
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Sidebar for API Key and Simulation */}
      <aside className="w-80 border-r border-slate-800 flex flex-col p-6 gap-8 bg-slate-900/50">
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Configuration</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-medium">Sandbox API Key</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="dev-api-key"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 font-medium">Anthropic API Key</label>
              <input 
                type="password" 
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sk-ant-..."
              />
              <p className="text-[10px] text-slate-600 italic">Used for real LLM responses</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Terminal size={16} /> Simulator
          </h2>
          <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
            Trigger events to see how Graphite's event-driven nodes respond.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => triggerMockEvent('email', { from: 'client@example.com', subject: 'Graphite Question', body: 'What is Graphite?' })}
              className="w-full text-left bg-slate-800/50 hover:bg-slate-800 p-3 rounded-lg border border-slate-700 transition-colors group"
            >
              <div className="text-xs font-medium text-emerald-400 mb-1 flex items-center gap-1"><Mail size={12} /> Email Webhook</div>
              <div className="text-sm text-slate-300 italic">"What is Graphite?"</div>
            </button>
            <button 
              onClick={() => triggerMockEvent('notion', { pageId: 'notion-123', title: 'Product Roadmap', url: '#' })}
              className="w-full text-left bg-slate-800/50 hover:bg-slate-800 p-3 rounded-lg border border-slate-700 transition-colors group"
            >
              <div className="text-xs font-medium text-orange-400 mb-1 flex items-center gap-1"><StickyNote size={12} /> Notion Webhook</div>
              <div className="text-sm text-slate-300">New roadmap page</div>
            </button>
            <button 
              onClick={() => triggerMockEvent('sms', { from: '+1555000111', body: 'Hello from SMS' })}
              className="w-full text-left bg-slate-800/50 hover:bg-slate-800 p-3 rounded-lg border border-slate-700 transition-colors group"
            >
              <div className="text-xs font-medium text-purple-400 mb-1 flex items-center gap-1"><MessageSquare size={12} /> SMS Webhook</div>
              <div className="text-sm text-slate-300">Simple hello text</div>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            <Activity size={12} /> System Status
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Graphite Nodes: Active<br/>
            Event Store: Connected
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full bg-slate-950">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center px-8 justify-between bg-slate-900/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bell size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">MarketSense Graphite</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Event-Driven Agent</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-2" />
            <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">Live</span>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
              <MessageSquare size={48} className="opacity-20" />
              <p className="text-sm">No activity yet. Start a chat or trigger a simulation.</p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageItem key={msg.id} event={msg} />
          ))}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/30">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative group">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 pr-32 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
            />
            <div className="absolute right-2 top-2 bottom-2 flex gap-2">
              <label className="cursor-pointer hover:bg-slate-800 p-2 rounded-xl transition-colors flex items-center justify-center text-slate-400 hover:text-blue-400">
                <FileUp size={20} />
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl transition-colors flex items-center gap-2 font-semibold shadow-lg shadow-blue-900/20"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function MessageItem({ event }: { event: Event }) {
  const isUser = event.type === 'chat.user';
  const isAgent = event.type === 'chat.agent';
  const isLog = event.type.startsWith('node.');
  
  if (isUser || isAgent) {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
        <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
          isUser 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
        }`}>
          <div className="text-xs mb-1 opacity-60 font-medium flex justify-between gap-4">
            <span>{event.actor} • {new Date(event.createdAt).toLocaleTimeString()}</span>
            <span className="font-mono opacity-40">ID: {event.context.invokeId.slice(0, 8)}</span>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{event.payload.text}</div>
        </div>
      </div>
    );
  }

  if (isLog) {
    return (
      <div className="flex justify-center animate-in fade-in duration-300">
        <div className="text-[10px] bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-slate-500 flex items-center gap-2">
          <Activity size={10} className="text-blue-500" />
          <span className="font-bold uppercase tracking-tighter text-slate-400">{event.type}</span>
          <span className="opacity-60">{event.payload.message}</span>
        </div>
      </div>
    );
  }

  // Webhook events rendered as notifications/cards
  return (
    <div className="flex justify-center px-4 animate-in fade-in duration-500">
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 w-full max-w-2xl flex gap-4 items-start shadow-xl">
        <div className={`p-2 rounded-lg ${getEventColor(event.type)}`}>
          {getEventIcon(event.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wide">
              {event.type.split('.').join(' ')}
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              {new Date(event.createdAt).toLocaleTimeString()}
            </span>
          </div>
          <div className="text-sm text-slate-400">
            {renderPayload(event)}
          </div>
          <div className="mt-2 text-[10px] text-slate-600 flex justify-between uppercase tracking-widest font-bold">
            <div className="flex gap-2">
              <span>Source: {event.source}</span>
              <span>•</span>
              <span>Actor: {event.actor}</span>
            </div>
            <div className="font-mono opacity-50">Invoke: {event.context.invokeId.slice(0, 8)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getEventColor(type: string) {
  switch(type) {
    case 'webhook.email': return 'bg-emerald-500/10 text-emerald-400';
    case 'webhook.notion': return 'bg-orange-500/10 text-orange-400';
    case 'webhook.sms': return 'bg-purple-500/10 text-purple-400';
    case 'file.uploaded': return 'bg-blue-500/10 text-blue-400';
    default: return 'bg-slate-500/10 text-slate-400';
  }
}

function getEventIcon(type: string) {
  switch(type) {
    case 'webhook.email': return <Mail size={16} />;
    case 'webhook.notion': return <StickyNote size={16} />;
    case 'webhook.sms': return <MessageSquare size={16} />;
    case 'file.uploaded': return <FileUp size={16} />;
    default: return <Bell size={16} />;
  }
}

function renderPayload(event: Event) {
  const { type, payload } = event;
  switch(type) {
    case 'webhook.email': 
      return (
        <div>
          <div className="font-semibold text-slate-300">{payload.subject}</div>
          <div className="line-clamp-2 italic">"{payload.body}"</div>
        </div>
      );
    case 'webhook.notion':
      return <div>Added page: <span className="text-blue-400 underline">{payload.title}</span></div>;
    case 'webhook.sms':
      return <div className="italic">"{payload.body}"</div>;
    case 'file.uploaded':
      return <div>Uploaded <span className="font-semibold text-slate-300">{payload.filename}</span> ({(payload.size / 1024).toFixed(1)} KB)</div>;
    default:
      return JSON.stringify(payload);
  }
}
