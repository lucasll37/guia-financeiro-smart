import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Download, Trash2, Loader2, AlertTriangle } from "lucide-react";
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
        { wch: 12 }, // Valor
        { wch: 12 }, // Recorrente
        { wch: 18 }, // Criado em
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");

      // Download
      const fileName = `lancamentos_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
      XLSX.writeFile(wb, fileName);

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
              <p className="text-destructive font-semibold">
                Todos os seus dados serão permanentemente excluídos sem backup.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Todas as contas e lançamentos</li>
                <li>Categorias e subcategorias personalizadas</li>
                <li>Previsões e orçamentos</li>
                <li>Investimentos e metas</li>
                <li>Configurações e preferências</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
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
