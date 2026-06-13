import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export const HighlightsEditor = ({
  value, onChange, lang,
}: { value: string[]; onChange: (v: string[]) => void; lang: "ar" | "en" }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{lang === "ar" ? "النقاط البارزة (Highlights)" : "Highlights"}</Label>
        <Button type="button" size="sm" variant="outline" disabled={value.length >= 12} onClick={() => onChange([...value, ""])}>
          <Plus className="h-3.5 w-3.5 me-1" /> {lang === "ar" ? "إضافة نقطة" : "Add highlight"}
        </Button>
      </div>
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center">
          {lang === "ar" ? "لم تتم إضافة نقاط بعد" : "No highlights yet"}
        </p>
      )}
      <div className="space-y-2">
        {value.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs w-6 text-center">{i + 1}.</span>
            <Input
              value={h}
              maxLength={120}
              onChange={(e) => { const n = [...value]; n[i] = e.target.value; onChange(n); }}
              placeholder={lang === "ar" ? "ميزة قصيرة…" : "Short bullet…"}
            />
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export type Spec = { label: string; value: string };

export const SpecsEditor = ({
  value, onChange, lang,
}: { value: Spec[]; onChange: (v: Spec[]) => void; lang: "ar" | "en" }) => {
  const update = (i: number, patch: Partial<Spec>) => {
    const n = [...value]; n[i] = { ...n[i], ...patch }; onChange(n);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{lang === "ar" ? "المواصفات (Specifications)" : "Specifications"}</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...value, { label: "", value: "" }])}>
          <Plus className="h-3.5 w-3.5 me-1" /> {lang === "ar" ? "إضافة صف" : "Add row"}
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center">
          {lang === "ar" ? "لا توجد مواصفات" : "No specifications"}
        </p>
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <div className="grid grid-cols-[1fr,1fr,auto] bg-secondary/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="px-3 py-2">{lang === "ar" ? "العنوان" : "Subject"}</div>
            <div className="px-3 py-2">{lang === "ar" ? "القيمة" : "Value"}</div>
            <div className="px-3 py-2 w-12"></div>
          </div>
          {value.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr,1fr,auto] border-t border-border">
              <Input value={row.label} maxLength={80} onChange={(e) => update(i, { label: e.target.value })} className="border-0 rounded-none h-10" />
              <Input value={row.value} maxLength={200} onChange={(e) => update(i, { value: e.target.value })} className="border-0 border-s border-border rounded-none h-10" />
              <Button type="button" size="icon" variant="ghost" className="h-10 w-12 rounded-none text-destructive hover:bg-destructive/10" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
