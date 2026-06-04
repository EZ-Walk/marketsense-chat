import React, { useState, useEffect, useRef } from 'react';
import { Send, Brain, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface EventContext {
  eventType: string;
  summary: string;
  data: any;
}

export default function SimpleEventChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentContext, setCurrentContext] = useState<EventContext | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:8000');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Simulate MarketSense event context
  const simulateEvent = (eventType: string) => {
    const eventData = {
      'post.needs_revision': {
        summary: 'Content failed quality review - needs improvement',
        data: {
          post_id: 'post_123',
          quality_score: 2,
          feedback: 'Caption lacks compelling call-to-action and brand voice is inconsistent',
          evaluation_scores: { image_quality: 3, caption_effectiveness: 1 }
        }
      },
      'campaign.created': {
        summary: 'New marketing campaign "Summer Launch" created',
        data: {
          campaign_id: 'camp_456',
          title: 'Summer Launch',
          target_audience: 'millennials',
          budget: 50000
        }
      },
      'post.approved': {
        summary: 'Content approved for publishing - high quality score',
        data: {
          post_id: 'post_789',
          quality_score: 4.5,
          evaluation_scores: { image_quality: 5, caption_effectiveness: 4 },
          channel: 'LinkedIn'
        }
      }
    };

    const event = eventData[eventType as keyof typeof eventData];
    if (event) {
      setCurrentContext({
        eventType,
        summary: event.summary,
        data: event.data
      });

      // Add system message about the event
      const systemMessage: Message = {
        id: `system_${Date.now()}`,
        role: 'system',
        content: `📢 Event detected: ${event.summary}. I'm ready to help you analyze this situation.`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, systemMessage]);

      // Auto-initiate analysis
      setTimeout(() => {
        analyzeEventAutomatically(eventType, event.data);
      }, 1000);
    }
  };

  // Auto-analyze event
  const analyzeEventAutomatically = async (eventType: string, eventData: any) => {
    setIsLoading(true);

    // Simulate AI analysis based on event type
    let analysis = '';
    switch (eventType) {
      case 'post.needs_revision':
        analysis = `🔍 **Analysis**: Content quality score is ${eventData.quality_score}/5, which is below our publishing threshold.

**Key Issues Identified**:
• Caption effectiveness scored only 1/5 - needs stronger call-to-action
• Brand voice inconsistency detected

**Business Impact**: This could reduce engagement by 40-60% if published as-is.

**Recommended Actions**:
1. Review the feedback: "${eventData.feedback}"
2. Strengthen the call-to-action with specific action words
3. Align caption with brand voice guidelines
4. Consider A/B testing different approaches

Would you like me to help you revise the content strategy or analyze specific aspects of the feedback?`;
        break;

      case 'campaign.created':
        analysis = `🚀 **Campaign Analysis**: "${eventData.title}" campaign successfully created.

**Campaign Details**:
• Target: ${eventData.target_audience}
• Budget: $${eventData.budget.toLocaleString()}
• Status: Ready for content planning

**Next Critical Steps**:
1. Define content calendar and posting schedule
2. Set up audience segmentation strategies  
3. Configure performance tracking metrics
4. Approve campaign to begin content generation

**Strategic Considerations**: 
With a $${eventData.budget.toLocaleString()} budget targeting ${eventData.target_audience}, you'll want to focus on high-engagement platforms and authentic storytelling.

What aspect of the campaign setup would you like to tackle first?`;
        break;

      case 'post.approved':
        analysis = `✅ **Quality Approved**: Content scored ${eventData.quality_score}/5 - excellent quality!

**Performance Metrics**:
• Image Quality: ${eventData.evaluation_scores.image_quality}/5 (Outstanding)
• Caption Effectiveness: ${eventData.evaluation_scores.caption_effectiveness}/5 (Strong)

**Publishing Recommendations**:
• Platform: ${eventData.channel} - optimal choice for this content type
• Best posting time: Consider peak engagement hours for your audience
• Hashtag strategy: Add 3-5 relevant hashtags for discoverability

**Monitoring Setup**:
This high-quality content is likely to perform well. I recommend setting up tracking for engagement rate, reach, and click-through metrics.

Ready to schedule this for publishing? Or would you like to optimize the posting strategy further?`;
        break;

      default:
        analysis = `📊 Event "${eventType}" detected. Let me analyze the implications for your marketing strategy.`;
    }

    // Add AI analysis message
    const analysisMessage: Message = {
      id: `ai_${Date.now()}`,
      role: 'assistant',
      content: analysis,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, analysisMessage]);
    setIsLoading(false);
  };

  // Send user message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response (in real implementation, this would call the MarketSense agent)
    setTimeout(() => {
      const responses = [
        "Let me analyze that in the context of your current event...",
        "Based on the event data, I recommend focusing on...",
        "That's a great question. Given the current situation...",
        "Here's how this relates to your MarketSense workflow..."
      ];

      const aiResponse: Message = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)] + ` (This is a demo response to: "${userMessage.content}")`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000 + Math.random() * 2000);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'post.needs_revision': return <AlertCircle className="text-red-400" size={16} />;
      case 'post.approved': return <CheckCircle className="text-green-400" size={16} />;
      case 'campaign.created': return <Brain className="text-blue-400" size={16} />;
      default: return <Clock className="text-gray-400" size={16} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Brain className="text-blue-400" size={24} />
            <div>
              <h1 className="text-lg font-bold">MarketSense Event-Driven Chat</h1>
              <p className="text-sm text-gray-400">Standalone Demo</p>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {isConnected ? '🟢' : '🔴'} {gatewayUrl}
          </div>
        </div>

        {/* Event Context Card */}
        {currentContext && (
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {getEventIcon(currentContext.eventType)}
              <span className="font-medium text-blue-300">{currentContext.eventType}</span>
            </div>
            <p className="text-sm text-gray-300">{currentContext.summary}</p>
          </div>
        )}

        {/* Event Simulation Buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => simulateEvent('post.needs_revision')}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs font-medium"
          >
            Simulate: Content Needs Revision
          </button>
          <button
            onClick={() => simulateEvent('campaign.created')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium"
          >
            Simulate: Campaign Created
          </button>
          <button
            onClick={() => simulateEvent('post.approved')}
            className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-medium"
          >
            Simulate: Content Approved
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <Brain size={48} className="mx-auto mb-4 opacity-30" />
            <p className="mb-2">Event-Driven Chat Ready</p>
            <p className="text-sm">Simulate a MarketSense event above to see how contextual chat works</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'system' && (
              <div className="text-center">
                <div className="inline-block bg-yellow-900/30 border border-yellow-700/50 rounded-full px-4 py-2 text-sm">
                  {msg.content}
                </div>
              </div>
            )}

            {msg.role === 'user' && (
              <div className="flex justify-end">
                <div className="bg-blue-600 rounded-lg p-3 max-w-xs">
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-60 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            )}

            {msg.role === 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 max-w-2xl">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm font-sans">{msg.content}</pre>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-pulse">●</div>
                <div className="animate-pulse delay-100">●</div>
                <div className="animate-pulse delay-200">●</div>
                <span className="text-sm">AI is analyzing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentContext ? "Discuss this event..." : "Start a conversation..."}
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            disabled={isLoading || !input.trim()}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}