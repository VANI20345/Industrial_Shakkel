import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Lang, translations } from "./translations";

type Dict = (typeof translations)["en"];

interface I18nCtx {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: Dict;
  toggle: () => void;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<I18nCtx | null>(null);

const STORAGE_KEY = "indus_lang";

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem(STORAGE_KEY) as Lang) || "en";
  });

  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((p) => (p === "en" ? "ar" : "en")), []);

  const value = useMemo(() => ({ lang, dir, t: translations[lang] as Dict, toggle, setLang }), [lang, dir, toggle, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
};
