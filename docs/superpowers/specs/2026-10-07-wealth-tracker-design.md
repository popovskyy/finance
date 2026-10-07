# Personal Wealth Tracker (Crypto, Stocks, Cash) — v1 design and plan

## Context

One personal dashboard that aggregates crypto, stocks and cash into a single net-worth view, so there is no need to check several apps and exchanges daily. The project folder and the GitHub repo (`git@github.com:popovskyy/finance.git`) are both empty; this is a greenfield build.

Decisions made with the user:

- **v1 scope:** portfolio core + transaction/PnL engine + AI analyst, with **manual entry** of holdings. Exchange API sync is a separate later spec; v1 only ships the `ApiKey` table and the adapter interface it will plug into.
- **Hosting:** local only. SQLite, no login.
- **AI provider:** Google Gemini (the user supplied a `GEMINI_API_KEY`), behind a provider interface so Claude/OpenAI can be swapped in.

Assumptions (not explicitly confirmed): single user; base currency is a setting, default USD; average-cost method for cost basis.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · Lucide · Recharts · Prisma + SQLite · TanStack Query · Zod (input validation) · decimal.js (money maths) · Vitest (engine tests) · `yahoo-finance2` · `@google/genai`.

## Folder structure

```
prisma/schema.prisma, prisma/seed.ts
src/app/
  layout.tsx, providers.tsx          # QueryClientProvider, theme
  page.tsx                           # dashboard
  assets/[id]/page.tsx               # asset detail + its transactions
  transactions/page.tsx              # full ledger
  settings/page.tsx                  # base currency, API keys
  api/
    assets/route.ts, assets/[id]/route.ts
    transactions/route.ts, transactions/[id]/route.ts
    portfolio/route.ts               # summary: net worth, holdings, PnL
    portfolio/history/route.ts       # net-worth time series
    search/route.ts                  # symbol lookup across providers
    settings/route.ts
    ai/insights/route.ts             # structured report
    ai/chat/route.ts                 # streaming chat
src/lib/
  db.ts                              # Prisma singleton
  prices/types.ts                    # PriceProvider interface
  prices/coingecko.ts, yahoo.ts, fx.ts, index.ts, cache.ts
  pnl/positions.ts                   # replay transactions -> position
  pnl/performance.ts                 # 1D / 1M / All-Time
  pnl/portfolio.ts                   # aggregate + convert to base currency
  ai/types.ts, gemini.ts, context.ts, prompts.ts
  exchanges/types.ts                 # ExchangeAdapter interface only (v2)
  crypto.ts                          # AES-256-GCM for stored API keys
  validation.ts, format.ts
src/components/
  layout/ (Sidebar, Header)
  dashboard/ (NetWorthCard, TimeframeToggle, NetWorthChart, AllocationDonut, HoldingsTable, PnlBadge)
  assets/ (AddAssetDialog, AssetSearch)
  transactions/ (TransactionForm, TransactionTable)
  ai/ (InsightsCard, ChatWidget)
  ui/ (Button, Dialog, Input, Select, Card, Skeleton)
src/hooks/ (usePortfolio, useAssets, useTransactions, useInsights, useChat)
```

## Database schema (Prisma)

