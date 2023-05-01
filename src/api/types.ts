export interface GridConfig {
  tradingPair1: string;
  tradingPair2: string;
  gridLevels: number;
  gridSpacing: number;
  tradeAmount: number;
  upperPrice: number;
  lowerPrice: number;
}

export interface Grid {
  level: number; // level: The level number in the grid.
  buyPrice: number; // buyPrice: The buy price for this level.
  sellPrice: number; // sellPrice: The sell price for this level.
  amount: number; // amount: The trade amount for this level.
}
