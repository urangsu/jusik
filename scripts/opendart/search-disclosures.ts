import { getCorpCodeByStockCode } from "../../src/server/opendart/corp-code-store";
import { searchOpenDartDisclosures } from "../../src/server/opendart/disclosure-search-client";

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
  console.log(`[OpenDART Search CLI] 공시검색 실행`);
  console.log(`  StockCode: ${stockCode || "전체"}`);
  console.log(`  기간:      ${beginDate || "지정안함"} ~ ${endDate || "지정안함"}`);
  console.log("=".repeat(80));

  try {
    let corpCode: string | undefined = undefined;

    if (stockCode) {
      const record = await getCorpCodeByStockCode(stockCode);
      if (record) {
        corpCode = record.corpCode;
        console.log(`  Resolved corpCode: ${corpCode} (${record.corpName})`);
      } else {
        console.error(`[Error] StockCode [${stockCode}]에 매핑된 고유번호가 없습니다. 고유번호 데이터를 먼저 임포트해 주세요.`);
        process.exit(1);
      }
    }

    const envelope = await searchOpenDartDisclosures({
      corpCode,
      beginDate,
      endDate,
      pageCount: 50,
    });

    if (envelope.status !== "eod" && envelope.status !== "not_found") {
      console.error(`[Error] 공시검색 실패: status=${envelope.status}, message=${envelope.message || "알수없음"}`);
      process.exit(1);
    }

    const result = envelope.value;
    if (!result || result.list.length === 0) {
      console.log("조회된 공시 데이터가 없습니다.");
      console.log("=".repeat(80));
      return;
    }

    console.log(`\n조회결과 (총 ${result.totalCount}건, 현재페이지 ${result.pageNo}/${result.totalPage}):`);
    console.log("-".repeat(80));
    console.log("접수일자 | 회사명   | 보고서명 (접수번호)");
    console.log("-".repeat(80));
    for (const item of result.list) {
      console.log(`${item.rcept_dt} | ${item.corp_name.padEnd(8)} | ${item.report_nm} (${item.rcept_no})`);
    }
    console.log("=".repeat(80));
  } catch (err) {
    console.error("[Error] 검색 수행 오류:", err);
    process.exit(1);
  }
}

main();
