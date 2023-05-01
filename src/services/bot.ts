import { ExchangeApi } from 'src/api/bitkub';
import { Grid, GridConfig } from 'src/api/types';

class GridTradingBot {
  private gridConfig: GridConfig;
  private exchangeApi: ExchangeApi;
  private isRunning: boolean;
  private grid: Grid[];
  private orders: {
    buyOrder: any;
    sellOrder: any;
  }[];

  constructor(gridConfig: GridConfig) {
    this.exchangeApi = new ExchangeApi(gridConfig);
    this.gridConfig = gridConfig;
    this.isRunning = false;
    this.grid = [];
    this.orders = [];
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Grid trading bot is already running');
    }

    this.isRunning = true;
    // this.exchangeApi.start();
    await this.calculateGrid();
    await this.placeGridOrders();
    this.exchangeApi.subscribeOrderStream((order) => {
      this.onOrderUpdate(order);
    });
  }

  public async onOrderUpdate(order) {
    console.log('🚀 ~ file: bot.ts:35 ~ order', order);
  }

  // Calculate grid levels and prices here
  private async calculateGrid() {
    const { gridLevels, gridSpacing, tradeAmount, tradingPair1 } =
      this.gridConfig;
    // const tickerPrice = await this.exchangeApi.getTickerPrice(tradingPair1);
    // const currentMarketPrice = tickerPrice.last;
    const currentMarketPrice = await this.exchangeApi.getTickerPrice(
      tradingPair1,
    );

    for (let i = 1; i <= gridLevels; i++) {
      const currentPrice = currentMarketPrice;
      const buyPrice = currentPrice * (1 - (i * gridSpacing) / 100);
      const sellPrice = currentPrice * (1 + (i * gridSpacing) / 100);
      const amount = tradeAmount;

      this.grid.push({
        level: i + 1,
        buyPrice,
        sellPrice,
        amount,
      });
    }
  }

  private async placeGridOrders() {
    for (const gridLevel of this.grid) {
      // symbol, side, type, amount, price
      const buyOrder = await this.exchangeApi.createOrder({
        symbol: this.gridConfig.tradingPair1,
        type: 'buy',
        side: 'limit',
        amount: gridLevel.amount,
        price: gridLevel.buyPrice,
      });
      const sellOrder = await this.exchangeApi.createOrder({
        symbol: this.gridConfig.tradingPair1,
        type: 'sell',
        side: 'limit',
        amount: gridLevel.amount,
        price: gridLevel.sellPrice,
      });

      this.orders.push({
        buyOrder: buyOrder.result,
        sellOrder: sellOrder.result,
      });
    }
  }

  private async cancelAllOrders() {
    for (const order of this.orders) {
      await this.exchangeApi.cancelOrder(
        this.gridConfig.tradingPair1,
        order.buyOrder.order_id,
      );
      await this.exchangeApi.cancelOrder(
        this.gridConfig.tradingPair1,
        order.sellOrder.order_id,
      );
    }
    this.orders = [];
  }

  async emergencyAction() {
    // Cancel all open orders
    this.cancelAllOrders();
    // const openOrders = await this.exchangeApi.getOpenOrders(
    //   this.gridConfig.tradingPair1,
    // );
    // for (const order of openOrders) {
    //   await this.exchangeApi.cancelOrder(order.id);
    // }

    // Get available THB balance
    const balances = await this.exchangeApi.getBalances();
    const thbBalance = balances.result['THB'];

    // Buy BTC with the available THB balance
    if (thbBalance) {
      const marketPrice = await this.exchangeApi.getTickerPrice(
        this.gridConfig.tradingPair1,
      );
      const btcAmount = thbBalance / marketPrice;
      await this.exchangeApi.createOrder({
        symbol: this.gridConfig.tradingPair1,
        type: 'buy',
        side: 'market',
        amount: btcAmount,
        price: 0,
      });
    }
  }
}

const gridConfig: GridConfig = {
  tradingPair1: 'THB_BTC',
  tradingPair2: 'THB_ETH',
  gridLevels: 10,
  gridSpacing: 0.5,
  tradeAmount: 0.01,
  upperPrice: 40000,
  lowerPrice: 30000,
};

export { GridTradingBot, gridConfig };
