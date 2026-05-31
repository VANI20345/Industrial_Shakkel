import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

export interface QuoteItem {
  productId: string;
  quantity: number;
}

interface QuoteCtx {
  items: QuoteItem[];
  add: (productId: string, quantity: number) => void;
  update: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  has: (productId: string) => boolean;
}

const Ctx = createContext<QuoteCtx | null>(null);
const KEY = "indus_quote";

export const QuoteProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<QuoteItem[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const add = useCallback((productId: string, quantity: number) => {
    setItems((p) => p.find((i) => i.productId === productId) ? p.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i) : [...p, { productId, quantity }]);
  }, []);
  const update = useCallback((productId: string, quantity: number) => setItems((p) => p.map((i) => i.productId === productId ? { ...i, quantity } : i)), []);
  const remove = useCallback((productId: string) => setItems((p) => p.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((productId: string) => items.some((i) => i.productId === productId), [items]);

  return <Ctx.Provider value={{ items, add, update, remove, clear, count: items.length, has }}>{children}</Ctx.Provider>;
};

export const useQuote = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useQuote inside provider");
  return c;
};
