<div align="center">

# ⚡ Solana Agent MCP Server
### Production Model Context Protocol (MCP) Server for the Solana Blockchain

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/Anthropic_MCP-1.6-8A2BE2?style=for-the-badge)](https://modelcontextprotocol.io)
[![Solana](https://img.shields.io/badge/Solana-Web3.js-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com)
[![Jupiter](https://img.shields.io/badge/Jupiter-DEX_v6-FFA500?style=for-the-badge)](https://jup.ag)
[![License: MIT](https://img.shields.io/badge/License-MIT-00FFA3?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Enabling Claude Desktop, Cursor, Windsurf, and Autonomous AI Agents to inspect balances, query live DEX pricing, build Jupiter swap routes, estimate Jito MEV tips, and simulate transactions safely.</b>
</p>

</div>

---

## 🏗️ Architecture

```
  ┌────────────────────────────────────────────────────────┐
  │         AI Clients (Claude Desktop / Cursor / Agents)  │
  └───────────────────────────┬────────────────────────────┘
                              │ Stdio Transport (JSON-RPC)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 solana-agent-mcp Server                │
  │                                                        │
  │   [Wallet & SPL Inspector]      [Jupiter v6 Routing]   │
  │   [Pre-flight Simulation]       [Jito MEV Tip Engine]  │
  └─────────────┬───────────────────────────┬──────────────┘
                │                           │
                ▼                           ▼
   Solana Mainnet RPC Cluster       Jupiter & Jito APIs
  (Balances, Accounts, Simulation) (DEX Swaps & Bundle Tips)
```

---

## ✨ Features

- **💼 Multi-Token Balances**: Inspect native SOL and all SPL token accounts (with automated mint symbol recognition: SOL, USDC, USDT, JUP, BONK, JitoSOL).
- **💱 Real-Time DEX Routing & Pricing**: Get optimal quotes across all Solana AMMs and CLMMs via Jupiter's liquidity aggregator.
- **🛡️ Pre-Flight Transaction Simulation**: Dry-run versioned transactions on-chain before signing to detect reverts, execution errors, and prevent malicious wallet drainers.
- **⚡ Jito MEV Priority Engine**: Query live MEV bundle tip floors (25th, 50th, 75th, 95th, 99th percentiles) for landing critical transactions during network congestion.
- **🌐 Solana Name Service (.sol)**: Automatic resolution of human-readable domains (`toly.sol`, `bonk.sol`) into base58 public keys.
- **🔐 Zero Private Key Exposure**: The server only operates in read, quote, and unsigned build modes. The AI never possesses or signs with user private keys.

---

## 🛠️ Installation & Setup

### Option 1: Claude Desktop

Add this to your `claude_desktop_config.json`:

* **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "solana": {
      "command": "node",
      "args": ["<PATH_TO_REPO>/solana-agent-mcp/build/index.js"],
      "env": {
        "SOLANA_RPC_URL": "https://api.mainnet-beta.solana.com"
      }
    }
  }
}
```

### Option 2: Cursor (.cursor/mcp.json)

```json
{
  "mcpServers": {
    "solana": {
      "command": "node",
      "args": ["<PATH_TO_REPO>/solana-agent-mcp/build/index.js"]
    }
  }
}
```

---

## 🧰 Available Tools

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `solana_get_balance` | `addressOrDomain` | Fetch SOL & SPL token holdings for an address or `.sol` domain. |
| `solana_get_token_price` | `tokens: string[]` | Retrieve live executable USD price for SOL, USDC, JUP, BONK, etc. |
| `solana_get_swap_quote` | `inputToken`, `outputToken`, `amount`, `slippageBps` | Query the best route & exact output amount from Jupiter v6. |
| `solana_build_swap_transaction` | `quoteResponse`, `userPublicKey` | Generate an unsigned VersionedTransaction ready for user wallet signing. |
| `solana_simulate_transaction` | `transactionBase64` | Dry-run simulation of any transaction to inspect balance diffs and errors. |
| `solana_get_jito_tip_floor` | *none* | Fetch live Jito bundle tip percentiles for transaction priority. |
| `solana_resolve_sns` | `domain` | Resolve a `.sol` domain into a Solana public key. |

---

## 💬 Example AI Prompts

Once configured in Claude or Cursor, you can ask natural language questions:

- *"Check the current SOL and token balance for `toly.sol`."*
- *"What is the current market price of SOL, JUP, and BONK?"*
- *"Get a Jupiter swap quote to trade 2.5 SOL into USDC with 0.5% max slippage."*
- *"What is the current 75th percentile Jito tip fee right now to get a transaction confirmed fast?"*
- *"Simulate this serialized transaction base64 string and tell me if it will fail or drain my account."*

---

## 🧪 Development & Testing

```bash
# Clone the repository
git clone https://github.com/bonnhatnguyen/solana-agent-mcp.git
cd solana-agent-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run unit & live integration tests
npm test
```

---

## 🔒 Security Invariant

1. **Non-Custodial Design**: This MCP server **NEVER** stores, requests, or handles private keys.
2. **Deterministic Unsigned Payloads**: All transactions produced are unsigned and require human/hardware wallet approval through external signers.
3. **Safety Simulation**: All transactions can be inspected using `solana_simulate_transaction` to verify token balance deltas before broadcast.

---

## 👨‍💻 Author

**bonnhatnguyen (Bonn N.)**  
- GitHub: [@bonnhatnguyen](https://github.com/bonnhatnguyen)  
- Focus: High-Performance Systems, Solana DeFi & Autonomous Agent Engineering
- License: [MIT](LICENSE)
