import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface PageMetaData {
  title: string;
  description: string;
  keywords?: string;
}

const pageMetadata: Record<string, PageMetaData> = {
  "/": {
    title: "Dashboard - Gestão Financeira Pessoal",
    description:
      "Visualize seus KPIs financeiros, fluxo de caixa, metas e alertas em tempo real",
    keywords: "dashboard, finanças pessoais, controle financeiro, KPIs",
  },
  "/contas": {
    title: "Contas - Gestão Financeira Pessoal",
    description:
      "Gerencie suas contas bancárias, cartões e investimentos em um só lugar",
    keywords: "contas bancárias, gestão de contas, finanças",
  },
  "/categorias": {
    title: "Categorias - Gestão Financeira Pessoal",
    description:
      "Organize suas despesas e receitas com categorias hierárquicas personalizadas",
    keywords: "categorias, organização financeira, despesas, receitas",
  },
  "/lancamentos": {
    title: "Lançamentos - Gestão Financeira Pessoal",
    description:
      "Registre e acompanhe todas as suas transações financeiras com filtros avançados",
    keywords: "lançamentos, transações, despesas, receitas, controle financeiro",
  },
  "/metas": {
    title: "Metas - Gestão Financeira Pessoal",
    description:
      "Defina e acompanhe suas metas financeiras com progresso em tempo real",
    keywords: "metas financeiras, objetivos, planejamento financeiro",
  },
  "/investimentos": {
    title: "Investimentos - Gestão Financeira Pessoal",
    description:
      "Acompanhe sua carteira de investimentos com simulações e projeções de rentabilidade",
    keywords: "investimentos, carteira, rentabilidade, simulador",
  },
  "/relatorios": {
    title: "Relatórios - Gestão Financeira Pessoal",
    description:
      "Gere relatórios detalhados em PDF, CSV e Excel com exportação e envio por email",
    keywords: "relatórios financeiros, exportação, PDF, Excel, análise financeira",
  },
  "/configuracoes": {
    title: "Configurações - Gestão Financeira Pessoal",
    description:
      "Personalize sua experiência com preferências de idioma, moeda, tema e formato de data",
    keywords: "configurações, preferências, personalização",
  },
};

export function PageMeta() {
  const location = useLocation();

  useEffect(() => {
    const metadata =
      pageMetadata[location.pathname] || pageMetadata["/"];

    // Update page title
    document.title = metadata.title;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute("content", metadata.description);

    // Update meta keywords
    if (metadata.keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement("meta");
        metaKeywords.setAttribute("name", "keywords");
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute("content", metadata.keywords);
    }

    // Update Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", metadata.title);
    }

    let ogDescription = document.querySelector(
      'meta[property="og:description"]'
    );
    if (ogDescription) {
      ogDescription.setAttribute("content", metadata.description);
    }

    // Update Twitter Card tags
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (!twitterTitle) {
      twitterTitle = document.createElement("meta");
      twitterTitle.setAttribute("name", "twitter:title");
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.setAttribute("content", metadata.title);

    let twitterDescription = document.querySelector(
      'meta[name="twitter:description"]'
    );
    if (!twitterDescription) {
      twitterDescription = document.createElement("meta");
      twitterDescription.setAttribute("name", "twitter:description");
      document.head.appendChild(twitterDescription);
    }
    twitterDescription.setAttribute("content", metadata.description);
  }, [location.pathname]);

  return null;
}
