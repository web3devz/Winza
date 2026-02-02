interface WebSocketClientOptions {
  url: string;
  chainId: string;
  onNotification?: (notification: any) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: string) => void;
  heartbeatInterval?: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private options: WebSocketClientOptions;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(options: WebSocketClientOptions) {
    this.options = {
      heartbeatInterval: 30000, // 30 seconds default
      ...options
    };
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    // Закриваємо попереднє з'єднання якщо воно існує
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    try {
      this.options.onStatusChange?.('🔄 Connecting to WebSocket...');
      console.log(`Connecting to WebSocket: ${this.options.url}`);
      
      this.ws = new WebSocket(this.options.url, 'graphql-transport-ws');
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.options.onError?.(error as Error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.options.onStatusChange?.('✅ WebSocket connected');
    
    // Send connection init message
    this.sendMessage({
      type: 'connection_init'
    });
    
    // Start heartbeat
    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      // Логуємо тільки важливі повідомлення
      if (message.type !== 'pong') {
        console.log('WebSocket message received:', message);
      }
      
      switch (message.type) {
        case 'connection_ack':
          console.log('Connection acknowledged');
          this.subscribeToChainNotifications();
          break;
          
        case 'next':
          if (message.id === 'chain_notifications') {
            console.log('Blockchain notification received!', message.payload);
            this.options.onNotification?.(message.payload);
          }
          break;
          
        case 'error':
          console.error('WebSocket error message:', message);
          this.options.onError?.(new Error(message.payload?.message || 'WebSocket error'));
          break;
          
        case 'complete':
          console.log('Subscription completed:', message.id);
          break;
          
        case 'pong':
          // Не логуємо pong повідомлення щоб зменшити спам
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    // Логуємо тільки якщо це не очікуване закриття
    if (event.code !== 1000 && event.code !== 1001) {
      console.log('WebSocket closed unexpectedly:', event.code, event.reason);
    }
    
    this.isConnected = false;
    this.stopHeartbeat();
    this.options.onStatusChange?.('🔴 WebSocket disconnected');
    
    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.options.onError?.(new Error('WebSocket connection error'));
  }

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message - WebSocket not connected');
    }
  }

  private subscribeToChainNotifications(): void {
    const subscriptionMessage = {
      id: 'chain_notifications',
      type: 'subscribe',
      payload: {
        query: `subscription { notifications(chainId: "${this.options.chainId}") }`
      }
    };
    
    console.log('Subscribing to chain notifications:', subscriptionMessage);
    this.sendMessage(subscriptionMessage);
    this.options.onStatusChange?.('🔔 Subscribed to chain notifications');
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        console.log('Sending ping');
        this.sendMessage({ type: 'ping' });
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached or reconnect disabled');
      this.options.onStatusChange?.('❌ Connection failed - max attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    // Менше спаму в логах
    if (this.reconnectAttempts <= 3) {
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    }
    this.options.onStatusChange?.(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    console.log('Disconnecting WebSocket');
    this.shouldReconnect = false;
    
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.options.onStatusChange?.('🔴 WebSocket disconnected');
  }

  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}