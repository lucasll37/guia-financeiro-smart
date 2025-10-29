import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, FolderTree } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Category {
  id: string;
  name: string;
  type: "receita" | "despesa";
  color: string;
  parent_id: string | null;
  account_id: string;
}

export function SeedCategoriesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [addingParent, setAddingParent] = useState(false);
  const [addingChild, setAddingChild] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "despesa" as "receita" | "despesa",
    color: "#6366f1",
  });

  // Buscar primeira conta do sistema para usar como template de categorias
  const { data: firstAccount } = useQuery({
    queryKey: ["first-account"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Buscar categorias seed (da primeira conta criada)
  const { data: categories, isLoading } = useQuery({
    queryKey: ["seed-categories", firstAccount?.id],
    queryFn: async () => {
      if (!firstAccount?.id) return [];

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("account_id", firstAccount.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!firstAccount?.id,
  });

  // Criar categoria
  const createCategory = useMutation({
    mutationFn: async (data: { name: string; type: "receita" | "despesa"; color: string; parent_id: string | null }) => {
      if (!firstAccount?.id) throw new Error("Conta não encontrada");

      const { error } = await supabase.from("categories").insert({
        account_id: firstAccount.id,
        name: data.name,
        type: data.type,
        color: data.color,
        parent_id: data.parent_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seed-categories"] });
      toast({
        title: "Categoria criada",
        description: "A categoria foi criada com sucesso.",
      });
      setAddingParent(false);
      setAddingChild(null);
      setEditForm({ name: "", type: "despesa", color: "#6366f1" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar categoria
  const updateCategory = useMutation({
    mutationFn: async ({ id, name, type, color }: { id: string; name: string; type: "receita" | "despesa"; color: string }) => {
      const { error } = await supabase
        .from("categories")
        .update({ name, type, color })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seed-categories"] });
      toast({
        title: "Categoria atualizada",
        description: "A categoria foi atualizada com sucesso.",
      });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deletar categoria
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seed-categories"] });
      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso.",
      });
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const parentCategories = categories?.filter((c) => !c.parent_id) || [];
  const getChildren = (parentId: string) =>
    categories?.filter((c) => c.parent_id === parentId) || [];

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      type: category.type,
      color: category.color,
    });
  };

  const handleSave = () => {
    if (!editingId) return;
    updateCategory.mutate({ id: editingId, ...editForm });
  };

  const handleAddParent = () => {
    if (!editForm.name) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a categoria.",
        variant: "destructive",
      });
      return;
    }
    createCategory.mutate({ ...editForm, parent_id: null });
  };

  const handleAddChild = (parentId: string) => {
    if (!editForm.name) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a subcategoria.",
        variant: "destructive",
      });
      return;
    }
    createCategory.mutate({ ...editForm, parent_id: parentId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!firstAccount) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Nenhuma conta encontrada no sistema. Crie uma conta primeiro.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          <CardTitle>Categorias Seed (Template)</CardTitle>
        </div>
        <CardDescription>
          Gerencie as categorias padrão que serão criadas para novas contas. Estas categorias são da primeira conta criada no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Adicionar Categoria Pai */}
        <div className="border rounded-lg p-4 bg-muted/50">
          {!addingParent ? (
            <Button onClick={() => setAddingParent(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Categoria Principal
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nome da categoria"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={editForm.type} onValueChange={(v: "receita" | "despesa") => setEditForm({ ...editForm, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    type="color"
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddParent} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button
                  onClick={() => {
                    setAddingParent(false);
                    setEditForm({ name: "", type: "despesa", color: "#6366f1" });
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Categorias */}
        <div className="space-y-4">
          {parentCategories.map((parent) => {
            const children = getChildren(parent.id);

            return (
              <div key={parent.id} className="border rounded-lg p-4 space-y-3">
                {/* Categoria Pai */}
                {editingId === parent.id ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={editForm.type} onValueChange={(v: "receita" | "despesa") => setEditForm({ ...editForm, type: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="receita">Receita</SelectItem>
                            <SelectItem value="despesa">Despesa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor</Label>
                        <Input
                          type="color"
                          value={editForm.color}
                          onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button onClick={() => setEditingId(null)} variant="outline" size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: parent.color }}
                      />
                      <span className="font-semibold text-lg">{parent.name}</span>
                      <Badge variant={parent.type === "receita" ? "default" : "secondary"}>
                        {parent.type === "receita" ? "Receita" : "Despesa"}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(parent)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(parent)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Subcategorias */}
                {children.length > 0 && (
                  <div className="ml-6 space-y-2 border-l-2 pl-4">
                    {children.map((child) => (
                      <div key={child.id}>
                        {editingId === child.id ? (
                          <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={editForm.type} onValueChange={(v: "receita" | "despesa") => setEditForm({ ...editForm, type: v })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="receita">Receita</SelectItem>
                                    <SelectItem value="despesa">Despesa</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Cor</Label>
                                <Input
                                  type="color"
                                  value={editForm.color}
                                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleSave} size="sm">
                                <Save className="h-4 w-4 mr-2" />
                                Salvar
                              </Button>
                              <Button onClick={() => setEditingId(null)} variant="outline" size="sm">
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: child.color }}
                              />
                              <span className="text-sm">{child.name}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(child)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDeleteTarget(child)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Adicionar Subcategoria */}
                <div className="ml-6 border-l-2 pl-4">
                  {addingChild === parent.id ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Nome da subcategoria"
                        />
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: parent.color }}
                          />
                          <span className="text-muted-foreground">Cor herdada</span>
                        </div>
                        <Badge variant={parent.type === "receita" ? "default" : "secondary"}>
                          {parent.type === "receita" ? "Receita" : "Despesa"}
                        </Badge>
                        <span className="text-muted-foreground text-xs">(herdados da categoria pai)</span>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleAddChild(parent.id)} size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                        <Button
                          onClick={() => {
                            setAddingChild(null);
                            setEditForm({ name: "", type: "despesa", color: "#6366f1" });
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setAddingChild(parent.id);
                        setEditForm({ name: "", type: parent.type, color: parent.color });
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Adicionar Subcategoria
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{deleteTarget?.name}"?
              {deleteTarget && !deleteTarget.parent_id && (
                <span className="block mt-2 text-destructive font-medium">
                  Atenção: Esta é uma categoria pai. Todas as subcategorias também serão excluídas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteCategory.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}