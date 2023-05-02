export interface GridConfig {
  tradingPair1: string;
  tradingPair2: string;
  gridLevels: number;
  gridSpacing: number;
  tradeBalance: number;
  upperPrice: number;
  lowerPrice: number;
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

export interface CreateOrderData {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  amount: number;
  price: number;
}
