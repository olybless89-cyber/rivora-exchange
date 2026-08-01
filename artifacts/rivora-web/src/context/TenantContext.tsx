import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tenant } from "@/lib/supabase/types";

interface TenantContextValue {
  tenant: Tenant | null;
  loading: boolean;
}

const TenantContext = createContext<TenantContextValue>({ tenant: null, loading: true });

export function useTenant() {
  return useContext(TenantContext);
}

// Resolve tenant from current hostname
async function resolveTenant(): Promise<Tenant | null> {
  const hostname = window.location.hostname;
  // In dev, fall back to slug from VITE_TENANT_SLUG or "rivora"
  const devSlug = import.meta.env.VITE_TENANT_SLUG as string | undefined;

  // First try exact domain match
  let { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("domain", hostname)
    .maybeSingle();

  if (!data && devSlug) {
    // Fallback: match by slug (dev / localhost)
    const res = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", devSlug)
      .maybeSingle();
    data = res.data;
  }

  if (!data) {
    // Last resort: first active tenant (localhost without VITE_TENANT_SLUG)
    const res = await supabase
      .from("tenants")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    data = res.data;
  }

  return data ?? null;
}

// Apply tenant branding as CSS variables on <html>
function applyBranding(tenant: Tenant) {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", tenant.primary_color);
  root.style.setProperty("--brand-secondary", tenant.secondary_color);
  root.style.setProperty("--brand-bg", tenant.background_color);
  root.style.setProperty("--brand-text", tenant.text_color);

  if (tenant.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = tenant.favicon_url;
  }

  document.title = tenant.name;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resolveTenant().then((t) => {
      if (t) {
        setTenant(t);
        applyBranding(t);
      }
      setLoading(false);
    });
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
}
