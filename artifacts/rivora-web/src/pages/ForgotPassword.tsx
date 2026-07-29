import { Link } from "wouter";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

// Automated password recovery via email/SMS is explicitly out of scope for
// this release (see requirements doc section 7) -- there's no email on file
// and no SMS provider wired up. Instead, an admin can reset any user's
// password directly from Admin > Users (routes/users.ts PATCH /users/:id
// supports newPassword), so this page just points users at support.
export default function ForgotPasswordPage() {
  return (
    <div style={{ minHeight: "100dvh", padding: "40px 24px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%", background: "rgba(212,175,55,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
      }}>
        <LifeBuoy size={28} color="#D4AF37" />
      </div>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>Reset Your Password</h1>
      <p style={{ color: "#9C9C9C", fontSize: 14, lineHeight: 1.7, maxWidth: 320, marginBottom: 8 }}>
        For your security, password resets are handled by our support team.
        Reach out with your registered phone number and we'll help you regain access.
      </p>
      <p style={{ color: "#9C9C9C", fontSize: 13, marginBottom: 32 }}>
        Support hours: 8:00 AM – 6:00 PM daily
      </p>
      <Link href="/login" style={{ width: "100%", maxWidth: 280 }}>
        <Button className="w-full">Back to Sign In</Button>
      </Link>
    </div>
  );
}
