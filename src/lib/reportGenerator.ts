import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface ReportData {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  dateFrom: Date;
  dateTo: Date;
  selectedAccounts: Account[];
}

export const generatePDFReport = (data: ReportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Cover page
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório Financeiro", pageWidth / 2, 40, { align: "center" });
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  const periodText = `Período: ${format(data.dateFrom, "dd/MM/yyyy", { locale: ptBR })} a ${format(data.dateTo, "dd/MM/yyyy", { locale: ptBR })}`;
  doc.text(periodText, pageWidth / 2, 60, { align: "center" });
  
  doc.setFontSize(10);
  const generatedText = `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
  doc.text(generatedText, pageWidth / 2, 70, { align: "center" });

  // Summary
  doc.addPage();
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Sumário Executivo", 14, 20);
  
  const totalRevenue = data.transactions
    .filter((t) => Number(t.amount) > 0)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const totalExpenses = data.transactions
    .filter((t) => Number(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  
  const balance = totalRevenue - totalExpenses;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Total de Receitas: ${formatCurrency(totalRevenue)}`, 14, 35);
  doc.text(`Total de Despesas: ${formatCurrency(totalExpenses)}`, 14, 45);
  doc.text(`Saldo do Período: ${formatCurrency(balance)}`, 14, 55);
  doc.text(`Total de Transações: ${data.transactions.length}`, 14, 65);

  // Per account breakdown
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhamento por Conta", 14, 85);
  
  let yPosition = 95;
  data.selectedAccounts.forEach((account) => {
    const accountTransactions = data.transactions.filter(
      (t) => t.account_id === account.id
    );
    
    const accountRevenue = accountTransactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const accountExpenses = accountTransactions
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(account.name, 14, yPosition);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    yPosition += 7;
    doc.text(`Receitas: ${formatCurrency(accountRevenue)}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Despesas: ${formatCurrency(accountExpenses)}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Saldo: ${formatCurrency(accountRevenue - accountExpenses)}`, 20, yPosition);
    yPosition += 12;

    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
  });

  // Transactions table
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Transações Detalhadas", 14, 20);

  const tableData = data.transactions.map((t) => {
    const category = data.categories.find((c) => c.id === t.category_id);
    const account = data.accounts.find((a) => a.id === t.account_id);
    
    return [
      format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR }),
      t.description,
      category?.name || "Sem categoria",
      account?.name || "Sem conta",
      formatCurrency(Number(t.amount)),
    ];
  });

  autoTable(doc, {
    head: [["Data", "Descrição", "Categoria", "Conta", "Valor"]],
    body: tableData,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  // Category breakdown
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhamento por Categoria", 14, 20);

  const categoryData: Record<string, { revenue: number; expenses: number }> = {};
  
  data.transactions.forEach((t) => {
    const category = data.categories.find((c) => c.id === t.category_id);
    const categoryName = category?.name || "Sem categoria";
    
    if (!categoryData[categoryName]) {
      categoryData[categoryName] = { revenue: 0, expenses: 0 };
    }
    
    const amount = Number(t.amount);
    if (amount > 0) {
      categoryData[categoryName].revenue += amount;
    } else {
      categoryData[categoryName].expenses += Math.abs(amount);
    }
  });

  const categoryTableData = Object.entries(categoryData).map(([name, data]) => [
    name,
    formatCurrency(data.revenue),
    formatCurrency(data.expenses),
    formatCurrency(data.revenue - data.expenses),
  ]);

  autoTable(doc, {
    head: [["Categoria", "Receitas", "Despesas", "Saldo"]],
    body: categoryTableData,
    startY: 30,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  return doc;
};

export const generateCSVExport = (data: ReportData): string => {
  const headers = ["Data", "Descrição", "Categoria", "Conta", "Valor", "Tipo"];
  
  const rows = data.transactions.map((t) => {
    const category = data.categories.find((c) => c.id === t.category_id);
    const account = data.accounts.find((a) => a.id === t.account_id);
    const amount = Number(t.amount);
    
    return [
      format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR }),
      t.description,
      category?.name || "Sem categoria",
      account?.name || "Sem conta",
      amount.toFixed(2),
      amount > 0 ? "Receita" : "Despesa",
    ];
  });

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
};

export const generateExcelExport = (data: ReportData): Blob => {
  const workbook = XLSX.utils.book_new();

  // Transactions sheet
  const transactionsData = data.transactions.map((t) => {
    const category = data.categories.find((c) => c.id === t.category_id);
    const account = data.accounts.find((a) => a.id === t.account_id);
    const amount = Number(t.amount);
    
    return {
      Data: format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR }),
      Descrição: t.description,
      Categoria: category?.name || "Sem categoria",
      Conta: account?.name || "Sem conta",
      Valor: amount,
      Tipo: amount > 0 ? "Receita" : "Despesa",
    };
  });

  const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, "Transações");

  // Summary sheet
  const totalRevenue = data.transactions
    .filter((t) => Number(t.amount) > 0)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const totalExpenses = data.transactions
    .filter((t) => Number(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const summaryData = [
    { Métrica: "Total de Receitas", Valor: totalRevenue },
    { Métrica: "Total de Despesas", Valor: totalExpenses },
    { Métrica: "Saldo do Período", Valor: totalRevenue - totalExpenses },
    { Métrica: "Total de Transações", Valor: data.transactions.length },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  // Category breakdown sheet
  const categoryData: Record<string, { revenue: number; expenses: number }> = {};
  
  data.transactions.forEach((t) => {
    const category = data.categories.find((c) => c.id === t.category_id);
    const categoryName = category?.name || "Sem categoria";
    
    if (!categoryData[categoryName]) {
      categoryData[categoryName] = { revenue: 0, expenses: 0 };
    }
    
    const amount = Number(t.amount);
    if (amount > 0) {
      categoryData[categoryName].revenue += amount;
    } else {
      categoryData[categoryName].expenses += Math.abs(amount);
    }
  });

  const categoryBreakdown = Object.entries(categoryData).map(([name, data]) => ({
    Categoria: name,
    Receitas: data.revenue,
    Despesas: data.expenses,
    Saldo: data.revenue - data.expenses,
  }));

  const categorySheet = XLSX.utils.json_to_sheet(categoryBreakdown);
  XLSX.utils.book_append_sheet(workbook, categorySheet, "Por Categoria");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};
