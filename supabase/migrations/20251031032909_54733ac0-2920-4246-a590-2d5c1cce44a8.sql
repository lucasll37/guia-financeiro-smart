-- Adicionar coluna para marcar categorias criadas automaticamente (sistema)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN NOT NULL DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN categories.is_system_generated IS 'Marca categorias criadas automaticamente pelo sistema (ex: receitas em contas Casa) que não podem ser editadas/excluídas';

-- Atualizar RLS para impedir edição/exclusão de categorias de sistema
DROP POLICY IF EXISTS "Owners and editors can update categories" ON categories;
DROP POLICY IF EXISTS "Owners and editors can delete categories" ON categories;

-- Nova política de UPDATE que impede edição de categorias de sistema
CREATE POLICY "Owners and editors can update categories"
ON categories
FOR UPDATE
TO authenticated
USING (
  user_can_edit_account_resources(account_id, auth.uid()) 
  AND NOT is_system_generated
)
WITH CHECK (
  user_can_edit_account_resources(account_id, auth.uid()) 
  AND NOT is_system_generated
);

-- Nova política de DELETE que impede exclusão de categorias de sistema
CREATE POLICY "Owners and editors can delete categories"
ON categories
FOR DELETE
TO authenticated
USING (
  user_can_edit_account_resources(account_id, auth.uid()) 
  AND NOT is_system_generated
);