import { cookies } from "next/headers";
import en from "./locales/en.json";
import tr from "./locales/tr.json";

export type Dictionary = typeof en;

const dictionaries: Record<string, Dictionary> = {
  en,
  tr,
};

export async function getLocale() {
  const cookieStore = await cookies();
  return cookieStore.get("bq_locale")?.value || "en";
}

export async function getDictionary() {
  const locale = await getLocale();
  return dictionaries[locale] || dictionaries["en"];
}
