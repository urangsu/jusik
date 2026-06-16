import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targets = ["src/app", "src/components"];
const forbidden = [
  "expectedAlphaAnnualized",
  "expected alpha",
  "예상 초과수익률",
  "예상 수익률",
  "기대수익률",
];
const ignoredFilePattern = /(\.test\.|\.spec\.)/;

async function collectFiles(target) {
  const absolute = path.join(root, target);
  const entries = await readdir(absolute, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const relative = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(relative));
    } else if (!ignoredFilePattern.test(relative)) {
      files.push(path.join(root, relative));
    }
  }
  return files;
}

const matches = [];
for (const target of targets) {
  const files = await collectFiles(target);
  for (const file of files) {
    const text = await readFile(file, "utf8").catch(() => "");
    const lines = text.split("\n");
    for (const [index, line] of lines.entries()) {
      const term = forbidden.find((word) => line.toLowerCase().includes(word.toLowerCase()));
      if (term) {
        matches.push({ file: path.relative(root, file), line: index + 1, term });
      }
    }
  }
}

if (matches.length > 0) {
  for (const match of matches) {
    console.error(`[alpha-ui:fail] ${match.file}:${match.line} exposes "${match.term}"`);
  }
  process.exit(1);
}

console.log("Expected alpha UI exposure check passed.");
