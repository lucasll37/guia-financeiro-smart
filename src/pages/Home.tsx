import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  Wallet, 
  Target, 
  PieChart, 
  CreditCard, 
  BarChart3,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Users
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Wallet,
      title: "Contas Compartilhadas",
      description: "Organize finanças conjugais, despesas de casa compartilhada ou mesadas em um só lugar"
    },
    {
      icon: CreditCard,
      title: "Gestão de Cartões",
      description: "Registre e controle faturas, limites e vencimentos manualmente"
    },
    {
      icon: PieChart,
      title: "Categorias Personalizadas",
      description: "Crie suas próprias categorias e organize despesas do seu jeito"
    },
    {
      icon: TrendingUp,
      title: "Controle de Investimentos",
      description: "Registre seus investimentos e acompanhe a evolução do patrimônio"
    },
    {
      icon: Target,
      title: "Metas Compartilhadas",
      description: "Defina objetivos financeiros individuais ou em conjunto com outras pessoas"
    },
    {
      icon: BarChart3,
      title: "Relatórios Visuais",
      description: "Visualize gráficos e análises para entender melhor seus gastos"
    }
  ];

  const benefits = [
    {
      icon: Users,
      title: "Gestão Colaborativa",
      description: "Convide parceiros, familiares ou amigos para gerenciar finanças juntos de forma segura"
    },
    {
      icon: Shield,
      title: "Privacidade Total",
      description: "Seus dados são 100% protegidos e nunca compartilhados com terceiros"
    },
    {
      icon: Zap,
      title: "Simples e Intuitivo",
      description: "Interface clara e fácil de usar, cadastre tudo rapidamente no seu ritmo"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Prospera</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Começar Grátis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <Badge variant="secondary" className="px-4 py-1">
            <Zap className="h-3 w-3 mr-1" />
            Controle Total das Suas Finanças
          </Badge>
          
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Organize suas finanças pessoais ou compartilhadas
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Registre transações, controle cartões, acompanhe investimentos e defina metas.
            Perfeito para casais, famílias e grupos que dividem despesas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Começar Agora
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Ver Funcionalidades
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" />
              <span>Dados Seguros</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-success" />
              <span>Compartilhamento Fácil</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-success" />
              <span>Setup Rápido</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Funcionalidades pensadas para você
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Organize suas finanças manualmente com total flexibilidade e privacidade
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg group">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center border-primary/10 hover:border-primary/20 transition-all hover:shadow-lg">
                <CardContent className="pt-6 space-y-3">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary mb-2">
                    <benefit.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold text-lg">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="container py-24 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 rounded-3xl my-12">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <TrendingUp className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Comece agora a organizar suas finanças
          </h2>
          <p className="text-xl text-muted-foreground">
            Cadastre-se gratuitamente e tenha controle total do seu dinheiro em minutos
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 shadow-lg">
              Criar Conta Grátis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold">Prospera</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Prospera. Todos os direitos reservados.
            </div>

            <Button variant="link" onClick={() => navigate("/auth")}>
              Já tem uma conta? Entrar
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
