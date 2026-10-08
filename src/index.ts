#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SolanaService } from "./services/solana.js";
import { JupiterService } from "./services/jupiter.js";
import { JitoService } from "./services/jito.js";
import { WELL_KNOWN_TOKENS } from "./types.js";

const server = new Server(
  {
    name: "solana-agent-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const solana = new SolanaService();
const jupiter = new JupiterService();
const jito = new JitoService();

// Define Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "solana_get_balance",
        description:
          "Fetch SOL and SPL token balances for a given Solana wallet address or .sol domain name.",
        inputSchema: {
          type: "object",
          properties: {
            addressOrDomain: {
              type: "string",
              description: "Solana public key (base58) or .sol domain (e.g., toly.sol)",
            },
          },
          required: ["addressOrDomain"],
        },
      },
      {
        name: "solana_get_token_price",
        description:
          "Get current USD price and market data for Solana tokens (e.g., SOL, USDC, JUP, BONK, JITOSOL) or any mint address.",
        inputSchema: {
          type: "object",
          properties: {
            tokens: {
              type: "array",
              items: { type: "string" },
              description: "List of symbols (SOL, USDC) or token mint addresses",
            },
          },
          required: ["tokens"],
        },
      },
      {
        name: "solana_get_swap_quote",
        description:
          "Fetch the best swap route, price impact, and expected output amount across Solana DEXes via Jupiter v6 Aggregator.",
        inputSchema: {
          type: "object",
          properties: {
            inputToken: {
              type: "string",
              description: "Input token symbol (e.g. 'SOL') or mint address",
            },
            outputToken: {
              type: "string",
              description: "Output token symbol (e.g. 'USDC') or mint address",
            },
            amount: {
              type: "string",
              description: "Amount in atomic units / lamports (e.g. 1000000000 for 1 SOL, 1000000 for 1 USDC)",
            },
            slippageBps: {
              type: "number",
              description: "Max slippage in basis points (50 = 0.5%, 100 = 1%)",
              default: 50,
            },
          },
          required: ["inputToken", "outputToken", "amount"],
        },
      },
      {
        name: "solana_build_swap_transaction",
        description:
          "Build an unsigned versioned swap transaction from a Jupiter quote, ready for safe signer review and signing.",
        inputSchema: {
          type: "object",
          properties: {
            quoteResponse: {
              type: "object",
              description: "Full quote object obtained from solana_get_swap_quote",
            },
            userPublicKey: {
              type: "string",
              description: "Public key of the user wallet executing the swap",
            },
            prioritizationFeeLamports: {
              type: "number",
              description: "Optional priority fee in lamports (or auto)",
            },
          },
          required: ["quoteResponse", "userPublicKey"],
        },
      },
      {
        name: "solana_simulate_transaction",
        description:
          "Simulate an unsigned or signed transaction before broadcasting. Validates program execution, logs, and protects against malicious drainers.",
        inputSchema: {
          type: "object",
          properties: {
            transactionBase64: {
              type: "string",
              description: "Serialized VersionedTransaction encoded in Base64",
            },
          },
          required: ["transactionBase64"],
        },
      },
      {
        name: "solana_get_jito_tip_floor",
        description:
          "Fetch live Jito MEV bundle tip floor percentiles to optimize high-priority transaction landing on Solana.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "solana_resolve_sns",
        description:
          "Resolve a Solana Name Service (.sol) domain name into a Solana public key address.",
        inputSchema: {
          type: "object",
          properties: {
            domain: {
              type: "string",
              description: "The .sol domain to resolve (e.g., 'bonk.sol')",
            },
          },
          required: ["domain"],
        },
      },
    ],
  };
});

// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "solana_get_balance": {
        let address = String(args?.addressOrDomain || "").trim();
        if (address.endsWith(".sol")) {
          const resolved = await solana.resolveDomain(address);
          if (!resolved) {
            return {
              isError: true,
              content: [{ type: "text", text: `Could not resolve domain '${address}' to a valid address.` }],
            };
          }
          address = resolved;
        }

        if (!solana.isValidAddress(address)) {
          return {
            isError: true,
            content: [{ type: "text", text: `Invalid Solana address: '${address}'` }],
          };
        }

        const balances = await solana.getWalletBalances(address);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(balances, null, 2),
            },
          ],
        };
      }

      case "solana_get_token_price": {
        const tokens = (args?.tokens as string[]) || ["SOL", "USDC"];
        const prices = await jupiter.getTokenPrice(tokens);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(prices, null, 2),
            },
          ],
        };
      }

      case "solana_get_swap_quote": {
        const inputToken = String(args?.inputToken);
        const outputToken = String(args?.outputToken);
        const amount = String(args?.amount);
        const slippageBps = args?.slippageBps ? Number(args.slippageBps) : 50;

        const quote = await jupiter.getQuote({
          inputMint: inputToken,
          outputMint: outputToken,
          amount,
          slippageBps,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(quote, null, 2),
            },
          ],
        };
      }

      case "solana_build_swap_transaction": {
        const quoteResponse = args?.quoteResponse as any;
        const userPublicKey = String(args?.userPublicKey);
        const prioritizationFeeLamports = args?.prioritizationFeeLamports
          ? Number(args.prioritizationFeeLamports)
          : undefined;

        const swapTx = await jupiter.buildSwapTransaction({
          quoteResponse,
          userPublicKey,
          prioritizationFeeLamports,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(swapTx, null, 2),
            },
          ],
        };
      }

      case "solana_simulate_transaction": {
        const rawBase64 = String(args?.transactionBase64);
        const sim = await solana.simulateRawTransaction(rawBase64);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(sim, null, 2),
            },
          ],
        };
      }

      case "solana_get_jito_tip_floor": {
        const tipFloor = await jito.getTipFloor();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tipFloor || { message: "Tip floor currently unavailable" }, null, 2),
            },
          ],
        };
      }

      case "solana_resolve_sns": {
        const domain = String(args?.domain);
        const resolved = await solana.resolveDomain(domain);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ domain, address: resolved, resolved: !!resolved }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
        };
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Tool execution error: ${error.message || String(error)}`,
        },
      ],
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Solana Agent MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
