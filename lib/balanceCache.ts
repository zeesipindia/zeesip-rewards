let memoryBalanceCache: number | null = null;
let memoryProgressCache: number | null = null;

export function getCachedBalance(): number | null {
  if (memoryBalanceCache !== null) return memoryBalanceCache;
  if (typeof window !== 'undefined') {
    const val = sessionStorage.getItem('zeesip_cached_balance');
    if (val !== null && !isNaN(Number(val))) {
      memoryBalanceCache = Number(val);
      return memoryBalanceCache;
    }
  }
  return null;
}

export function setCachedBalance(balance: number, progress?: number) {
  memoryBalanceCache = balance;
  if (progress !== undefined) memoryProgressCache = progress;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('zeesip_cached_balance', String(balance));
  }
}

export function addOptimisticCoins(amount: number): number {
  const current = getCachedBalance() ?? 0;
  const newBalance = current + amount;
  const progress = Math.min(100, Math.round((newBalance / 250) * 100));
  setCachedBalance(newBalance, progress);
  return newBalance;
}

export async function fetchAndCacheBalance(): Promise<{ balance: number; progress_percent: number }> {
  try {
    const res = await fetch('/api/balance');
    const data = await res.json();
    if (data.balance !== undefined) {
      setCachedBalance(data.balance, data.progress_percent);
      return { balance: data.balance, progress_percent: data.progress_percent || 0 };
    }
  } catch {}
  return {
    balance: getCachedBalance() ?? 0,
    progress_percent: memoryProgressCache ?? 0,
  };
}
