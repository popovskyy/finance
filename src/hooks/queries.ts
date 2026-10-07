"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StoredInsights } from "@/lib/ai/types";
import { api } from "@/lib/api";
import type { HistoryPoint, PortfolioSummary } from "@/lib/pnl/portfolio";
import type { TxType } from "@/lib/pnl/types";
import type { Category, SearchResult } from "@/lib/prices/types";

export interface AssetDto {
  id: string;
  category: Category;
  symbol: string;
  name: string;
  providerId: string;
  currency: string;
}

export interface TransactionDto {
  id: string;
  assetId: string;
  type: TxType;
  date: string;
  quantity: string;
  price: string;
  fee: string;
  note: string | null;
}

export interface TransactionWithAsset extends TransactionDto {
  asset: Pick<AssetDto, "id" | "symbol" | "name" | "category" | "currency">;
}

export interface TransactionInput {
  type: TxType;
  date: string;
  quantity: number;
  price: number;
  fee: number;
  note?: string;
}

export type HistoryRange = "1M" | "3M" | "1Y" | "ALL";

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => api<PortfolioSummary>("/api/portfolio"),
    refetchInterval: 60_000,
  });
}

export function usePortfolioHistory(range: HistoryRange) {
  return useQuery({
    queryKey: ["portfolio", "history", range],
    queryFn: () => api<HistoryPoint[]>(`/api/portfolio/history?range=${range}`),
    placeholderData: (previous) => previous,
    staleTime: 5 * 60_000,
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ["asset", id],
    queryFn: () => api<AssetDto & { transactions: TransactionDto[] }>(`/api/assets/${id}`),
    retry: false,
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: () => api<TransactionWithAsset[]>("/api/transactions"),
  });
}

export function useAssetSearch(category: Category, query: string) {
  return useQuery({
    queryKey: ["search", category, query],
    queryFn: () => api<SearchResult[]>(`/api/search?category=${category}&q=${encodeURIComponent(query)}`),
    enabled: category === "CASH" || query.trim().length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useQuote(category: Category, providerId: string | undefined) {
  return useQuery({
    queryKey: ["quote", category, providerId],
    queryFn: () =>
      api<{ price: number; currency: string } | null>(
        `/api/quote?category=${category}&id=${encodeURIComponent(providerId ?? "")}`,
      ),
    enabled: Boolean(providerId),
    staleTime: 60_000,
    retry: false,
  });
}

/** Everything derived from the ledger is refetched after any change to it. */
function useInvalidateLedger() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      ["portfolio", "transactions", "asset"].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
}

export function useCreateAsset() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (input: {
      category: Category;
      providerId: string;
      symbol: string;
      name: string;
      transaction?: TransactionInput;
    }) => api<{ id: string }>("/api/assets", { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteAsset() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/assets/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useSaveTransaction() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: ({ id, assetId, ...input }: TransactionInput & { id?: string; assetId: string }) =>
      id
        ? api<TransactionDto>(`/api/transactions/${id}`, { method: "PUT", json: input })
        : api<TransactionDto>("/api/transactions", { method: "POST", json: { ...input, assetId } }),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/transactions/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => api<{ baseCurrency: string }>("/api/settings") });
}

export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: { baseCurrency: string }) =>
      api<{ baseCurrency: string }>("/api/settings", { method: "PUT", json: patch }),
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useInsights() {
  return useQuery({ queryKey: ["insights"], queryFn: () => api<StoredInsights | null>("/api/ai/insights") });
}

export function useGenerateInsights() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<StoredInsights>("/api/ai/insights", { method: "POST" }),
    onSuccess: (data) => client.setQueryData(["insights"], data),
  });
}
