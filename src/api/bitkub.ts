import { GridConfig } from './types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocket = require('ws');
// import WebSocket from 'ws';

class ExchangeApi {
  private gridConfig: GridConfig;
  private tickerPrices: Map<string, number>;

  constructor(gridConfig: GridConfig) {
    this.gridConfig = gridConfig;
    this.tickerPrices = new Map<string, number>();
  }

  public start() {
    this.subscribeTickerStream(this.gridConfig.tradingPair1, (data: any) => {
      console.log('🚀 ~ tradingPair1:', data);
      this.tickerPrices.set(
        this.gridConfig.tradingPair1,
        parseFloat(data.last),
      );
    });

    this.subscribeTickerStream(this.gridConfig.tradingPair2, (data: any) => {
      console.log('🚀 ~ tradingPair2:', data);
      this.tickerPrices.set(
        this.gridConfig.tradingPair2,
        parseFloat(data.last),
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
}

export { ExchangeApi };
