import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

if (!process.env.WRANGLER_LOG_PATH) {
  process.env.WRANGLER_LOG_PATH = resolve(process.cwd(), ".wrangler", "logs");
}

mkdirSync(process.env.WRANGLER_LOG_PATH, { recursive: true });

const command = ["pnpm", "exec", "wrangler", ...process.argv.slice(2)].join(" ");

const child = spawn(command, {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("error", (error) => {
  console.error("Failed to start Wrangler:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
