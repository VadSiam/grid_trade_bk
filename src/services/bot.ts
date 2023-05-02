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
    try {
      await this.calculateGrid();
      console.log(
        '🚀 ~ file: bot.ts:26 ~ GridTradingBot ~ this.grid',
        this.grid,
      );
      await this.placeGridOrders();
      console.log('🚀 ~ file: bot.ts:20 ~ this.orders:', this.orders);
      // this.exchangeApi.subscribeOrderStream((order) => {
      //   this.onOrderUpdate(order);
      // });
    } catch (error) {
      console.log('Start Error: ', error);
    }
  }

  public async onOrderUpdate(order) {
    console.log('🚀 ~ file: bot.ts:35 ~ order', order);
  }

  // Calculate grid levels and prices here
  private async calculateGrid() {
    const { gridLevels, gridSpacing, tradeBalance, tradingPair1 } =
      this.gridConfig;
    const currentMarketPrice = await this.exchangeApi.getTickerPrice(
      tradingPair1,
    );

    const { last: currentPrice } = currentMarketPrice;
    const amountPerLevel = tradeBalance / gridLevels / 2;

    for (let i = 1; i <= gridLevels; i++) {
      const priceBuy = currentPrice * (1 - (i * gridSpacing) / 100); // thb amount
      const priceSell = currentPrice * (1 + (i * gridSpacing) / 100); // btc amount

      const amountBuy = amountPerLevel;
      const amountSell = amountPerLevel / priceSell;

      this.grid.push({
        level: i,
        priceBuy,
        priceSell,
        amountBuy,
        amountSell,
      });
    }
  }

  private async placeGridOrders() {
    for (const gridLevel of this.grid) {
      // symbol, side, type, amount, price
      const buyOrder = await this.exchangeApi.createOrder({
        symbol: this.gridConfig.tradingPair1,
        side: 'buy',
        type: 'limit',
        amount: gridLevel.amountBuy,
        price: gridLevel.priceBuy,
      });
      const sellOrder = await this.exchangeApi.createOrder({
        symbol: this.gridConfig.tradingPair1,
        side: 'sell',
        type: 'limit',
        amount: gridLevel.amountSell,
        price: gridLevel.priceSell,
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
      const { last: marketPrice } = await this.exchangeApi.getTickerPrice(
        this.gridConfig.tradingPair1,
      );
      const btcAmount = thbBalance / marketPrice;
      await this.exchangeApi.createOrder({
        symbol: this.gridConfig.tradingPair1,
        side: 'buy',
        type: 'market',
        amount: btcAmount,
        price: 0,
      });
    }
  }
}

const gridConfig: GridConfig = {
  tradingPair1: 'THB_BTC',
  tradingPair2: 'THB_ETH',
  gridLevels: 2,
  gridSpacing: 0.5,
  tradeBalance: 900, // THB
  upperPrice: 40000,
  lowerPrice: 30000,
};

export { GridTradingBot, gridConfig };
