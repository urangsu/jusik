import { execSync } from "child_process";

const pathsToCheck = [
  "data/research",
  "data/market",
  "data/outcome-journals",
  "data/evidence",
];

let failed = false;

for (const dirPath of pathsToCheck) {
  try {
    const gitFiles = execSync(`git ls-files ${dirPath}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();

    if (gitFiles) {
      const trackedFiles = gitFiles
        .split("\n")
        .filter((file) => !file.endsWith(".gitkeep"));

      if (trackedFiles.length > 0) {
        console.error(`Error: Tracked runtime data files found in ${dirPath}:`, trackedFiles);
        failed = true;
      }
    }
  } catch (err) {
    // ignore git errors if directory is untracked/empty
  }
}

if (failed) {
  console.error("FAIL: Checked directories must only contain untracked files (except .gitkeep).");
  process.exit(1);
} else {
  console.log("PASS: Runtime data isolation check succeeded.");
}
