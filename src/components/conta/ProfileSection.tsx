import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload, X, AlertTriangle, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SecuritySection } from "./SecuritySection";
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

export function ProfileSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setName(data.name || "");
        setAvatarUrl(data.avatar_url || "");
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O avatar deve ter no máximo 2MB",
        variant: "destructive",
      });
      return;
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Tipo inválido",
        description: "Apenas imagens são permitidas",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      // Deletar avatar anterior se existir
      if (avatarUrl && avatarUrl.includes(user.id)) {
        const oldPath = avatarUrl.split("/").slice(-1)[0];
        await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`]);
      }

      // Upload novo avatar
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      // Atualizar perfil imediatamente se não estiver editando
      if (!isEditing) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", user.id);

        if (updateError) throw updateError;

        queryClient.invalidateQueries({ queryKey: ["profile", user.id] });

        toast({
          title: "Avatar atualizado",
          description: "Sua foto de perfil foi atualizada com sucesso",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id || !avatarUrl) return;

    try {
      // Remover do storage se for uma URL do nosso bucket
      if (avatarUrl.includes(user.id)) {
        const oldPath = avatarUrl.split("/").slice(-1)[0];
        await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`]);
      }

      setAvatarUrl("");

      // Atualizar perfil
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });

      toast({
        title: "Avatar removido",
        description: "Sua foto de perfil foi removida",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover avatar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update({ name, avatar_url: avatarUrl })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setIsEditing(false);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCancel = () => {
    setName(profile?.name || "");
    setAvatarUrl(profile?.avatar_url || "");
    setIsEditing(false);
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

  if (loadingProfile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>Gerencie suas informações de perfil</CardDescription>
        </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="text-2xl">{initials || "U"}</AvatarFallback>
            </Avatar>
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {avatarUrl ? "Trocar foto" : "Fazer upload"}
                </Button>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </div>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
              >
                <X className="h-4 w-4 mr-2" />
                Remover foto
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 2MB
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ""} disabled />
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                onClick={() => updateProfile.mutate()}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Editar Perfil</Button>
          )}
        </div>
      </CardContent>
    </Card>
    
    <SecuritySection />

    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Gerenciamento de Conta</CardTitle>
        <CardDescription>
          Opções avançadas de configuração da conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold">Excluir Conta Permanentemente</h3>
            <p className="text-sm text-muted-foreground">
              A exclusão da conta é permanente. Todos os dados associados serão removidos de forma irreversível.
            </p>
          </div>
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="outline"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Excluir Conta
          </Button>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão de Conta</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              Esta ação é permanente e não poderá ser desfeita.
            </p>
            <p>
              Um email de confirmação será enviado para <strong>{user?.email}</strong> com
              as instruções necessárias para completar o processo.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-md border">
            <p className="font-medium text-sm mb-3">
              Os seguintes dados serão permanentemente removidos:
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>• Todas as contas e lançamentos financeiros</li>
              <li>• Categorias e subcategorias personalizadas</li>
              <li>• Previsões e orçamentos configurados</li>
              <li>• Investimentos e metas cadastradas</li>
              <li>• Configurações e preferências do usuário</li>
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
  </div>
  );
}
