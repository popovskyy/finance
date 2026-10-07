import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Same precedence as Next.js: .env.local (Neon, from `vercel env pull`) over .env.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct connection; Neon exposes it as DATABASE_URL_UNPOOLED.
    url: process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"],
  },
});
