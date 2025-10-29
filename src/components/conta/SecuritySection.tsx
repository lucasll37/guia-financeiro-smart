import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z
    .string()
    .min(6, "A nova senha deve ter no mínimo 6 caracteres")
    .max(100, "A senha deve ter no máximo 100 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export function SecuritySection() {
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo ao digitar
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleChangePassword = async () => {
    setErrors({});
    
    // Validar com zod
    const validation = passwordSchema.safeParse(formData);
    
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        if (error.path[0]) {
          newErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setIsChangingPassword(true);

    try {
      // Primeiro, tentar fazer login com a senha atual para verificar se está correta
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error("Usuário não encontrado");
      }

      // Tentar fazer login com email e senha atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: formData.currentPassword,
      });

      if (signInError) {
        setErrors({ currentPassword: "Senha atual incorreta" });
        setIsChangingPassword(false);
        return;
      }

      // Se o login foi bem-sucedido, atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso",
      });

      // Limpar formulário
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Ocorreu um erro ao tentar alterar sua senha",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setErrors({});
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          <CardTitle>Segurança</CardTitle>
        </div>
        <CardDescription>Altere sua senha de acesso</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Senha Atual</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              value={formData.currentPassword}
              onChange={(e) => handleInputChange("currentPassword", e.target.value)}
              disabled={isChangingPassword}
              className={errors.currentPassword ? "border-destructive" : ""}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              disabled={isChangingPassword}
            >
              {showCurrentPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.currentPassword && (
            <p className="text-sm text-destructive">{errors.currentPassword}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">Nova Senha</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={formData.newPassword}
              onChange={(e) => handleInputChange("newPassword", e.target.value)}
              disabled={isChangingPassword}
              className={errors.newPassword ? "border-destructive" : ""}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowNewPassword(!showNewPassword)}
              disabled={isChangingPassword}
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.newPassword && (
            <p className="text-sm text-destructive">{errors.newPassword}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Mínimo de 6 caracteres
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              disabled={isChangingPassword}
              className={errors.confirmPassword ? "border-destructive" : ""}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isChangingPassword}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleChangePassword}
            disabled={isChangingPassword || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
          >
            {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Alterar Senha
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isChangingPassword}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
