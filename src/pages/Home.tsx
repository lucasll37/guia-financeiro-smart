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
import { useRef } from "react";
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
  const featuresSection = useScrollAnimation(0.1);
  const benefitsSection = useScrollAnimation(0.1);
  const ctaSection = useScrollAnimation(0.1);
  
  const plugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  const testimonials = [
    { name: "Mariana Costa", city: "São Paulo, SP", initials: "MC", text: "Finalmente consegui organizar as finanças com meu marido! O compartilhamento de contas facilitou muito nossa vida." },
    { name: "Ricardo Santos", city: "Rio de Janeiro, RJ", initials: "RS", text: "Excelente para acompanhar investimentos! Consigo ver a evolução do meu patrimônio de forma clara e simples." },
    { name: "Juliana Oliveira", city: "Belo Horizonte, MG", initials: "JO", text: "Controlar os cartões de crédito ficou muito mais fácil. Não perco mais nenhum vencimento!" },
    { name: "Fernando Silva", city: "Curitiba, PR", initials: "FS", text: "As categorias personalizadas me ajudaram a identificar onde estava gastando demais. Recomendo!" },
    { name: "Camila Rodrigues", city: "Porto Alegre, RS", initials: "CR", text: "Perfeito para gerenciar a mesada dos meus filhos. Todos conseguem acompanhar os gastos." },
    { name: "Lucas Almeida", city: "Brasília, DF", initials: "LA", text: "A interface é super intuitiva. Cadastrei todas as minhas contas em menos de 10 minutos." },
    { name: "Patricia Ferreira", city: "Salvador, BA", initials: "PF", text: "Consigo definir metas junto com meu esposo e acompanhar o progresso. Muito bom!" },
    { name: "Rafael Lima", city: "Fortaleza, CE", initials: "RL", text: "Os relatórios visuais me deram uma nova perspectiva sobre meus gastos mensais." },
    { name: "Amanda Santos", city: "Recife, PE", initials: "AS", text: "Compartilho a conta com minhas amigas da república. Ficou muito fácil dividir as despesas!" },
    { name: "Thiago Martins", city: "Manaus, AM", initials: "TM", text: "Finalmente tenho controle total dos meus investimentos em um só lugar." },
    { name: "Gabriela Souza", city: "Belém, PA", initials: "GS", text: "A privacidade dos dados me deixa tranquila. Excelente sistema de segurança." },
    { name: "Bruno Carvalho", city: "Goiânia, GO", initials: "BC", text: "Setup super rápido! Em minutos já estava usando todas as funcionalidades." },
    { name: "Larissa Pereira", city: "Vitória, ES", initials: "LP", text: "Adoro poder personalizar as categorias do meu jeito. Muito flexível!" },
    { name: "Diego Costa", city: "Florianópolis, SC", initials: "DC", text: "O controle de faturas dos cartões é perfeito. Não tenho mais surpresas no fim do mês." },
    { name: "Tatiana Ribeiro", city: "São Luís, MA", initials: "TR", text: "Compartilho com meu namorado e conseguimos economizar muito mais!" },
    { name: "Rodrigo Azevedo", city: "Maceió, AL", initials: "RA", text: "Os gráficos são lindos e muito informativos. Facilita muito o entendimento." },
    { name: "Beatriz Gomes", city: "Natal, RN", initials: "BG", text: "Perfeito para quem divide apartamento. Todos podem ver e registrar as despesas." },
    { name: "Gustavo Nunes", city: "João Pessoa, PB", initials: "GN", text: "A função de metas me motivou a poupar. Já alcancei meu primeiro objetivo!" },
    { name: "Carolina Dias", city: "Aracaju, SE", initials: "CD", text: "Sistema muito completo e ao mesmo tempo simples de usar. Parabéns!" },
    { name: "Felipe Moreira", city: "Teresina, PI", initials: "FM", text: "Consigo acompanhar todas as minhas contas bancárias em um único lugar." },
    { name: "Renata Campos", city: "Campo Grande, MS", initials: "RC", text: "A gestão colaborativa é perfeita para casais. Recomendo muito!" },
    { name: "Marcelo Barbosa", city: "Cuiabá, MT", initials: "MB", text: "Finalmente entendo para onde meu dinheiro está indo. Transparência total!" },
    { name: "Vanessa Torres", city: "Palmas, TO", initials: "VT", text: "O melhor app de finanças que já usei. Interface linda e funcional." },
    { name: "André Monteiro", city: "Boa Vista, RR", initials: "AM", text: "Compartilho com toda minha família. Facilitou muito nossa organização financeira." },
    { name: "Priscila Ramos", city: "Macapá, AP", initials: "PR", text: "Os alertas de vencimento salvaram minha vida várias vezes!" },
    { name: "Roberto Cunha", city: "Porto Velho, RO", initials: "RC", text: "Controlo meus investimentos e despesas em um só app. Maravilhoso!" },
    { name: "Fernanda Lopes", city: "Rio Branco, AC", initials: "FL", text: "A privacidade é levada a sério. Me sinto segura usando o app." },
    { name: "Paulo Mendes", city: "São Paulo, SP", initials: "PM", text: "Excelente para freelancers como eu. Consigo separar gastos pessoais e profissionais." },
    { name: "Aline Cardoso", city: "Rio de Janeiro, RJ", initials: "AC", text: "As categorias me ajudaram a cortar gastos desnecessários. Economizei muito!" },
    { name: "Vinícius Soares", city: "Belo Horizonte, MG", initials: "VS", text: "Interface moderna e responsiva. Funciona perfeitamente no celular." },
    { name: "Daniela Castro", city: "Curitiba, PR", initials: "DC", text: "Compartilho com meus pais idosos. É tão simples que eles conseguem usar sozinhos!" },
    { name: "Leandro Freitas", city: "Porto Alegre, RS", initials: "LF", text: "Os relatórios me ajudaram a negociar melhores condições com o banco." },
    { name: "Bruna Melo", city: "Brasília, DF", initials: "BM", text: "Perfeito para organizar as finanças da empresa familiar." },
    { name: "Carlos Eduardo", city: "Salvador, BA", initials: "CE", text: "A função de projeção de gastos é muito útil para planejamento." },
    { name: "Isabela Araújo", city: "Fortaleza, CE", initials: "IA", text: "Consigo ver exatamente quanto posso gastar sem comprometer as metas." },
    { name: "Henrique Pinto", city: "Recife, PE", initials: "HP", text: "O app é rápido e não trava. Muito bem desenvolvido!" },
    { name: "Luciana Correia", city: "Manaus, AM", initials: "LC", text: "Compartilho com meu irmão para controlar as despesas da nossa mãe." },
    { name: "Pedro Henrique", city: "Belém, PA", initials: "PH", text: "As notificações me mantêm sempre informado. Não perco nada!" },
    { name: "Ana Paula", city: "Goiânia, GO", initials: "AP", text: "Finalmente consigo poupar todo mês. O app me ajuda a manter o foco." },
    { name: "Fábio Teixeira", city: "Vitória, ES", initials: "FT", text: "Excelente para quem tem múltiplos cartões. Centraliza tudo!" },
    { name: "Mônica Silva", city: "Florianópolis, SC", initials: "MS", text: "A organização por categorias mudou minha vida financeira." },
    { name: "Júlio César", city: "São Luís, MA", initials: "JC", text: "Compartilho com minha esposa. Acabaram as brigas sobre dinheiro!" },
    { name: "Letícia Amaral", city: "Maceió, AL", initials: "LA", text: "Os gráficos são tão bonitos que até gosto de conferir meus gastos!" },
    { name: "Sérgio Baptista", city: "Natal, RN", initials: "SB", text: "Perfeito para controlar gastos da viagem em família." },
    { name: "Cristiane Duarte", city: "João Pessoa, PB", initials: "CD", text: "A simplicidade é o ponto forte. Não tem nada complicado!" },
    { name: "Matheus Vieira", city: "Aracaju, SE", initials: "MV", text: "Consigo planejar grandes compras com a função de metas." },
    { name: "Raquel Nogueira", city: "Teresina, PI", initials: "RN", text: "O suporte é excelente. Sempre que preciso, sou bem atendida." },
    { name: "Eduardo Macedo", city: "Campo Grande, MS", initials: "EM", text: "Compartilho com sócios da empresa. Transparência total nas finanças!" },
    { name: "Silvia Rezende", city: "Cuiabá, MT", initials: "SR", text: "As cores e o design são lindos. Dá prazer de usar!" },
    { name: "Alexandre Farias", city: "Palmas, TO", initials: "AF", text: "Finalmente um app brasileiro que funciona de verdade!" },
    { name: "Adriana Moura", city: "Boa Vista, RR", initials: "AM", text: "Controlo as finanças de 3 contas diferentes. Muito prático!" },
    { name: "Giovanni Rocha", city: "Macapá, AP", initials: "GR", text: "A segurança dos dados me impressionou. Muito bem feito!" },
    { name: "Simone Coelho", city: "Porto Velho, RO", initials: "SC", text: "Compartilho com minha filha universitária. Ajuda muito no controle!" },
    { name: "Renato Ferraz", city: "Rio Branco, AC", initials: "RF", text: "Os relatórios mensais são perfeitos para declarar imposto de renda." },
    { name: "Elaine Vasconcelos", city: "São Paulo, SP", initials: "EV", text: "Melhor decisão que tomei foi começar a usar o Prospera!" },
    { name: "Cesar Augusto", city: "Rio de Janeiro, RJ", initials: "CA", text: "A função de investimentos é muito completa. Acompanho tudo!" },
    { name: "Jéssica Borges", city: "Belo Horizonte, MG", initials: "JB", text: "Compartilho com meu namorado. Planejamos nosso casamento juntos!" },
    { name: "Igor Santana", city: "Curitiba, PR", initials: "IS", text: "O app me ajudou a sair das dívidas. Muito grato!" },
    { name: "Natália Xavier", city: "Porto Alegre, RS", initials: "NX", text: "Perfeito para controlar gastos com pets. Criei uma categoria só para isso!" },
    { name: "Claudio Mendonça", city: "Brasília, DF", initials: "CM", text: "A velocidade do app é impressionante. Tudo carrega instantaneamente!" },
    { name: "Viviane Costa", city: "Salvador, BA", initials: "VC", text: "Compartilho com minhas irmãs para cuidar das finanças da família." },
    { name: "Márcio Prado", city: "Fortaleza, CE", initials: "MP", text: "Os alertas personalizados são muito úteis. Sempre me lembram!" },
    { name: "Débora Cunha", city: "Recife, PE", initials: "DC", text: "Finalmente consigo poupar para realizar meus sonhos!" },
    { name: "William Campos", city: "Manaus, AM", initials: "WC", text: "O melhor é não precisar de integração bancária. Controlo tudo manualmente!" },
    { name: "Claudia Marques", city: "Belém, PA", initials: "CM", text: "Compartilho com toda a família. Todos adoraram!" },
    { name: "Daniel Fernandes", city: "Goiânia, GO", initials: "DF", text: "A organização financeira que eu sempre quis, finalmente!" },
    { name: "Giovanna Lima", city: "Vitória, ES", initials: "GL", text: "Perfeito para casais que moram juntos. Dividimos tudo certinho!" },
    { name: "Samuel Rodrigues", city: "Florianópolis, SC", initials: "SR", text: "Os gráficos me motivam a economizar mais. Funciona!" },
    { name: "Karla Andrade", city: "São Luís, MA", initials: "KA", text: "A privacidade é o diferencial. Meus dados estão seguros!" },
    { name: "Otávio Santos", city: "Maceió, AL", initials: "OS", text: "Uso para controlar gastos do meu negócio. Muito útil!" },
    { name: "Elisa Ribeiro", city: "Natal, RN", initials: "ER", text: "As metas compartilhadas motivam toda a família a economizar!" },
    { name: "Hugo Batista", city: "João Pessoa, PB", initials: "HB", text: "Interface limpa e moderna. Parece um app premium!" },
    { name: "Marina Guimarães", city: "Aracaju, SE", initials: "MG", text: "Compartilho com meu marido. Melhorou muito nossa comunicação financeira!" },
    { name: "Nelson Oliveira", city: "Teresina, PI", initials: "NO", text: "Controlo 5 cartões diferentes. O app organiza tudo perfeitamente!" },
    { name: "Rosana Silva", city: "Campo Grande, MS", initials: "RS", text: "Finalmente entendo meus padrões de gastos. Muito revelador!" },
    { name: "Jonas Alves", city: "Cuiabá, MT", initials: "JA", text: "A função de orçamento me ajuda a não estourar o limite mensal." },
    { name: "Bianca Moreira", city: "Palmas, TO", initials: "BM", text: "Compartilho com minha mãe. Ela adora a simplicidade!" },
    { name: "Edson Tavares", city: "Boa Vista, RR", initials: "ET", text: "Os relatórios são profissionais. Uso até para apresentar no trabalho!" },
    { name: "Fabiana Leal", city: "Macapá, AP", initials: "FL", text: "Perfeito para quem está começando a se organizar financeiramente." },
    { name: "Caio Ribeiro", city: "Porto Velho, RO", initials: "CR", text: "A melhor ferramenta de controle financeiro que já usei!" },
    { name: "Luciane Dias", city: "Rio Branco, AC", initials: "LD", text: "Compartilho com meus filhos adultos. Ajuda no planejamento familiar!" },
    { name: "Walter Freitas", city: "São Paulo, SP", initials: "WF", text: "Os gráficos de evolução patrimonial são incríveis!" },
    { name: "Alessandra Neves", city: "Rio de Janeiro, RJ", initials: "AN", text: "Finalmente consigo me organizar. Valeu muito a pena!" },
    { name: "Davi Monteiro", city: "Belo Horizonte, MG", initials: "DM", text: "A integração é perfeita. Tudo sincroniza rapidamente!" },
    { name: "Sabrina Coutinho", city: "Curitiba, PR", initials: "SC", text: "Uso com meu esposo. Planejamos nossa aposentadoria juntos!" },
    { name: "Marco Antonio", city: "Porto Alegre, RS", initials: "MA", text: "O controle de investimentos é muito detalhado. Adorei!" },
    { name: "Talita Fonseca", city: "Brasília, DF", initials: "TF", text: "Compartilho com minha irmã. Dividimos as contas da casa!" },
    { name: "Evandro Lima", city: "Salvador, BA", initials: "EL", text: "A funcionalidade de metas me motivou a poupar mais!" },
    { name: "Cíntia Barros", city: "Fortaleza, CE", initials: "CB", text: "Perfeito para autônomos. Separo receitas e despesas facilmente!" },
    { name: "Renan Costa", city: "Recife, PE", initials: "RC", text: "O design é maravilhoso. Muito intuitivo e bonito!" },
    { name: "Angélica Souza", city: "Manaus, AM", initials: "AS", text: "Compartilho com meu pai. Ele consegue usar sem dificuldade!" },
    { name: "Danilo Cardoso", city: "Belém, PA", initials: "DC", text: "As notificações são muito úteis. Nunca mais atrasei pagamento!" },
    { name: "Valéria Matos", city: "Goiânia, GO", initials: "VM", text: "Finalmente tenho controle total das finanças familiares!" },
    { name: "Emerson Ramos", city: "Vitória, ES", initials: "ER", text: "A privacidade dos dados me deixa tranquilo. Excelente segurança!" },
    { name: "Luana Pereira", city: "Florianópolis, SC", initials: "LP", text: "Compartilho com amigas. Organizamos a viagem de férias juntas!" },
    { name: "Arthur Mendes", city: "São Luís, MA", initials: "AM", text: "O app é leve e rápido. Funciona perfeitamente!" },
    { name: "Flávia Martins", city: "Maceió, AL", initials: "FM", text: "As categorias personalizadas fazem toda a diferença!" },
    { name: "Guilherme Torres", city: "Natal, RN", initials: "GT", text: "Controlo gastos pessoais e da empresa. Muito versátil!" }
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
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
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
