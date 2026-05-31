import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nProvider";
import { Plus, ArrowDownUp, History, Loader2, FileDown, AlertTriangle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toCsv, downloadCsv } from "@/lib/csv";
import { exportXlsx } from "@/lib/reports";

type Product = { id: string; code: string; name: string; stock_qty: number; low_stock_threshold: number; unit: string; brands?: { name: string } | null };
type Movement = { id: string; movement_type: string; quantity: number; old_quantity: number; new_quantity: number; reason: string | null; created_at: string };

const stStatus = (q: number, t: number) => (q <= 0 ? "out" : q <= t ? "low" : "in");

const AdminStock = () => {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addQty, setAddQty] = useState<Record<string, string>>({});
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ id: "", current: 0, newQty: 0, reason: "" });
  const [movOpen, setMovOpen] = useState(false);
  const [movRows, setMovRows] = useState<Movement[]>([]);
  const [movLoading, setMovLoading] = useState(false);
  const [movProductName, setMovProductName] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,code,name,stock_qty,low_stock_threshold,unit,brands(name)")
      .order("name");
    if (error) toast.error(error.message);
    setRows((data as Product[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addStock = async (p: Product) => {
    const q = parseInt(addQty[p.id] || "0");
    if (!q || q <= 0) return toast.error(lang === "ar" ? "أدخل كمية صحيحة" : "Enter a valid quantity");
    setBusyId(p.id);
    const { error } = await supabase.rpc("add_stock", { _product_id: p.id, _qty: q, _reason: "Manual add" });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(lang === "ar" ? `تمت إضافة ${q}` : `Added ${q}`);
    setAddQty((s) => ({ ...s, [p.id]: "" }));
    load();
  };

  const submitAdjust = async () => {
    if (adjustForm.newQty < 0) return toast.error(lang === "ar" ? "الكمية لا تكون سالبة" : "Cannot be negative");
    setBusyId(adjustForm.id);
    const { error } = await supabase.rpc("adjust_stock", {
      _product_id: adjustForm.id, _new_qty: adjustForm.newQty, _reason: adjustForm.reason || "Manual adjust",
    });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(lang === "ar" ? "تم التعديل" : "Adjusted");
    setAdjustOpen(false);
    load();
  };

  const openMovements = async (p: Product) => {
    setMovProductName(`${p.name} (${p.code})`);
    setMovOpen(true);
    setMovLoading(true);
    const { data } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("product_id", p.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setMovRows((data as Movement[]) || []);
    setMovLoading(false);
  };

  const [showLowOnly, setShowLowOnly] = useState(false);
  const [thresholdEdit, setThresholdEdit] = useState<Record<string, string>>({});

  const saveThreshold = async (p: Product) => {
    const v = Number(thresholdEdit[p.id]);
    if (!Number.isFinite(v) || v < 0) return toast.error(lang === "ar" ? "قيمة غير صحيحة" : "Invalid value");
    setBusyId(p.id);
    const { error } = await supabase.from("products").update({ low_stock_threshold: v }).eq("id", p.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_audit", { _action: "update", _table: "products", _record_id: p.id, _old: { low_stock_threshold: p.low_stock_threshold } as any, _new: { low_stock_threshold: v } as any });
    toast.success(lang === "ar" ? "تم تحديث الحد" : "Threshold saved");
    setThresholdEdit((s) => { const n = { ...s }; delete n[p.id]; return n; });
    load();
  };

  const filtered = useMemo(() => {
    if (!showLowOnly) return rows;
    return rows.filter((p) => p.stock_qty <= (p.low_stock_threshold ?? 10));
  }, [rows, showLowOnly]);

  const exportCsv = () => {
    const csv = toCsv(
      ["product_code","product_name","brand","stock_qty","low_stock_threshold","unit","status"],
      filtered.map((p) => [p.code, p.name, p.brands?.name || "", p.stock_qty, p.low_stock_threshold ?? 10, p.unit, stStatus(p.stock_qty, p.low_stock_threshold ?? 10)]),
    );
    downloadCsv(`stock-${new Date().toISOString().slice(0,10)}.csv`, csv);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{t.admin.stock}</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} / {rows.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showLowOnly ? "default" : "outline"} size="sm" onClick={() => setShowLowOnly((v) => !v)}>
            <AlertTriangle className="h-3.5 w-3.5 me-1.5" /> {lang === "ar" ? "منخفض فقط" : "Low only"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><FileDown className="h-3.5 w-3.5 me-1.5" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportXlsx(`stock-${new Date().toISOString().slice(0,10)}.xlsx`, [{
            name: "Stock",
            rows: filtered.map((p) => ({ product_code: p.code, product_name: p.name, brand: p.brands?.name || "", stock_qty: p.stock_qty, low_stock_threshold: p.low_stock_threshold ?? 10, unit: p.unit, status: stStatus(p.stock_qty, p.low_stock_threshold ?? 10) })),
          }])}><FileDown className="h-3.5 w-3.5 me-1.5" /> Excel</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">{t.products.code}</th>
                  <th className="px-5 py-3">{t.admin.currentStock}</th>
                  <th className="px-5 py-3">{lang === "ar" ? "حد التنبيه" : "Threshold"}</th>
                  <th className="px-5 py-3">{t.admin.status}</th>
                  <th className="px-5 py-3">{t.admin.addQuantity}</th>
                  <th className="px-5 py-3 text-end">{t.admin.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const threshold = p.low_stock_threshold ?? 10;
                  const st = stStatus(p.stock_qty, threshold);
                  const editVal = thresholdEdit[p.id];
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-5 py-3">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.brands?.name || "—"}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{p.code}</td>
                      <td className="px-5 py-3 font-bold text-base">{p.stock_qty} {p.unit}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" min={0}
                            value={editVal !== undefined ? editVal : String(threshold)}
                            onChange={(e) => setThresholdEdit((s) => ({ ...s, [p.id]: e.target.value }))}
                            className="w-20 h-8 text-xs"
                          />
                          {editVal !== undefined && Number(editVal) !== threshold && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveThreshold(p)} disabled={busyId === p.id}>
                              {busyId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={cn("border",
                          st === "in" && "bg-success/10 text-success border-success/30",
                          st === "low" && "bg-warning/15 text-warning-foreground border-warning/40",
                          st === "out" && "bg-destructive/10 text-destructive border-destructive/30",
                        )}>
                          {st === "in" ? t.products.inStock : st === "low" ? t.products.lowStock : t.products.outOfStock}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Input type="number" min={1} placeholder="0" value={addQty[p.id] || ""} onChange={(e) => setAddQty((s) => ({ ...s, [p.id]: e.target.value }))} className="w-24 h-9" />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" disabled={busyId === p.id} onClick={() => addStock(p)} className="bg-gradient-primary">
                            {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 me-1" />} Add
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setAdjustForm({ id: p.id, current: p.stock_qty, newQty: p.stock_qty, reason: "" }); setAdjustOpen(true); }}>
                            <ArrowDownUp className="h-3.5 w-3.5 me-1" /> {t.admin.adjust}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openMovements(p)}><History className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.admin.adjust}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{lang === "ar" ? "الكمية الحالية" : "Current"}: <span className="font-bold">{adjustForm.current}</span></p>
            <div><Label>{lang === "ar" ? "الكمية الجديدة" : "New quantity"}</Label><Input type="number" min={0} value={adjustForm.newQty} onChange={(e) => setAdjustForm({ ...adjustForm, newQty: Number(e.target.value) })} /></div>
            <div><Label>{lang === "ar" ? "السبب" : "Reason"}</Label><Input value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>{t.admin.cancel}</Button>
            <Button onClick={submitAdjust} disabled={busyId === adjustForm.id} className="bg-gradient-primary">{busyId === adjustForm.id && <Loader2 className="h-4 w-4 me-2 animate-spin" />} {t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movOpen} onOpenChange={setMovOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Stock Movements — {movProductName}</DialogTitle></DialogHeader>
          {movLoading ? (
            <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : movRows.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">No movements yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs uppercase text-muted-foreground"><th className="text-left py-2">Type</th><th>Qty</th><th>Old → New</th><th>Reason</th><th>Date</th></tr></thead>
              <tbody>
                {movRows.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="py-2"><Badge variant="outline" className={cn(m.movement_type === "in" && "bg-success/10 text-success border-success/30", m.movement_type === "out" && "bg-destructive/10 text-destructive border-destructive/30", m.movement_type === "adjustment" && "bg-warning/10 text-warning-foreground border-warning/30")}>{m.movement_type}</Badge></td>
                    <td className="text-center font-bold">{m.quantity}</td>
                    <td className="text-center text-muted-foreground">{m.old_quantity} → {m.new_quantity}</td>
                    <td className="text-xs text-muted-foreground max-w-[180px] truncate">{m.reason}</td>
                    <td className="text-xs text-muted-foreground whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminStock;
