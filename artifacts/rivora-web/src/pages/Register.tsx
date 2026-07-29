import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const fullSchema = z
  .object({
    phone: z.string().min(10, "Enter a valid Nigerian phone number"),
    fullName: z.string().min(1, "Full name is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FullValues = z.infer<typeof fullSchema>;

function randomCaptcha(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [captcha, setCaptcha] = useState(randomCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const form = useForm<FullValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: { phone: "", fullName: "", password: "", confirmPassword: "", referralCode: "" },
  });

  const stepFields = useMemo(
    () => ({
      1: ["phone"] as const,
      2: ["fullName", "password", "confirmPassword", "referralCode"] as const,
    }),
    [],
  );

  const goNext = async () => {
    const fields = stepFields[step as 1 | 2];
    const valid = await form.trigger(fields as any);
    if (valid) setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const refreshCaptcha = () => {
    setCaptcha(randomCaptcha());
    setCaptchaInput("");
    setCaptchaError(null);
  };

  const onSubmit = (values: FullValues) => {
    if (captchaInput !== captcha) {
      setCaptchaError("Incorrect code, please try again.");
      refreshCaptcha();
      return;
    }

    registerMutation.mutate(
      {
        data: {
          phone: values.phone,
          fullName: values.fullName,
          password: values.password,
          confirmPassword: values.confirmPassword,
          referralCode: values.referralCode || undefined,
        },
      },
      {
        onSuccess: (res) => {
          setToken(res.token);
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          toast({
            title: "Registration failed",
            description: err?.data?.message || err?.message || "Please try again.",
            variant: "destructive",
          });
          refreshCaptcha();
        },
      },
    );
  };

  return (
    <div style={{ minHeight: "100dvh", padding: "40px 24px", display: "flex", flexDirection: "column" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img src="/rivora-logo.png" alt="RIVORA EXCHANGE" style={{ width: 64, height: 64, objectFit: "contain", margin: "0 auto 12px" }} />
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Create Account</h1>
        <p style={{ color: "#8b95a1", fontSize: 13, marginTop: 4 }}>Join RIVORA EXCHANGE — Trade. Invest. Grow.</p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? "#00A300" : "rgba(255,255,255,0.1)" }} />
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {step === 1 && (
            <>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{
                          display: "flex", alignItems: "center", padding: "0 12px", height: 44,
                          background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e8eaec", fontSize: 14,
                        }}>+234</div>
                        <Input placeholder="803 123 4567" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="button" onClick={goNext} className="w-full">Continue</Button>
            </>
          )}

          {step === 2 && (
            <>
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div style={{ position: "relative" }}>
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", color: "#8b95a1", cursor: "pointer" }}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div style={{ position: "relative" }}>
                        <Input type={showConfirm ? "text" : "password"} placeholder="••••••••" {...field} />
                        <button type="button" onClick={() => setShowConfirm((v) => !v)} style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", color: "#8b95a1", cursor: "pointer" }}>
                          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral Code (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g. AB12CD" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div style={{ display: "flex", gap: 12 }}>
                <Button type="button" variant="outline" onClick={goBack} className="flex-1">Back</Button>
                <Button type="button" onClick={goNext} className="flex-1">Continue</Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <FormLabel>Verify You're Human</FormLabel>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(0,163,0,0.08)", border: "1px solid rgba(0,163,0,0.3)", borderRadius: 8,
                  padding: "12px 16px", marginTop: 8, marginBottom: 12,
                }}>
                  <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 6, color: "#e8eaec", textDecoration: "line-through", fontStyle: "italic" }}>{captcha}</span>
                  <button type="button" onClick={refreshCaptcha} style={{ background: "none", border: "none", color: "#00A300", cursor: "pointer" }}>
                    <RefreshCw size={18} />
                  </button>
                </div>
                <Input
                  placeholder="Enter the code above"
                  value={captchaInput}
                  onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(null); }}
                />
                {captchaError && <p style={{ color: "#e31937", fontSize: 12, marginTop: 6 }}>{captchaError}</p>}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <Button type="button" variant="outline" onClick={goBack} className="flex-1">Back</Button>
                <Button type="submit" disabled={registerMutation.isPending || captchaInput.length !== 4} className="flex-1">
                  {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>

      <p style={{ textAlign: "center", color: "#8b95a1", fontSize: 13, marginTop: 28 }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#00A300", textDecoration: "none" }}>Sign in</Link>
      </p>
    </div>
  );
}
