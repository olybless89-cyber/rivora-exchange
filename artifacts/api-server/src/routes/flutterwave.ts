import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, depositRequestsTable, transactionsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth-middleware.js";
import { generateReference } from "../lib/reference.js";

const router: IRouter = Router();

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY ?? "";
const FLW_WEBHOOK_HASH = process.env.FLUTTERWAVE_WEBHOOK_HASH ?? "";
const FLW_BASE_URL = "https://api.flutterwave.com/v3";

const MIN_DEPOSIT = 20_000; // NGN
const WELCOME_BONUS = 2_000;
const REFERRAL_LEVEL_RATES = [0.10, 0.02, 0.02];

// ---------------------------------------------------------------------------
// POST /api/flutterwave/initiate
// Creates a Flutterwave payment link (standard/inline) and persists a pending
// deposit request so we can reconcile the webhook later.
// ---------------------------------------------------------------------------
router.post("/flutterwave/initiate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { amount, currency = "NGN", redirectUrl } = req.body as {
    amount?: number;
    currency?: string;
    redirectUrl?: string;
  };

  if (!amount || isNaN(amount) || amount < MIN_DEPOSIT) {
    res.status(400).json({ message: `Minimum deposit is ₦${MIN_DEPOSIT.toLocaleString()}` });
    return;
  }

  const SUPPORTED = ["NGN", "USD", "GHS", "KES", "ZAR"];
  if (!SUPPORTED.includes(currency)) {
    res.status(400).json({ message: `Unsupported currency. Supported: ${SUPPORTED.join(", ")}` });
    return;
  }

  const user = req.user!;
  const txRef = `RIVO-FLW-${crypto.randomUUID()}`;

  // Persist a pending deposit request right away so we can match on webhook
  const [depositReq] = await db
    .insert(depositRequestsTable)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      amount: String(amount),
      paymentMethod: `Flutterwave (${currency})`,
      proofUrl: txRef, // re-using proofUrl column to store tx_ref for matching
      status: "pending",
    })
    .returning();

  // Call Flutterwave Standard API to generate a hosted payment link
  const payload = {
    tx_ref: txRef,
    amount,
    currency,
    redirect_url: redirectUrl || `${process.env.FRONTEND_URL ?? ""}/payment-callback`,
    customer: {
      email: `${user.phone.replace("+", "")}@rivora.app`,
      phonenumber: user.phone,
      name: user.fullName,
    },
    customizations: {
      title: "Rivora Exchange",
      description: `Fund your Rivora account (${currency})`,
      logo: `${process.env.FRONTEND_URL ?? ""}/rivora-logo.png`,
    },
    meta: {
      deposit_request_id: depositReq.id,
      user_id: user.id,
    },
  };

  const flwRes = await fetch(`${FLW_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const flwData = (await flwRes.json()) as { status: string; data?: { link: string }; message?: string };

  if (!flwRes.ok || flwData.status !== "success") {
    // Roll back the pending deposit request on Flutterwave API failure
    await db.delete(depositRequestsTable).where(eq(depositRequestsTable.id, depositReq.id));
    res.status(502).json({ message: flwData.message ?? "Failed to initiate payment" });
    return;
  }

  res.status(201).json({
    paymentLink: flwData.data!.link,
    txRef,
    depositRequestId: depositReq.id,
  });
});

// ---------------------------------------------------------------------------
// GET /api/flutterwave/verify/:txRef
// Called by the frontend after redirect_url callback to confirm payment status.
// ---------------------------------------------------------------------------
router.get("/flutterwave/verify/:txRef", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const txRef = req.params.txRef;

  if (!txRef?.startsWith("RIVO-FLW-")) {
    res.status(400).json({ message: "Invalid transaction reference" });
    return;
  }

  // Find the matching deposit request (proofUrl stores txRef)
  const [depositReq] = await db
    .select()
    .from(depositRequestsTable)
    .where(eq(depositRequestsTable.proofUrl, txRef));

  if (!depositReq) {
    res.status(404).json({ message: "Deposit request not found" });
    return;
  }

  // Non-admins can only verify their own transactions
  if (req.user!.role !== "admin" && depositReq.userId !== req.user!.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  // Already processed — return current status
  if (depositReq.status !== "pending") {
    res.json({ status: depositReq.status, depositRequest: depositReq });
    return;
  }

  // Verify with Flutterwave
  const flwRes = await fetch(
    `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } },
  );

  const flwData = (await flwRes.json()) as {
    status: string;
    data?: { status: string; amount: number; currency: string };
    message?: string;
  };

  if (!flwRes.ok || flwData.status !== "success") {
    res.status(502).json({ message: flwData.message ?? "Verification failed" });
    return;
  }

  const txData = flwData.data!;
  if (txData.status === "successful") {
    await _creditDeposit(depositReq.id, depositReq.userId, Number(depositReq.amount), `Flutterwave (${txData.currency})`);
    const [updated] = await db.select().from(depositRequestsTable).where(eq(depositRequestsTable.id, depositReq.id));
    res.json({ status: "approved", depositRequest: updated });
  } else if (txData.status === "failed" || txData.status === "cancelled") {
    await db
      .update(depositRequestsTable)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(eq(depositRequestsTable.id, depositReq.id));
    res.json({ status: "rejected" });
  } else {
    res.json({ status: "pending" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/flutterwave/webhook
// Receives Flutterwave event notifications. Verified via secret hash header.
// ---------------------------------------------------------------------------
router.post("/flutterwave/webhook", async (req: Request, res: Response): Promise<void> => {
  // Verify webhook signature
  const signature = req.headers["verif-hash"];
  if (!FLW_WEBHOOK_HASH || signature !== FLW_WEBHOOK_HASH) {
    res.status(401).json({ message: "Invalid webhook signature" });
    return;
  }

  const event = req.body as {
    event?: string;
    data?: {
      status: string;
      tx_ref: string;
      amount: number;
      currency: string;
      id: number;
    };
  };

  if (event.event !== "charge.completed" || !event.data) {
    res.json({ received: true });
    return;
  }

  const { tx_ref, status, currency } = event.data;

  if (!tx_ref?.startsWith("RIVO-FLW-")) {
    res.json({ received: true });
    return;
  }

  const [depositReq] = await db
    .select()
    .from(depositRequestsTable)
    .where(eq(depositRequestsTable.proofUrl, tx_ref));

  if (!depositReq || depositReq.status !== "pending") {
    res.json({ received: true, note: "already processed or not found" });
    return;
  }

  if (status === "successful") {
    await _creditDeposit(depositReq.id, depositReq.userId, Number(depositReq.amount), `Flutterwave (${currency})`);
  } else if (status === "failed" || status === "cancelled") {
    await db
      .update(depositRequestsTable)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(eq(depositRequestsTable.id, depositReq.id));
  }

  res.json({ received: true });
});

// ---------------------------------------------------------------------------
// Internal helper — credits a deposit, welcome bonus, and referral commissions.
// Idempotent: no-ops if deposit request is already non-pending.
// ---------------------------------------------------------------------------
async function _creditDeposit(
  depositRequestId: string,
  userId: string,
  depositAmount: number,
  paymentMethod: string,
): Promise<void> {
  await db.transaction(async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
    // Lock and re-check status to prevent double-credit
    const [req] = await tx
      .select()
      .from(depositRequestsTable)
      .where(eq(depositRequestsTable.id, depositRequestId));

    if (!req || req.status !== "pending") return;

    await tx
      .update(depositRequestsTable)
      .set({ status: "approved", reviewedAt: new Date() })
      .where(eq(depositRequestsTable.id, depositRequestId));

    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return;

    let newBalance = Number(user.balance) + depositAmount;

    await tx.insert(transactionsTable).values({
      id: crypto.randomUUID(),
      userId: user.id,
      type: "deposit",
      amount: String(depositAmount),
      status: "completed",
      reference: generateReference(),
      description: `Deposit via ${paymentMethod}`,
    });

    // Referral commissions (up to 3 levels)
    let ancestorId: string | null = user.referredBy;
    for (let level = 0; level < REFERRAL_LEVEL_RATES.length && ancestorId; level++) {
      const [ancestor] = await tx.select().from(usersTable).where(eq(usersTable.id, ancestorId));
      if (!ancestor) break;

      const rate = REFERRAL_LEVEL_RATES[level];
      const commission = Math.round(depositAmount * rate * 100) / 100;

      if (commission > 0) {
        await tx.insert(transactionsTable).values({
          id: crypto.randomUUID(),
          userId: ancestor.id,
          type: "referral_bonus",
          amount: String(commission),
          status: "completed",
          reference: generateReference(),
          description: `Level ${level + 1} referral commission from ${user.fullName}'s deposit`,
        });

        await tx
          .update(usersTable)
          .set({
            balance: String(Number(ancestor.balance) + commission),
            updatedAt: new Date(),
          })
          .where(eq(usersTable.id, ancestor.id));
      }

      ancestorId = ancestor.referredBy;
    }

    // Welcome bonus — first deposit only
    const shouldCreditWelcomeBonus = !user.hasReceivedWelcomeBonus;
    if (shouldCreditWelcomeBonus) {
      newBalance += WELCOME_BONUS;
      await tx.insert(transactionsTable).values({
        id: crypto.randomUUID(),
        userId: user.id,
        type: "bonus",
        amount: String(WELCOME_BONUS),
        status: "completed",
        reference: generateReference(),
        description: "Welcome bonus (first deposit)",
      });
    }

    await tx
      .update(usersTable)
      .set({
        balance: String(newBalance),
        hasReceivedWelcomeBonus: shouldCreditWelcomeBonus ? true : user.hasReceivedWelcomeBonus,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user.id));
  });
}

export default router;
