// Fills an empty database with a small sample portfolio: npm run db:seed
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

async function main() {
  if ((await db.asset.count()) > 0) {
    console.log("Database already has assets; seed skipped.");
    return;
  }

  const samples = [
    {
      asset: { category: "CRYPTO", providerId: "bitcoin", symbol: "BTC", name: "Bitcoin", currency: "USD" },
      txs: [
        { type: "BUY", date: daysAgo(120), quantity: 0.05, price: 78000, fee: 6 },
        { type: "BUY", date: daysAgo(45), quantity: 0.03, price: 88000, fee: 4 },
        { type: "SELL", date: daysAgo(10), quantity: 0.02, price: 86000, fee: 3 },
      ],
    },
    {
      asset: { category: "CRYPTO", providerId: "ethereum", symbol: "ETH", name: "Ethereum", currency: "USD" },
      txs: [{ type: "BUY", date: daysAgo(90), quantity: 0.8, price: 2400, fee: 3 }],
    },
    {
      asset: { category: "STOCK", providerId: "AAPL", symbol: "AAPL", name: "Apple Inc.", currency: "USD" },
      txs: [{ type: "BUY", date: daysAgo(150), quantity: 6, price: 290, fee: 1 }],
    },
    {
      asset: { category: "STOCK", providerId: "VOO", symbol: "VOO", name: "Vanguard S&P 500 ETF", currency: "USD" },
      txs: [
        { type: "BUY", date: daysAgo(200), quantity: 3, price: 560, fee: 1 },
        { type: "BUY", date: daysAgo(20), quantity: 1, price: 610, fee: 1 },
      ],
    },
    {
      asset: { category: "CASH", providerId: "USD", symbol: "USD", name: "Долар США", currency: "USD" },
      txs: [{ type: "DEPOSIT", date: daysAgo(210), quantity: 2500, price: 1, fee: 0 }],
    },
    {
      asset: { category: "CASH", providerId: "UAH", symbol: "UAH", name: "Українська гривня", currency: "UAH" },
      txs: [
        { type: "DEPOSIT", date: daysAgo(100), quantity: 80000, price: 1, fee: 0 },
        { type: "WITHDRAWAL", date: daysAgo(15), quantity: 15000, price: 1, fee: 0 },
      ],
    },
  ] as const;

  for (const { asset, txs } of samples) {
    await db.asset.create({ data: { ...asset, transactions: { create: txs.map((tx) => ({ ...tx })) } } });
  }
  console.log(`Seeded ${samples.length} assets.`);
}

main().finally(() => db.$disconnect());
