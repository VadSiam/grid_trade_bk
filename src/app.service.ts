import { Injectable } from '@nestjs/common';
import { GridTradingBot, gridConfig } from './services/bot';

@Injectable()
export class AppService {
  runBot() {
    const gridTradingBot = new GridTradingBot(gridConfig);
    gridTradingBot.start();
    // gridTradingBot.continueWatching();
  }
}
