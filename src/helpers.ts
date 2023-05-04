import { Balance } from './api/types';

const removeTrailingZeros = (num) => {
  const strNum = num.toString();
  const decimalIndex = strNum.indexOf('.');
  if (decimalIndex === -1) {
    return num;
  }
  let i = strNum.length - 1;
  while (strNum[i] === '0') {
    i--;
  }
  if (strNum[i] === '.') {
    i--;
  }
  return parseFloat(strNum.slice(0, i + 1));
};

const filterNonZeroValues = (obj: Balance) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== 0),
  );
};

const getCoinsFromPair = (pair: string) => {
  const regex = /^([A-Z]{3})_([A-Z]{3})$/;
  const [, baseCurrency, quoteCurrency] = pair.match(regex);
  return [baseCurrency, quoteCurrency];
};

const stringToNumber = (str: string): number => {
  // Use the Number() function to convert the string to a number
  const number = Number(str);

  // Check if the conversion was successful
  if (Number.isNaN(number)) {
    throw new Error('Invalid input');
  }

  return number;
};

/**
 * Execute a function with retry logic 3 times
 * @param func Function to execute
 * @param timeout Timeout between retries in milliseconds
 * @returns The result of the function
 * @throws If the function throws an error after all retries
 */
async function executeWithRetry<T>(
  func: () => Promise<T[]>,
  timeout: number,
): Promise<T[]> {
  let result: T[] = [];
  let retries = 0;
  while (retries < 3) {
    result = await func();
    if (result.length > 0) {
      break;
    }
    retries++;
    await sleep(timeout);
  }
  return result;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export {
  removeTrailingZeros,
  filterNonZeroValues,
  getCoinsFromPair,
  stringToNumber,
  executeWithRetry,
};
