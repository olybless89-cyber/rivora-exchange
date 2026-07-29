import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { HeroBanner } from "@/components/HeroBanner";
import { Splash } from "@/components/Splash";

const loginSchema = z.object({
  phone: z.string().min(10, "Enter your phone number"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (res) => { setToken(res.token); setLocation("/dashboard"); },
      onError: (err: any) => {
        toast({ title: "Login failed", description: err?.data?.message || err?.message || "Invalid phone number or password.", variant: "destructive" });
      },
    });
  };

  return (
    <>
      <Splash />
      <div style={{ minHeight: "100dvh", padding: "40px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <img src="/rivora-logo.png" alt="RIVORA EXCHANGE" style={{ width: 72, height: 72, objectFit: "contain", margin: "0 auto 12px" }} />
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 600, margin: 0 }}>Welcome Back</h1>
          <p style={{ color: "#9C9C9C", fontSize: 13, marginTop: 4 }}>Sign in to your RIVORA EXCHANGE account</p>
        </div>
        <HeroBanner />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", padding: "0 12px", height: 44, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e8eaec", fontSize: 14 }}>+234</div>
                    <Input placeholder="803 123 4567" {...field} />
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
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", color: "#9C9C9C", cursor: "pointer" }}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div style={{ textAlign: "right", marginTop: -12 }}>
              <Link href="/forgot-password" style={{ color: "#D4AF37", fontSize: 12, textDecoration: "none" }}>Forgot password?</Link>
            </div>
            <Button type="submit" disabled={loginMutation.isPending} className="w-full">
              {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </Form>
        <p style={{ textAlign: "center", color: "#9C9C9C", fontSize: 13, marginTop: 28 }}>
          Don't have an account?{" "}
          <Link href="/register" style={{ color: "#D4AF37", textDecoration: "none" }}>Register</Link>
        </p>
      </div>
    </>
  );
}
