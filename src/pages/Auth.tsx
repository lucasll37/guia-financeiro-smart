import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { t } from "@/lib/i18n";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, CheckCircle } from "lucide-react";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "signup" ? "signup" : "login");
  const [showEmailConfirmModal, setShowEmailConfirmModal] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const { signIn, signUp, resetPassword, resend, signOut, user } = useAuth();
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  // Forçar tema dark na tela de Auth
  useEffect(() => {
    const root = document.documentElement;
    const hadDarkClass = root.classList.contains("dark");
    const prevTheme = localStorage.getItem("theme");

    root.classList.add("dark");
    setTheme("dark");

    return () => {
      if (prevTheme) {
        setTheme(prevTheme);
      }
      if (!hadDarkClass) {
        root.classList.remove("dark");
      }
    };
  }, [setTheme]);

  // Verificar se usuário veio de confirmação de email e fazer logout
  useEffect(() => {
    const confirmed = searchParams.get("confirmed");
    if (confirmed === "true" && user) {
      // Fazer logout imediatamente
      signOut();
      // Mostrar mensagem de sucesso
      setError("✅ Email confirmado com sucesso! Agora você pode fazer login.");
      // Limpar o parâmetro da URL
      navigate("/auth?tab=login", { replace: true });
    }
  }, [searchParams, user, signOut, navigate]);

  useEffect(() => {
    // Não redirecionar se estiver vindo de confirmação de email
    const confirmed = searchParams.get("confirmed");
    if (user && confirmed !== "true") {
      navigate("/app/dashboard");
    }
  }, [user, navigate, searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showEmailConfirmModal && resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showEmailConfirmModal, resendCountdown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      // Detectar erro de email não confirmado
      if (error.message.includes("Email not confirmed") || 
          error.message.includes("email_not_confirmed") ||
          error.message.includes("not confirmed")) {
        setConfirmationEmail(email);
        setShowEmailConfirmModal(true);
        setError("");
      } else {
        setError(error.message);
      }
    } else {
      navigate("/app/dashboard");
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, name);
      
      if (error) {
        // Verificar se é erro de email já existente
        if (error.message.includes("already registered") || 
            error.message.includes("already been registered") ||
            error.message.includes("User already registered")) {
          setError("✉️ Este email já está cadastrado. Tente fazer login ou use outro email.");
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      // Tudo certo - mostrar modal e limpar campos
      setConfirmationEmail(email);
      setResendCountdown(60); // Iniciar countdown apenas após envio
      setShowEmailConfirmModal(true);
      
      // Limpar campos do formulário
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      
      // Mudar para aba de login
      setActiveTab("login");
      
    } catch (emailError: any) {
      // Erro específico do envio de email
      if (emailError.message === 'RESEND_DOMAIN_NOT_VERIFIED') {
        setError("⚠️ Conta criada! Porém, o domínio de email não está verificado no Resend. Configure em https://resend.com/domains");
      } else {
        setError("✅ Conta criada! Porém houve um problema ao enviar o email de confirmação.");
      }
    }
    
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await resetPassword(email);
    
    if (error) {
      setError(error.message);
    } else {
      setError("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    }
    
    setLoading(false);
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    setError("");
    try {
      const { error } = await resend(confirmationEmail);
      if (error) {
        setError("Erro ao reenviar email. Tente novamente.");
      } else {
        setError("Email reenviado com sucesso!");
        setResendCountdown(60); // Iniciar countdown apenas após reenvio
      }
    } catch (emailError: any) {
      if (emailError.message === 'RESEND_DOMAIN_NOT_VERIFIED') {
        setError("⚠️ Domínio de email não está verificado no Resend.");
      } else {
        setError("Erro ao reenviar email. Tente novamente.");
      }
    } finally {
      setIsResending(false);
    }
  };

  if (resetMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("auth.resetPassword")}</CardTitle>
            <CardDescription>
              Digite seu e-mail para receber instruções de recuperação
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              {error && (
                <Alert>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="reset-email">{t("auth.email")}</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("common.loading") : t("auth.resetPassword")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setResetMode(false)}
              >
                {t("auth.backToLogin")}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="login">
            <form onSubmit={handleSignIn}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("common.loading") : t("auth.login")}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm"
                  onClick={() => setResetMode(true)}
                >
                  {t("auth.forgotPassword")}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t("auth.name")}</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("auth.email")}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("auth.password")}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("common.loading") : t("auth.signup")}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Modal de Confirmação de Email */}
      <Dialog open={showEmailConfirmModal} onOpenChange={setShowEmailConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold">
              📧 Confirme seu Email
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Enviamos um email de confirmação para:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <p className="font-semibold text-lg text-primary">
                {confirmationEmail}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Abra sua caixa de entrada e clique no link de confirmação
                </p>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Não encontrou? Verifique a pasta de spam ou lixo eletrônico
                </p>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  O link expira em 24 horas
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Após confirmar seu email, você poderá fazer login normalmente
              </p>
              
              {error && (
                <Alert className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowEmailConfirmModal(false)}
                >
                  Entendi
                </Button>
                
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleResendEmail}
                  disabled={resendCountdown > 0 || isResending}
                >
                  {isResending 
                    ? "Reenviando..." 
                    : resendCountdown > 0 
                      ? `Reenviar email (${resendCountdown}s)` 
                      : "Reenviar email"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
