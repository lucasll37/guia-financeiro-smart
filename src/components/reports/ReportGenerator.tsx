import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, FileText, Download, Crown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  generatePDFReport,
  generateCSVExport,
  generateExcelExport,
} from "@/lib/reportGenerator";
import type { Database } from "@/integrations/supabase/types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];

interface ReportGeneratorProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  onReportGenerated: (report: GeneratedReport) => void;
  accountId?: string;
}

export interface GeneratedReport {
  id: string;
  name: string;
  type: "pdf" | "csv" | "excel";
  generatedAt: Date;
  period: string;
  accounts: string[];
}

export function ReportGenerator({
  accounts,
  transactions,
  categories,
  onReportGenerated,
  accountId,
}: ReportGeneratorProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canGenerateReports } = usePlanLimits();
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    accountId ? [accountId] : []
  );
  const [reportType, setReportType] = useState<"summary" | "detailed">("summary");
  const [isGenerating, setIsGenerating] = useState(false);

  // Se accountId está presente no contexto, essa conta é fixa
  const isContextAccount = !!accountId;

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const selectAllAccounts = () => {
    setSelectedAccountIds(accounts.map((a) => a.id));
  };

  const filteredTransactions = transactions.filter((t) => {
    const date = new Date(t.date);
    return (
      date >= dateFrom &&
      date <= dateTo &&
      selectedAccountIds.includes(t.account_id)
    );
  });

  const selectedAccounts = accounts.filter((a) =>
    selectedAccountIds.includes(a.id)
  );

  const handleGeneratePDF = async () => {
    if (!canGenerateReports) {
      navigate("/app/planos");
      return;
    }

    if (selectedAccountIds.length === 0) {
      toast({
        title: "Selecione ao menos uma conta",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const doc = generatePDFReport({
        transactions: filteredTransactions,
        categories,
        accounts,
        dateFrom,
        dateTo,
        selectedAccounts,
      });

      const fileName = `relatorio_${format(dateFrom, "yyyy-MM-dd")}_${format(dateTo, "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);

      const report: GeneratedReport = {
        id: crypto.randomUUID(),
        name: fileName,
        type: "pdf",
        generatedAt: new Date(),
        period: `${format(dateFrom, "dd/MM/yyyy")} - ${format(dateTo, "dd/MM/yyyy")}`,
        accounts: selectedAccounts.map((a) => a.name),
      };

      onReportGenerated(report);

      toast({
        title: "Relatório PDF gerado",
        description: "O arquivo foi baixado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCSV = () => {
    if (!canGenerateReports) {
      navigate("/app/planos");
      return;
    }

    if (selectedAccountIds.length === 0) {
      toast({
        title: "Selecione ao menos uma conta",
        variant: "destructive",
      });
      return;
    }

    try {
      const csv = generateCSVExport({
        transactions: filteredTransactions,
        categories,
        accounts,
        dateFrom,
        dateTo,
        selectedAccounts,
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const fileName = `transacoes_${format(dateFrom, "yyyy-MM-dd")}_${format(dateTo, "yyyy-MM-dd")}.csv`;
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();

      const report: GeneratedReport = {
        id: crypto.randomUUID(),
        name: fileName,
        type: "csv",
        generatedAt: new Date(),
        period: `${format(dateFrom, "dd/MM/yyyy")} - ${format(dateTo, "dd/MM/yyyy")}`,
        accounts: selectedAccounts.map((a) => a.name),
      };

      onReportGenerated(report);

      toast({
        title: "Exportação CSV concluída",
        description: "O arquivo foi baixado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar CSV",
        variant: "destructive",
      });
    }
  };

  const handleGenerateExcel = () => {
    if (!canGenerateReports) {
      navigate("/app/planos");
      return;
    }

    if (selectedAccountIds.length === 0) {
      toast({
        title: "Selecione ao menos uma conta",
        variant: "destructive",
      });
      return;
    }

    try {
      const blob = generateExcelExport({
        transactions: filteredTransactions,
        categories,
        accounts,
        dateFrom,
        dateTo,
        selectedAccounts,
      });

      const link = document.createElement("a");
      const fileName = `relatorio_${format(dateFrom, "yyyy-MM-dd")}_${format(dateTo, "yyyy-MM-dd")}.xlsx`;
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();

      const report: GeneratedReport = {
        id: crypto.randomUUID(),
        name: fileName,
        type: "excel",
        generatedAt: new Date(),
        period: `${format(dateFrom, "dd/MM/yyyy")} - ${format(dateTo, "dd/MM/yyyy")}`,
        accounts: selectedAccounts.map((a) => a.name),
      };

      onReportGenerated(report);

      toast({
        title: "Exportação Excel concluída",
        description: "O arquivo foi baixado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar Excel",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerador de Relatórios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Inicial</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? (
                    format(dateFrom, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecione a data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => date && setDateFrom(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Final</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? (
                    format(dateTo, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecione a data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => date && setDateTo(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {!isContextAccount && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Contas</label>
              <Button
                variant="link"
                size="sm"
                onClick={selectAllAccounts}
                className="h-auto p-0"
              >
                Selecionar todas
              </Button>
            </div>
            <div className="grid gap-2">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={account.id}
                    checked={selectedAccountIds.includes(account.id)}
                    onCheckedChange={() => toggleAccount(account.id)}
                  />
                  <label
                    htmlFor={account.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {account.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Relatório</label>
          <Select
            value={reportType}
            onValueChange={(value: "summary" | "detailed") =>
              setReportType(value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Resumo</SelectItem>
              <SelectItem value="detailed">Detalhado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 border-t">
          {!canGenerateReports && (
            <div className="mb-4 p-3 bg-muted rounded-lg border border-primary/20">
              <div className="flex items-start gap-2">
                <Crown className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Recurso exclusivo do plano Pro</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    A geração de relatórios está disponível apenas para assinantes Pro.
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => navigate("/app/planos")}
                    className="h-7"
                  >
                    Fazer Upgrade
                  </Button>
                </div>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground mb-4">
            {filteredTransactions.length} transações no período selecionado
          </p>
          <TooltipProvider>
            <div className="grid gap-2 md:grid-cols-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Button
                      onClick={handleGeneratePDF}
                      disabled={isGenerating || selectedAccountIds.length === 0 || !canGenerateReports}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar PDF
                      {!canGenerateReports && (
                        <Crown className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canGenerateReports && (
                  <TooltipContent>
                    <p className="text-xs">Exclusivo do plano Pro</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Button
                      onClick={handleGenerateCSV}
                      variant="outline"
                      disabled={selectedAccountIds.length === 0 || !canGenerateReports}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar CSV
                      {!canGenerateReports && (
                        <Crown className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canGenerateReports && (
                  <TooltipContent>
                    <p className="text-xs">Exclusivo do plano Pro</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Button
                      onClick={handleGenerateExcel}
                      variant="outline"
                      disabled={selectedAccountIds.length === 0 || !canGenerateReports}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Excel
                      {!canGenerateReports && (
                        <Crown className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canGenerateReports && (
                  <TooltipContent>
                    <p className="text-xs">Exclusivo do plano Pro</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
