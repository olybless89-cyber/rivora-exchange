import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = {
  id: number;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastInput = Omit<Toast, "id">;

const ToastContext = createContext<{
  toasts: Toast[];
  toast: (t: ToastInput) => void;
} | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: ToastInput) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return <ToastContext.Provider value={{ toasts, toast }}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function Toaster() {
  const { toasts } = useToast();
  return (
    <div style={{
      position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, width: "calc(100% - 32px)", maxWidth: 400,
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.variant === "destructive" ? "#2A1113" : "#141414",
          border: `1px solid ${t.variant === "destructive" ? "#C0392B" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 10, padding: "12px 16px", color: "#e8eaec",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t.title}</div>
          {t.description && <div style={{ fontSize: 13, color: "#9C9C9C", marginTop: 4 }}>{t.description}</div>}
        </div>
      ))}
    </div>
  );
}
