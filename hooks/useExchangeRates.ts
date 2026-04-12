import { useExchangeRateStore } from '../store/exchangeRateStore';

export function useExchangeRates() {
  return useExchangeRateStore();
}
