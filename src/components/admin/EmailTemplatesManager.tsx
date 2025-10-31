import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Save, Eye, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmailTemplate {
  id: string;
  template_key: string;
  subject: string;
  html_content: string;
  description: string | null;
  variables: string[] | null;
  updated_at: string;
}

export function EmailTemplatesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editForm, setEditForm] = useState({
    subject: "",
    html_content: "",
  });
  const [testEmail, setTestEmail] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getPreviewHTML = () => {
    // Replace template variables with example values
    let html = editForm.html_content;
    const exampleData: Record<string, string> = {
      userName: "João Silva",
      confirmationUrl: "#",
      resetUrl: "#",
      confirmUrl: "#",
      reportName: "Relatório Mensal",
      reportPeriod: "Janeiro 2025",
      reportType: "PDF",
    };

    Object.entries(exampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      html = html.replace(regex, value);
    });

    return html;
  };

  // Update preview when content changes
  useEffect(() => {
    if (iframeRef.current && editForm.html_content) {
      const iframe = iframeRef.current;
      
      // Wait for iframe to be ready
      const updateIframe = () => {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          try {
            doc.open();
            doc.write(getPreviewHTML());
            doc.close();
          } catch (error) {
            console.error("Error updating iframe:", error);
          }
        }
      };

      // Try to update immediately and also on load
      updateIframe();
      iframe.onload = updateIframe;
    }
  }, [editForm.html_content]);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_key");

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async (data: { id: string; subject: string; html_content: string }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: data.subject,
          html_content: data.html_content,
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      setSelectedTemplate(null);
      setEditForm({ subject: "", html_content: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send test email mutation
  const sendTestEmail = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate || !testEmail) {
        throw new Error("Template e email são obrigatórios");
      }

      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: {
          to: testEmail,
          templateKey: selectedTemplate.template_key,
          subject: editForm.subject,
          htmlContent: editForm.html_content,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Email de teste enviado!",
        description: `Um email foi enviado para ${testEmail}`,
      });
      setTestEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar email de teste",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      subject: template.subject,
      html_content: template.html_content,
    });
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    updateTemplate.mutate({
      id: selectedTemplate.id,
      subject: editForm.subject,
      html_content: editForm.html_content,
    });
  };

  const getTemplateLabel = (key: string) => {
    const labels: Record<string, string> = {
      welcome: "Boas-vindas",
      reset_password: "Redefinição de Senha",
      account_deletion: "Exclusão de Conta",
      report: "Relatório Financeiro",
    };
    return labels[key] || key;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gerenciar Templates de Email
          </CardTitle>
          <CardDescription>
            Configure os templates de email enviados automaticamente pela aplicação
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de templates */}
        <Card>
          <CardHeader>
            <CardTitle>Templates Disponíveis</CardTitle>
            <CardDescription>Selecione um template para editar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates?.map((template) => (
              <div
                key={template.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate?.id === template.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold">
                    {getTemplateLabel(template.template_key)}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {template.template_key}
                  </Badge>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {template.description}
                  </p>
                )}
                {template.variables && template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Editor e Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedTemplate
                  ? `Editar: ${getTemplateLabel(selectedTemplate.template_key)}`
                  : "Selecione um template"}
              </CardTitle>
              <CardDescription>
                {selectedTemplate
                  ? "Modifique o template e visualize o resultado em tempo real"
                  : "Escolha um template da lista para começar a editar"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <Tabs defaultValue="editor" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="editor">
                      <Mail className="mr-2 h-4 w-4" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="preview">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="space-y-4 mt-4">
                    {/* Variáveis disponíveis */}
                    {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <Label className="text-sm font-medium mb-2 block">
                          Variáveis disponíveis:
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {selectedTemplate.variables.map((variable) => (
                            <Badge key={variable} variant="secondary" className="text-xs">
                              {`{${variable}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assunto */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">Assunto do Email</Label>
                      <Input
                        id="subject"
                        value={editForm.subject}
                        onChange={(e) =>
                          setEditForm({ ...editForm, subject: e.target.value })
                        }
                        placeholder="Assunto do email..."
                      />
                    </div>

                    {/* Conteúdo HTML */}
                    <div className="space-y-2">
                      <Label htmlFor="html_content">Conteúdo HTML</Label>
                      <Textarea
                        id="html_content"
                        value={editForm.html_content}
                        onChange={(e) =>
                          setEditForm({ ...editForm, html_content: e.target.value })
                        }
                        placeholder="Conteúdo HTML do email..."
                        className="font-mono text-sm min-h-[500px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use HTML válido. As variáveis devem ser inseridas no formato{" "}
                        <code className="bg-muted px-1 py-0.5 rounded">{"{variavel}"}</code>
                      </p>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-2 justify-end pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(null);
                          setEditForm({ subject: "", html_content: "" });
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={updateTemplate.isPending}
                      >
                        {updateTemplate.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="mt-4">
                    <div className="space-y-4">
                      {/* Preview do assunto */}
                      <div className="p-4 bg-muted rounded-lg">
                        <Label className="text-sm font-medium mb-2 block">
                          Assunto:
                        </Label>
                        <p className="text-sm">{editForm.subject || "Sem assunto"}</p>
                      </div>

                      {/* Envio de teste */}
                      <div className="p-4 border rounded-lg bg-background">
                        <Label className="text-sm font-medium mb-3 block">
                          Enviar Email de Teste
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="seu.email@exemplo.com"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            onClick={() => sendTestEmail.mutate()}
                            disabled={!testEmail || sendTestEmail.isPending}
                            variant="secondary"
                          >
                            {sendTestEmail.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar Teste
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          O email será enviado com dados de exemplo para teste
                        </p>
                      </div>

                      {/* Preview do conteúdo */}
                      <div className="border rounded-lg overflow-hidden bg-white">
                        <iframe
                          ref={iframeRef}
                          title="Email Preview"
                          className="w-full min-h-[600px] border-0"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum template selecionado
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Selecione um template da lista para começar a editar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
