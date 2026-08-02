import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase/client";
import type { Tenant, InvestmentPlan } from "@/lib/supabase/types";
import { Loader2, Trash2, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FEATURES = ["deposit", "withdraw", "invest", "referral", "p2p"];
const CURRENCIES = ["NGN", "USD", "GHS", "KES", "ZAR", "GBP", "EUR"];
const TABS = ["Branding", "Financial", "Payment", "Plans"] as const;
type Tab = typeof TABS[number];

const emptyTenant: Record<string, unknown> = {
  slug: "", name: "", domain: "",
  primary_color: "#D4AF37", secondary_color: "#0D2044",
  background_color: "#000000", text_color: "#FFFFFF",
  tagline: "", support_email: "", support_phone: "",
  telegram_url: "", whatsapp_url: "",
  currencies: ["NGN"], enabled_features: ["deposit", "withdraw", "invest", "referral"],
  flw_public_key: "", flw_secret_key: "", flw_webhook_hash: "",
  min_deposit: 20000, min_withdrawal: 5000,
  withdrawal_fee_pct: 5, welcome_bonus: 2000,
  referral_l1_rate: 0.10, referral_l2_rate: 0.02, referral_l3_rate: 0.02,
  require_referral: true, is_active: true,
};

export default function SuperAdminTenantEditPage() {
  const [, params] = useRoute("/superadmin/tenants/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = params?.id === "new";
  const tenantId = isNew ? null : params?.id;

  const [tab, setTab] = useState<Tab>("Branding");
  const [form, setForm] = useState<Record<string, any>>(emptyTenant);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle(),
      supabase.from("investment_plans").select("*").eq("tenant_id", tenantId).order("sort_order"),
    ]).then(([{ data: t }, { data: p }]) => {
      if (t) setForm(t);
      setPlans(Array.isArray(p) ? p : []);
      setLoading(false);
    });
  }, [tenantId]);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleArr = (key: keyof Tenant, val: string) => {
    const arr = (form[key] as string[]) ?? [];
    set(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const saveTenant = async () => {
    if (!form.slug || !form.name) { toast({ title: "Slug and name are required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (isNew) {
        const { data, error } = await (supabase as any).from("tenants").insert({ ...emptyTenant, ...form }).select().maybeSingle();
        if (error) throw new Error(error.message);
        toast({ title: "Tenant created!" });
        setLocation(`/superadmin/tenants/${data!.id}`);
      } else {
        const { error } = await (supabase as any).from("tenants").update({ ...form, updated_at: new Date().toISOString() }).eq("id", tenantId!);
        if (error) throw new Error(error.message);
        toast({ title: "Saved!" });
      }
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Plan helpers
  const addPlan = () => setPlans(p => [...p, { id: `new-${Date.now()}`, tenant_id: tenantId ?? "", name: "", daily_rate: 2, min_amount: 10000, max_amount: null, duration_days: 30, description: "", is_active: true, sort_order: p.length, created_at: "", updated_at: "" }]);

  const savePlan = async (plan: InvestmentPlan) => {
    if (!plan.name) return;
    if (plan.id.startsWith("new-")) {
      const { data, error } = await (supabase as any).from("investment_plans").insert({ ...plan, id: undefined, tenant_id: tenantId! }).select().maybeSingle();
      if (!error && data) setPlans(ps => ps.map(p => p.id === plan.id ? data : p));
    } else {
      await (supabase as any).from("investment_plans").update(plan).eq("id", plan.id);
    }
    toast({ title: "Plan saved" });
  };

  const deletePlan = async (id: string) => {
    if (!id.startsWith("new-")) await supabase.from("investment_plans").delete().eq("id", id);
    setPlans(ps => ps.filter(p => p.id !== id));
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Loader2 size={32} className="animate-spin" color="#D4AF37" /></div>;

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", color: "#e8eaec", padding: "32px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <Link href="/superadmin" style={{ color: "#9C9C9C", fontSize: 13, textDecoration: "none" }}>← Super Admin</Link>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, margin: "8px 0 0", color: "#D4AF37" }}>
              {isNew ? "New Tenant" : form.name}
            </h1>
          </div>
          <button onClick={saveTenant} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "#D4AF37", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 28 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background: "none", border: "none", padding: "10px 18px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: tab === t ? "#D4AF37" : "#9C9C9C", borderBottom: tab === t ? "2px solid #D4AF37" : "2px solid transparent", marginBottom: -1 }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── BRANDING TAB ── */}
        {tab === "Branding" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Row label="Site Name *"><Input value={form.name ?? ""} onChange={e => set("name", e.target.value)} placeholder="e.g. Rivora Exchange" /></Row>
            <Row label="Slug *"><Input value={form.slug ?? ""} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="e.g. rivora (url-safe)" /></Row>
            <Row label="Custom Domain"><Input value={form.domain ?? ""} onChange={e => set("domain", e.target.value)} placeholder="e.g. rivora.com" /></Row>
            <Row label="Tagline"><Input value={form.tagline ?? ""} onChange={e => set("tagline", e.target.value)} placeholder="Your Gateway to Smart Investments" /></Row>
            <Row label="Logo URL"><Input value={form.logo_url ?? ""} onChange={e => set("logo_url", e.target.value)} placeholder="https://…" /></Row>
            <Row label="Favicon URL"><Input value={form.favicon_url ?? ""} onChange={e => set("favicon_url", e.target.value)} placeholder="https://…" /></Row>
            <Row label="Support Email"><Input value={form.support_email ?? ""} onChange={e => set("support_email", e.target.value)} /></Row>
            <Row label="Support Phone"><Input value={form.support_phone ?? ""} onChange={e => set("support_phone", e.target.value)} /></Row>
            <Row label="Telegram URL"><Input value={form.telegram_url ?? ""} onChange={e => set("telegram_url", e.target.value)} /></Row>
            <Row label="WhatsApp URL"><Input value={form.whatsapp_url ?? ""} onChange={e => set("whatsapp_url", e.target.value)} /></Row>

            <p style={{ fontSize: 12, color: "#9C9C9C", marginBottom: 4 }}>Brand Colors</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {(["primary_color", "secondary_color", "background_color", "text_color"] as const).map(k => (
                <Row key={k} label={k.replace("_", " ").replace("_", " ")}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={(form[k] as string) ?? "#000000"} onChange={e => set(k, e.target.value)}
                      style={{ width: 40, height: 36, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }} />
                    <Input value={(form[k] as string) ?? ""} onChange={e => set(k, e.target.value)} style={{ flex: 1 }} />
                  </div>
                </Row>
              ))}
            </div>

            <div>
              <p style={{ fontSize: 12, color: "#9C9C9C", marginBottom: 8 }}>Enabled Features</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FEATURES.map(f => {
                  const on = (form.enabled_features ?? []).includes(f);
                  return <Chip key={f} label={f} active={on} onClick={() => toggleArr("enabled_features", f)} />;
                })}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, color: "#9C9C9C", marginBottom: 8 }}>Active</p>
              <Chip label={form.is_active ? "Active" : "Inactive"} active={!!form.is_active} onClick={() => set("is_active", !form.is_active)} />
            </div>
          </div>
        )}

        {/* ── FINANCIAL TAB ── */}
        {tab === "Financial" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <p style={{ fontSize: 12, color: "#9C9C9C", marginBottom: 8 }}>Accepted Currencies</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CURRENCIES.map(c => <Chip key={c} label={c} active={(form.currencies ?? []).includes(c)} onClick={() => toggleArr("currencies", c)} />)}
              </div>
            </div>
            <Row label="Min Deposit"><Input type="number" value={form.min_deposit ?? 20000} onChange={e => set("min_deposit", Number(e.target.value))} /></Row>
            <Row label="Min Withdrawal"><Input type="number" value={form.min_withdrawal ?? 5000} onChange={e => set("min_withdrawal", Number(e.target.value))} /></Row>
            <Row label="Withdrawal Fee %"><Input type="number" step="0.1" value={form.withdrawal_fee_pct ?? 5} onChange={e => set("withdrawal_fee_pct", Number(e.target.value))} /></Row>
            <Row label="Welcome Bonus"><Input type="number" value={form.welcome_bonus ?? 2000} onChange={e => set("welcome_bonus", Number(e.target.value))} /></Row>
            <Row label="Referral L1 Rate (0–1)"><Input type="number" step="0.01" value={form.referral_l1_rate ?? 0.10} onChange={e => set("referral_l1_rate", Number(e.target.value))} /></Row>
            <Row label="Referral L2 Rate (0–1)"><Input type="number" step="0.01" value={form.referral_l2_rate ?? 0.02} onChange={e => set("referral_l2_rate", Number(e.target.value))} /></Row>
            <Row label="Referral L3 Rate (0–1)"><Input type="number" step="0.01" value={form.referral_l3_rate ?? 0.02} onChange={e => set("referral_l3_rate", Number(e.target.value))} /></Row>
            <Row label="Require Referral on Register">
              <Chip label={form.require_referral ? "Required" : "Optional"} active={!!form.require_referral} onClick={() => set("require_referral", !form.require_referral)} />
            </Row>
          </div>
        )}

        {/* ── PAYMENT TAB ── */}
        {tab === "Payment" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 10, padding: 16, fontSize: 13, color: "#D4AF37" }}>
              Each site uses its own Flutterwave keys. Revenue goes directly to the site owner's Flutterwave account.
            </div>
            <Row label="Flutterwave Public Key"><Input value={form.flw_public_key ?? ""} onChange={e => set("flw_public_key", e.target.value)} placeholder="FLWPUBK_TEST-…" /></Row>
            <Row label="Flutterwave Secret Key"><Input type="password" value={(form as any).flw_secret_key ?? ""} onChange={e => set("flw_secret_key", e.target.value)} placeholder="FLWSECK_TEST-…" /></Row>
            <Row label="Webhook Hash"><Input value={(form as any).flw_webhook_hash ?? ""} onChange={e => set("flw_webhook_hash", e.target.value)} placeholder="Your custom webhook hash" /></Row>
            <p style={{ fontSize: 12, color: "#9C9C9C" }}>
              Set webhook URL in Flutterwave Dashboard → Settings → Webhooks:<br />
              <code style={{ color: "#D4AF37" }}>https://[your-supabase-ref].supabase.co/functions/v1/flutterwave-webhook</code>
            </p>
          </div>
        )}

        {/* ── PLANS TAB ── */}
        {tab === "Plans" && (
          <div>
            {isNew && <p style={{ color: "#9C9C9C", fontSize: 13, marginBottom: 16 }}>Save the tenant first, then add investment plans.</p>}
            {!isNew && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  {plans.map((plan, idx) => (
                    <div key={plan.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <Label>Plan Name</Label>
                          <Input value={plan.name} onChange={e => setPlans(ps => ps.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))} placeholder="VIP-1" />
                        </div>
                        <div>
                          <Label>Daily Rate %</Label>
                          <Input type="number" step="0.1" value={plan.daily_rate} onChange={e => setPlans(ps => ps.map((p, i) => i === idx ? { ...p, daily_rate: Number(e.target.value) } : p))} />
                        </div>
                        <div>
                          <Label>Min Amount</Label>
                          <Input type="number" value={plan.min_amount} onChange={e => setPlans(ps => ps.map((p, i) => i === idx ? { ...p, min_amount: Number(e.target.value) } : p))} />
                        </div>
                        <div>
                          <Label>Days</Label>
                          <Input type="number" value={plan.duration_days} onChange={e => setPlans(ps => ps.map((p, i) => i === idx ? { ...p, duration_days: Number(e.target.value) } : p))} />
                        </div>
                        <div>
                          <Label>Active</Label>
                          <Chip label={plan.is_active ? "Yes" : "No"} active={plan.is_active} onClick={() => setPlans(ps => ps.map((p, i) => i === idx ? { ...p, is_active: !p.is_active } : p))} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => savePlan(plan)} style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 6, padding: "5px 14px", color: "#D4AF37", cursor: "pointer", fontSize: 12 }}>Save</button>
                        <button onClick={() => deletePlan(plan.id)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "5px 10px", color: "#ef4444", cursor: "pointer" }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addPlan}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(212,175,55,0.08)", border: "1px dashed rgba(212,175,55,0.4)", borderRadius: 10, padding: "12px 20px", color: "#D4AF37", cursor: "pointer", width: "100%", justifyContent: "center", fontSize: 14 }}>
                  <Plus size={16} /> Add Investment Plan
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small reusable components ──────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: "#9C9C9C", margin: 0, marginBottom: 4 }}>{children}</p>;
}

function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8, padding: "9px 12px", color: "#e8eaec", fontSize: 14, boxSizing: "border-box",
        ...style,
      }}
    />
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ background: active ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.1)"}`, borderRadius: 20, padding: "5px 14px", color: active ? "#D4AF37" : "#9C9C9C", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400 }}>
      {label}
    </button>
  );
}
