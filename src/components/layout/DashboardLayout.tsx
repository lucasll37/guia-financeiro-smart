import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { FeedbackButton } from "./FeedbackButton";
import { Outlet } from "react-router-dom";

export const DashboardLayout = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
          <footer className="border-t py-4 px-4 md:px-6">
            <p className="text-center text-sm text-muted-foreground">
              © {currentYear} Prospera - Gestão Financeira
            </p>
          </footer>
        </div>
        <FeedbackButton />
      </div>
    </SidebarProvider>
  );
};