- **Asset** — `id`, `category` (CRYPTO | STOCK | CASH), `symbol`, `name`, `providerId` (CoinGecko id / Yahoo ticker / ISO currency code), `currency` (the currency its price is quoted in), `createdAt`. Unique on (`category`, `providerId`).
- **Transaction** — `id`, `assetId`, `type` (BUY | SELL | DEPOSIT | WITHDRAWAL), `date`, `quantity`, `price` (per unit, in the asset's quote currency), `fee`, `note`, `createdAt`. Index on (`assetId`, `date`).
- **ApiKey** — `id`, `provider`, `label`, `encryptedKey`, `encryptedSecret?`, `iv`, `authTag`, `createdAt`. Encrypted with a key from `APP_ENCRYPTION_KEY`. Unused by v1 features beyond the settings CRUD.
- **PriceSnapshot** — `providerId`, `category`, `date`, `price`, `currency`. Cache of daily closes; unique on (`category`, `providerId`, `date`).
- **Setting** — key/value (`baseCurrency`).
- **ChatMessage** — `id`, `role`, `content`, `createdAt` (chat history survives reloads).

Holdings are **not stored**; they are always derived by replaying transactions, so the ledger is the single source of truth.

## Price service layer

`PriceProvider` interface: `search(query)`, `getQuotes(ids)` → price + previous close, `getHistory(id, from, to)` → daily closes.

- **Crypto:** CoinGecko public API (optional `COINGECKO_API_KEY`).
- **Stocks:** Yahoo Finance via `yahoo-finance2` (no key).
- **Cash/FX:** Yahoo currency pairs (e.g. `USDUAH=X`). Chosen over Frankfurter because it covers UAH and gives history from the same source.
- `cache.ts`: in-memory TTL (60 s for quotes) plus `PriceSnapshot` for history, to stay inside free rate limits. If a provider fails, the last known price is returned and flagged `stale` so the UI can show it.

## PnL engine (pure functions, test-driven)

- **Position (average cost):** BUY/DEPOSIT add quantity; buy fees are added to cost basis. SELL/WITHDRAWAL reduce quantity at the current average cost; realized PnL = proceeds − fees − (avg cost × qty sold). Selling more than held is rejected at validation.
- **Cash:** DEPOSIT/WITHDRAWAL at price 1 in its own currency; its PnL in base currency is purely the FX move.
- **Unrealized** = qty × current price − remaining cost basis. **All-Time** = realized + unrealized.
- **1D / 1M:** value now − value at period start − net flows during the period (buys in, sells out), so new deposits do not show up as profit. Percentage is relative to start value + inflows. Period-start values use previous close (1D) and the 30-day-old close (1M).
- All sums in decimal.js; converted to base currency at the end with the matching FX rate.

Written test-first with Vitest: buys at several prices, partial and full sells, fees, cash FX, period flows, empty portfolio.

## AI analyst (Gemini)

- `AiProvider` interface (`generateInsights`, `streamChat`); `gemini.ts` implements it with `@google/genai`. Model name comes from `GEMINI_MODEL`; the default is checked against the current model list at implementation time.
- `context.ts` builds a compact JSON snapshot: allocation by category and by asset, top positions, 1D/1M/All-Time PnL, recent transactions.
- **Insights** use structured JSON output validated with Zod: performance summary, risk assessment, concentration warnings (also computed deterministically, e.g. any single asset > 25%, so warnings do not depend on the model). Cached until the user refreshes.
- **Chat widget:** streaming responses, portfolio snapshot injected as system context, history persisted.
- The key lives only in `.env.local` and is read server-side; it never reaches the browser. Note: AI features send portfolio figures to Google.

## Dashboard UI

Kubera-style: quiet, dense, table-first. Left sidebar (Dashboard, Transactions, Settings). Dashboard, top to bottom:

1. Net worth in base currency, with PnL (absolute + %) and a 1D / 1M / All toggle; green for gains, red for losses.
2. Net-worth line chart (Recharts) beside an allocation donut by category.
3. Holdings table grouped Crypto / Stocks / Cash: quantity, price, value, avg buy price, unrealized PnL, PnL for the selected timeframe, % of portfolio. Row click opens asset detail.
4. AI insights card; floating chat button opens the chat panel.

"Add asset" dialog searches the right provider per category, then records the first transaction. Loading skeletons, empty state for a new portfolio, stale-price indicator. Light and dark themes, responsive down to phone width.

## Implementation order

1. `git init`, scaffold Next.js + Tailwind, add dependencies, `.gitignore` covering `.env*` and the SQLite file, `.env.example`; put the Gemini key in `.env.local`. Save this design to `docs/superpowers/specs/2026-10-07-wealth-tracker-design.md`.
2. Prisma schema, migration, seed script with a small sample portfolio.
3. PnL engine, test-first.
4. Price adapters + cache.
5. API routes with Zod validation.
6. UI shell, dashboard, asset and transaction flows.
7. AI provider, insights route, chat route, UI widgets.
8. README (setup, env vars, architecture), commit, push to `origin main`.

## Verification

- `npm test` — PnL engine suite passes.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — clean.
- `npm run dev` with the seeded portfolio, driven in a browser: add one asset of each category, log a buy and a partial sell, and check net worth, average price and realized/unrealized PnL against hand-calculated numbers; switch 1D / 1M / All.
- Live calls: each price adapter returns a real quote; the insights route returns valid structured output; chat streams a reply that references the actual holdings (this also confirms the supplied Gemini key works).

## Out of scope for v1

Exchange/wallet API sync, authentication, hosting, multi-user, CSV import, tax lots (FIFO/LIFO), dividends and staking income.

## Amendments (2026-10-07, during implementation)

- UI is Ukrainian only; single user, no accounts.
- Exchange sync dropped entirely at the user's request: no `ApiKey` table, no adapter interface.
- Database switched to PostgreSQL (local Docker, Neon on Vercel) because the app is deployed to Vercel.
- One shared password (`APP_PASSWORD`) gates the deployed app; failed attempts are rate-limited.
- Added: PWA (manifest, service worker, iOS icons), a 1W timeframe, Playwright e2e suite.
