import { syncRecentDisclosures } from "../../src/server/filings/disclosure-sync-service";

function parseArgs() {
  const args = process.argv.slice(2);
  let stockCode = "";
  let beginDate = "";
  let endDate = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--stockCode" && args[i + 1]) {
      stockCode = args[i + 1];
    }
    if (args[i] === "--beginDate" && args[i + 1]) {
      beginDate = args[i + 1];
    }
    if (args[i] === "--endDate" && args[i + 1]) {
      endDate = args[i + 1];
    }
  }

  return { stockCode, beginDate, endDate };
}

async function main() {
  const { stockCode, beginDate, endDate } = parseArgs();

  console.log("=".repeat(80));
  console.log(`[OpenDART Sync CLI] 공시 동기화 실행`);
  console.log(`  StockCode: ${stockCode || "전체"}`);
  console.log(`  기간:      ${beginDate || "지정안함"} ~ ${endDate || "지정안함"}`);
  console.log("=".repeat(80));

  try {
    const envelope = await syncRecentDisclosures({
      stockCode: stockCode || undefined,
      beginDate,
      endDate,
    });

    if (envelope.status !== "eod") {
      console.error(`[Error] 공시 동기화 실패: status=${envelope.status}, message=${envelope.message || "알수없음"}`);
      process.exit(1);
    }

    const result = envelope.value;
    console.log(`\n동기화 완료:`);
    console.log(`  Fetched: ${result?.fetched || 0}건`);
    console.log(`  Saved:   ${result?.saved || 0}건 (신규 저장)`);
    console.log(`  Skipped: ${result?.skipped || 0}건 (중복 스킵)`);
    console.log("=".repeat(80));
  } catch (err) {
    console.error("[Error] 동기화 중 오류 발생:", err);
    process.exit(1);
  }
}

main();
