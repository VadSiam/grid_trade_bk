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

export { removeTrailingZeros };
