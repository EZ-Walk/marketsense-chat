import React, { useState, useEffect, useRef } from 'react';
import { Send, FileUp, Terminal, Mail, MessageSquare, StickyNote, Bell, Activity, Zap, Brain } from 'lucide-react';
import { marketSenseGateway, ChatMessage, EventStreamEvent } from '../adapters/MarketSenseEventGateway';
import { AccountButton, type AnimationFramework, type AttentionLevel } from './AccountButton';

interface MarketSenseEvent {
  id: string;
  event_type: string;
  timestamp: string;
  source: string;
  payload: any;
  customer_id?: string;
}

interface ChatContext {
  eventId: string;
  eventType: string;
  summary: string;
  relevantData: any;
  suggestedActions: string[];
}

interface ConversationThread {
  id: string;
  context: ChatContext;
  messages: ChatMessage[];
  isActive: boolean;
  createdAt: string;
}

export default function EventDrivenChat() {
  const [events, setEvents] = useState<MarketSenseEvent[]>([]);
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [input, setInput] = useState('');
  const [gatewayUrl, setGatewayUrl] = useState(localStorage.getItem('ms_gateway_url') || 'http://localhost:8000');
  const [customerId, setCustomerId] = useState(localStorage.getItem('ms_customer_id') || 'dev');
  const [anthropicKey, setAnthropicKey] = useState(localStorage.getItem('ms_anthropic_key') || '');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [autoInitiateChat, setAutoInitiateChat] = useState(localStorage.getItem('ms_auto_chat') === 'true');
  const [animFramework, setAnimFramework] = useState<AnimationFramework>(
    (localStorage.getItem('ms_anim_framework') as AnimationFramework) || 'framer-motion'
  );
  const [attention, setAttention] = useState<AttentionLevel>(
    (localStorage.getItem('ms_attention_level') as AttentionLevel) || 'idle'
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('ms_gateway_url', gatewayUrl);
    localStorage.setItem('ms_customer_id', customerId);
    localStorage.setItem('ms_anthropic_key', anthropicKey);
    localStorage.setItem('ms_auto_chat', autoInitiateChat.toString());
  }, [gatewayUrl, customerId, anthropicKey, autoInitiateChat]);

  useEffect(() => {
    localStorage.setItem('ms_anim_framework', animFramework);
  }, [animFramework]);

  useEffect(() => {
    localStorage.setItem('ms_attention_level', attention);
  }, [attention]);

  // Convert MarketSense events to chat context
  const eventToContext = (event: MarketSenseEvent): ChatContext => {
    const baseContext = {
      eventId: event.id,
      eventType: event.event_type,
      summary: `Event: ${event.event_type}`,
      relevantData: event.payload,
      suggestedActions: ['Analyze', 'Review', 'Take action']
    };

    switch (event.event_type) {
      case 'campaign.created':
        return {
          ...baseContext,
          summary: `New campaign "${event.payload.title || 'Untitled'}" was created`,
          suggestedActions: [
            'Review campaign details',
            'Set up content calendar',
            'Configure target audience',
            'Approve for content generation'
          ]
        };

      case 'post.written':
        return {
          ...baseContext,
          summary: `Content generated for "${event.payload.topic || 'Unknown topic'}"`,
          suggestedActions: [
            'Review generated content',
            'Edit and refine',
            'Schedule for publishing',
            'Request revision'
          ]
        };

      case 'post.approved':
        return {
          ...baseContext,
          summary: `Post approved with score ${event.payload.evaluation_score || 'N/A'}`,
          suggestedActions: [
            'Schedule for posting',
            'Review publishing channels',
            'Optimize posting time'
          ]
        };

      case 'post.needs_revision':
        return {
          ...baseContext,
          summary: `Content needs revision: ${event.payload.feedback || 'Quality issues detected'}`,
          suggestedActions: [
            'Review feedback',
            'Revise content strategy',
            'Update brand guidelines',
            'Re-generate content'
          ]
        };

      case 'webhook.received':
        return {
          ...baseContext,
          summary: `Webhook received from ${event.payload.source || event.source}`,
          suggestedActions: [
            'Process webhook data',
            'Update relevant campaigns',
            'Trigger workflows'
          ]
        };

      case 'topic.researched':
        return {
          ...baseContext,
          summary: `Research completed for "${event.payload.topic || 'Unknown topic'}"`,
          suggestedActions: [
            'Review research findings',
            'Generate content outline',
            'Identify key insights',
            'Proceed with content creation'
          ]
        };

      default:
        return {
          ...baseContext,
          summary: `${event.event_type} event occurred`,
          suggestedActions: ['Investigate', 'Review details', 'Take appropriate action']
        };
    }
  };

  // Generate contextual prompt for the AI
  const generateContextualPrompt = (context: ChatContext, event: MarketSenseEvent): string => {
    const eventData = JSON.stringify(event.payload, null, 2);
    
    return `You are the MarketSense AI Assistant analyzing a system event.

EVENT CONTEXT:
- Type: ${event.event_type}
- Source: ${event.source}
- Timestamp: ${event.timestamp}
- Summary: ${context.summary}

EVENT DATA:
${eventData}

SUGGESTED ACTIONS:
${context.suggestedActions.map(action => `- ${action}`).join('\n')}

Please provide:
1. A brief analysis of this event and its significance
2. Recommended next steps for the user
3. Any potential issues or opportunities this event presents

Be concise, actionable, and focus on helping the user understand what happened and what they should do next.`;
  };

  // Initialize chat thread from event
  const initiateThreadFromEvent = async (event: MarketSenseEvent) => {
    const context = eventToContext(event);
    const threadId = `thread_${event.id}_${Date.now()}`;
    
    const newThread: ConversationThread = {
      id: threadId,
      context,
      messages: [],
      isActive: true,
      createdAt: new Date().toISOString()
    };

    // Deactivate other threads
    setThreads(prev => prev.map(t => ({ ...t, isActive: false })));
    setThreads(prev => [...prev, newThread]);
    setActiveThread(newThread);

    // Auto-initiate conversation if enabled
    if (autoInitiateChat) {
      const contextualPrompt = generateContextualPrompt(context, event);
      await sendContextualMessage(contextualPrompt, threadId);
    }
  };

  // Send message with event context
  const sendContextualMessage = async (message: string, threadId?: string) => {
    try {
      const thread = threadId ? threads.find(t => t.id === threadId) : activeThread;
      if (!thread) return;

      const response = await fetch(`${gatewayUrl}/api/chat/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(anthropicKey && { 'x-anthropic-key': anthropicKey })
        },
        body: JSON.stringify({ 
          message,
          context: { 
            customer_id: customerId,
            event_context: thread.context,
            thread_id: thread.id
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Chat API failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Contextual message sent to MarketSense');
    } catch (err) {
      console.error('Failed to send contextual message:', err);
    }
  };

  // Event stream connection
  useEffect(() => {
    if (!gatewayUrl) return;

    marketSenseGateway.baseUrl = gatewayUrl;
    marketSenseGateway.apiKey = 'dev-api-key';
    
    if (anthropicKey) {
      marketSenseGateway.setAnthropicKey(anthropicKey);
    }

    const source = marketSenseGateway.subscribeToEventStream(customerId);
    
    source.onopen = () => {
      setConnectionStatus('connected');
      console.log('📡 Event stream connected for reactive chat');
    };

    source.onmessage = (event) => {
      try {
        if (event.data === '[DONE]') return;

        const data = JSON.parse(event.data);
        
        // Handle chat responses
        if (data.content || data.status) {
          // Update active thread with AI response
          if (activeThread) {
            const aiMessage: ChatMessage = {
              id: `ai_${Date.now()}`,
              role: 'assistant',
              message: data.content || data.status,
              created_at: new Date().toISOString(),
              metadata: { agent: data.agent || 'MarketSense' }
            };

            setThreads(prev => prev.map(thread => 
              thread.id === activeThread.id 
                ? { ...thread, messages: [...thread.messages, aiMessage] }
                : thread
            ));
          }
        }
        // Handle system events that should trigger chat
        else if (data.event_type && isSignificantEvent(data.event_type)) {
          const newEvent: MarketSenseEvent = {
            id: data.id || `event_${Date.now()}`,
            event_type: data.event_type,
            timestamp: data.timestamp || new Date().toISOString(),
            source: data.source || 'event-gateway',
            payload: data.payload || {},
            customer_id: customerId
          };

          setEvents(prev => [newEvent, ...prev.slice(0, 19)]); // Keep last 20 events

          // Auto-initiate chat for significant events
          if (shouldInitiateChat(newEvent)) {
            initiateThreadFromEvent(newEvent);
          }
        }
      } catch (error) {
        console.error('Failed to parse event stream message:', error);
      }
    };

    source.onerror = () => {
      setConnectionStatus('error');
    };

    return () => source.close();
  }, [gatewayUrl, customerId, anthropicKey, autoInitiateChat, activeThread]);

  // Determine if event is significant enough to show in UI
  const isSignificantEvent = (eventType: string): boolean => {
    const significantEvents = [
      'campaign.created', 'campaign.ready',
      'post.written', 'post.approved', 'post.needs_revision', 'post.published',
      'topic.researched', 'topic.ready',
      'webhook.received', 'webhook.notion'
    ];
    return significantEvents.includes(eventType);
  };

  // Determine if event should auto-initiate chat
  const shouldInitiateChat = (event: MarketSenseEvent): boolean => {
    if (!autoInitiateChat) return false;
    
    const chatTriggerEvents = [
      'post.needs_revision', // Content failed quality check
      'campaign.created',    // New campaign needs attention
      'post.approved',       // Content ready for review
      'webhook.received'     // External trigger
    ];
    return chatTriggerEvents.includes(event.event_type);
  };

  // Manual message sending
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeThread) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      message: input.trim(),
      created_at: new Date().toISOString(),
      metadata: { thread_id: activeThread.id }
    };

    // Add user message to thread
    setThreads(prev => prev.map(thread => 
      thread.id === activeThread.id 
        ? { ...thread, messages: [...thread.messages, userMessage] }
        : thread
    ));

    const message = input.trim();
    setInput('');

    await sendContextualMessage(message);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Event Feed Sidebar */}
      <aside className="w-80 border-r border-slate-800 flex flex-col p-6 gap-6 bg-slate-900/50">
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap size={16} /> Event Feed
            <div className={`h-2 w-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500' : 
              connectionStatus === 'error' ? 'bg-red-500' : 
              'bg-yellow-500 animate-pulse'
            }`} />
          </h2>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {events.length === 0 && (
              <div className="text-xs text-slate-600 italic">No recent events</div>
            )}
            {events.map((event) => (
              <div 
                key={event.id}
                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => initiateThreadFromEvent(event)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Brain size={12} className="text-blue-400" />
                  <span className="text-xs font-medium text-blue-300">{event.event_type}</span>
                </div>
                <div className="text-xs text-slate-400 mb-2">{eventToContext(event).summary}</div>
                <div className="text-[10px] text-slate-600">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Gateway URL</label>
            <input 
              type="text" 
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Customer ID</label>
            <input 
              type="text" 
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              checked={autoInitiateChat}
              onChange={(e) => setAutoInitiateChat(e.target.checked)}
              className="rounded"
            />
            <label className="text-xs text-slate-500">Auto-initiate chat</label>
          </div>
        </div>

        {/* Thread List */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Chat Threads</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {threads.map((thread) => (
              <div 
                key={thread.id}
                className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                  thread.isActive 
                    ? 'bg-blue-600/20 border border-blue-600/50' 
                    : 'bg-slate-800/50 hover:bg-slate-800'
                }`}
                onClick={() => setActiveThread(thread)}
              >
                <div className="font-medium text-blue-300">{thread.context.eventType}</div>
                <div className="text-slate-500 truncate">{thread.context.summary}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col h-full">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center px-8 justify-between bg-slate-900/30">
          <div className="flex items-center gap-3">
            <Brain size={24} className="text-blue-500" />
            <div>
              <h1 className="font-bold text-lg">Event-Driven MarketSense Chat</h1>
              <p className="text-xs text-slate-500">
                {activeThread ? `Context: ${activeThread.context.summary}` : 'Select an event to start chatting'}
              </p>
            </div>
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

            <AccountButton
              framework={animFramework}
              attention={attention}
              onClick={() =>
                setAttention((prev) => (prev === 'urgent' ? 'actionable' : prev === 'actionable' ? 'idle' : 'urgent'))
              }
            />

            <div className="text-xs text-slate-500">
              {connectionStatus === 'connected' ? '🟢 Connected' : connectionStatus === 'error' ? '🔴 Error' : '🟡 Connecting'}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8">
          {!activeThread && (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Brain size={48} className="mx-auto mb-4 opacity-20" />
                <p className="mb-2">Event-Reactive Chat System</p>
                <p className="text-sm">Events from the MarketSense gate will automatically load here as conversational context</p>
              </div>
            </div>
          )}
          
          {activeThread && (
            <div className="space-y-6">
              {/* Context Card */}
              <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={16} className="text-blue-400" />
                  <span className="font-semibold text-blue-300">Event Context</span>
                </div>
                <h3 className="font-medium mb-2">{activeThread.context.summary}</h3>
                <div className="text-sm text-slate-400 mb-3">
                  Event Type: <span className="text-blue-300">{activeThread.context.eventType}</span>
                </div>
                <div className="text-xs text-slate-500">
                  <strong>Suggested Actions:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {activeThread.context.suggestedActions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Messages */}
              {activeThread.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 border border-slate-700'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                    <div className="text-xs opacity-60 mt-2">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        {activeThread && (
          <div className="p-6 border-t border-slate-800">
            <form onSubmit={sendMessage} className="flex gap-3">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Discuss this event..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl flex items-center gap-2"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}