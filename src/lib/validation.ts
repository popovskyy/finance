import { z } from "zod";

export const categorySchema = z.enum(["CRYPTO", "STOCK", "CASH"]);
export const txTypeSchema = z.enum(["BUY", "SELL", "DEPOSIT", "WITHDRAWAL"]);
export const rangeSchema = z.enum(["1M", "3M", "1Y", "ALL"]);

const amount = z.coerce.number().finite();

export const transactionInputSchema = z.object({
  type: txTypeSchema,
  date: z.coerce.date().refine((d) => d.getTime() <= Date.now() + 86_400_000, "Дата не може бути в майбутньому"),
  quantity: amount.positive(),
  price: amount.nonnegative(),
  fee: amount.nonnegative().default(0),
  note: z.string().trim().max(500).optional(),
});

export const createTransactionSchema = transactionInputSchema.extend({ assetId: z.string().min(1) });

export const createAssetSchema = z.object({
  category: categorySchema,
  providerId: z.string().trim().min(1).max(100),
  symbol: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(200),
  transaction: transactionInputSchema.optional(),
});

export const settingsSchema = z.object({
  baseCurrency: z.string().regex(/^[A-Z]{3}$/).optional(),
});

export const chatSchema = z.object({ message: z.string().trim().min(1).max(4000) });
