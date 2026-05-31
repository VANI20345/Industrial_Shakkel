// Public sitemap.xml — lists static pages, brands, and active products
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const origin = SITE_URL || new URL(req.url).origin.replace(/\/functions.*$/, "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const [brandsRes, productsRes] = await Promise.all([
    supabase.from("brands").select("id,slug,updated_at").eq("is_active", true),
    supabase.from("products").select("id,updated_at").eq("is_active", true).eq("status", "active").limit(5000),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const urls: { loc: string; lastmod?: string; priority?: string }[] = [
    { loc: `${origin}/`, lastmod: today, priority: "1.0" },
    { loc: `${origin}/products`, lastmod: today, priority: "0.9" },
    { loc: `${origin}/brands`, lastmod: today, priority: "0.8" },
    { loc: `${origin}/about`, lastmod: today, priority: "0.5" },
    { loc: `${origin}/contact`, lastmod: today, priority: "0.5" },
  ];

  for (const b of brandsRes.data || []) {
    urls.push({ loc: `${origin}/products?brand=${b.id}`, lastmod: (b.updated_at || today).slice(0, 10), priority: "0.6" });
  }
  for (const p of productsRes.data || []) {
    urls.push({ loc: `${origin}/products/${p.id}`, lastmod: (p.updated_at || today).slice(0, 10), priority: "0.7" });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}${u.priority ? `<priority>${u.priority}</priority>` : ""}</url>`).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
});
