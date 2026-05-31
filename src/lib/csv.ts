// CSV utilities — minimal, no external dependencies
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { cur.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  // Drop trailing empty rows
  while (rows.length && rows[rows.length - 1].every((v) => v.trim() === "")) rows.pop();
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  return { headers, rows: rows.slice(1) };
}

export function rowsToObjects<T extends Record<string, string>>(headers: string[], rows: string[][]): T[] {
  return rows.map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, idx) => { o[h] = (r[idx] ?? "").trim(); });
    return o as T;
  });
}

export function toCsv(headers: string[], rows: (string | number | null | undefined | boolean)[][]): string {
  const esc = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  rows.forEach((r) => lines.push(r.map(esc).join(",")));
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[\u0600-\u06FF]+/g, (m) => m) // keep arabic as-is
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_\u0600-\u06FF]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `item-${Date.now()}`;
}
