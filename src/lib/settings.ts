import { db } from "@/lib/db";

export interface AppSettings {
  baseCurrency: string;
}

const DEFAULT_BASE_CURRENCY = "USD";

export async function getSettings(): Promise<AppSettings> {
  const row = await db.setting.findUnique({ where: { key: "baseCurrency" } });
  return { baseCurrency: row?.value ?? DEFAULT_BASE_CURRENCY };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  if (patch.baseCurrency) {
    await db.setting.upsert({
      where: { key: "baseCurrency" },
      create: { key: "baseCurrency", value: patch.baseCurrency },
      update: { value: patch.baseCurrency },
    });
  }
  return getSettings();
}
