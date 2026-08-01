import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { phoneToEmail } from "@/lib/supabase/api";
import { useTenant } from "@/context/TenantContext";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Splash } from "@/components/Splash";

const loginSchema = z.object({
  phone: z.string().min(10, "Enter your phone number"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { tenant } = useTenant();
  const { refreshUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    try {
      const email = phoneToEmail(values.phone);
      const { error } = await supabase.auth.signInWithPassword({ email, password: values.password });
      if (error) throw new Error(error.message);
      await refreshUser();
      setLocation("/dashboard");
    } catch (err: unknown) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Invalid phone or password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const primary = tenant?.primary_color ?? "#D4AF37";

  return (
    <>
      <Splash />
      <div style={{ minHeight: "100dvh", padding: "40px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          {tenant?.logo_url
            ? <img src={tenant.logo_url} alt={tenant.name} style={{ width: 72, height: 72, objectFit: "contain", margin: "0 auto 12px" }} />
            : <div style={{ width: 72, height: 72, borderRadius: 16, background: primary, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#000" }}>{(tenant?.name ?? "R")[0]}</div>
          }
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Welcome Back</h1>
          <p style={{ color: "#9C9C9C", fontSize: 13, marginTop: 4 }}>Sign in to your {tenant?.name ?? "account"}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", padding: "0 12px", height: 44, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e8eaec", fontSize: 14 }}>+234</div>
                    <Input placeholder="803 123 4567" {...field} style={{ height: 44 }} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div style={{ position: "relative" }}>
                    <Input type={showPassword ? "text" : "password"} placeholder="Enter password" {...field} style={{ height: 44, paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9C9C9C" }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" disabled={loading} className="w-full" style={{ background: primary, color: "#000", fontWeight: 700, fontSize: 15, height: 48 }}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </Form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#9C9C9C" }}>
          Don't have an account?{" "}
          <a href="/register" style={{ color: primary, textDecoration: "none", fontWeight: 600 }}>Register</a>
        </p>
      </div>
    </>
  );
}
