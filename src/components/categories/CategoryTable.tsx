import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
}

export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  const navigate = useNavigate();
  const { canEditCategories } = usePlanLimits();
  const [sortField, setSortField] = useState<'name' | 'type' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'name' | 'type') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: 'name' | 'type') => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Organizar categorias por hierarquia com ordenação
  const sortedCategories = useMemo(() => {
    if (!sortField) return categories;
    
    return [...categories].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'type') {
        comparison = a.type.localeCompare(b.type);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [categories, sortField, sortDirection]);

  const parentCategories = sortedCategories.filter((cat) => !cat.parent_id);
  const childrenMap = new Map<string, Category[]>();

  sortedCategories.forEach((cat) => {
    if (cat.parent_id) {
      const existing = childrenMap.get(cat.parent_id) || [];
      childrenMap.set(cat.parent_id, [...existing, cat]);
    }
  });

  const rows: Array<{ category: Category; isParent: boolean }> = [];

  parentCategories.forEach((parent) => {
    rows.push({ category: parent, isParent: true });
    const children = childrenMap.get(parent.id) || [];
    children.forEach((child) => {
      rows.push({ category: child, isParent: false });
    });
  });

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">
              <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                Categoria
                {renderSortIcon('name')}
              </Button>
            </TableHead>
            <TableHead className="font-semibold">
              <Button variant="ghost" size="sm" onClick={() => handleSort('type')} className="flex items-center gap-1 p-0 h-auto font-semibold">
                Tipo
                {renderSortIcon('type')}
              </Button>
            </TableHead>
            <TableHead className="font-semibold w-[100px]">Cor</TableHead>
            <TableHead className="text-right font-semibold w-[120px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ category, isParent }) => (
            <TableRow
              key={category.id}
              className={isParent ? "bg-muted/30 font-semibold" : "hover:bg-muted/50"}
            >
              <TableCell className={isParent ? "font-bold text-foreground" : "text-primary pl-8"}>
                {category.name}
              </TableCell>
              <TableCell className="capitalize">
                {category.type}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 w-4 rounded-full border"
                    style={{ backgroundColor: category.color }}
                  />
                </div>
              </TableCell>
              <TableCell className="text-right">
                <TooltipProvider>
                  <div className="flex justify-end gap-1">
                    {/* Desabilitar edição para categorias do sistema */}
                    {!category.is_system_generated ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => canEditCategories ? onEdit(category) : navigate("/app/planos")}
                              disabled={!canEditCategories}
                              className="h-8 w-8 relative"
                            >
                              <Pencil className="h-4 w-4" />
                              {!canEditCategories && (
                                <Crown className="h-3 w-3 absolute -top-1 -right-1 text-primary" />
                              )}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!canEditCategories && (
                          <TooltipContent>
                            <p className="text-xs max-w-[200px]">
                              Editar categorias é exclusivo do plano Pro. Clique para fazer upgrade.
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={true}
                              className="h-8 w-8 opacity-50 cursor-not-allowed"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-[200px]">
                            Esta categoria foi criada automaticamente e não pode ser editada
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {/* Desabilitar exclusão para categorias do sistema */}
                    {!category.is_system_generated ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => canEditCategories ? onDelete(category.id) : navigate("/app/planos")}
                              disabled={!canEditCategories}
                              className="h-8 w-8 text-destructive hover:text-destructive relative"
                            >
                              <Trash2 className="h-4 w-4" />
                              {!canEditCategories && (
                                <Crown className="h-3 w-3 absolute -top-1 -right-1 text-primary" />
                              )}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!canEditCategories && (
                          <TooltipContent>
                            <p className="text-xs max-w-[200px]">
                              Deletar categorias é exclusivo do plano Pro. Clique para fazer upgrade.
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={true}
                              className="h-8 w-8 text-destructive opacity-50 cursor-not-allowed"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-[200px]">
                            Esta categoria foi criada automaticamente e não pode ser excluída
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
