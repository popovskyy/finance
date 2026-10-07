import type { SearchResult } from "./types";

/** Yahoo ticker for converting one unit of `from` into `to`. */
export const fxPair = (from: string, to: string) => `${from}${to}=X`;

export const CURRENCIES: Record<string, string> = {
  USD: "Долар США",
  EUR: "Євро",
  UAH: "Українська гривня",
  GBP: "Британський фунт",
  PLN: "Польський злотий",
  CHF: "Швейцарський франк",
  CZK: "Чеська крона",
  CAD: "Канадський долар",
  AUD: "Австралійський долар",
  JPY: "Японська єна",
  CNY: "Китайський юань",
  SEK: "Шведська крона",
  NOK: "Норвезька крона",
  DKK: "Данська крона",
  HUF: "Угорський форинт",
  RON: "Румунський лей",
  TRY: "Турецька ліра",
  AED: "Дирхам ОАЕ",
  SGD: "Сінгапурський долар",
  HKD: "Гонконгський долар",
  INR: "Індійська рупія",
  BRL: "Бразильський реал",
  MXN: "Мексиканське песо",
  ILS: "Ізраїльський шекель",
  GEL: "Грузинський ларі",
  KZT: "Казахстанський тенге",
};

export function searchCurrencies(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  return Object.entries(CURRENCIES)
    .filter(([code, name]) => !q || code.toLowerCase().includes(q) || name.toLowerCase().includes(q))
    .slice(0, 10)
    .map(([code, name]) => ({ providerId: code, symbol: code, name }));
}
