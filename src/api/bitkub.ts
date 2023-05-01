import { GridConfig } from './types';
import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocket = require('ws');

class ExchangeApi {
  private gridConfig: GridConfig;
  private tickerPrices: Map<string, number>;
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;

  constructor(gridConfig: GridConfig) {
    this.gridConfig = gridConfig;
    this.tickerPrices = new Map<string, number>();
    this.apiKey = process.env.BITKUB_API_KEY;
    this.apiSecret = process.env.BITKUB_API_SECRET;
    this.baseURL = 'https://api.bitkub.com';
  }

  async apiRequest(
    method,
    endpoint,
    params = {},
    data = {},
    isSigned = false,
    additionalHeaders = {},
  ) {
    const url = new URL(this.baseURL + endpoint);
    const headers = {
      'Content-Type': 'application/json',
      'X-BTK-APIKEY': this.apiKey,
      ...additionalHeaders,
    };

    // If the request needs to be signed
    if (isSigned) {
      const timestamp = Date.now();
      const signaturePayload = {
        ...params,
        ts: timestamp,
      };

      // Add the signature to the headers
      const signature = this.createSignature(signaturePayload);
      headers['X-BTK-SIGNATURE'] = signature;
    }

    // Add query parameters to the URL
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(data) : null,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} - ${response.statusText}`,
      );
    }

    const jsonResponse = await response.json();
    return jsonResponse;
  }

  createSignature(payload) {
    // Create the signature for signed requests
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(payloadString)
      .digest('hex');
  }

  //   {
  //   stream: 'market.ticker.thb_eth',
  //   id: 2,
  //   last: 62957.57,
  //   lowestAsk: 62928.11,
  //   lowestAskSize: 0.2446948,
  //   highestBid: 62861.58,
  //   highestBidSize: 0.13326121,
  //   change: -1831.44,
  //   percentChange: -2.83,
  //   baseVolume: 670.40862414,
  //   quoteVolume: 42832555.05,
  //   isFrozen: 0,
  //   high24hr: 65720.05,
  //   low24hr: 62600,
  //   open: 64789.01,
  //   close: 62957.57
  // }
  public start() {
    this.subscribeTickerStream(this.gridConfig.tradingPair1, (data: any) => {
      // console.log('🚀 ~ tradingPair1:', data);
      this.tickerPrices.set(
        this.gridConfig.tradingPair1,
        data,
        // parseFloat(data.last),
      );
    });

    this.subscribeTickerStream(this.gridConfig.tradingPair2, (data: any) => {
      // console.log('🚀 ~ tradingPair2:', data);
      this.tickerPrices.set(
        this.gridConfig.tradingPair2,
        data,
        // parseFloat(data.last),
      );
    });
  }

  private subscribeTickerStream(
    tradingPair: string,
    callback: (data: any) => void,
  ) {
    const ws = new WebSocket(
      `wss://api.bitkub.com/websocket-api/market.ticker.${tradingPair.toLowerCase()}`,
    );

    ws.onopen = () => {
      console.log(
        `WebSocket connected to market.ticker.${tradingPair.toLowerCase()}`,
      );
    };

    ws.onmessage = (message: any) => {
      const data = JSON.parse(message.data);
      callback(data);
    };

    ws.onerror = (error: any) => {
      console.error(
        `WebSocket error on market.ticker.${tradingPair.toLowerCase()}:`,
        error,
      );
    };

    ws.onclose = () => {
      console.log(
        `WebSocket disconnected from market.ticker.${tradingPair.toLowerCase()}`,
      );
      // Reconnect on close
      setTimeout(() => this.subscribeTickerStream(tradingPair, callback), 1000);
    };
  }

  public async getTickerPrice(tradingPair) {
    try {
      const response = await this.apiRequest(
        'GET',
        `/api/market/ticker?sym=${tradingPair}`,
      );
      return response[tradingPair];
    } catch (error) {
      console.error(`Error fetching ticker price for ${tradingPair}:`, error);
      return null;
    }
  }

  async createOrder({ symbol, side, type, amount, price }) {
    const endpoint = '/api/market/place-bid';
    const timestamp = Date.now();
    const data = {
      sym: symbol,
      side: side,
      type: type,
      amt: amount.toFixed(8),
      rat: price.toFixed(2),
      ts: timestamp,
    };

    const signature = this.createSignature(data);
    const headers = {
      'X-BTK-SIGNATURE': signature,
      'X-BTK-TIMESTAMP': timestamp,
    };

    const response = await this.apiRequest(
      'POST',
      endpoint,
      {},
      data,
      true,
      headers,
    );
    return response;
  }

  public async cancelOrder(symbol, orderId) {
    try {
      await this.apiRequest('POST', '/api/market/cancel-order', {
        order_id: orderId,
      });
    } catch (error) {
      console.error(`Error canceling order ${orderId}:`, error);
    }
  }

  public async getOpenOrders(tradingPair) {
    try {
      const response = await this.apiRequest(
        'POST',
        '/api/market/my-open-orders',
        { sym: tradingPair },
      );
      return response.result;
    } catch (error) {
      console.error(`Error fetching open orders for ${tradingPair}:`, error);
      return null;
    }
  }

  public async getBalances() {
    try {
      const response = await this.apiRequest('POST', '/api/market/balances');
      return response.result;
    } catch (error) {
      console.error('Error fetching balances:', error);
      return null;
    }
  }

  public subscribeOrderStream(onOrderUpdate) {
    const wsUrl = `wss://api.bitkub.com/websocket-api/order`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`WebSocket connected to ${wsUrl}`);
      const payload = {
        type: 'subscribe',
        channel: 'order',
        api_key: this.apiKey,
      };
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'order') {
        onOrderUpdate(data);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error on ${wsUrl}:`, error);
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected from ${wsUrl}`);
    };
  }
}

export { ExchangeApi };
