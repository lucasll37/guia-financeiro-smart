import { useState } from "react";
import { ChevronRight, ChevronDown, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface CategoryTreeProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  canEdit?: boolean;
}

interface CategoryNodeProps {
  category: Category;
  categoryMap: Map<string, Category[]>;
  level: number;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  canEdit?: boolean;
}

function CategoryNode({ category, categoryMap, level, onEdit, onDelete, onAddChild, canEdit = true }: CategoryNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const children = categoryMap.get(category.id) || [];
  const hasChildren = children.length > 0;
  const isSystemGenerated = category.is_system_generated || false;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 group"
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-accent rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        <div
          className="w-4 h-4 rounded-full border-2"
          style={{ backgroundColor: category.color }}
        />

        <span className={`flex-1 ${level === 0 ? 'font-semibold' : ''}`}>{category.name}</span>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onAddChild(category.id)}
            disabled={!canEdit || isSystemGenerated}
            title={isSystemGenerated ? "Categoria automática - não pode adicionar subcategorias" : "Adicionar subcategoria"}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(category)}
            disabled={!canEdit || isSystemGenerated}
            title={isSystemGenerated ? "Categoria automática - não pode ser editada" : "Editar categoria"}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDelete(category.id)}
            disabled={!canEdit || isSystemGenerated}
            title={isSystemGenerated ? "Categoria automática - não pode ser excluída" : "Excluir categoria"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              categoryMap={categoryMap}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTree({ categories, onEdit, onDelete, onAddChild, canEdit = true }: CategoryTreeProps) {
  // Build tree structure
  const categoryMap = new Map<string, Category[]>();
  const rootCategories: Category[] = [];

  categories.forEach((cat) => {
    if (!cat.parent_id) {
      rootCategories.push(cat);
    } else {
      if (!categoryMap.has(cat.parent_id)) {
        categoryMap.set(cat.parent_id, []);
      }
      categoryMap.get(cat.parent_id)!.push(cat);
    }
  });

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">Nenhuma categoria cadastrada</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-1">
      {rootCategories.map((category) => (
        <CategoryNode
          key={category.id}
          category={category}
          categoryMap={categoryMap}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}
