import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetMe,
  useUpdateMyBankDetails,
  useChangePassword,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { clearToken } from "@/lib/auth";
import { User as UserIcon, Landmark, KeyRound, Share2, LogOut, Copy, Loader2, ChevronRight } from "lucide-react";

export default function ProfilePage() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [bankOpen, setBankOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const referralLink = user ? `${window.location.origin}/register?ref=${user.referralCode}` : "";

  const copyReferral = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(
      () => toast({ title: "Copied", description: "Referral link copied to clipboard." }),
      () => toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" }),
    );
  };

  const handleLogout = () => {
    clearToken();
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <AppLayout>
      <div style={{ padding: "24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", background: "rgba(212,175,55,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <UserIcon size={26} color="#D4AF37" />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 600, margin: 0, color: "#fff" }}>{user?.fullName}</p>
            <p style={{ fontSize: 13, color: "#9C9C9C", margin: "2px 0 0" }}>{user?.phone}</p>
          </div>
        </div>

        <Card style={{ padding: 18, marginBottom: 20, background: "linear-gradient(135deg, #141414, #050505)" }}>
          <p style={{ fontSize: 12, color: "#9C9C9C", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            Total Balance
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 0", color: "#fff" }}>
            {formatNaira(user?.balance ?? 0)}
          </p>
        </Card>

        <Card style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Share2 size={16} color="#D4AF37" />
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#fff" }}>Referral Code</p>
            </div>
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.06em", color: "#D4AF37", margin: "0 0 10px" }}>
            {user?.referralCode}
          </p>
          <Button variant="outline" size="sm" onClick={copyReferral} className="w-full">
            <Copy className="h-3.5 w-3.5 mr-2" />
            Copy Referral Link
          </Button>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          <SettingRow icon={Landmark} label="Bank Account Details" onClick={() => setBankOpen(true)} />
          <SettingRow icon={KeyRound} label="Change Password" onClick={() => setPasswordOpen(true)} />
        </div>

        <Button variant="outline" onClick={handleLogout} className="w-full">
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </Button>
      </div>

      <BankDetailsDialog open={bankOpen} onOpenChange={setBankOpen} />
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </AppLayout>
  );
}

function SettingRow({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
        padding: "16px", background: "#141414", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)",
        cursor: "pointer", textAlign: "left",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Icon size={18} color="#D4AF37" />
        <span style={{ fontSize: 14, color: "#e8eaec" }}>{label}</span>
      </div>
      <ChevronRight size={16} color="#9C9C9C" />
    </button>
  );
}

function BankDetailsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: user } = useGetMe();
  const updateBank = useUpdateMyBankDetails();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [bankName, setBankName] = useState(user?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(user?.bankAccountNumber ?? "");
  const [accountName, setAccountName] = useState(user?.bankAccountName ?? "");

  const handleSave = () => {
    updateBank.mutate(
      { data: { bankName, bankAccountNumber: accountNumber, bankAccountName: accountName } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: "Bank details saved" });
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast({ title: "Update failed", description: err?.data?.message || err?.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bank Account Details</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Label>Bank Name</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-2" placeholder="e.g. GTBank" />
          </div>
          <div>
            <Label>Account Number</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="mt-2" placeholder="0123456789" />
          </div>
          <div>
            <Label>Account Name</Label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="mt-2" placeholder="As it appears on your account" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateBank.isPending}>
            {updateBank.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const changePassword = useChangePassword();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const reset = () => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); };

  const handleSave = () => {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    changePassword.mutate(
      { data: { currentPassword, newPassword } },
      {
        onSuccess: () => {
          toast({ title: "Password changed" });
          reset();
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast({ title: "Change failed", description: err?.data?.message || err?.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-2" />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-2" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={changePassword.isPending}>
            {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
