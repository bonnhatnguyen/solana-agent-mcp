import { SolanaService } from "./services/solana.js";
import { JupiterService } from "./services/jupiter.js";
import { JitoService } from "./services/jito.js";
import test from "node:test";
import assert from "node:assert";

test("JupiterService: Price API lookup", async () => {
  const jupiter = new JupiterService();
  const prices = await jupiter.getTokenPrice(["SOL", "USDC"]);
  assert.ok(prices, "Prices object should exist");
  assert.ok(Object.keys(prices).length > 0, "Should return at least 1 token price");
  console.log("✅ Verified Jupiter Price API:", Object.keys(prices));
});

test("JupiterService: Swap Quote for 0.01 SOL to USDC", async () => {
  const jupiter = new JupiterService();
  // 10,000,000 lamports = 0.01 SOL
  const quote = await jupiter.getQuote({
    inputMint: "SOL",
    outputMint: "USDC",
    amount: "10000000",
  });
  assert.ok(quote.outAmount, "OutAmount must be present");
  assert.ok(Number(quote.outAmount) > 0, "Expected output USDC amount > 0");
  console.log(`✅ Verified Jupiter Quote: 0.01 SOL -> ${(Number(quote.outAmount) / 1e6).toFixed(2)} USDC`);
});

test("SolanaService: Address validation", () => {
  const solana = new SolanaService();
  assert.strictEqual(solana.isValidAddress("So11111111111111111111111111111111111111112"), true);
  assert.strictEqual(solana.isValidAddress("invalid_address_123"), false);
  console.log("✅ Verified Solana Address Validator");
});

test("JitoService: Tip floor check", async () => {
  const jito = new JitoService();
  const floor = await jito.getTipFloor();
  if (floor) {
    assert.ok(typeof floor.landed_tips_50th_percentile === "number");
    console.log(`✅ Verified Jito Tip Floor (50th %ile): ${floor.landed_tips_50th_percentile} lamports`);
  } else {
    console.log("ℹ️ Jito tip floor API currently rate-limited or idle");
  }
});
