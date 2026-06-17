import fs from "fs";
import path from "path";
import { saveCorpCodes } from "../../src/server/opendart/corp-code-store";

function parseArgs(): { file: string } {
  const args = process.argv.slice(2);
  let file = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      file = args[i + 1];
    }
  }
  return { file };
}

async function main() {
  const { file } = parseArgs();
  if (!file) {
    console.error("사용법: npm run opendart:import-corp-codes -- --file <path_to_json>");
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  if (!fs.existsSync(absolutePath)) {
    console.error(`[Error] 파일을 찾을 수 없습니다: ${absolutePath}`);
    process.exit(1);
  }

  try {
    const raw = fs.readFileSync(absolutePath, "utf8");
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      console.error("[Error] JSON 데이터는 배열 형태여야 합니다.");
      process.exit(1);
    }

    console.log(`[Import] ${data.length}개의 고유번호 데이터를 로드 중...`);
    await saveCorpCodes(data);
    console.log("[Import] 고유번호 마스터 데이터 적재 완료!");
  } catch (err) {
    console.error("[Error] 임포트 실패:", err);
    process.exit(1);
  }
}

main();
