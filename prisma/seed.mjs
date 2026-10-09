import "dotenv/config";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("node", ["prisma/create-admin.mjs"]);
run("npx", ["tsx", "prisma/seed-demo.ts"]);
