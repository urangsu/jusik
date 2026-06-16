import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const forbidden = [
  "종합 추천",
  "매수 추천",
  "강력 매수",
  "매도 추천",
  "목표가",
  "예상 수익률",
  "수익 보장",
  "확정 진입",
  "진입 신호",
];

const failDirs = ["src/app", "src/components"];
const warnDirs = ["docs", "README.md", "AGENTS.md"];
const ignoredFilePattern = /(\.test\.|\.spec\.)/;

async function collectFiles(target) {
  const absolute = path.join(root, target);
  const entries = await readdir(absolute, { withFileTypes: true }).catch(async () => {
    if (target.endsWith(".md")) return [{ name: path.basename(target), isDirectory: () => false }];
    return [];
  });

  if (target.endsWith(".md")) return [absolute];

  const files = [];
  for (const entry of entries) {
    const relative = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(relative));
    } else {
      files.push(path.join(root, relative));
    }
  }
  return files;
}

async function scan(targets, mode) {
  const matches = [];
  for (const target of targets) {
    const files = await collectFiles(target);
    for (const file of files) {
      if (mode === "fail" && ignoredFilePattern.test(file)) continue;
      const text = await readFile(file, "utf8").catch(() => "");
      const lines = text.split("\n");
      for (const [index, line] of lines.entries()) {
        const term = forbidden.find((word) => line.includes(word));
        if (term) {
          matches.push({ file: path.relative(root, file), line: index + 1, term });
        }
      }
    }
  }
  return matches;
}

const failures = await scan(failDirs, "fail");
const warnings = await scan(warnDirs, "warn");

for (const warning of warnings) {
  console.warn(`[wording:warn] ${warning.file}:${warning.line} contains policy term "${warning.term}"`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[wording:fail] ${failure.file}:${failure.line} contains forbidden UI term "${failure.term}"`);
  }
  process.exit(1);
}

console.log("Forbidden UI wording check passed.");
