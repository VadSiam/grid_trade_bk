export interface GridConfig {
  tradingPair1: string;
  tradingPair2: string;
  gridLevels: number;
  gridSpacing: number;
  tradeBalance: number;
  upperPrice: number;
  lowerPrice: number;
  priceThreshold: number;
  bitkubTradingFee: number;
}

export interface Grid {
  level: number; // level: The level number in the grid.
  priceBuy: number; // priceBuy: The buy price for this level.
  priceSell: number; // priceSell: The sell price for this level.
  amountBuy: number; // amount to buy: The trade amount for this level.
  amountSell: number; // amount to sell: The trade amount for this level.
}

export interface ITickerPriceResponse {
  id: number;
  last: number;
  lowestAsk: number;
  highestBid: number;
  percentChange: number;
  baseVolume: number;
  quoteVolume: number;
  isFrozen: number;
  high24hr: number;
  low24hr: number;
  change: number;
  prevClose: number;
  prevOpen: number;
}

export type ISideCreate = 'buy' | 'sell';
export type ITypeCreate = 'limit' | 'market';

export interface CreateOrderData {
  symbol: string;
  side: ISideCreate;
  type: ITypeCreate;
  amount: number;
  price: number;
}

export type ISide = 'BUY' | 'SELL';
export const Side: Record<ISide, ISide> = {
  BUY: 'BUY',
  SELL: 'SELL',
};
export interface Order {
  id: string;
  hash: string;
  side: ISide;
  type: 'limit' | 'market';
  rate: string;
  fee: string;
  credit: string;
  amount: string;
  receive: string;
  parent_id: string;
  super_id: string;
  client_id: null | string;
  ts: number;
  // id: string;
  // hash: string;
  // typ: string;
  // amt: number;
  // rat: number;
  // fee: number;
  // cre: number;
  // rec: number;
  // ts: string;
}

export interface CancelOrderData {
  symbol: string;
  orderId: string;
  side: 'buy' | 'sell';
  hash?: string;
}
export interface CancelOrderDataAlternative {
  symbol?: string;
  orderId?: string;
  side?: 'buy' | 'sell';
  hash: string;
}

export interface GetInfoOrderData {
  symbol: string;
  orderId: string;
  side: 'buy' | 'sell';
  hash?: string;
}
export interface GetInfoOrderDataAlternative {
  symbol?: string;
  orderId?: string;
  side?: 'buy' | 'sell';
  hash: string;
}

export interface Balance {
  [key: string]: number;
}

export interface OrderHistory {
  id: number;
  first: number;
  parent: number;
  last: number;
  amount: number;
  rate: number;
  fee: number;
  credit: number;
  filled: number;
  total: number;
  status: string;
  partial_filled: boolean;
  remaining: number;
  history: Array<{
    amount: number;
    credit: number;
    fee: number;
    id: number;
    rate: number;
    timestamp: number;
  }>;
}
