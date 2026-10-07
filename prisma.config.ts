import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// A DATABASE_URL passed in the environment (tests, CI, Vercel) always wins:
// files must never swap in a different database behind its back.
const explicitUrl = process.env.DATABASE_URL;
const explicitDirectUrl = process.env.DATABASE_URL_UNPOOLED;

// Same precedence as Next.js: .env.local (Neon, from `vercel env pull`) over .env.
config({ path: [".env.local", ".env"], quiet: true });

// Migrations need a direct connection; Neon exposes it as DATABASE_URL_UNPOOLED.
const url = explicitUrl
  ? (explicitDirectUrl ?? explicitUrl)
  : process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { url },
});
