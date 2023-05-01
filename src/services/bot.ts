import { ExchangeApi } from 'src/api/bitkub';
import { GridConfig } from 'src/api/types';

class GridTradingBot {
  private gridConfig: GridConfig;
  private exchangeApi: ExchangeApi;

  constructor(gridConfig: GridConfig) {
    this.gridConfig = gridConfig;
    this.exchangeApi = new ExchangeApi(gridConfig);
  }

  async start() {
    this.exchangeApi.start();
    await this.calculateGrid();
  }

  async calculateGrid() {
    // Your grid calculation logic here, based on the ticker prices received from the ExchangeApi
  }

  isRunning() {
    // Check if the bot is running
  }
}

const gridConfig: GridConfig = {
  tradingPair1: 'BTC_THB',
  tradingPair2: 'THB_ETH',
  gridLevels: 10,
  gridSpacing: 0.5,
  tradeAmount: 0.01,
  upperPrice: 40000,
  lowerPrice: 30000,
};

export { GridTradingBot, gridConfig };
