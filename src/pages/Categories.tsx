import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Crown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useAccountEditPermissions } from "@/hooks/useAccountEditPermissions";
import { CategoryTree } from "@/components/categories/CategoryTree";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

interface CategoriesProps {
  accountId?: string;
}

export default function Categories({ accountId: propAccountId }: CategoriesProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const { canEditCategories } = usePlanLimits();
  const isMobile = useIsMobile();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(propAccountId || "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  
  // Update selectedAccountId when propAccountId changes
  useEffect(() => {
    if (propAccountId) {
      setSelectedAccountId(propAccountId);
    }
  }, [propAccountId]);

  const { categories, isLoading, createCategory, updateCategory, deleteCategory } =
    useCategories(selectedAccountId);
  const { transactions } = useTransactions(selectedAccountId);

  const { data: canEdit = false } = useAccountEditPermissions(selectedAccountId);

  const handleCreateCategory = () => {
    if (!selectedAccountId) {
      toast({
        title: "Selecione uma conta",
        description: "Você precisa selecionar uma conta primeiro",
        variant: "destructive",
      });
      return;
    }
    setSelectedCategory(null);
    setParentId(null);
    setDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setParentId(null);
    setDialogOpen(true);
  };

  const handleAddChild = (parentCategoryId: string) => {
    if (!selectedAccountId) return;
    setSelectedCategory(null);
    setParentId(parentCategoryId);
    setDialogOpen(true);
  };

  const handleSaveCategory = async (categoryData: any) => {
    if (selectedCategory) {
      await updateCategory.mutateAsync({ ...categoryData, id: selectedCategory.id });
    } else {
      await createCategory.mutateAsync(categoryData);
    }
    setDialogOpen(false);
    setSelectedCategory(null);
    setParentId(null);
  };

  const handleDeleteCategory = async (id: string) => {
    // Check if category has transactions
    const categoryTransactions = transactions?.filter((t) => t.category_id === id);
    
    if (categoryTransactions && categoryTransactions.length > 0) {
      toast({
        title: "Não é possível excluir",
        description: `Esta categoria possui ${categoryTransactions.length} lançamento(s). Mova ou exclua os lançamentos primeiro.`,
        variant: "destructive",
      });
      return;
    }

    // Check if category has children
    const hasChildren = categories?.some((c) => c.parent_id === id);
    
    if (hasChildren) {
      toast({
        title: "Não é possível excluir",
        description: "Esta categoria possui subcategorias. Exclua ou mova as subcategorias primeiro.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    await deleteCategory.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">
            Organize seus lançamentos em categorias
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateCategory} disabled={!canEdit}>
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Nova Categoria</span>}
          </Button>
        </div>
      </div>

      {!propAccountId && (
        <div className="w-64">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma conta" />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!canEditCategories ? (
        <div className="p-4 bg-muted rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium mb-1">Recurso exclusivo do plano Pro</p>
              <p className="text-sm text-muted-foreground mb-3">
                A visualização e edição de categorias está disponível apenas para assinantes Pro.
              </p>
              <Button 
                size="sm" 
                onClick={() => navigate("/app/planos")}
              >
                Fazer Upgrade
              </Button>
            </div>
          </div>
        </div>
      ) : !selectedAccountId ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">Selecione uma conta para ver as categorias</p>
        </div>
      ) : isLoading ? (
        <p className="text-muted-foreground">Carregando categorias...</p>
      ) : (
        <Tabs defaultValue="receita" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="receita">Receita</TabsTrigger>
            <TabsTrigger value="despesa">Despesas</TabsTrigger>
          </TabsList>
          <TabsContent value="receita" className="mt-6">
            <CategoryTree
              categories={categories?.filter(c => c.type === 'receita') || []}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              onAddChild={handleAddChild}
              canEdit={canEdit}
            />
          </TabsContent>
          <TabsContent value="despesa" className="mt-6">
            <CategoryTree
              categories={categories?.filter(c => c.type === 'despesa') || []}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              onAddChild={handleAddChild}
              canEdit={canEdit}
            />
          </TabsContent>
        </Tabs>
      )}

      {selectedAccountId && (
        <CategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveCategory}
          category={selectedCategory}
          accountId={selectedAccountId}
          parentId={parentId}
          categories={categories || []}
          accountType={accounts?.find(a => a.id === selectedAccountId)?.type}
        />
      )}
    </div>
  );
}
