import { useState, useEffect } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import {
  ReportGenerator,
  GeneratedReport,
} from "@/components/reports/ReportGenerator";
import { ReportHistory } from "@/components/reports/ReportHistory";

interface ReportsProps {
  accountId?: string;
}

export default function Reports({ accountId: propAccountId }: ReportsProps) {
  const { accounts } = useAccounts();
  const { transactions } = useTransactions(propAccountId);
  const { categories } = useCategories(propAccountId);
  const [reportHistory, setReportHistory] = useState<GeneratedReport[]>([]);

  // Load report history from localStorage
  useEffect(() => {
    const savedReports = localStorage.getItem("report-history");
    if (savedReports) {
      const parsed = JSON.parse(savedReports);
      // Convert date strings back to Date objects
      const reportsWithDates = parsed.map((r: any) => ({
        ...r,
        generatedAt: new Date(r.generatedAt),
      }));
      setReportHistory(reportsWithDates);
    }
  }, []);

  // Save report history to localStorage
  const saveReportHistory = (reports: GeneratedReport[]) => {
    localStorage.setItem("report-history", JSON.stringify(reports));
    setReportHistory(reports);
  };

  const handleReportGenerated = (report: GeneratedReport) => {
    const updatedHistory = [report, ...reportHistory];
    saveReportHistory(updatedHistory);
  };

  const handleReportDeleted = (reportId: string) => {
    const updatedHistory = reportHistory.filter((r) => r.id !== reportId);
    saveReportHistory(updatedHistory);
  };

  const hasData =
    accounts && accounts.length > 0 && transactions && transactions.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Gere e exporte relatórios financeiros detalhados
        </p>
      </div>

      {!hasData ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-2">
            Comece a registrar suas transações para gerar relatórios financeiros
            completos.
          </p>
          <p className="text-sm">
            Configure suas contas e adicione lançamentos para visualizar dados
            aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <ReportGenerator
            accounts={accounts}
            transactions={transactions}
            categories={categories || []}
            onReportGenerated={handleReportGenerated}
            accountId={propAccountId}
          />

          <ReportHistory
            reports={reportHistory}
            onReportDeleted={handleReportDeleted}
          />
        </div>
      )}
    </div>
  );
}
