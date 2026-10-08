import { JupiterQuoteResponse, WELL_KNOWN_TOKENS } from "../types.js";

export class JupiterService {
  private quoteApiUrl = process.env.JUPITER_API_URL || "https://lite-api.jup.ag/swap/v1";

  /**
   * Helper to normalize token symbol or mint into a valid mint address
   */
  public resolveMint(symbolOrMint: string): string {
    const upper = symbolOrMint.toUpperCase();
    if (WELL_KNOWN_TOKENS[upper]) {
      return WELL_KNOWN_TOKENS[upper].mint;
    }
    return symbolOrMint;
  }

  /**
   * Fetch swap quote from Jupiter v6/v1 Lite API
   */
  public async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: string; // in atomic units / lamports
    slippageBps?: number;
  }): Promise<JupiterQuoteResponse> {
    const input = this.resolveMint(params.inputMint);
    const output = this.resolveMint(params.outputMint);
    const slippage = params.slippageBps ?? 50; // default 0.5%

    const url = new URL(`${this.quoteApiUrl}/quote`);
    url.searchParams.set("inputMint", input);
    url.searchParams.set("outputMint", output);
    url.searchParams.set("amount", params.amount);
    url.searchParams.set("slippageBps", slippage.toString());

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) solana-agent-mcp/1.0" },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Jupiter quote error (${res.status}): ${errText}`);
    }

    return (await res.json()) as JupiterQuoteResponse;
  }

  /**
   * Build unsigned VersionedTransaction from Jupiter quote
   */
  public async buildSwapTransaction(params: {
    quoteResponse: JupiterQuoteResponse;
    userPublicKey: string;
    wrapAndUnwrapSol?: boolean;
    prioritizationFeeLamports?: number;
  }): Promise<{ swapTransaction: string; lastValidBlockHeight?: number }> {
    const payload = {
      quoteResponse: params.quoteResponse,
      userPublicKey: params.userPublicKey,
      wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
      prioritizationFeeLamports: params.prioritizationFeeLamports ?? "auto",
    };

    const res = await fetch(`${this.quoteApiUrl}/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) solana-agent-mcp/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Jupiter swap builder error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as { swapTransaction: string; lastValidBlockHeight?: number };
    return data;
  }

  /**
   * Derive live token price in USDC by querying executable quotes against USDC
   */
  public async getTokenPrice(symbolOrMints: string[]): Promise<Record<string, { id: string; price: string }>> {
    const usdcMint = WELL_KNOWN_TOKENS.USDC.mint;
    const results: Record<string, { id: string; price: string }> = {};

    for (const sym of symbolOrMints) {
      const mint = this.resolveMint(sym);
      if (mint === usdcMint || sym.toUpperCase() === "USDC") {
        results[sym] = { id: usdcMint, price: "1.00" };
        continue;
      }

      try {
        // Query quote for 1 unit of token into USDC
        const tokenMeta = Object.values(WELL_KNOWN_TOKENS).find((t) => t.mint === mint);
        const decimals = tokenMeta ? tokenMeta.decimals : 9;
        const oneUnitAtomic = (10 ** decimals).toString();

        const quote = await this.getQuote({
          inputMint: mint,
          outputMint: usdcMint,
          amount: oneUnitAtomic,
        });

        const usdcOut = Number(quote.outAmount) / 1e6;
        results[sym] = { id: mint, price: usdcOut.toFixed(4) };
      } catch {
        results[sym] = { id: mint, price: "N/A" };
      }
    }

    return results;
  }
}
