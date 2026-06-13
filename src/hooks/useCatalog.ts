import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";

export type DBBrand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export type DBCategory = {
  id: string;
  name: string;
  name_ar?: string | null;
  name_en?: string | null;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  image_url?: string | null;
};

export type ProductSpec = { label: string; value: string };

export type DBProduct = {
  id: string;
  code: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  description: string | null;
  long_description: string | null;
  highlights: string[];
  specs: ProductSpec[];
  shakkel_ref: string | null;
  datasheet_url: string | null;
  unit: string;
  min_order_qty: number;
  stock_qty: number;
  status: "active" | "inactive";
  is_active: boolean;
  brands?: { id: string; name: string; slug: string; logo_url: string | null } | null;
  categories?: { id: string; name: string; slug: string } | null;
  product_images?: { image_url: string; sort_order: number }[];
  product_documents?: { id: string; file_url: string; file_name: string; mime_type: string | null; size_bytes: number | null; sort_order: number }[];
};

export const useBrands = (onlyActive = true) => {
  const [data, setData] = useState<DBBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("brands").select("*").order("sort_order", { ascending: true });
    if (onlyActive) q = q.eq("is_active", true);
    const { data } = await q;
    setData((data as DBBrand[]) || []);
    setLoading(false);
  }, [onlyActive]);
  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, refetch };
};

export const useCategories = (onlyActive = true) => {
  const [data, setData] = useState<DBCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("categories").select("*").order("name");
    if (onlyActive) q = q.eq("is_active", true);
    const { data } = await q;
    setData((data as DBCategory[]) || []);
    setLoading(false);
  }, [onlyActive]);
  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, refetch };
};

export type SortBy = "newest" | "oldest" | "name_asc" | "name_desc" | "stock_desc";
export type Availability = "all" | "in" | "low" | "out";

export const useProducts = (filters?: {
  brandId?: string;
  categoryId?: string;
  search?: string;
  adminMode?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: SortBy;
  availability?: Availability;
}) => {
  const [data, setData] = useState<DBProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 12;
  const sortBy = filters?.sortBy ?? "newest";

  const refetch = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("products")
      .select("*, brands(id,name,slug,logo_url), categories(id,name,slug), product_images(image_url,sort_order)", { count: "exact" });

    if (!filters?.adminMode) q = q.eq("is_active", true).eq("status", "active");
    if (filters?.brandId) q = q.eq("brand_id", filters.brandId);
    if (filters?.categoryId) q = q.eq("category_id", filters.categoryId);
    if (filters?.availability && filters.availability !== "all") {
      if (filters.availability === "in") q = q.gte("stock_qty", 10);
      else if (filters.availability === "low") q = q.gt("stock_qty", 0).lt("stock_qty", 10);
      else q = q.eq("stock_qty", 0);
    }
    if (filters?.search && filters.search.trim()) {
      const s = filters.search.trim().replace(/[%,]/g, "");
      q = q.or(`name.ilike.%${s}%,code.ilike.%${s}%,description.ilike.%${s}%`);
    }
    switch (sortBy) {
      case "oldest": q = q.order("created_at", { ascending: true }); break;
      case "name_asc": q = q.order("name", { ascending: true }); break;
      case "name_desc": q = q.order("name", { ascending: false }); break;
      case "stock_desc": q = q.order("stock_qty", { ascending: false }); break;
      default: q = q.order("created_at", { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    q = q.range(from, to);

    const { data, count } = await q;
    setData(((data as any[]) || []) as DBProduct[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [filters?.brandId, filters?.categoryId, filters?.search, filters?.adminMode, filters?.availability, page, pageSize, sortBy]);
  useEffect(() => { refetch(); }, [refetch]);
  return { data, total, loading, refetch };
};

export const useProduct = (id: string | undefined) => {
  const [data, setData] = useState<DBProduct | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase
      .from("products")
      .select("*, brands(id,name,slug,logo_url), categories(id,name,slug), product_images(image_url,sort_order), product_documents(id,file_url,file_name,mime_type,size_bytes,sort_order)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setData((data as any) as DBProduct | null);
        setLoading(false);
      });
  }, [id]);
  return { data, loading };
};

export const productPrimaryImage = (p: DBProduct | null | undefined) => {
  if (!p) return "";
  const imgs = (p.product_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  return imgs[0]?.image_url || "";
};

export const stockState = (p: { stock_qty: number }) => {
  if (p.stock_qty <= 0) return "out" as const;
  if (p.stock_qty < 10) return "low" as const;
  return "in" as const;
};
