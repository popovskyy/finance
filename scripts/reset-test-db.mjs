// Resets the e2e database. Refuses anything that is not a local *_test database,
// so a stray environment variable can never wipe real data.
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error("reset-test-db: DATABASE_URL is missing or invalid");
  process.exit(1);
}
const database = parsed.pathname.slice(1);
const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname);
if (!local || !database.endsWith("_test")) {
  console.error(`reset-test-db: refusing to reset "${database}" on ${parsed.hostname}; only local *_test databases`);
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "reset", "--force"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: url,
    DATABASE_URL_UNPOOLED: url,
    // Prisma blocks resets started by AI agents unless consent is given; given only here.
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "local e2e test database",
  },
});
process.exit(result.status ?? 1);
