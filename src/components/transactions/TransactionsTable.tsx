import React, { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CreditCard, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, FolderTree, List } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMaskValues } from "@/hooks/useMaskValues";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  categories: {
    name: string;
    type: string;
    color: string;
  } | null;
};

interface TransactionsTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  categories?: any[]; // Lista completa de categorias para resolver hierarquia
  canEdit?: boolean;
  accountType?: string; // Tipo da conta (e.g., "casa")
}

export function TransactionsTable({
  transactions,
  onEdit,
  onDelete,
  categories = [],
  canEdit = true,
  accountType,
}: TransactionsTableProps) {
  const [sortField, setSortField] = useState<'date' | 'description' | 'amount' | 'category' | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [incomeExpanded, setIncomeExpanded] = useState(true);
  const [expenseExpanded, setExpenseExpanded] = useState(true);
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const { maskValue } = useMaskValues();

  const handleSort = (field: 'date' | 'description' | 'amount' | 'category') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Para data, começar com asc (mais antigo primeiro), para outros desc
      setSortDirection(field === 'date' ? 'asc' : 'desc');
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleSubcategoryExpansion = (subcategoryId: string) => {
    setExpandedSubcategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subcategoryId)) {
        newSet.delete(subcategoryId);
      } else {
        newSet.add(subcategoryId);
      }
      return newSet;
    });
  };

  const renderSortIcon = (field: 'date' | 'description' | 'amount' | 'category') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  // Separar e ordenar transações por tipo
  const { incomeTransactions, expenseTransactions, totalIncome, totalExpense, incomeByParent, expenseByParent } = useMemo(() => {
    const income = transactions.filter((t) => t.categories?.type === "receita");
    const expense = transactions.filter((t) => t.categories?.type === "despesa");

    // Mapa de categorias para lookup rápido
    const categoriesMap = new Map<string, any>(categories.map((c: any) => [c.id, c]));

    // Encontra o PAI RAIZ (sobe toda a hierarquia)
    const getRootParent = (cat: any | undefined | null): any | undefined => {
      if (!cat) return undefined;
      let current = cat;
      while (current?.parent_id && categoriesMap.get(current.parent_id)) {
        current = categoriesMap.get(current.parent_id);
      }
      return current;
    };
    
    const sortTransactions = (txs: Transaction[]) => {
      if (!sortField) return txs;
      
      return [...txs].sort((a, b) => {
        let comparison = 0;
        
        if (sortField === 'date') {
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === 'description') {
          comparison = a.description.localeCompare(b.description);
        } else if (sortField === 'amount') {
          comparison = a.amount - b.amount;
        } else if (sortField === 'category') {
          // Buscar categoria raiz para ordenar
          const catA = categoriesMap.get(a.category_id as any);
          const catB = categoriesMap.get(b.category_id as any);
          const rootA = getRootParent(catA) || catA;
          const rootB = getRootParent(catB) || catB;

          const parentNameA = rootA?.name || catA?.name || '';
          const parentNameB = rootB?.name || catB?.name || '';
          
          comparison = parentNameA.localeCompare(parentNameB);
          
          // Se mesma raiz, ordenar por subcategoria
          if (comparison === 0) {
            const subNameA = catA?.name || '';
            const subNameB = catB?.name || '';
            comparison = subNameA.localeCompare(subNameB);
          }
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    };
    
    // Agrupar por categoria pai (raiz)
    const groupByParent = (txs: Transaction[]) => {
      const grouped: Record<string, { parent: any; children: Transaction[]; total: number }> = {};
      
      txs.forEach(transaction => {
        const category = categoriesMap.get(transaction.category_id as any);
        const root = getRootParent(category) || category;
        const parentId = (root?.id as string) || (transaction.category_id as string);
        
        if (!grouped[parentId]) {
          grouped[parentId] = {
            parent: root,
            children: [],
            total: 0
          };
        }
        
        grouped[parentId].children.push(transaction);
        grouped[parentId].total += transaction.amount;
      });
      
      return grouped;
    };

    // Agrupar por categoria pai e subcategoria (dois níveis)
    const groupByParentAndSubcategory = (txs: Transaction[]) => {
      const grouped: Record<string, { 
        parent: any; 
        subcategories: Record<string, { 
          subcategory: any; 
          transactions: Transaction[]; 
          total: number 
        }>; 
        total: number 
      }> = {};
      
      txs.forEach(transaction => {
        const category = categoriesMap.get(transaction.category_id as any);
        const root = getRootParent(category) || category;
        const parentId = (root?.id as string) || (transaction.category_id as string);
        const subcategoryId = (category?.id as string) || (transaction.category_id as string);
        
        if (!grouped[parentId]) {
          grouped[parentId] = {
            parent: root || category,
            subcategories: {},
            total: 0
          };
        }
        
        if (!grouped[parentId].subcategories[subcategoryId]) {
          grouped[parentId].subcategories[subcategoryId] = {
            subcategory: category,
            transactions: [],
            total: 0
          };
        }
        
        grouped[parentId].subcategories[subcategoryId].transactions.push(transaction);
        grouped[parentId].subcategories[subcategoryId].total += transaction.amount;
        grouped[parentId].total += transaction.amount;
      });
      
      return grouped;
    };
    
    const incomeTotal = income.reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = expense.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      incomeTransactions: sortTransactions(income),
      expenseTransactions: sortTransactions(expense),
      totalIncome: incomeTotal,
      totalExpense: expenseTotal,
      incomeByParent: groupByCategory ? groupByParentAndSubcategory(income) : {},
      expenseByParent: groupByCategory ? groupByParentAndSubcategory(expense) : {},
    };
  }, [transactions, sortField, sortDirection, groupByCategory, categories]);

  const balance = totalIncome - totalExpense;

  const renderTransactionRow = (transaction: Transaction) => {
    const isExpense = transaction.categories?.type === "despesa";
    const isCreditCard = !!transaction.credit_card_id;
    const isIncome = transaction.categories?.type === "receita";
    
    return (
      <TableRow key={transaction.id}>
        <TableCell>
          {format(parse(String(transaction.date), "yyyy-MM-dd", new Date()), "dd/MM/yyyy")}
        </TableCell>
        <TableCell className="max-w-[280px]">
          {transaction.categories && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: transaction.categories.color }}
              />
              <span className="break-words">{transaction.categories.name}</span>
            </div>
          )}
        </TableCell>
        <TableCell className="max-w-[200px] break-words">
          {transaction.description}
        </TableCell>
        <TableCell className="text-right">
          <span className={isExpense ? "text-destructive" : "text-green-600"}>
            {isExpense ? "-" : "+"} {maskValue(formatCurrency(transaction.amount))}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(transaction)}
              disabled={!canEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(transaction.id)}
              disabled={!canEdit}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderGroupedTransactions = (groupedData: any, isExpense: boolean) => {
    return Object.entries(groupedData).map(([parentId, data]: [string, any]) => {
      const isExpanded = expandedCategories.has(parentId);
      
      // Verifica se tem subcategorias (dois níveis)
      if (data.subcategories) {
        return (
          <React.Fragment key={parentId}>
            {/* Categoria Pai */}
            <TableRow
              className="cursor-pointer hover:bg-muted/50 font-medium bg-muted/20"
              onClick={() => toggleCategoryExpansion(parentId)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategoryExpansion(parentId);
                    }}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: data.parent?.color || "#6366f1" }}
                  />
                  <span className="font-semibold text-base">{data.parent?.name || "Sem categoria"}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    ({(Object.values(data.subcategories) as any[]).reduce((sum: number, sub: any) => sum + sub.transactions.length, 0)})
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {(Object.values(data.subcategories) as any[]).reduce((sum: number, sub: any) => sum + sub.transactions.length, 0)} lançamento(s)
              </TableCell>
              <TableCell className="text-right font-semibold">
                <span className={isExpense ? "text-destructive" : "text-green-600"}>
                  {isExpense ? "-" : "+"} {maskValue(formatCurrency(data.total))}
                </span>
              </TableCell>
              <TableCell />
            </TableRow>
            
            {/* Subcategorias */}
            {isExpanded && Object.entries(data.subcategories).map(([subcategoryId, subData]: [string, any]) => {
              const isSubExpanded = expandedSubcategories.has(subcategoryId);
              
              return (
                <React.Fragment key={subcategoryId}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/30 bg-muted/10"
                    onClick={() => toggleSubcategoryExpansion(subcategoryId)}
                  >
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSubcategoryExpansion(subcategoryId);
                          }}
                        >
                          {isSubExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                        <div className="w-0.5 h-6 bg-primary/30" />
                        <span className="text-sm font-medium">{subData.subcategory?.name || "Sem subcategoria"}</span>
                        <span className="text-xs text-muted-foreground font-normal">({subData.transactions.length})</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {subData.transactions.length} lançamento(s)
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      <span className={isExpense ? "text-destructive" : "text-green-600"}>
                        {isExpense ? "-" : "+"} {maskValue(formatCurrency(subData.total))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" />
                  </TableRow>
                  
                  {/* Transações individuais */}
                  {isSubExpanded && subData.transactions.map((transaction: Transaction) => (
                    <TableRow key={transaction.id} className="bg-muted/20">
                      <TableCell className="pl-16">
                        <div className="flex items-center gap-2">
                          <div className="w-0.5 h-6 bg-primary/20" />
                          <span className="text-xs font-normal text-muted-foreground">
                            {format(parse(String(transaction.date), "yyyy-MM-dd", new Date()), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] break-words">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <span className={isExpense ? "text-destructive" : "text-green-600"}>
                          {isExpense ? "-" : "+"} {maskValue(formatCurrency(transaction.amount))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(transaction)}
                            disabled={!canEdit}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(transaction.id)}
                            disabled={!canEdit}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      }
      
      // Fallback para estrutura antiga (não usado mais)
      return null;
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Data</TableHead>
              <TableHead className="w-[200px]">Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right w-[150px]">Valor</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum lançamento encontrado
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle para visualização agrupada */}
      <div className="flex justify-end">
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg">
          <List className="h-4 w-4 text-muted-foreground" />
          <span className={`text-sm font-medium ${!groupByCategory ? 'text-foreground' : 'text-muted-foreground'}`}>
            Plano
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={groupByCategory}
              onChange={() => setGroupByCategory(!groupByCategory)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
          <span className={`text-sm font-medium ${groupByCategory ? 'text-foreground' : 'text-muted-foreground'}`}>
            Árvore
          </span>
          <FolderTree className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Receitas */}
      {(incomeTransactions.length > 0 || Object.keys(incomeByParent).length > 0) && (
        <Collapsible open={incomeExpanded} onOpenChange={setIncomeExpanded}>
          <div className="border rounded-lg">
            <CollapsibleTrigger asChild>
              <div className="bg-green-50 dark:bg-green-950/20 px-4 py-2 border-b cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors flex items-center justify-between">
                <h3 className="font-semibold text-green-700 dark:text-green-400">Receitas</h3>
                {incomeExpanded ? (
                  <ChevronDown className="h-4 w-4 text-green-700 dark:text-green-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-green-700 dark:text-green-400" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
            <TableHeader>
              <TableRow>
                {!groupByCategory && (
                  <TableHead className="w-[120px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('date')} className="flex items-center gap-1 p-0 h-auto font-medium">
                      Data
                      {renderSortIcon('date')}
                    </Button>
                  </TableHead>
                )}
                <TableHead className="w-[280px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('category')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Categoria
                    {renderSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead className="w-[200px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('description')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Descrição
                    {renderSortIcon('description')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[150px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('amount')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Valor
                    {renderSortIcon('amount')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupByCategory 
                ? renderGroupedTransactions(incomeByParent, false)
                : incomeTransactions.map(renderTransactionRow)
              }
              <TableRow className="bg-green-50/50 dark:bg-green-950/10 font-semibold">
                <TableCell colSpan={groupByCategory ? 2 : 3} className="text-right">
                  Total de Receitas:
                </TableCell>
                <TableCell className="text-right text-green-600">
                  + {maskValue(formatCurrency(totalIncome))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
            </CollapsibleContent>
        </div>
        </Collapsible>
      )}

      {/* Despesas */}
      {(expenseTransactions.length > 0 || Object.keys(expenseByParent).length > 0) && (
        <Collapsible open={expenseExpanded} onOpenChange={setExpenseExpanded}>
          <div className="border rounded-lg">
            <CollapsibleTrigger asChild>
              <div className="bg-red-50 dark:bg-red-950/20 px-4 py-2 border-b cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors flex items-center justify-between">
                <h3 className="font-semibold text-red-700 dark:text-red-400">Despesas</h3>
                {expenseExpanded ? (
                  <ChevronDown className="h-4 w-4 text-red-700 dark:text-red-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-red-700 dark:text-red-400" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
            <TableHeader>
              <TableRow>
                {!groupByCategory && (
                  <TableHead className="w-[120px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('date')} className="flex items-center gap-1 p-0 h-auto font-medium">
                      Data
                      {renderSortIcon('date')}
                    </Button>
                  </TableHead>
                )}
                <TableHead className="w-[280px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('category')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Categoria
                    {renderSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead className="w-[200px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('description')} className="flex items-center gap-1 p-0 h-auto font-medium">
                    Descrição
                    {renderSortIcon('description')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[150px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('amount')} className="flex items-center gap-1 p-0 h-auto font-medium ml-auto">
                    Valor
                    {renderSortIcon('amount')}
                  </Button>
                </TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupByCategory 
                ? renderGroupedTransactions(expenseByParent, true)
                : expenseTransactions.map(renderTransactionRow)
              }
              <TableRow className="bg-red-50/50 dark:bg-red-950/10 font-semibold">
                <TableCell colSpan={groupByCategory ? 2 : 3} className="text-right">
                  Total de Despesas:
                </TableCell>
                <TableCell className="text-right text-destructive">
                  - {maskValue(formatCurrency(totalExpense))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
            </CollapsibleContent>
        </div>
        </Collapsible>
      )}

      {/* Saldo */}
      <div className="border rounded-lg bg-muted/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Saldo:</span>
            <span className={`text-xl font-bold ${balance >= 0 ? "text-green-600" : "text-destructive"}`}>
              {maskValue(formatCurrency(balance))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
