import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { fetchCnnFearGreed } from "../../src/server/sentiment/cnn-fear-greed-reference-client";
import { fetchCryptoFearGreed } from "../../src/server/sentiment/alternative-me-crypto-fng-client";
import { sentimentReferenceStore } from "../../src/server/sentiment/sentiment-reference-store";

async function main() {
  console.log("[Refresh Sentiment Script] Starting refresh of sentiment references...");
  try {
    const cnn = await fetchCnnFearGreed();
    const crypto = await fetchCryptoFearGreed();

    await sentimentReferenceStore.saveSnapshot(cnn);
    await sentimentReferenceStore.saveSnapshot(crypto);

    console.log(`[Refresh Sentiment Script] Success.`);
    console.log(` - CNN F&G: ${cnn.value} (${cnn.label})`);
    console.log(` - Crypto F&G: ${crypto.value} (${crypto.label})`);
    process.exit(0);
  } catch (err) {
    console.error("[Refresh Sentiment Script] Failed:", err);
    process.exit(1);
  }
}

main();
