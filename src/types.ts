/**
 * Common Constants & Well-Known Solana Token Mints
 */
export const WELL_KNOWN_TOKENS: Record<string, { mint: string; decimals: number; symbol: string; name: string }> = {
  SOL: {
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    symbol: "SOL",
    name: "Wrapped SOL",
  },
  USDC: {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    symbol: "USDC",
    name: "USD Coin",
  },
  USDT: {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    symbol: "USDT",
    name: "Tether USD",
  },
  JUP: {
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
    symbol: "JUP",
    name: "Jupiter",
  },
  BONK: {
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
    symbol: "BONK",
    name: "Bonk",
  },
  JITOSOL: {
    mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    decimals: 9,
    symbol: "JitoSOL",
    name: "Jito Staked SOL",
  },
};

export interface TokenBalanceInfo {
  mint: string;
  symbol?: string;
  amount: string;
  uiAmount: number;
  decimals: number;
}

export interface WalletBalances {
  address: string;
  solBalanceLamports: number;
  solBalance: number;
  tokens: TokenBalanceInfo[];
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

export interface JitoTipFloor {
  time: string;
  landed_tips_25th_percentile: number;
  landed_tips_50th_percentile: number;
  landed_tips_75th_percentile: number;
  landed_tips_95th_percentile: number;
  landed_tips_99th_percentile: number;
  ema_landed_tips_50th_percentile: number;
}

export interface SimulationResult {
  success: boolean;
  err: any | null;
  logs: string[];
  unitsConsumed?: number;
  accountsDiffSummary: {
    signerSolBalanceChangeLamports?: number;
    signerSolBalanceChange?: number;
    potentialRiskFlag: boolean;
    riskReason?: string;
  };
}
