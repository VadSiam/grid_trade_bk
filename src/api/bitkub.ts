import { filterNonZeroValues, removeTrailingZeros } from 'src/helpers';
import {
  Balance,
  CancelOrderData,
  CancelOrderDataAlternative,
  CreateOrderData,
  GetInfoOrderData,
  GetInfoOrderDataAlternative,
  GridConfig,
  ITickerPriceResponse,
  Order,
  OrderHistory,
} from './types';
import * as crypto from 'crypto';
// import fetch from 'node-fetch';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocket = require('ws');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch');

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

  async apiRequest(method, endpoint, params = {}, data = {}) {
    const url = new URL(this.baseURL + endpoint);
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-BTK-APIKEY': this.apiKey,
    };

    // Add query parameters to the URL
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });

    try {
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

      const jsonResponse: any = await response.json();
      return jsonResponse;
    } catch (error) {
      console.log('apiRequest func error:', error);
    }
  }

  createSignature(payload) {
    // Convert the payload object to a JSON string
    const payloadString = JSON.stringify(payload);

    // Create the signature for signed requests
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(payloadString)
      .digest('hex');
  }

  // public start() {
  //   this.subscribeTickerStream(this.gridConfig.tradingPair1, (data: any) => {
  //     this.tickerPrices.set(
  //       this.gridConfig.tradingPair1,
  //       data,
  //       // parseFloat(data.last),
  //     );
  //   });

  //   this.subscribeTickerStream(this.gridConfig.tradingPair2, (data: any) => {
  //     this.tickerPrices.set(
  //       this.gridConfig.tradingPair2,
  //       data,
  //       // parseFloat(data.last),
  //     );
  //   });
  // }

  public subscribeTickerStream(
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
      return response[tradingPair] as ITickerPriceResponse;
    } catch (error) {
      console.error(`Error fetching ticker price for ${tradingPair}:`, error);
      return null;
    }
  }

  async createOrder({ symbol, side, type, amount, price }: CreateOrderData) {
    // const endpoint =
    //   side === 'buy'
    //     ? '/api/market/place-bid/test'
    //     : '/api/market/place-ask/test';
    const endpoint =
      side === 'buy' ? '/api/market/v2/place-bid' : '/api/market/v2/place-ask';
    const timestamp = Date.now();
    const data = {
      sym: symbol,
      typ: type,
      amt: removeTrailingZeros(amount.toFixed(8)),
      rat: removeTrailingZeros(price.toFixed(2)),
      ts: timestamp,
    };
    const signature = this.createSignature(data);
    data['sig'] = signature;

    try {
      const response = await this.apiRequest('POST', endpoint, {}, data);
      return response;
    } catch (error) {
      console.log('createOrder func error: ', error);
    }
  }

  public async cancelOrder({
    symbol,
    orderId,
    side,
    hash,
  }: CancelOrderData | CancelOrderDataAlternative) {
    try {
      const timestamp = Date.now();
      const data = {
        // sym: string The symbol
        // id: int Order id you wish to cancel
        // sd: string Order side: buy or sell
        // hash: string Cancel an order with order hash(optional).You don't need to specify sym, id, and sd when you specify order hash.
        sym: symbol,
        id: orderId,
        sd: side,
        hash,
        ts: timestamp,
      };
      const signature = this.createSignature(data);
      data['sig'] = signature;
      await this.apiRequest('POST', '/api/market/v2/cancel-order', {}, data);
    } catch (error) {
      console.error(`Error canceling order ${orderId}:`, error);
    }
  }

  public async getMyOpenOrders(symbol: string): Promise<Order[]> {
    try {
      const timestamp = Date.now();
      const data = {
        sym: symbol,
        ts: timestamp,
      };
      const signature = this.createSignature(data);
      data['sig'] = signature;
      const response = await this.apiRequest(
        'POST',
        '/api/market/my-open-orders',
        {},
        data,
      );
      return response.result;
    } catch (error) {
      console.error('Error fetching open orders:', error);
      return [];
    }
  }

  public async getOrderInfo({
    symbol,
    orderId,
    side,
    hash,
  }: GetInfoOrderDataAlternative | GetInfoOrderData): Promise<OrderHistory> {
    try {
      const timestamp = Date.now();
      const data = {
        sym: symbol,
        id: orderId,
        ts: timestamp,
        ...(side ? { sd: side } : {}),
        ...(hash ? { hash } : {}),
      };
      const signature = this.createSignature(data);
      data['sig'] = signature;
      const response = await this.apiRequest(
        'POST',
        '/api/market/order-info',
        {},
        data,
      );
      return response.result;
    } catch (error) {
      console.error('Error fetching order info:', error);
      throw error;
    }
  }

  public async getAvailableBalances(): Promise<Balance> {
    try {
      const timestamp = Date.now();
      const data = {
        ts: timestamp,
      };
      const signature = this.createSignature(data);
      data['sig'] = signature;
      const { result } = await this.apiRequest(
        'POST',
        '/api/market/wallet',
        {},
        data,
      );
      const filteredResult = filterNonZeroValues(result);
      return filteredResult;
    } catch (error) {
      console.error('Error fetching open orders:', error);
      return null;
    }
  }

  // public subscribeOrderStream(
  //   orders: OrderPair[],
  //   symbol: string,
  //   onOrderUpdate,
  // ) {
  //   const wsUrl = `wss://api.bitkub.com/websocket-api/orderbook/${symbol}`;

  //   const ws = new WebSocket(wsUrl);

  //   const orderIds = new Set(
  //     orders.flatMap((pair) => [pair.buyOrder.id, pair.sellOrder.id]),
  //   );

  //   ws.onopen = () => {
  //     console.log(`WebSocket connected to ${wsUrl}`);
  //   };

  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     console.log('🚀 ~ file: bitkub.ts:213 ~ event:', event, data);
  //     if (data.event === 'tradeschanged') {
  //       const [trades, bids, asks] = data.data;
  //       const orders = [...bids, ...asks].filter((order) =>
  //         orderIds.has(order[0]),
  //       );
  //       if (orders.length > 0) {
  //         onOrderUpdate(orders);
  //       }
  //     }
  //   };

  //   ws.onerror = (error) => {
  //     console.error(`WebSocket error on ${wsUrl}:`, error);
  //   };

  //   ws.onclose = () => {
  //     console.log(`WebSocket disconnected from ${wsUrl}`);
  //   };
  // }
}

export { ExchangeApi };
