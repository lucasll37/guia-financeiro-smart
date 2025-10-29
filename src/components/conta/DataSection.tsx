import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Download, Trash2, Loader2, AlertTriangle, TrendingUp } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as XLSX from "xlsx";
import { format } from "date-fns";

export function DataSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [downloadingInvestments, setDownloadingInvestments] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDownloadExcel = async () => {
    if (!user?.id) return;
    
    setDownloading(true);
    try {
      // Buscar todas as transações do usuário
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id")
        .eq("owner_id", user.id);

      if (!accounts || accounts.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "Você ainda não possui lançamentos para exportar",
        });
        return;
      }

      const accountIds = accounts.map(a => a.id);

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(`
          *,
          categories(name, type),
          accounts(name)
        `)
        .in("account_id", accountIds)
        .order("date", { ascending: false });

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        toast({
          title: "Nenhum lançamento encontrado",
          description: "Você ainda não possui lançamentos para exportar",
        });
        return;
      }

      // Formatar dados para Excel
      const excelData = transactions.map(t => ({
        "Data": format(new Date(t.date), "dd/MM/yyyy"),
        "Conta": (t.accounts as any)?.name || "",
        "Categoria": (t.categories as any)?.name || "",
        "Tipo": (t.categories as any)?.type === "receita" ? "Receita" : "Despesa",
        "Descrição": t.description,
        "Valor": Number(t.amount),
        "Recorrente": t.is_recurring ? "Sim" : "Não",
        "Criado em": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
      }));

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 12 }, // Data
        { wch: 20 }, // Conta
        { wch: 20 }, // Categoria
        { wch: 10 }, // Tipo
        { wch: 40 }, // Descrição
        { wch: 15 }, // Valor
        { wch: 12 }, // Recorrente
        { wch: 18 }, // Criado em
      ];
      ws["!cols"] = colWidths;

      // Estilizar cabeçalho
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F46E5" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };

      // Aplicar estilo ao cabeçalho
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = headerStyle;
      }

      // Aplicar bordas e alinhamento nas células de dados
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) continue;
          
          // Estilo base para células de dados
          ws[cellAddress].s = {
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } },
            },
            alignment: { 
              vertical: "center",
              horizontal: col === 4 ? "left" : "center" // Descrição alinhada à esquerda
            },
          };

          // Formatar valor como moeda
          if (col === 5) {
            ws[cellAddress].z = 'R$ #,##0.00';
            
            // Colorir receitas de verde e despesas de vermelho
            const tipo = ws[XLSX.utils.encode_cell({ r: row, c: 3 })].v;
            if (tipo === "Receita") {
              ws[cellAddress].s.font = { color: { rgb: "059669" } };
            } else {
              ws[cellAddress].s.font = { color: { rgb: "DC2626" } };
            }
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");

      // Download
      const fileName = `lancamentos_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
      XLSX.writeFile(wb, fileName, { cellStyles: true });

      toast({
        title: "Download concluído",
        description: `${transactions.length} lançamento(s) exportado(s) com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadInvestments = async () => {
    if (!user?.id) return;
    
    setDownloadingInvestments(true);
    try {
      // Buscar todos os investimentos do usuário
      const { data: investments, error: investmentsError } = await supabase
        .from("investment_assets")
        .select("*")
        .eq("owner_id", user.id)
        .order("name");

      if (investmentsError) throw investmentsError;

      if (!investments || investments.length === 0) {
        toast({
          title: "Nenhum investimento encontrado",
          description: "Você ainda não possui investimentos para exportar",
        });
        return;
      }

      // Criar workbook
      const wb = XLSX.utils.book_new();

      // Para cada investimento, criar uma guia
      for (const investment of investments) {
        // Buscar retornos mensais deste investimento
        const { data: returns, error: returnsError } = await supabase
          .from("investment_monthly_returns")
          .select("*")
          .eq("investment_id", investment.id)
          .order("month", { ascending: false });

        if (returnsError) console.error("Erro ao buscar retornos:", returnsError);

        // Título e informações do investimento
        const headerData = [
          ["INFORMAÇÕES DO INVESTIMENTO"],
          [],
          ["Nome", investment.name],
          ["Tipo", investment.type],
          ["Saldo Inicial", Number(investment.balance)],
          ["Taxa Mensal (%)", Number(investment.monthly_rate)],
          ["Taxas (%)", Number(investment.fees)],
          ["Mês Inicial", investment.initial_month ? format(new Date(investment.initial_month), "MM/yyyy") : ""],
          ["Data de Criação", format(new Date(investment.created_at), "dd/MM/yyyy HH:mm")],
          [],
          [],
        ];

        // Cabeçalho dos retornos
        const returnsHeader = [["HISTÓRICO DE RETORNOS MENSAIS"]];
        
        // Dados dos retornos
        const returnsData = returns && returns.length > 0
          ? returns.map(r => ({
              "Mês": format(new Date(r.month), "MM/yyyy"),
              "Contribuição": Number(r.contribution),
              "Retorno Real (%)": Number(r.actual_return),
              "Taxa Inflação (%)": Number(r.inflation_rate),
              "Saldo Após": Number(r.balance_after),
              "Observações": r.notes || "",
            }))
          : [];

        // Combinar tudo
        const allData = [...headerData, ...returnsHeader, []];
        
        const ws = XLSX.utils.aoa_to_sheet(allData);
        
        // Adicionar dados dos retornos se existirem
        if (returnsData.length > 0) {
          XLSX.utils.sheet_add_json(ws, returnsData, { 
            origin: allData.length,
            skipHeader: false 
          });
        }

        // Larguras das colunas
        ws["!cols"] = [
          { wch: 25 },
          { wch: 20 },
          { wch: 18 },
          { wch: 18 },
          { wch: 18 },
          { wch: 35 },
        ];

        // Estilo do título principal
        const titleStyle = {
          font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "7C3AED" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "medium", color: { rgb: "000000" } },
            right: { style: "medium", color: { rgb: "000000" } },
          },
        };

        // Aplicar título principal
        if (ws["A1"]) {
          ws["A1"].s = titleStyle;
          // Mesclar células do título
          if (!ws["!merges"]) ws["!merges"] = [];
          ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
        }

        // Estilo dos labels das informações
        const labelStyle = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E9D5FF" } },
          alignment: { horizontal: "right", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };

        // Estilo dos valores das informações
        const valueStyle = {
          alignment: { horizontal: "left", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "E5E7EB" } },
            bottom: { style: "thin", color: { rgb: "E5E7EB" } },
            left: { style: "thin", color: { rgb: "E5E7EB" } },
            right: { style: "thin", color: { rgb: "E5E7EB" } },
          },
        };

        // Aplicar estilos nas linhas de informação (linhas 3-9)
        for (let row = 2; row <= 8; row++) {
          const labelCell = XLSX.utils.encode_cell({ r: row, c: 0 });
          const valueCell = XLSX.utils.encode_cell({ r: row, c: 1 });
          
          if (ws[labelCell]) ws[labelCell].s = labelStyle;
          if (ws[valueCell]) {
            ws[valueCell].s = valueStyle;
            
            // Formatar valores monetários
            if (row === 4) { // Saldo Inicial
              ws[valueCell].z = 'R$ #,##0.00';
            } else if (row === 5 || row === 6) { // Taxas
              ws[valueCell].z = '0.00"%"';
            }
          }
        }

        // Estilo do título dos retornos
        const returnsHeaderStyle = {
          font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "059669" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "medium", color: { rgb: "000000" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "medium", color: { rgb: "000000" } },
            right: { style: "medium", color: { rgb: "000000" } },
          },
        };

        // Aplicar título dos retornos (linha 11)
        const returnsHeaderCell = XLSX.utils.encode_cell({ r: 10, c: 0 });
        if (ws[returnsHeaderCell]) {
          ws[returnsHeaderCell].s = returnsHeaderStyle;
          ws["!merges"].push({ s: { r: 10, c: 0 }, e: { r: 10, c: 5 } });
        }

        // Estilo do cabeçalho da tabela de retornos
        const tableHeaderStyle = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "10B981" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };

        // Aplicar estilo no cabeçalho da tabela (linha 12)
        if (returnsData.length > 0) {
          for (let col = 0; col < 6; col++) {
            const cell = XLSX.utils.encode_cell({ r: 12, c: col });
            if (ws[cell]) ws[cell].s = tableHeaderStyle;
          }

          // Estilo das linhas de dados dos retornos
          for (let row = 13; row < 13 + returnsData.length; row++) {
            for (let col = 0; col < 6; col++) {
              const cell = XLSX.utils.encode_cell({ r: row, c: col });
              if (!ws[cell]) continue;

              ws[cell].s = {
                border: {
                  top: { style: "thin", color: { rgb: "E5E7EB" } },
                  bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                  left: { style: "thin", color: { rgb: "E5E7EB" } },
                  right: { style: "thin", color: { rgb: "E5E7EB" } },
                },
                alignment: { 
                  horizontal: col === 5 ? "left" : "center",
                  vertical: "center" 
                },
              };

              // Formatar valores monetários e percentuais
              if (col === 1 || col === 4) { // Contribuição e Saldo Após
                ws[cell].z = 'R$ #,##0.00';
              } else if (col === 2 || col === 3) { // Retornos e Inflação
                ws[cell].z = '0.00"%"';
              }
            }
          }
        }

        // Nome da guia (limitado a 31 caracteres)
        const sheetName = investment.name.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      // Download
      const fileName = `investimentos_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
      XLSX.writeFile(wb, fileName, { cellStyles: true });

      toast({
        title: "Download concluído",
        description: `${investments.length} investimento(s) exportado(s) com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar investimentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloadingInvestments(false);
    }
  };

  const handleRequestDeleteAccount = async () => {
    if (!user?.email) return;
    
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-account-deletion-email", {
        body: { email: user.email },
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: "Verifique seu email para confirmar a exclusão da conta",
      });
      
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>Dados e Privacidade</CardTitle>
          <CardDescription>
            Gerencie seus dados e configurações de privacidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <h3 className="font-semibold">Exportar Lançamentos</h3>
                <p className="text-sm text-muted-foreground">
                  Faça download de todos os seus lançamentos em formato Excel
                </p>
              </div>
              <Button
                onClick={handleDownloadExcel}
                disabled={downloading}
                variant="outline"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Baixar Excel
              </Button>
            </div>

            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Exportar Investimentos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Faça download de todos os seus investimentos (um por guia)
                </p>
              </div>
              <Button
                onClick={handleDownloadInvestments}
                disabled={downloadingInvestments}
                variant="outline"
              >
                {downloadingInvestments ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Baixar Excel
              </Button>
            </div>

            <div className="flex items-start justify-between p-4 border rounded-lg border-destructive/50 bg-destructive/5">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="font-semibold text-destructive">Excluir Conta</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos
                  sem possibilidade de recuperação.
                </p>
              </div>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Conta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão de Conta
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                <strong>ATENÇÃO:</strong> Esta ação é permanente e irreversível.
              </p>
              <p>
                Enviaremos um email de confirmação para <strong>{user?.email}</strong> com
                instruções para concluir a exclusão da sua conta.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 p-3 rounded-md border border-destructive/30">
              <p className="text-destructive font-semibold text-sm mb-2">
                Todos os seus dados serão permanentemente excluídos:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Todas as contas e lançamentos</li>
                <li>Categorias e subcategorias personalizadas</li>
                <li>Previsões e orçamentos</li>
                <li>Investimentos e metas</li>
                <li>Configurações e preferências</li>
              </ul>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRequestDeleteAccount}
              disabled={sendingEmail}
              className="bg-destructive hover:bg-destructive/90"
            >
              {sendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Email de Confirmação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
