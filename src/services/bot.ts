// This bot for BTC-THB pair only
import { ExchangeApi } from 'src/api/bitkub';
import {
  Grid,
  GridConfig,
  ISide,
  ISideCreate,
  Order,
  Side,
} from 'src/api/types';
import {
  executeWithRetry,
  getCoinsFromPair,
  stringToNumber,
} from 'src/helpers';

class GridTradingBot {
  private gridConfig: GridConfig;
  private exchangeApi: ExchangeApi;
  private isRunning: boolean;
  private grid: Grid[];
  private orders: Order[];

  constructor(gridConfig: GridConfig) {
    this.exchangeApi = new ExchangeApi(gridConfig);
    this.gridConfig = gridConfig;
    this.isRunning = false;
    this.grid = [];
    this.orders = [];
  }

  stop() {
    this.isRunning = false;
    console.log('TradingBot stopped.');
  }

  async continueWatching() {
    if (this.isRunning) {
      throw new Error('Grid trading bot is already running');
    }

    this.isRunning = true;

    try {
      // 0. Get all running orders and assign it to this.orders
      const checkMyOrders = await this.exchangeApi.getMyOpenOrders(
        this.gridConfig.tradingPair1,
      );
      this.orders = checkMyOrders;

      // 1. Call checkOrdersPeriodically to start periodically checking orders
      await this.checkOrdersPeriodically();
    } catch (error) {}
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Grid trading bot is already running');
    }

