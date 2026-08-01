import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase/client";
import type { Tenant } from "@/lib/supabase/types";
import { Building2, Plus, Users, TrendingUp, Globe, ToggleLeft, ToggleRight } from "lucide-react";

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("tenants").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("tenants").update({ is_active: !current }).eq("id", id);
    setTenants(ts => ts.map(t => t.id === id ? { ...t, is_active: !current } : t));
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", color: "#e8eaec", padding: "32px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 700, margin: 0, color: "#D4AF37" }}>
              Super Admin
            </h1>
            <p style={{ color: "#9C9C9C", fontSize: 13, marginTop: 4 }}>Manage all investment platform tenants</p>
          </div>
          <Link href="/superadmin/tenants/new">
            <button style={{ display: "flex", alignItems: "center", gap: 8, background: "#D4AF37", color: "#000", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              <Plus size={16} /> New Tenant
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { icon: Building2, label: "Total Sites", value: tenants.length },
            { icon: ToggleRight, label: "Active Sites", value: tenants.filter(t => t.is_active).length },
            { icon: Globe, label: "With Custom Domain", value: tenants.filter(t => t.domain).length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 12, padding: 20 }}>
              <Icon size={20} color="#D4AF37" />
              <p style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 2px" }}>{value}</p>
              <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Tenants list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading && <p style={{ color: "#9C9C9C" }}>Loading tenants…</p>}
          {tenants.map(tenant => (
            <div key={tenant.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: tenant.primary_color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#000" }}>
                {tenant.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, margin: 0, fontSize: 15 }}>{tenant.name}</p>
                <p style={{ color: "#9C9C9C", fontSize: 12, margin: "2px 0 0", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>{tenant.slug}</span>
                  {tenant.domain && <span style={{ color: "#D4AF37" }}>{tenant.domain}</span>}
                  <span>Min ₦{Number(tenant.min_deposit).toLocaleString()}</span>
                  <span>{tenant.currencies.join(", ")}</span>
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <button onClick={() => toggleActive(tenant.id, tenant.is_active)} style={{ background: "none", border: "none", cursor: "pointer", color: tenant.is_active ? "#22c55e" : "#9C9C9C" }}>
                  {tenant.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <Link href={`/superadmin/tenants/${tenant.id}`}>
                  <button style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, padding: "6px 14px", color: "#D4AF37", cursor: "pointer", fontSize: 13 }}>Edit</button>
                </Link>
              </div>
            </div>
          ))}
          {!loading && tenants.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#9C9C9C" }}>
              <Building2 size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <p>No tenants yet. Create your first investment site.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
