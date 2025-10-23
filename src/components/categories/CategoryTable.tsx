import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
}

export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  // Organizar categorias por hierarquia
  const parentCategories = categories.filter((cat) => !cat.parent_id);
  const childrenMap = new Map<string, Category[]>();

  categories.forEach((cat) => {
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
            <TableHead className="font-semibold">Categoria</TableHead>
            <TableHead className="font-semibold">Tipo</TableHead>
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
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(category)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(category.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
