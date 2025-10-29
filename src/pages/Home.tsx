import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef, useEffect } from "react";
import { useTheme } from "next-themes";
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
  const { setTheme } = useTheme();
  const featuresSection = useScrollAnimation(0.1);
  const benefitsSection = useScrollAnimation(0.1);
  const ctaSection = useScrollAnimation(0.1);
  
  const plugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  // Forçar tema dark na Landing Page e restaurar tema anterior ao sair
  useEffect(() => {
    const root = document.documentElement;
    const hadDarkClass = root.classList.contains("dark");
    // Guardar tema anterior da lib
    const prevTheme = localStorage.getItem("theme");

    // Aplicar imediatamente classe dark para evitar flash claro
    root.classList.add("dark");
    // E também instruir a lib a usar dark
    setTheme("dark");

    return () => {
      // Restaurar tema anterior
      if (prevTheme) {
        setTheme(prevTheme);
      }
      // Se a página anterior não era dark, removemos a classe
      if (!hadDarkClass) {
        root.classList.remove("dark");
      }
    };
  }, [setTheme]);

  const testimonials = [
    { name: "Ana Silva", city: "Campinas, SP", initials: "AS", text: "Uso há 3 meses e já consigo ver diferença. Está me ajudando a organizar melhor." },
    { name: "João Santos", city: "Uberlândia, MG", initials: "JS", text: "É bom, mas ainda estou me acostumando com algumas funcionalidades." },
    { name: "Maria Oliveira", city: "Londrina, PR", initials: "MO", text: "Prático para o dia a dia. Consigo lançar rapidamente as despesas." },
    { name: "Pedro Costa", city: "Joinville, SC", initials: "PC", text: "Atende bem as necessidades básicas. Interface é simples de usar." },
    { name: "Carla Souza", city: "Sorocaba, SP", initials: "CS", text: "Facilitou muito compartilhar despesas com minha irmã." },
    { name: "José Lima", city: "Ribeirão Preto, SP", initials: "JL", text: "Uso para controlar os gastos do mês. Funciona bem." },
    { name: "Fernanda Rocha", city: "Juiz de Fora, MG", initials: "FR", text: "Gosto das categorias personalizadas. Me ajuda a ver onde gasto mais." },
    { name: "Carlos Pereira", city: "Santos, SP", initials: "CP", text: "Serve para o básico. Estou conseguindo me organizar melhor." },
    { name: "Juliana Martins", city: "Maringá, PR", initials: "JM", text: "Bom para quem quer começar a controlar as finanças. Nada muito complexo." },
    { name: "Roberto Alves", city: "Caxias do Sul, RS", initials: "RA", text: "Uso com minha esposa. Está nos ajudando a economizar." },
    { name: "Paula Freitas", city: "Campos dos Goytacazes, RJ", initials: "PF", text: "Interface clara. Consigo entender meus gastos melhor agora." },
    { name: "Marcos Dias", city: "Pelotas, RS", initials: "MD", text: "Útil para registrar as despesas. Ainda explorando os recursos." },
    { name: "Sandra Mendes", city: "Volta Redonda, RJ", initials: "SM", text: "Fácil de usar. Os gráficos ajudam a visualizar onde o dinheiro vai." },
    { name: "Antonio Ramos", city: "Petrópolis, RJ", initials: "AR", text: "Simples e direto. Faço o controle básico das contas aqui." },
    { name: "Luciana Castro", city: "Blumenau, SC", initials: "LC", text: "Prático para dividir despesas da casa. Meus colegas também gostaram." },
    { name: "Ricardo Nunes", city: "Piracicaba, SP", initials: "RN", text: "Está me ajudando a não esquecer dos vencimentos dos cartões." },
    { name: "Camila Barros", city: "Franca, SP", initials: "CB", text: "Uso faz uns 2 meses. Tá ajudando a ter mais controle dos gastos." },
    { name: "Thiago Silva", city: "Juazeiro do Norte, CE", initials: "TS", text: "Funciona bem. Consigo acompanhar minhas contas sem complicação." },
    { name: "Patrícia Gomes", city: "Bauru, SP", initials: "PG", text: "Simples de entender. Ideal para quem está começando." },
    { name: "Felipe Cunha", city: "Montes Claros, MG", initials: "FC", text: "Me ajuda a ter noção de quanto posso gastar no mês." },
    { name: "Beatriz Torres", city: "Cascavel, PR", initials: "BT", text: "Legal poder customizar as categorias do meu jeito." },
    { name: "André Lopes", city: "Jundiaí, SP", initials: "AL", text: "Atende o que preciso. Sistema funciona bem." },
    { name: "Renata Moura", city: "Mossoró, RN", initials: "RM", text: "Uso para controle pessoal. Está fazendo diferença na minha organização." },
    { name: "Gabriel Ferreira", city: "Taubaté, SP", initials: "GF", text: "Bom para ter uma visão geral das finanças. Recomendo." },
    { name: "Daniela Cardoso", city: "Imperatriz, MA", initials: "DC", text: "Interface intuitiva. Não tive dificuldade para começar a usar." },
    { name: "Lucas Pinto", city: "Limeira, SP", initials: "LP", text: "Prático e objetivo. Faço meu controle mensal aqui." },
    { name: "Adriana Coelho", city: "Divinópolis, MG", initials: "AC", text: "Está me ajudando a organizar melhor o orçamento." },
    { name: "Eduardo Xavier", city: "Cabo Frio, RJ", initials: "EX", text: "Simples de usar no celular. Lanço as despesas na hora." },
    { name: "Vanessa Ribeiro", city: "Ponta Grossa, PR", initials: "VR", text: "Serve bem para controle básico. Nada mirabolante mas funciona." },
    { name: "Rafael Monteiro", city: "Araraquara, SP", initials: "RM", text: "Gosto dos relatórios mensais. Me ajuda a planejar melhor." },
    { name: "Tatiane Santos", city: "Uberaba, MG", initials: "TS", text: "Bom para quem divide apartamento. Facilita a divisão das contas." },
    { name: "Bruno Araújo", city: "Foz do Iguaçu, PR", initials: "BA", text: "Interface limpa. Consigo encontrar o que preciso facilmente." },
    { name: "Cristina Vieira", city: "Presidente Prudente, SP", initials: "CV", text: "Me ajudou a identificar gastos desnecessários. Valeu a pena." },
    { name: "Rodrigo Souza", city: "Governador Valadares, MG", initials: "RS", text: "Uso com minha namorada. Tá sendo útil para planejar juntos." },
    { name: "Alessandra Dias", city: "Novo Hamburgo, RS", initials: "AD", text: "Prático e funcional. Atende o que eu precisava." },
    { name: "Marcelo Ferraz", city: "Marília, SP", initials: "MF", text: "Serve para organizar as finanças pessoais. Sistema é estável." },
    { name: "Silvia Costa", city: "Vitória da Conquista, BA", initials: "SC", text: "Fácil de cadastrar as despesas. Interface é ok." },
    { name: "Diego Almeida", city: "São José dos Campos, SP", initials: "DA", text: "Me ajuda a não perder o controle dos gastos mensais." },
    { name: "Larissa Borges", city: "Itabuna, BA", initials: "LB", text: "Uso para acompanhar metas de economia. Está ajudando bastante." },
    { name: "Fábio Teixeira", city: "Suzano, SP", initials: "FT", text: "Sistema simples e direto. Faço meu controle financeiro aqui." },
    { name: "Cristiane Melo", city: "Caruaru, PE", initials: "CM", text: "Ajuda a ter mais disciplina com os gastos. Tá valendo." },
    { name: "Gustavo Reis", city: "Rio Grande, RS", initials: "GR", text: "Interface clara e objetiva. Uso diariamente." },
    { name: "Priscila Campos", city: "Guarulhos, SP", initials: "PC", text: "Bom para controle básico. Nada muito sofisticado mas atende." },
    { name: "Márcio Rocha", city: "Santa Maria, RS", initials: "MR", text: "Prático para registrar despesas rápidas. Uso bastante." },
    { name: "Roberta Lima", city: "Teresópolis, RJ", initials: "RL", text: "Me ajuda a ter noção de quanto já gastei no mês." },
    { name: "Vinicius Correia", city: "Dourados, MS", initials: "VC", text: "Sistema funciona bem. Interface poderia ser mais moderna mas serve." },
    { name: "Elaine Martins", city: "Araçatuba, SP", initials: "EM", text: "Uso para dividir gastos com amigos. Facilita muito." },
    { name: "Leandro Barros", city: "Chapecó, SC", initials: "LB", text: "Simples de entender. Consigo usar sem complicação." },
    { name: "Débora Cunha", city: "Garanhuns, PE", initials: "DC", text: "Está me ajudando a me organizar financeiramente." },
    { name: "Henrique Moreira", city: "Americana, SP", initials: "HM", text: "Prático para o dia a dia. Cadastro rápido das despesas." }
  ];

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
            <Button variant="ghost" onClick={() => navigate("/auth?tab=login")}>
              Entrar
            </Button>
            <Button onClick={() => navigate("/auth?tab=signup")}>
              Começar Grátis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-32 md:py-48 lg:py-56 min-h-[90vh] flex items-center">
        <div className="mx-auto max-w-3xl text-center space-y-8 w-full">
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
            <Button size="lg" onClick={() => navigate("/auth?tab=signup")} className="gap-2">
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
      <section ref={featuresSection.ref} id="features" className="container py-24 bg-muted/30">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className={`text-center space-y-4 transition-all duration-700 ${
            featuresSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Funcionalidades pensadas para você
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Organize suas finanças manualmente com total flexibilidade e privacidade
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className={`border-primary/10 hover:border-primary/30 transition-all duration-500 hover:shadow-lg hover:-translate-y-2 group ${
                  featuresSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ 
                  transitionDelay: featuresSection.isVisible ? `${index * 100}ms` : "0ms"
                }}
              >
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

          <div ref={benefitsSection.ref} className="mt-16 grid gap-8 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <Card 
                key={index} 
                className={`text-center border-primary/10 hover:border-primary/20 transition-all duration-500 hover:shadow-lg hover:-translate-y-2 hover:scale-105 ${
                  benefitsSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ 
                  transitionDelay: benefitsSection.isVisible ? `${index * 150}ms` : "0ms"
                }}
              >
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


      {/* Testimonials Section */}
      <section className="container py-24 bg-muted/20">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              O que nossos usuários dizem
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Veja como o Prospera tem ajudado pessoas a organizarem suas finanças
            </p>
          </div>

          <Carousel
            plugins={[plugin.current]}
            className="w-full"
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem 
                  key={index} 
                  className="md:basis-1/2 lg:basis-1/3"
                  onMouseEnter={() => plugin.current.stop()}
                  onMouseLeave={() => plugin.current.reset()}
                >
                  <Card className="border-primary/10 h-full">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {testimonial.initials}
                        </div>
                        <div>
                          <p className="font-semibold">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.city}</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        "{testimonial.text}"
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaSection.ref} className="container py-24 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 rounded-3xl my-12">
        <div className={`mx-auto max-w-3xl text-center space-y-8 transition-all duration-700 ${
          ctaSection.isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}>
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4 transition-all duration-700 delay-200 ${
            ctaSection.isVisible ? "opacity-100 scale-100 animate-pulse" : "opacity-0 scale-50"
          }`}>
            <TrendingUp className="h-8 w-8" />
          </div>
          <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl transition-all duration-700 delay-300 ${
            ctaSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}>
            Comece agora a organizar suas finanças
          </h2>
          <p className={`text-xl text-muted-foreground transition-all duration-700 delay-500 ${
            ctaSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}>
            Cadastre-se gratuitamente e tenha controle total do seu dinheiro em minutos
          </p>
          <div className={`flex flex-col sm:flex-row gap-4 justify-center pt-4 transition-all duration-700 delay-700 ${
            ctaSection.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}>
            <Button size="lg" onClick={() => navigate("/auth?tab=signup")} className="gap-2 shadow-lg hover:scale-110 transition-transform duration-300">
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

            <Button variant="link" onClick={() => navigate("/auth?tab=login")}>
              Já tem uma conta? Entrar
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
