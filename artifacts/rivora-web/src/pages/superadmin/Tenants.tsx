import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase/client";
import type { Tenant } from "@/lib/supabase/types";
import { Plus, Search } from "lucide-react";

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("tenants").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setTenants(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.includes(search.toLowerCase()) ||
    (t.domain ?? "").includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", color: "#e8eaec", padding: "32px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <Link href="/superadmin" style={{ color: "#9C9C9C", fontSize: 13, textDecoration: "none" }}>← Super Admin</Link>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, margin: "8px 0 0", color: "#D4AF37" }}>All Tenants</h1>
          </div>
          <Link href="/superadmin/tenants/new">
            <button style={{ display: "flex", alignItems: "center", gap: 8, background: "#D4AF37", color: "#000", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              <Plus size={16} /> New Tenant
            </button>
          </Link>
        </div>

        <div style={{ position: "relative", marginBottom: 20 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9C9C9C" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, slug, or domain…"
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px 10px 36px", color: "#e8eaec", fontSize: 14, boxSizing: "border-box" }} />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#9C9C9C", textAlign: "left" }}>
                {["Site", "Domain", "Currencies", "Min Deposit", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#9C9C9C" }}>Loading…</td></tr>
              )}
              {filtered.map(tenant => (
                <tr key={tenant.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: tenant.primary_color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#000" }}>{tenant.name[0]}</div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>{tenant.name}</p>
                        <p style={{ margin: 0, color: "#9C9C9C", fontSize: 11 }}>{tenant.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px", color: tenant.domain ? "#D4AF37" : "#9C9C9C" }}>{tenant.domain ?? "—"}</td>
                  <td style={{ padding: "12px" }}>{tenant.currencies.join(", ")}</td>
                  <td style={{ padding: "12px" }}>₦{Number(tenant.min_deposit).toLocaleString()}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: tenant.is_active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: tenant.is_active ? "#22c55e" : "#ef4444", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                      {tenant.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <Link href={`/superadmin/tenants/${tenant.id}`}>
                      <button style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 6, padding: "5px 12px", color: "#D4AF37", cursor: "pointer", fontSize: 12 }}>Edit</button>
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#9C9C9C" }}>No tenants found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
