import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const IGNORED_DIRS = [".next", "node_modules", "references"];

function readStdin() {
  const chunks = [];
  return new Promise((resolve, reject) => {
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

function isIgnored(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  return IGNORED_DIRS.some((dir) => normalized.startsWith(`${dir}/`));
}

async function main() {
  const input = await readStdin();
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const filePath = payload?.tool_input?.file_path;
  if (!filePath) process.exit(0);

  const cwd = payload.cwd || process.cwd();
  const relativePath = path.relative(cwd, filePath);
  if (relativePath.startsWith("..") || isIgnored(relativePath)) process.exit(0);

  const ext = path.extname(filePath).toLowerCase();
  const isReactComponent = ext === ".tsx" || ext === ".jsx";
  const isMarkdown = ext === ".md";

  if (!isReactComponent && !isMarkdown) process.exit(0);

  const require = createRequire(path.join(cwd, "package.json"));
  const prettierBin = require.resolve("prettier/bin/prettier.cjs");
  const eslintBin = path.join(require.resolve("eslint/package.json"), "..", "bin", "eslint.js");

  try {
    execFileSync(process.execPath, [prettierBin, "--write", filePath], {
      cwd,
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (err) {
    console.error(`Prettier failed on ${relativePath}:\n${err.stdout ?? ""}${err.stderr ?? ""}`);
    process.exit(2);
  }

  if (isReactComponent) {
    try {
      execFileSync(process.execPath, [eslintBin, filePath], {
        cwd,
        stdio: "pipe",
        encoding: "utf8",
      });
    } catch (err) {
      console.error(`ESLint found issues in ${relativePath}:\n${err.stdout ?? ""}${err.stderr ?? ""}`);
      process.exit(2);
    }
  }

  process.exit(0);
}

main();
