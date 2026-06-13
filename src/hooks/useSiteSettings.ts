import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ContactSettings = {
  email: string;
  phone: string;
  whatsapp: string;
  address_ar: string;
  address_en: string;
  show_email_footer: boolean;
  show_phone_footer: boolean;
  show_whatsapp_footer: boolean;
  show_email_contact: boolean;
  show_phone_contact: boolean;
  show_whatsapp_contact: boolean;
};

export const DEFAULT_CONTACT: ContactSettings = {
  email: "sales@shakkel.com",
  phone: "+966 11 200 1100",
  whatsapp: "+966 50 100 2200",
  address_ar: "الرياض • جدة • الدمام",
  address_en: "Riyadh • Jeddah • Dammam",
  show_email_footer: true,
  show_phone_footer: true,
  show_whatsapp_footer: true,
  show_email_contact: true,
  show_phone_contact: true,
  show_whatsapp_contact: true,
};

export const useContactSettings = () => {
  const [contact, setContact] = useState<ContactSettings>(DEFAULT_CONTACT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("site_settings" as any)
      .select("value")
      .eq("key", "contact")
      .maybeSingle();
    if (data && (data as any).value) {
      setContact({ ...DEFAULT_CONTACT, ...(data as any).value });
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { contact, loading, refresh };
};

export const saveContactSettings = async (value: ContactSettings) => {
  return supabase.from("site_settings" as any).upsert({ key: "contact", value, updated_at: new Date().toISOString() });
};