    this.isRunning = true;
    try {
      // 0. Cancel all orders before starting
      await this.cancelAllOrders();

      // 1. Check balance enough for trading
      const isBalanceEnough = await this.checkBalance();
      if (!isBalanceEnough) {
        this.stop();
        throw new Error(
          `Balance is not enough for trading. Checking please. Summary it should be more than ${this.gridConfig.tradeBalance} THB`,
        );
      }

      // 2. Calculate grid levels
      await this.calculateGrid();
      console.log('🚀  bot.ts:26 ~ GridTradingBot ~ this.grid', this.grid);

      // 3. Place grid orders and assign the orders to this.orders
      await this.placeGridOrders();
      console.log('🚀 ~ file: bot.ts:20 ~ this.orders:', this.orders);

      // 4. Call checkOrdersPeriodically to start periodically checking orders
      await this.checkOrdersPeriodically();

      // Cancel orders
      // await this.cancelAllOrders();

      // Subscribe to the ticker stream
      // this.exchangeApi.subscribeTickerStream(
      //   this.gridConfig.tradingPair1,
      //   (data) => {
      //     const price = data.last;
      //     console.log('Current price:', price);

      //     // Call checkOrdersWhenPriceIsClose with the current price
      //     this.checkOrdersWhenPriceIsClose(price);
      //   },
      // );
    } catch (error) {
      console.log('Start Error: ', error);
    }
  }

  //TODO: nothing
  // Calculate grid levels and prices here
  private async calculateGrid() {
    const { gridLevels, gridSpacing, tradeBalance, tradingPair1 } =
      this.gridConfig;
    const currentMarketPrice = await this.exchangeApi.getTickerPrice(
      tradingPair1,
    );

    const { last: currentPrice } = currentMarketPrice;
    const amountPerLevel = tradeBalance / gridLevels / 2; // one level include buy and sell that we split it to 2

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

  //TODO: nothing
  private async calculateSingleGrid(type: ISide, amountTHB: number) {
    const { gridSpacing, tradingPair1 } = this.gridConfig;
    const { last: currentPrice } = await this.exchangeApi.getTickerPrice(
      tradingPair1,
    );

    if (type === Side.BUY) {
      const priceBuy = currentPrice * (1 - gridSpacing / 100);

      return {
        side: 'buy' as ISideCreate,
        price: priceBuy,
        amount: amountTHB,
      };
    } else {
      const priceSell = currentPrice * (1 + gridSpacing / 100);
      const amountSell = amountTHB / priceSell;

      return {
        side: 'sell' as ISideCreate,
        price: priceSell,
        amount: amountSell,
      };
    }
  }

  //TODO: nothing
  private async placeGridOrders() {
    for (const gridLevel of this.grid) {
      const { error: buyCreateError } = await this.exchangeApi.createOrder({
        symbol: this.gridConfig.tradingPair1,
        side: 'buy',
        type: 'limit',
        amount: gridLevel.amountBuy,
        price: gridLevel.priceBuy,
      });
      console.log('🚀 buyCreateError in placeGridOrders:', buyCreateError);
      const { error: sellCreateError } = await this.exchangeApi.createOrder({
        symbol: this.gridConfig.tradingPair1,
        side: 'sell',
        type: 'limit',
        amount: gridLevel.amountSell,
        price: gridLevel.priceSell,
      });
      console.log('🚀 sellCreateError in placeGridOrders:', sellCreateError);
      if (buyCreateError !== 0 || sellCreateError !== 0) {
        await this.cancelAllOrders();
        throw new Error('Cannot place order');
      }
    }
    const checkMyOrders = await this.exchangeApi.getMyOpenOrders(
      this.gridConfig.tradingPair1,
    );
    this.orders = checkMyOrders;
  }

  //TODO: nothing
  private async checkBalance(): Promise<boolean> {
    const { tradeBalance, tradingPair1, priceThreshold } = this.gridConfig;
    const [baseCoin, primCoin] = getCoinsFromPair(tradingPair1);
    const balance = await this.exchangeApi.getAvailableBalances();
    const { [primCoin]: primCoinBalance = 0, [baseCoin]: baseCoinBalance = 0 } =
      balance;
    const currentMarketPricePair1 = await this.exchangeApi.getTickerPrice(
      tradingPair1,
    );
    const primBalanceTHB = primCoinBalance * currentMarketPricePair1.last;
    const baseBalanceTHB = baseCoinBalance;
    if (
      primBalanceTHB > (tradeBalance / 2) * (1 + priceThreshold) &&
      baseBalanceTHB > (tradeBalance / 2) * (1 + priceThreshold)
    ) {
      console.log(
        'Balance is enough for trading',
        primBalanceTHB,
        baseBalanceTHB,
        tradeBalance,
      );
      return true;
    } else {
      console.log(
        '🚀 NOT! Need equivalent in BTC and THB this amount(in THB): ',
        tradeBalance / 2,
      );
      return false;
    }
  }

  //TODO: nothing
  private async buyCoinMarketPriceForTHB({
    amountTHB,
    tradingPair,
  }: {
    amountTHB: number;
    tradingPair: string;
  }) {
    const balance = await this.exchangeApi.getAvailableBalances();
    const { ['THB']: thbBalance } = balance;
    if (thbBalance >= amountTHB) {
      const resp = await this.exchangeApi.createOrder({
        symbol: tradingPair,
        side: 'buy',
        type: 'market',
        amount: amountTHB,
        price: 0,
      });
      return resp;
    } else {
      console.log('🚀 NOT enough THB to buy');
      return null;
    }
  }

  //TODO: nothing
  private async sellCoinMarketPriceForTHB({
    amountCoin,
    tradingPair,
  }: {
    amountCoin: number;
    tradingPair: string;
  }) {
    const balance = await this.exchangeApi.getAvailableBalances();
    const [, coin] = getCoinsFromPair(tradingPair);
    const { [coin]: coinBalance } = balance;
    if (coinBalance >= amountCoin) {
      const resp = await this.exchangeApi.createOrder({
        symbol: tradingPair,
        side: 'sell',
        type: 'market',
        amount: amountCoin,
        price: 0,
      });
      return resp;
    } else {
      console.log(`🚀 NOT enough ${coin} to buy`);
      return null;
    }
  }

  //FIXME: not ready yet
  private async checkOrdersWhenPriceIsClose(price: number): Promise<void> {
    const priceThreshold = price * this.gridConfig.priceThreshold;
    console.log('🚀 ~ file: bot.ts:110 ~ priceThreshold:', priceThreshold);
    const closeOrders = this.orders.filter((order) => {
      const orderClose =
        Math.abs(price - stringToNumber(order.rate)) <= priceThreshold;
      return orderClose;
    });

    if (closeOrders.length > 0) {
      const openOrders = await this.exchangeApi.getMyOpenOrders('THB_BTC');
      console.log('🚀 ~ file: bot.ts:120 ~ openOrders:', openOrders);
      const openOrderIds = new Set(openOrders.map((order) => order.id));
      const executedOrders = this.orders.filter(
        (order) => !openOrderIds.has(order.id),
      );

      if (executedOrders.length > 0) {
        console.log('Executed orders:', executedOrders);
        // Handle executed orders
      }
    }
  }

  //TODO: nothing
  private async checkOrdersPeriodically(): Promise<void> {
    // sometime glitch at bitkub server happens. need to run 3 times to make sure orders exist
    const openOrders = await executeWithRetry(
      () => this.exchangeApi.getMyOpenOrders(this.gridConfig.tradingPair1),
      1000,
    );
    console.log('🚀 ~ file: bot.ts:287 ~ openOrders:', openOrders.length);
    // const openOrderIds = openOrders.map((order) => order.id);
    // const executedOrders = this.orders.filter((order) => {
    //   return !openOrderIds.includes(order.id);
    // });
    const openOrderIds = await Promise.all(openOrders.map((order) => order.id));
    const executedOrders = await Promise.all(
      this.orders.filter((order) => !openOrderIds.includes(order.id)),
    );

    if (executedOrders.length) {
      console.log('Executed orders:', executedOrders);
      // creating new orders
      await Promise.all(
        executedOrders.map(async (order) => {
          const { hash } = order;
          const infoFromOrder = await this.exchangeApi.getOrderInfo({ hash });
          const { status } = infoFromOrder;
          console.log('🚀 ~ file: bot.ts:306 ~ infoFromOrder:', infoFromOrder);
          if (!(status === 'filled')) {
            return null;
          }
          const { side, receive, rate } = order;
          if (side === 'SELL') {
            const amountCoinTHB = stringToNumber(receive);
            const grid = await this.calculateSingleGrid(
              Side.BUY,
              amountCoinTHB,
            );
            const { error: buyCreateError } =
              await this.exchangeApi.createOrder({
                symbol: this.gridConfig.tradingPair1,
                side: grid.side,
                type: 'limit',
                amount: grid.amount,
                price: grid.price,
              });
            console.log(
              '🚀 buyCreateError in checkOrdersPeriodically:',
              buyCreateError,
            );
          } else {
            const receiveInNumber = stringToNumber(receive);
            const rateInNumber = stringToNumber(rate);
            const amountCoinTHB = receiveInNumber * rateInNumber;
            const grid = await this.calculateSingleGrid(
              Side.SELL,
              amountCoinTHB,
            );
            const { error: sellCreateError } =
              await this.exchangeApi.createOrder({
                symbol: this.gridConfig.tradingPair1,
                side: grid.side,
                type: 'limit',
                amount: grid.amount,
                price: grid.price,
              });
            console.log(
              '🚀 sellCreateError in checkOrdersPeriodically:',
              sellCreateError,
            );
          }
        }),
      );
      // removing executed orders
      this.orders = this.orders.filter(
        (order) => !executedOrders.some((eOrder) => eOrder.id === order.id),
      );
    }

    // Check again after 1 minute
    setTimeout(() => this.checkOrdersPeriodically(), 2 * 1000);
  }

  //TODO: nothing
  private async cancelAllOrders() {
    try {
      const orders = await this.exchangeApi.getMyOpenOrders(
        this.gridConfig.tradingPair1,
      );
      console.log('🚀 Orders before cancel:', orders);
      for (const order of orders) {
        const { hash } = order;
        await this.exchangeApi.cancelOrder({
          hash,
        });
      }
      const ordersFinally = await this.exchangeApi.getMyOpenOrders(
        this.gridConfig.tradingPair1,
      );
      console.log('🚀 ~ Orders after cancel:', ordersFinally);
      // if orders exist run again
      if (ordersFinally.length !== 0) {
        this.cancelAllOrders();
      }
    } catch (error) {
      console.log('cancelAllOrders func error:', error);
    }
  }

  //FIXME: check if this is working
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
    const balances = await this.exchangeApi.getAvailableBalances();
    const thbBalance = balances['THB'];

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
  gridLevels: 5,
  gridSpacing: 0.3, // 0.5%
  tradeBalance: 10000, // THB
  upperPrice: 40000, // not in use
  lowerPrice: 30000, // not in use
  priceThreshold: 0.002, // 0.2%
  bitkubTradingFee: 0.0025, // 0.25%
};

export { GridTradingBot, gridConfig };
