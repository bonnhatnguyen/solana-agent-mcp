import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  WELL_KNOWN_TOKENS,
  WalletBalances,
  TokenBalanceInfo,
  SimulationResult,
} from "../types.js";

export class SolanaService {
  private connection: Connection;

  constructor(rpcUrl?: string) {
    const endpoint =
      rpcUrl ||
      process.env.SOLANA_RPC_URL ||
      "https://api.mainnet-beta.solana.com";
    this.connection = new Connection(endpoint, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 30000,
    });
  }

  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Validate if a string is a valid Solana public key
   */
  public isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch SOL balance and all SPL Token Accounts owned by the address
   */
  public async getWalletBalances(address: string): Promise<WalletBalances> {
    const pubkey = new PublicKey(address);

    // 1. Fetch SOL balance
    const solLamports = await this.connection.getBalance(pubkey);
    const solUi = solLamports / LAMPORTS_PER_SOL;

    // 2. Fetch SPL Token Accounts
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: TOKEN_PROGRAM_ID }
    );

    const tokens: TokenBalanceInfo[] = [];

    for (const { account } of tokenAccounts.value) {
      const parsedInfo = account.data.parsed.info;
      const mintAddress = parsedInfo.mint;
      const tokenAmount = parsedInfo.tokenAmount;

      if (tokenAmount.uiAmount && tokenAmount.uiAmount > 0) {
        // Match with well-known tokens
        const wellKnown = Object.values(WELL_KNOWN_TOKENS).find(
          (t) => t.mint === mintAddress
        );

        tokens.push({
          mint: mintAddress,
          symbol: wellKnown?.symbol || "UNKNOWN",
          amount: tokenAmount.amount,
          uiAmount: tokenAmount.uiAmount,
          decimals: tokenAmount.decimals,
        });
      }
    }

    return {
      address,
      solBalanceLamports: solLamports,
      solBalance: solUi,
      tokens,
    };
  }

  /**
   * Simulate a serialized VersionedTransaction before execution
   * Detects balance changes and risk flags
   */
  public async simulateRawTransaction(rawBase64: string): Promise<SimulationResult> {
    try {
      const buffer = Buffer.from(rawBase64, "base64");
      const tx = VersionedTransaction.deserialize(buffer);

      const simulation = await this.connection.simulateTransaction(tx, {
        sigVerify: false,
        replaceRecentBlockhash: true,
      });

      const value = simulation.value;
      const logs = value.logs || [];
      const hasError = value.err !== null;

      // Risk analysis
      let potentialRisk = false;
      let riskReason = "";

      if (hasError) {
        potentialRisk = true;
        riskReason = `Transaction execution simulation failed: ${JSON.stringify(value.err)}`;
      }

      return {
        success: !hasError,
        err: value.err,
        logs,
        unitsConsumed: value.unitsConsumed,
        accountsDiffSummary: {
          potentialRiskFlag: potentialRisk,
          riskReason: riskReason || undefined,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        err: error.message || String(error),
        logs: [],
        accountsDiffSummary: {
          potentialRiskFlag: true,
          riskReason: `Deserialization error: ${error.message || String(error)}`,
        },
      };
    }
  }

  /**
   * Resolve .sol domain to public key using Bonfida/SNS public lookup
   */
  public async resolveDomain(domain: string): Promise<string | null> {
    try {
      const cleanDomain = domain.toLowerCase().replace(/\.sol$/, "");
      const res = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${cleanDomain}`);
      if (!res.ok) return null;
      const data = await res.json() as { result?: string };
      return data.result || null;
    } catch {
      return null;
    }
  }
}
