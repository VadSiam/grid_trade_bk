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

export {
  removeTrailingZeros,
  filterNonZeroValues,
  getCoinsFromPair,
  stringToNumber,
};
