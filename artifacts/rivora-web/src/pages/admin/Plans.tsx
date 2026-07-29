import { useState } from "react";
import {
  useListInvestmentPlans,
  useCreateInvestmentPlan,
  useUpdateInvestmentPlan,
  useDeleteInvestmentPlan,
  getListInvestmentPlansQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";

const emptyForm = { name: "", dailyRate: "", minAmount: "", durationDays: "", isActive: true };

export default function AdminPlansPage() {
  const { data: plans, isLoading } = useListInvestmentPlans();
  const deletePlan = useDeleteInvestmentPlan();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const handleDelete = (id: string) => {
    deletePlan.mutate(
      { planId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvestmentPlansQueryKey() });
          toast({ title: "Plan deleted" });
        },
        onError: (err: any) => {
          toast({ title: "Delete failed", description: err?.data?.message || err?.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <AdminLayout title="Investment Plans">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Plan
        </Button>
      </div>

      {isLoading && <p style={{ color: "#8b95a1" }}>Loading plans…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(plans ?? []).map((plan) => (
          <Card key={plan.id} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#fff" }}>
                  {plan.name}
                  {!plan.isActive && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#8b95a1", border: "1px solid #8b95a1", borderRadius: 6, padding: "1px 6px" }}>INACTIVE</span>
                  )}
                </p>
                <p style={{ fontSize: 12, color: "#8b95a1", margin: "3px 0 0" }}>Min {formatNaira(plan.minAmount)} · {plan.durationDays} days</p>
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#00A300", margin: 0 }}>
                {Number(plan.dailyRate)}%<span style={{ fontSize: 10, fontWeight: 400, color: "#8b95a1" }}>/day</span>
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingPlan(plan)}>Edit</Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDelete(plan.id)} disabled={deletePlan.isPending}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {!isLoading && (plans ?? []).length === 0 && (
          <p style={{ color: "#8b95a1", textAlign: "center", padding: 24 }}>No investment plans yet.</p>
        )}
      </div>

      <PlanFormDialog mode="edit" plan={editingPlan} open={!!editingPlan} onOpenChange={(o) => !o && setEditingPlan(null)} />
      <PlanFormDialog mode="create" plan={null} open={creating} onOpenChange={setCreating} />
    </AdminLayout>
  );
}

function PlanFormDialog({
  mode, plan, open, onOpenChange,
}: {
  mode: "create" | "edit";
  plan: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createPlan = useCreateInvestmentPlan();
  const updatePlan = useUpdateInvestmentPlan();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const pending = mode === "create" ? createPlan.isPending : updatePlan.isPending;

  const set = (key: keyof typeof emptyForm) => (e: any) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    if (!form.name || !form.dailyRate || !form.minAmount || !form.durationDays) {
      toast({ title: "Missing fields", description: "Please fill in all plan fields.", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name,
      dailyRate: Number(form.dailyRate),
      minAmount: Number(form.minAmount),
      durationDays: Number(form.durationDays),
      isActive: form.isActive,
    };

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListInvestmentPlansQueryKey() });
      toast({ title: mode === "create" ? "Plan created" : "Plan updated" });
      onOpenChange(false);
    };
    const onError = (err: any) => {
      toast({ title: "Save failed", description: err?.data?.message || err?.message, variant: "destructive" });
    };

    if (mode === "create") {
      createPlan.mutate({ data: payload }, { onSuccess, onError });
    } else if (plan) {
      updatePlan.mutate({ planId: plan.id, data: payload }, { onSuccess, onError });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setForm(
            plan
              ? {
                  name: plan.name,
                  dailyRate: String(plan.dailyRate),
                  minAmount: String(plan.minAmount),
                  durationDays: String(plan.durationDays),
                  isActive: plan.isActive,
                }
              : emptyForm,
          );
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Investment Plan" : `Edit ${plan?.name}`}</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Label>Plan Name</Label>
            <Input placeholder="e.g. RIVO-LV1" value={form.name} onChange={set("name")} className="mt-2" />
          </div>
          <div>
            <Label>Minimum Amount (₦)</Label>
            <Input type="number" value={form.minAmount} onChange={set("minAmount")} className="mt-2" />
          </div>
          <div>
            <Label>Daily Rate (%)</Label>
            <Input type="number" step="0.01" value={form.dailyRate} onChange={set("dailyRate")} className="mt-2" />
          </div>
          <div>
            <Label>Duration (days)</Label>
            <Input type="number" value={form.durationDays} onChange={set("durationDays")} className="mt-2" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#e8eaec" }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Active (visible to users)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
