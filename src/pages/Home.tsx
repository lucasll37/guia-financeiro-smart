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
  ArrowRight
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Wallet,
      title: "Controle de Contas",
      description: "Gerencie múltiplas contas bancárias e acompanhe saldos em tempo real"
    },
    {
      icon: CreditCard,
      title: "Cartões de Crédito",
      description: "Controle faturas, limites e vencimentos de todos seus cartões"
    },
    {
      icon: PieChart,
      title: "Categorização Inteligente",
      description: "Organize despesas e receitas com categorias personalizáveis"
    },
    {
      icon: TrendingUp,
      title: "Investimentos",
      description: "Acompanhe rentabilidade e evolução dos seus investimentos"
    },
    {
      icon: Target,
      title: "Metas Financeiras",
      description: "Defina objetivos e acompanhe progresso automaticamente"
    },
    {
      icon: BarChart3,
      title: "Análises e Relatórios",
      description: "Visualize insights detalhados sobre suas finanças"
    }
  ];

  const plans = [
    {
      name: "Free",
      price: "Grátis",
      description: "Ideal para começar",
      features: [
        "Até 2 contas bancárias",
        "Categorias básicas",
        "Lançamentos ilimitados",
        "Relatórios mensais",
        "Suporte por email"
      ],
      highlighted: false
    },
    {
      name: "Plus",
      price: "R$ 19,90/mês",
      description: "Para quem quer mais controle",
      features: [
        "Contas ilimitadas",
        "Categorias personalizadas",
        "Múltiplos cartões de crédito",
        "Metas financeiras",
        "Análises avançadas",
        "Relatórios personalizados",
        "Suporte prioritário"
      ],
      highlighted: true
    },
    {
      name: "Pro",
      price: "R$ 39,90/mês",
      description: "Controle total das finanças",
      features: [
        "Tudo do Plus",
        "Controle de investimentos",
        "Projeções financeiras",
        "Dashboard de admin",
        "Exportação avançada",
        "API de integração",
        "Suporte dedicado 24/7"
      ],
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">FinanceApp</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
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
            Organize suas finanças de forma simples e inteligente
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Controle contas, cartões, investimentos e metas financeiras em um só lugar. 
            Visualize onde seu dinheiro está indo e tome decisões mais inteligentes.
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

          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" />
              <span>100% Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>Sem cartão de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-success" />
              <span>Setup em 2 minutos</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tudo que você precisa para controlar suas finanças
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas e intuitivas para você ter total controle do seu dinheiro
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
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container py-24">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Escolha o plano ideal para você
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comece grátis e evolua conforme suas necessidades
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${
                  plan.highlighted 
                    ? 'border-primary shadow-xl scale-105' 
                    : 'border-primary/10 hover:border-primary/30'
                } transition-all`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8 pt-8">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base pt-2">
                    {plan.description}
                  </CardDescription>
                  <div className="pt-4">
                    <div className="text-4xl font-bold">{plan.price}</div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full" 
                    variant={plan.highlighted ? "default" : "outline"}
                    onClick={() => navigate("/auth")}
                  >
                    {plan.name === "Free" ? "Começar Grátis" : "Assinar Agora"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pronto para transformar suas finanças?
          </h2>
          <p className="text-xl text-muted-foreground">
            Junte-se a milhares de usuários que já estão no controle do seu dinheiro
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
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
              <span className="font-semibold">FinanceApp</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              © 2024 FinanceApp. Todos os direitos reservados.
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
