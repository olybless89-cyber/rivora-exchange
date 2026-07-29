// End-to-end smoke test against the LIVE RIVORA EXCHANGE backend.
// Run with: node scripts/smoke-test.mjs
//
// Exercises: registration + 3-level referral chain (A -> B -> C -> D),
// deposit approval + welcome bonus + referral commission math, minimum
// deposit enforcement, investment plans (flat 4% daily), investing +
// balance debit, withdrawal rules (min amount / time window), and the
// admin panel endpoints (users, deposits, withdrawals, plans, transactions).
//
// Nothing here touches your real production data except: it creates 4
// throwaway test users (phone numbers stamped with the current timestamp,
// so re-running is always safe/non-colliding), and one throwaway
// investment plan named "TEST-PLAN-DELETE-ME" which the script creates,
// edits, and deletes itself. Your real RIVO-LV1..10 plans and any real
// user accounts are never modified.

const API = "https://rivora-exchange.onrender.com/api";
const HEALTH_URL = "https://rivora-exchange.onrender.com/health";

const ADMIN_PHONE = "+2348000000001";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Rivora2025!";

const failures = [];
let passCount = 0;

function pass(label) {
  console.log(`  ✅ ${label}`);
  passCount++;
}
function fail(label, detail) {
  console.log(`  ❌ ${label}${detail ? " -- " + detail : ""}`);
  failures.push(label);
}
function section(title) {
  console.log(`\n=== ${title} ===`);
}
function approx(a, b, label) {
  // numeric compare tolerant of string/number/float rounding
  const na = Number(a), nb = Number(b);
  if (Math.abs(na - nb) < 0.01) pass(`${label} (${na})`);
  else fail(label, `expected ${nb}, got ${na}`);
}

