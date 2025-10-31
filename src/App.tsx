import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { MaskValuesProvider } from "@/hooks/useMaskValues";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageMeta } from "@/components/seo/PageMeta";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AccountsList from "./pages/AccountsList";
import AccountDetails from "./pages/AccountDetails";
import Goals from "./pages/Goals";
import InvestmentsList from "./pages/InvestmentsList";
import InvestmentDetails from "./pages/InvestmentDetails";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Conta from "./pages/Conta";
import Planos from "./pages/Planos";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading: isCheckingAdmin } = useIsAdmin();

  if (loading || isCheckingAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageMeta />
          <AuthProvider>
            <MaskValuesProvider>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="contas" element={<AccountsList />} />
                <Route path="contas/:accountId" element={<AccountDetails />} />
                <Route path="metas" element={<Goals />} />
                <Route path="investimentos" element={<InvestmentsList />} />
                <Route path="investimentos/:investmentId" element={<InvestmentDetails />} />
                <Route path="configuracoes" element={<Settings />} />
                <Route path="conta" element={<Conta />} />
                <Route path="planos" element={<Planos />} />
                <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </MaskValuesProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
