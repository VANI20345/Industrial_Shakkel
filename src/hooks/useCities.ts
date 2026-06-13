import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SAUDI_CITIES, CityOption } from "@/data/saudiCities";

export const useCities = () => {
  const [cities, setCities] = useState<CityOption[]>(SAUDI_CITIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("cities" as any)
        .select("name_ar,name_en,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order");
      if (!alive) return;
      if (!error && data && (data as any[]).length > 0) {
        setCities((data as any[]).map((c) => ({ name_ar: c.name_ar, name_en: c.name_en })));
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { cities, loading };
};
