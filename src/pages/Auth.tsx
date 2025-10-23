import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { t } from "@/lib/i18n";
import authHero from "@/assets/auth-hero.jpg";
import { Wallet } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      navigate("/dashboard");
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

    const { error } = await signUp(email, password, name);
    
    if (error) {
      setError(error.message);
    } else {
      navigate("/dashboard");
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

  if (resetMode) {
    return (
      <div className="flex min-h-screen bg-white">
        {/* Left side - Form */}
        <div className="flex flex-1 items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
                <Wallet className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Recuperar senha</h1>
              <p className="text-muted-foreground">
                Digite seu e-mail para receber instruções de recuperação
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-6">
              {error && (
                <Alert>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-base font-medium">
                  {t("auth.email")}
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold rounded-full" 
                  disabled={loading}
                >
                  {loading ? t("common.loading") : t("auth.resetPassword")}
                </Button>
                
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-primary"
                  onClick={() => setResetMode(false)}
                >
                  {t("auth.backToLogin")}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right side - Image */}
        <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100">
          <img
            src={authHero}
            alt="Financial Growth"
            className="object-cover w-full h-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side - Form */}
      <div className="flex flex-1 items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md space-y-8">
          {/* Logo/Brand Section */}
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
              <Wallet className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              Pra acessar, insira suas informações
            </h1>
          </div>

          <Tabs defaultValue="login" className="w-full space-y-8">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50">
              <TabsTrigger value="login" className="text-base font-medium">
                {t("auth.login")}
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-base font-medium">
                {t("auth.signup")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6 mt-8">
              <form onSubmit={handleSignIn} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">
                    {t("auth.email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-medium">
                    {t("auth.password")}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold rounded-full" 
                    disabled={loading}
                  >
                    {loading ? t("common.loading") : "Continuar"}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-primary text-sm"
                    onClick={() => setResetMode(true)}
                  >
                    {t("auth.forgotPassword")}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-6 mt-8">
              <form onSubmit={handleSignUp} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-base font-medium">
                    {t("auth.name")}
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-base font-medium">
                    {t("auth.email")}
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-base font-medium">
                    {t("auth.password")}
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-base font-medium">
                    {t("auth.confirmPassword")}
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold rounded-full" 
                  disabled={loading}
                >
                  {loading ? t("common.loading") : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero Image */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100">
        <img
          src={authHero}
          alt="Financial Growth"
          className="object-cover w-full h-full"
        />
      </div>
    </div>
  );
}
