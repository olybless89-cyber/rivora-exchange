import { Link } from "wouter";
import { CompassIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: "100dvh", padding: "40px 24px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%", background: "rgba(0,163,0,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
      }}>
        <CompassIcon size={28} color="#00A300" />
      </div>
      <h1 style={{ fontSize: 44, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>404</h1>
      <p style={{ color: "#8b95a1", fontSize: 14, lineHeight: 1.7, maxWidth: 300, marginBottom: 28 }}>
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link href="/dashboard" style={{ width: "100%", maxWidth: 280 }}>
        <Button className="w-full">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
