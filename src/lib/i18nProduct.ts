// Localized field pickers for products. Falls back to the other language,
// then to the legacy single-language column so we never render empty strings.

type Lang = "ar" | "en";

type ProductLike = {
  name?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  description?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  long_description?: string | null;
  long_description_ar?: string | null;
  long_description_en?: string | null;
  specs?: unknown;
  specs_ar?: unknown;
  specs_en?: unknown;
};

const pick = (lang: Lang, primary?: string | null, alt?: string | null, legacy?: string | null) => {
  const a = (primary || "").trim();
  if (a) return a;
  const b = (alt || "").trim();
  if (b) return b;
  return (legacy || "").trim();
};

export const productName = (p: ProductLike | null | undefined, lang: Lang): string => {
  if (!p) return "";
  return lang === "ar"
    ? pick("ar", p.name_ar, p.name_en, p.name)
    : pick("en", p.name_en, p.name_ar, p.name);
};

export const productDescription = (p: ProductLike | null | undefined, lang: Lang): string => {
  if (!p) return "";
  return lang === "ar"
    ? pick("ar", p.description_ar, p.description_en, p.description)
    : pick("en", p.description_en, p.description_ar, p.description);
};

export const productLongDescription = (p: ProductLike | null | undefined, lang: Lang): string => {
  if (!p) return "";
  return lang === "ar"
    ? pick("ar", p.long_description_ar, p.long_description_en, p.long_description)
    : pick("en", p.long_description_en, p.long_description_ar, p.long_description);
};

export type ProductSpec = { label: string; value: string };

const asSpecs = (v: unknown): ProductSpec[] => (Array.isArray(v) ? (v as ProductSpec[]) : []);

export const productSpecs = (p: ProductLike | null | undefined, lang: Lang): ProductSpec[] => {
  if (!p) return [];
  const primary = lang === "ar" ? asSpecs(p.specs_ar) : asSpecs(p.specs_en);
  if (primary.length) return primary;
  const alt = lang === "ar" ? asSpecs(p.specs_en) : asSpecs(p.specs_ar);
  if (alt.length) return alt;
  return asSpecs(p.specs);
};
