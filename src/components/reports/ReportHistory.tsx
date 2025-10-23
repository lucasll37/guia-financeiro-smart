import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Mail, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { GeneratedReport } from "./ReportGenerator";

interface ReportHistoryProps {
  reports: GeneratedReport[];
  onReportDeleted: (reportId: string) => void;
}

export function ReportHistory({
  reports,
  onReportDeleted,
}: ReportHistoryProps) {
  const { toast } = useToast();
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const handleSendEmail = async (report: GeneratedReport) => {
    setSendingEmail(report.id);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        toast({
          title: "Erro ao enviar e-mail",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      // Call edge function to send email
      const { error } = await supabase.functions.invoke("send-report-email", {
        body: {
          email: user.email,
          reportName: report.name,
          reportPeriod: report.period,
          reportType: report.type,
        },
      });

      if (error) throw error;

      toast({
        title: "E-mail enviado",
        description: `Relatório enviado para ${user.email}`,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Erro ao enviar e-mail",
        description:
          "Não foi possível enviar o relatório. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(null);
    }
  };

  const handleDelete = (reportId: string) => {
    if (confirm("Tem certeza que deseja excluir este relatório?")) {
      onReportDeleted(reportId);
      toast({
        title: "Relatório excluído",
        description: "O relatório foi removido do histórico",
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pdf":
        return "default";
      case "csv":
        return "secondary";
      case "excel":
        return "outline";
      default:
        return "default";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "pdf":
        return "PDF";
      case "csv":
        return "CSV";
      case "excel":
        return "Excel";
      default:
        return type.toUpperCase();
    }
  };

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Relatórios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum relatório gerado ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Relatórios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Contas</TableHead>
                <TableHead>Gerado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeColor(report.type)}>
                      {getTypeLabel(report.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{report.period}</TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {report.accounts.join(", ")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(
                      new Date(report.generatedAt),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR }
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSendEmail(report)}
                        disabled={sendingEmail === report.id}
                        title="Enviar por e-mail"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(report.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