async function api(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

const runId = Date.now().toString().slice(-9);
function phoneFor(tag) {
  return `+234901${runId}${tag}`.slice(0, 17);
}

async function main() {
  // -------------------------------------------------------------------
  section("Health check");
  try {
    const res = await fetch(HEALTH_URL);
    const body = await res.json();
    if (res.status === 200 && body.ok) pass(`Backend is live (${HEALTH_URL})`);
    else fail("Backend health check", `status ${res.status}: ${JSON.stringify(body)}`);
  } catch (e) {
    fail("Backend health check", e.message);
    console.log("\nBackend unreachable -- aborting remaining tests.");
    return summarize();
  }

  // -------------------------------------------------------------------
  section("Register referral chain: A -> B -> C -> D");
  const users = {};

  async function register(name, refCode) {
    const phone = phoneFor(name);
    const body = {
      phone,
      password: "TestPass123!",
      confirmPassword: "TestPass123!",
      fullName: `Smoke Test ${name}`,
      ...(refCode ? { referralCode: refCode } : {}),
    };
    const { status, data } = await api("POST", "/auth/register", body);
    if (status === 201 && data?.token) {
      pass(`Registered ${name} (${phone})`);
      users[name] = { phone, token: data.token, user: data.user };
      return true;
    }
    fail(`Register ${name}`, `status ${status}: ${JSON.stringify(data)}`);
    return false;
  }

  if (!(await register("A"))) return summarize();
  if (!(await register("B", users.A.user.referralCode))) return summarize();
  if (!(await register("C", users.B.user.referralCode))) return summarize();
  if (!(await register("D", users.C.user.referralCode))) return summarize();

  if (users.B.user.referredBy === users.A.user.id) pass("B correctly linked to A as referrer");
  else fail("B referredBy link", `expected ${users.A.user.id}, got ${users.B.user.referredBy}`);
  if (users.C.user.referredBy === users.B.user.id) pass("C correctly linked to B as referrer");
  else fail("C referredBy link", `expected ${users.B.user.id}, got ${users.C.user.referredBy}`);
  if (users.D.user.referredBy === users.C.user.id) pass("D correctly linked to C as referrer");
  else fail("D referredBy link", `expected ${users.C.user.id}, got ${users.D.user.referredBy}`);

  // -------------------------------------------------------------------
  section("Minimum deposit enforcement (must reject < ₦20,000)");
  {
    const { status, data } = await api("POST", "/deposit-requests", {
      amount: 15000,
      paymentMethod: "Bank Transfer",
    }, users.A.token);
    if (status === 400) pass(`Correctly rejected ₦15,000 deposit: "${data?.message}"`);
    else fail("Min deposit enforcement", `expected 400, got ${status}: ${JSON.stringify(data)}`);
  }

  // -------------------------------------------------------------------
  section("Submit deposits (A: ₦25,000, B: ₦25,000, C: ₦25,000, D: ₦100,000)");
  const depositAmounts = { A: 25000, B: 25000, C: 25000, D: 100000 };
  const depositRequestIds = {};
  for (const name of ["A", "B", "C", "D"]) {
    const { status, data } = await api("POST", "/deposit-requests", {
      amount: depositAmounts[name],
      paymentMethod: "Bank Transfer",
    }, users[name].token);
    if (status === 201 && data?.id) {
      pass(`${name} submitted deposit request for ₦${depositAmounts[name].toLocaleString()}`);
      depositRequestIds[name] = data.id;
    } else {
      fail(`${name} submit deposit`, `status ${status}: ${JSON.stringify(data)}`);
    }
  }

  // -------------------------------------------------------------------
  section("Admin login");
  let adminToken = null;
  {
    const { status, data } = await api("POST", "/auth/login", { phone: ADMIN_PHONE, password: ADMIN_PASSWORD });
    if (status === 200 && data?.token) {
      pass("Admin login succeeded");
      adminToken = data.token;
    } else {
      fail("Admin login", `status ${status}: ${JSON.stringify(data)} -- if you've already changed the admin password, rerun with: ADMIN_PASSWORD='your-current-password' node scripts/smoke-test.mjs`);
    }
  }
  if (!adminToken) {
    console.log("\nCannot continue without an admin token -- skipping approval/admin-panel tests.");
    return summarize();
  }

  // -------------------------------------------------------------------
  section("Admin approves deposits in order A -> B -> C -> D (checking referral payouts as we go)");
  for (const name of ["A", "B", "C", "D"]) {
    const { status, data } = await api("PATCH", `/deposit-requests/${depositRequestIds[name]}`, { status: "approved" }, adminToken);
    if (status === 200 && data?.status === "approved") pass(`Admin approved ${name}'s deposit`);
    else fail(`Approve ${name}'s deposit`, `status ${status}: ${JSON.stringify(data)}`);
  }

  section("Verify final balances (deposit + welcome bonus + cascaded referral commissions)");
  // Expected: A=34500 (27000 + 5000 from B L1 + 500 from C L2 + 2000 from D L3)
  //           B=34000 (27000 + 5000 from C L1 + 2000 from D L2)
  //           C=47000 (27000 + 20000 from D L1)
  //           D=102000 (100000 + 2000 welcome, no downline yet)
  const expectedBalances = { A: 34500, B: 34000, C: 47000, D: 102000 };
  const freshUser = {};
  for (const name of ["A", "B", "C", "D"]) {
    const { status, data } = await api("GET", "/auth/me", undefined, users[name].token);
    if (status === 200) {
      freshUser[name] = data;
      approx(data.balance, expectedBalances[name], `${name}'s final balance`);
    } else {
      fail(`Fetch ${name}'s balance`, `status ${status}`);
    }
  }

  section("Verify referral_bonus transaction records");
  for (const name of ["A", "B", "C"]) {
    const { status, data } = await api("GET", `/transactions?userId=${users[name].user.id}&type=referral_bonus`, undefined, users[name].token);
    if (status === 200 && Array.isArray(data)) {
      pass(`${name} has ${data.length} referral_bonus transaction(s): [${data.map((t) => t.amount).join(", ")}]`);
    } else {
      fail(`${name}'s referral_bonus transactions`, `status ${status}: ${JSON.stringify(data)}`);
    }
  }

  // -------------------------------------------------------------------
  section("Investment plans: confirm all 10 RIVO-LV tiers pay flat 4% daily");
  {
    const { status, data } = await api("GET", "/investment-plans", undefined, users.A.token);
    if (status === 200 && Array.isArray(data)) {
      const wrongRate = data.filter((p) => Number(p.dailyRate) !== 4);
      if (data.length >= 10 && wrongRate.length === 0) {
        pass(`All ${data.length} plans confirmed at 4% daily`);
      } else if (wrongRate.length > 0) {
        fail("Investment plan rates", `these plans are NOT at 4%: ${wrongRate.map((p) => `${p.name}=${p.dailyRate}%`).join(", ")}`);
      } else {
        fail("Investment plan count", `expected >=10 plans, found ${data.length}`);
      }
    } else {
      fail("List investment plans", `status ${status}`);
    }
  }

  // -------------------------------------------------------------------
  section("Invest ₦20,000 as A into RIVO-LV1, confirm balance debit");
  {
    const { status: listStatus, data: plans } = await api("GET", "/investment-plans?activeOnly=true", undefined, users.A.token);
    const lv1 = Array.isArray(plans) ? plans.find((p) => p.name === "RIVO-LV1") : null;
    if (listStatus === 200 && lv1) {
      const { status, data } = await api("POST", "/investments", { planId: lv1.id, amount: 20000 }, users.A.token);
      if (status === 201 && data?.id) {
        pass(`A invested ₦20,000 into RIVO-LV1 (dailyRate snapshot: ${data.dailyRate}%)`);
        const { data: meAfter } = await api("GET", "/auth/me", undefined, users.A.token);
        approx(meAfter.balance, expectedBalances.A - 20000, "A's balance after investment");
      } else {
        fail("Create investment", `status ${status}: ${JSON.stringify(data)}`);
      }
    } else {
      fail("Find RIVO-LV1 plan", `status ${listStatus}: ${JSON.stringify(plans)}`);
    }
  }

  // -------------------------------------------------------------------
  section("Withdrawal rules (min ₦10,000, 20% fee, 7PM-11PM Mon-Sat Africa/Lagos)");
  {
    const { status, data } = await api("POST", "/withdrawal-requests", {
      amount: 12000,
      bankName: "GTBank",
      bankAccountNumber: "0123456789",
      bankAccountName: "Smoke Test A",
    }, users.A.token);

    if (status === 201 && data?.id) {
      const expectedFee = 12000 * 0.2;
      const expectedNet = 12000 - expectedFee;
      pass(`Withdrawal accepted (inside the allowed window right now) -- fee ₦${data.fee}, net ₦${data.netAmount}`);
      approx(data.fee, expectedFee, "20% fee calculated correctly");
      approx(data.netAmount, expectedNet, "Net amount calculated correctly");

      // Admin approve/list round-trip, only possible if a request exists
      const { status: listStatus, data: listData } = await api("GET", "/withdrawal-requests?status=pending", undefined, adminToken);
      if (listStatus === 200 && Array.isArray(listData) && listData.some((w) => w.id === data.id)) {
        pass("Admin can see the pending withdrawal request");
      } else {
        fail("Admin withdrawal list", `status ${listStatus}`);
      }
      const { status: approveStatus } = await api("PATCH", `/withdrawal-requests/${data.id}`, { status: "approved" }, adminToken);
      if (approveStatus === 200) pass("Admin approved the withdrawal request");
      else fail("Admin approve withdrawal", `status ${approveStatus}`);
    } else if (status === 400 && /Withdrawals are only available/.test(data?.message || "")) {
      pass(`Correctly blocked outside the withdrawal window: "${data.message}" (this is expected if it's not currently 7PM-11PM WAT, Mon-Sat -- not a bug)`);
    } else {
      fail("Withdrawal request", `status ${status}: ${JSON.stringify(data)}`);
    }
  }

  // -------------------------------------------------------------------
  section("Admin: user management round-trip (deactivate D, confirm login blocked, reactivate)");
  {
    const { status: deactivateStatus } = await api("PATCH", `/users/${users.D.user.id}`, { status: "inactive" }, adminToken);
    if (deactivateStatus === 200) pass("Admin deactivated D");
    else fail("Deactivate D", `status ${deactivateStatus}`);

    const { status: loginStatus, data: loginData } = await api("POST", "/auth/login", { phone: users.D.phone, password: "TestPass123!" });
    if (loginStatus === 403) pass(`Deactivated user correctly blocked from logging in: "${loginData?.message}"`);
    else fail("Deactivated user login block", `expected 403, got ${loginStatus}`);

    const { status: reactivateStatus } = await api("PATCH", `/users/${users.D.user.id}`, { status: "active" }, adminToken);
    if (reactivateStatus === 200) pass("Admin reactivated D");
    else fail("Reactivate D", `status ${reactivateStatus}`);

    const { status: loginStatus2 } = await api("POST", "/auth/login", { phone: users.D.phone, password: "TestPass123!" });
    if (loginStatus2 === 200) pass("D can log in again after reactivation");
    else fail("Reactivated user login", `expected 200, got ${loginStatus2}`);
  }

  // -------------------------------------------------------------------
  section("Admin: investment plan CRUD (create/edit/delete a throwaway test plan)");
  {
    const { status: createStatus, data: created } = await api("POST", "/investment-plans", {
      name: "TEST-PLAN-DELETE-ME",
      dailyRate: 1,
      minAmount: 1000,
      durationDays: 1,
      isActive: false,
    }, adminToken);
    if (createStatus === 201 && created?.id) {
      pass("Admin created a test plan");
      const { status: editStatus } = await api("PATCH", `/investment-plans/${created.id}`, { dailyRate: 5 }, adminToken);
      if (editStatus === 200) pass("Admin edited the test plan's rate");
      else fail("Edit test plan", `status ${editStatus}`);

      const { status: deleteStatus } = await api("DELETE", `/investment-plans/${created.id}`, undefined, adminToken);
      if (deleteStatus === 204) pass("Admin deleted the test plan (cleaned up)");
      else fail("Delete test plan", `status ${deleteStatus}`);
    } else {
      fail("Create test plan", `status ${createStatus}: ${JSON.stringify(created)}`);
    }
  }

  // -------------------------------------------------------------------
  section("Admin: transactions ledger visibility");
  {
    const { status, data } = await api("GET", "/transactions", undefined, adminToken);
    if (status === 200 && Array.isArray(data)) {
      const referralTx = data.filter((t) => t.type === "referral_bonus");
      pass(`Admin can see the full transaction ledger (${data.length} total, ${referralTx.length} referral_bonus entries)`);
    } else {
      fail("Admin transaction ledger", `status ${status}`);
    }
  }

  return summarize();
}

function summarize() {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`RESULT: ${passCount} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log("\nFailed checks:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log("\nAll checks passed.");
  }
}

main().catch((e) => {
  console.error("Script crashed:", e);
  process.exitCode = 1;
});
