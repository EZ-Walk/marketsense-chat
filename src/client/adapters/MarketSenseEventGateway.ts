/**
 * MarketSense Event Gateway Adapter
 * Bridges the Graphite chat interface to the MarketSense Event Gateway
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface EventStreamEvent {
  event_type: string;
  timestamp: string;
  payload: Record<string, any>;
  source?: string;
}

export class MarketSenseEventGateway {
  public baseUrl: string;
  public apiKey: string;
  private anthropicKey?: string;

  constructor(baseUrl: string = 'http://localhost:3006', apiKey: string = 'dev-api-key') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  setAnthropicKey(key: string) {
    this.anthropicKey = key;
  }

  /**
   * Send a chat message to the MarketSense Event Gateway
   * Returns SSE stream for real-time responses
   */
  async sendChatMessage(message: string, customerId: string = 'dev'): Promise<EventSource> {
    const response = await fetch(`${this.baseUrl}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...(this.anthropicKey && { 'x-anthropic-key': this.anthropicKey })
      },
      body: JSON.stringify({
        text: message,
        conversationId: customerId
      })
    });

    if (!response.ok) {
      throw new Error(`Chat API failed: ${response.status} ${response.statusText}`);
    }

    // The MarketSense API returns an SSE stream
    const eventSource = new EventSource(
      `${this.baseUrl}/api/stream?apiKey=${encodeURIComponent(this.apiKey)}`,
      {
        withCredentials: false
      }
    );

    return eventSource;
  }

  /**
   * Get chat history from MarketSense Event Gateway
   */
  async getChatHistory(customerId: string = 'dev', limit: number = 50): Promise<ChatMessage[]> {
    const response = await fetch(
      `${this.baseUrl}/api/chat/history?customer_id=${customerId}&limit=${limit}`,
      {
        headers: {
          'x-api-key': this.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Chat history API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.messages || [];
  }

  /**
   * Subscribe to the MarketSense event stream
   */
  subscribeToEventStream(customerId: string = 'dev'): EventSource {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/stream?apiKey=${encodeURIComponent(this.apiKey)}`,
      {
        withCredentials: false
      }
    );

    return eventSource;
  }

  /**
   * Get system topology for graph visualization
   */
  async getSystemTopology(customerId: string = 'dev') {
    const response = await fetch(
      `${this.baseUrl}/api/graph/topology?customer_id=${customerId}`,
      {
        headers: {
          'x-api-key': this.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Topology API failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get system activity for real-time visualization
   */
  async getSystemActivity(customerId: string = 'dev') {
    const response = await fetch(
      `${this.baseUrl}/api/graph/activity?customer_id=${customerId}`,
      {
        headers: {
          'x-api-key': this.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Activity API failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Trigger a webhook for testing (compatible with existing simulation buttons)
   */
  async triggerWebhook(type: 'notion' | 'email' | 'sms', payload: Record<string, any>) {
    let endpoint = '';
    switch(type) {
      case 'notion':
        endpoint = '/webhooks/notion';
        break;
      case 'email':
        // Map to MarketSense webhook format if available
        endpoint = '/webhooks/notion'; // Using notion as fallback
        break;
      case 'sms':
        endpoint = '/webhooks/notion'; // Using notion as fallback
        break;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook trigger failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Health check for MarketSense Event Gateway
   */
  async healthCheck(): Promise<{ status: string; services: Record<string, string> }> {
    const response = await fetch(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }
}

// Export a default instance
export const marketSenseGateway = new MarketSenseEventGateway();