import type { DBCategory } from "@/hooks/useCatalog";

type Lang = "ar" | "en";

export const categoryName = (
  c: { name?: string | null; name_ar?: string | null; name_en?: string | null } | null | undefined,
  lang: Lang,
): string => {
  if (!c) return "";
  const ar = (c.name_ar || "").trim();
  const en = (c.name_en || "").trim();
  const legacy = (c.name || "").trim();
  if (lang === "ar") return ar || en || legacy;
  return en || ar || legacy;
};

export const getChildren = (cats: DBCategory[], parentId: string | null, onlyActive = true) =>
  cats.filter((c) => (c.parent_id || null) === (parentId || null) && (!onlyActive || c.is_active));

export const hasChildren = (cats: DBCategory[], id: string) =>
  cats.some((c) => c.parent_id === id && c.is_active);

export const getDescendantIds = (cats: DBCategory[], rootId: string): string[] => {
  const ids: string[] = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const next: string[] = [];
    for (const c of cats) {
      if (c.parent_id && frontier.includes(c.parent_id)) {
        ids.push(c.id);
        next.push(c.id);
      }
    }
    frontier = next;
  }
  return ids;
};

export const getAncestors = (cats: DBCategory[], id: string): DBCategory[] => {
  const map = new Map(cats.map((c) => [c.id, c] as const));
  const trail: DBCategory[] = [];
  let cur: DBCategory | undefined = map.get(id);
  let guard = 0;
  while (cur && guard++ < 20) {
    trail.unshift(cur);
    cur = cur.parent_id ? map.get(cur.parent_id) : undefined;
  }
  return trail;
};
