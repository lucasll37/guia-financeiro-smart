import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { MaskValuesProvider } from "@/hooks/useMaskValues";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageMeta } from "@/components/seo/PageMeta";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Categories from "./pages/Categories";
import Transactions from "./pages/Transactions";
import Forecasts from "./pages/Forecasts";
import Analysis from "./pages/Analysis";
import Goals from "./pages/Goals";
import Investments from "./pages/Investments";
import CreditCards from "./pages/CreditCards";
import Reports from "./pages/Reports";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MaskValuesProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PageMeta />
            <AuthProvider>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
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
                <Route path="contas" element={<Accounts />} />
                <Route path="categorias" element={<Categories />} />
                <Route path="lancamentos" element={<Transactions />} />
                <Route path="cartoes" element={<CreditCards />} />
                <Route path="previsoes" element={<Forecasts />} />
                <Route path="analise" element={<Analysis />} />
                <Route path="metas" element={<Goals />} />
                <Route path="investimentos" element={<Investments />} />
                <Route path="relatorios" element={<Reports />} />
                <Route path="configuracoes" element={<Settings />} />
                <Route path="conta" element={<Conta />} />
                <Route path="planos" element={<Planos />} />
                <Route path="admin" element={<Admin />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      </MaskValuesProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
