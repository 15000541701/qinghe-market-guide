import type { Currency, Product } from './types';

export function productCurrency(product: Pick<Product, 'currency'> | undefined): Currency {
  return product?.currency === 'USD' ? 'USD' : 'CNY';
}

export function currencySymbol(currency: Currency) {
  return currency === 'USD' ? 'US$' : '¥';
}

export function formatCurrency(value: number, currency: Currency) {
  return `${currencySymbol(currency)}${value.toFixed(2)}`;
}

export function currencyMismatchMessage(message: string, currency: Currency) {
  const asksCny = /\bCNY\b|\bRMB\b|人民币|[¥￥]|\d+(?:\.\d+)?\s*元|\d+(?:\.\d+)?\s*块钱?/i.test(message);
  const asksUsd = /\bUSD\b|\bUS\$|\$|美元|\bdollars?\b/i.test(message);
  if (currency === 'USD' && asksCny)
    return '当前顾客目录按美元（USD）计价。请先切换到人民币（CNY）目录，或用 $ / USD 表达预算。';
  if (currency === 'CNY' && asksUsd)
    return '当前顾客目录按人民币（CNY）计价。请先切换到美元（USD）目录，或用 ¥ / 元表达预算。';
  return '';
}
