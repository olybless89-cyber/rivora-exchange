import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Send, Users, Building2, CreditCard, User } from "lucide-react";

const API = import.meta.env.VITE_API_URL as string;

async function getSetting(key: string): Promise<string> {
  const token = localStorage.getItem("rivora_token");
  const r = await fetch(`${API}/api/settings/${key}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return (await r.json()).value ?? "";
}
async function putSetting(key: string, value: string): Promise<void> {
  const token = localStorage.getItem("rivora_token");
  const r = await fetch(`${API}/api/settings/${key}`, { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ value }) });
  if (!r.ok) throw new Error((await r.json()).message);
}
async function sendEmail(endpoint: string, payload: object): Promise<{ sent: number; failed?: number }> {
  const token = localStorage.getItem("rivora_token");
  const r = await fetch(`${API}/api/admin/email/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error((await r.json()).message);
  return r.json();
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [waUrl, setWaUrl] = useState(""); const [waLoading, setWaLoading] = useState(true); const [waSaving, setWaSaving] = useState(false);

  // Payment account settings
  const [bankName, setBankName] = useState(""); const [bankLoading, setBankLoading] = useState(true); const [bankSaving, setBankSaving] = useState(false);
  const [accountNumber, setAccountNumber] = useState(""); const [accountLoading, setAccountLoading] = useState(true); const [accountSaving, setAccountSaving] = useState(false);
  const [accountName, setAccountName] = useState(""); const [nameLoading, setNameLoading] = useState(true); const [nameSaving, setNameSaving] = useState(false);

  const [singleUserId, setSingleUserId] = useState(""); const [singleSubject, setSingleSubject] = useState(""); const [singleMessage, setSingleMessage] = useState(""); const [singleSending, setSingleSending] = useState(false);
  const [bulkSubject, setBulkSubject] = useState(""); const [bulkMessage, setBulkMessage] = useState(""); const [bulkSending, setBulkSending] = useState(false);

  // Load WhatsApp URL
  useEffect(() => { getSetting("whatsapp_url").then(setWaUrl).finally(() => setWaLoading(false)); }, []);
  const saveWaUrl = async () => { setWaSaving(true); try { await putSetting("whatsapp_url", waUrl.trim()); toast({ title: "Saved", description: "WhatsApp group link updated." }); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setWaSaving(false); } };

  // Load payment account settings
  useEffect(() => { getSetting("platform_bank_name").then(setBankName).finally(() => setBankLoading(false)); }, []);
  useEffect(() => { getSetting("platform_bank_account_number").then(setAccountNumber).finally(() => setAccountLoading(false)); }, []);
  useEffect(() => { getSetting("platform_bank_account_name").then(setAccountName).finally(() => setNameLoading(false)); }, []);

  const saveBankName = async () => { setBankSaving(true); try { await putSetting("platform_bank_name", bankName.trim()); toast({ title: "Saved", description: "Bank name updated." }); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setBankSaving(false); } };
  const saveAccountNumber = async () => { setAccountSaving(true); try { await putSetting("platform_bank_account_number", accountNumber.trim()); toast({ title: "Saved", description: "Account number updated." }); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setAccountSaving(false); } };
  const saveAccountName = async () => { setNameSaving(true); try { await putSetting("platform_bank_account_name", accountName.trim()); toast({ title: "Saved", description: "Account name updated." }); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } finally { setNameSaving(false); } };

  const handleSingleEmail = async () => {
    if (!singleUserId.trim() || !singleSubject.trim() || !singleMessage.trim()) { toast({ title: "Missing fields", description: "Fill in User ID, subject, and message.", variant: "destructive" }); return; }
    setSingleSending(true);
    try { const { sent } = await sendEmail("single", { userId: singleUserId.trim(), subject: singleSubject, message: singleMessage }); toast({ title: "Email sent", description: `${sent} email delivered.` }); setSingleUserId(""); setSingleSubject(""); setSingleMessage(""); }
    catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); } finally { setSingleSending(false); }
  };
  const handleBulkEmail = async () => {
    if (!bulkSubject.trim() || !bulkMessage.trim()) { toast({ title: "Missing fields", description: "Fill in subject and message.", variant: "destructive" }); return; }
    setBulkSending(true);
    try { const { sent, failed } = await sendEmail("bulk", { subject: bulkSubject, message: bulkMessage }); toast({ title: "Bulk email complete", description: `${sent} sent, ${failed ?? 0} failed.` }); setBulkSubject(""); setBulkMessage(""); }
    catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); } finally { setBulkSending(false); }
  };
  const taStyle: React.CSSProperties = { marginTop: 6, width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 13, padding: "10px 12px", resize: "vertical", outline: "none", boxSizing: "border-box" };
  return (
    <AdminLayout title="Settings">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 600 }}>
        {/* Payment Account Settings */}
        <Card style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>💳 Platform Payment Account</h2>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: "0 0 16px" }}>Bank details shown to users when they want to deposit money.</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={14} /> Bank Name
              </Label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Input 
                  placeholder="e.g. First Bank, Access Bank" 
                  value={bankLoading ? "Loading…" : bankName} 
                  onChange={(e) => setBankName(e.target.value)} 
                  disabled={bankLoading}
                  style={{ flex: 1 }}
                />
                <Button onClick={saveBankName} disabled={bankSaving || bankLoading} style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}>
                  {bankSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save
                </Button>
              </div>
            </div>

            <div>
              <Label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CreditCard size={14} /> Account Number
              </Label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Input 
                  placeholder="e.g. 3084567890" 
                  value={accountLoading ? "Loading…" : accountNumber} 
                  onChange={(e) => setAccountNumber(e.target.value)} 
                  disabled={accountLoading}
                  style={{ flex: 1 }}
                />
                <Button onClick={saveAccountNumber} disabled={accountSaving || accountLoading} style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}>
                  {accountSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save
                </Button>
              </div>
            </div>

            <div>
              <Label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <User size={14} /> Account Name
              </Label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Input 
                  placeholder="e.g. RIVORA INVESTMENT LIMITED" 
                  value={nameLoading ? "Loading…" : accountName} 
                  onChange={(e) => setAccountName(e.target.value)} 
                  disabled={nameLoading}
                  style={{ flex: 1 }}
                />
                <Button onClick={saveAccountName} disabled={nameSaving || nameLoading} style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}>
                  {nameSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>📱 WhatsApp Group Link</h2>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: "0 0 16px" }}>Shown as a green button on the welcome splash screen.</p>
          <Label>Group Invite URL</Label>
          <Input style={{ margin: "8px 0 14px" }} placeholder="https://chat.whatsapp.com/xxxxxxxxxxxxxxx" value={waLoading ? "Loading…" : waUrl} onChange={(e) => setWaUrl(e.target.value)} disabled={waLoading} />
          <Button onClick={saveWaUrl} disabled={waSaving || waLoading} style={{ display: "flex", gap: 8 }}>{waSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save Link</Button>
        </Card>
        <Card style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>✉️ Send Email to One User</h2>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: "0 0 16px" }}>Paste the user's ID from the Users page.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><Label>User ID</Label><Input style={{ marginTop: 6 }} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={singleUserId} onChange={(e) => setSingleUserId(e.target.value)} /></div>
            <div><Label>Subject</Label><Input style={{ marginTop: 6 }} placeholder="e.g. Your deposit was approved" value={singleSubject} onChange={(e) => setSingleSubject(e.target.value)} /></div>
            <div><Label>Message</Label><textarea rows={4} value={singleMessage} onChange={(e) => setSingleMessage(e.target.value)} placeholder="Write your message here…" style={taStyle} /></div>
            <Button onClick={handleSingleEmail} disabled={singleSending} style={{ display: "flex", gap: 8, alignSelf: "flex-start" }}>{singleSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}Send Email</Button>
          </div>
        </Card>
        <Card style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>📢 Send Bulk Email (All Users)</h2>
          <p style={{ fontSize: 12, color: "#9C9C9C", margin: "0 0 16px" }}>Sends to every user with an email address. Use carefully.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><Label>Subject</Label><Input style={{ marginTop: 6 }} placeholder="e.g. Platform maintenance notice" value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} /></div>
            <div><Label>Message</Label><textarea rows={5} value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} placeholder="Write your broadcast message here…" style={taStyle} /></div>
            <Button onClick={handleBulkEmail} disabled={bulkSending} style={{ display: "flex", gap: 8, alignSelf: "flex-start", background: "#D4AF37", color: "#0A0A0A" }}>{bulkSending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}Send to All Users</Button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
