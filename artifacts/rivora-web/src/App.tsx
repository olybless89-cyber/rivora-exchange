import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Redirect } from "wouter";
import { ToastProvider, Toaster } from "@/hooks/use-toast";
import { TenantProvider } from "@/context/TenantContext";
import { AuthProvider } from "@/context/AuthContext";

import RegisterPage from "@/pages/Register";
import LoginPage from "@/pages/Login";
import ForgotPasswordPage from "@/pages/ForgotPassword";
import DashboardPage from "@/pages/Dashboard";
import InvestPage from "@/pages/Invest";
import MyInvestmentsPage from "@/pages/MyInvestments";
import DepositPage from "@/pages/Deposit";
import WithdrawPage from "@/pages/Withdraw";
import HistoryPage from "@/pages/History";
import ProfilePage from "@/pages/Profile";
import PaymentCallbackPage from "@/pages/PaymentCallback";
import NotFoundPage from "@/pages/NotFound";

import AdminUsersPage from "@/pages/admin/Users";
import AdminDepositsPage from "@/pages/admin/Deposits";
import AdminWithdrawalsPage from "@/pages/admin/Withdrawals";
import AdminPlansPage from "@/pages/admin/Plans";
import AdminTransactionsPage from "@/pages/admin/Transactions";
import AdminSettingsPage from "@/pages/admin/Settings";
import AdminDashboardPage from "@/pages/admin/Index";
import SuperAdminPage from "@/pages/superadmin/Index";
import SuperAdminTenantsPage from "@/pages/superadmin/Tenants";
import SuperAdminTenantEditPage from "@/pages/superadmin/TenantEdit";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/invest" component={InvestPage} />
      <Route path="/my-investments" component={MyInvestmentsPage} />
      <Route path="/deposit" component={DepositPage} />
      <Route path="/withdraw" component={WithdrawPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/payment-callback" component={PaymentCallbackPage} />
      <Route path="/admin" component={AdminDashboardPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/deposits" component={AdminDepositsPage} />
      <Route path="/admin/withdrawals" component={AdminWithdrawalsPage} />
      <Route path="/admin/plans" component={AdminPlansPage} />
      <Route path="/admin/transactions" component={AdminTransactionsPage} />
      <Route path="/admin/settings" component={AdminSettingsPage} />
      {/* Super-admin routes */}
      <Route path="/superadmin" component={SuperAdminPage} />
      <Route path="/superadmin/tenants" component={SuperAdminTenantsPage} />
      <Route path="/superadmin/tenants/:id" component={SuperAdminTenantEditPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <AuthProvider>
          <ToastProvider>
            <Router />
            <Toaster />
          </ToastProvider>
        </AuthProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}
