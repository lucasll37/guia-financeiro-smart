import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { format, addMonths, startOfMonth } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { useCreditCards } from "@/hooks/useCreditCards";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (transaction: TransactionInsert) => Promise<void>;
  transaction?: any;
  accounts: Account[];
  categories: Category[];
  currentUserId: string;
}

interface SplitMember {
  user_id: string;
  percent: number;
}

export function TransactionDialog({
  open,
  onOpenChange,
  onSave,
  transaction,
  accounts,
  categories,
  currentUserId,
}: TransactionDialogProps) {
  const [formData, setFormData] = useState<TransactionInsert>({
    account_id: "",
    category_id: "",
    date: new Date().toISOString().split("T")[0],
    amount: 0,
    description: "",
    is_recurring: false,
    split_override: null,
    created_by: currentUserId,
    credit_card_id: null,
    payment_month: null,
  });

  const [installmentType, setInstallmentType] = useState<"single" | "installments">("single");
  const [installmentCount, setInstallmentCount] = useState(2);

  const { creditCards } = useCreditCards();

  const [useCustomSplit, setUseCustomSplit] = useState(false);
  const [splitMembers, setSplitMembers] = useState<SplitMember[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (transaction) {
      setFormData({
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.description,
        is_recurring: transaction.is_recurring,
        split_override: transaction.split_override,
        created_by: transaction.created_by,
        credit_card_id: transaction.credit_card_id || null,
        payment_month: transaction.payment_month || null,
      });
      
      if (transaction.split_override) {
        setUseCustomSplit(true);
        setSplitMembers(transaction.split_override as any);
      }
    } else {
      setFormData({
        account_id: "",
        category_id: "",
        date: new Date().toISOString().split("T")[0],
        amount: 0,
        description: "",
        is_recurring: false,
        split_override: null,
        created_by: currentUserId,
        credit_card_id: null,
        payment_month: null,
      });
      setUseCustomSplit(false);
      setSplitMembers([]);
      setInstallmentType("single");
      setInstallmentCount(2);
    }
    setErrors({});
  }, [transaction, currentUserId, open]);

  // Calcular mês de pagamento automaticamente quando selecionar cartão ou mudar data
  useEffect(() => {
    if (formData.credit_card_id && formData.date) {
      const card = creditCards?.find(c => c.id === formData.credit_card_id);
      if (card) {
        const transactionDate = new Date(formData.date);
        const transactionDay = transactionDate.getDate();
        
        // Se a compra foi depois do fechamento, vai para fatura do próximo mês
        let paymentMonth = startOfMonth(transactionDate);
        if (transactionDay > card.closing_day) {
          paymentMonth = addMonths(paymentMonth, 1);
        }
        
        setFormData(prev => ({
          ...prev,
          payment_month: format(paymentMonth, "yyyy-MM-dd"),
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        payment_month: null,
      }));
    }
  }, [formData.credit_card_id, formData.date, creditCards]);

  const selectedAccount = accounts.find((a) => a.id === formData.account_id);
  const isShared = selectedAccount?.is_shared || false;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.account_id) newErrors.account = "Conta é obrigatória";
    if (!formData.category_id) newErrors.category = "Categoria é obrigatória";
    
    // Validar se a categoria selecionada é uma subcategoria
    const selectedCategory = categories.find((c) => c.id === formData.category_id);
    if (selectedCategory && !selectedCategory.parent_id) {
      newErrors.category = "Selecione uma subcategoria, não uma categoria principal";
    }
    
    if (!formData.description.trim()) newErrors.description = "Descrição é obrigatória";
    if (formData.amount <= 0) newErrors.amount = "Valor deve ser maior que zero";

    if (isShared && useCustomSplit) {
      const total = splitMembers.reduce((sum, m) => sum + m.percent, 0);
      if (total !== 100) {
        newErrors.split = "A soma dos percentuais deve ser exatamente 100%";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Se for parcelado no cartão, criar múltiplas transações
    if (formData.credit_card_id && installmentType === "installments" && installmentCount > 1) {
      const totalAmount = formData.amount;
      const baseInstallment = Math.floor((totalAmount * 100) / installmentCount) / 100;
      const remainder = Math.round((totalAmount * 100) - (baseInstallment * 100 * installmentCount));
      
      const selectedCard = creditCards?.find(c => c.id === formData.credit_card_id);
      const cardName = selectedCard?.name || "Cartão";
      const purchaseDate = format(new Date(formData.date), "dd/MM/yyyy");
      
      // Criar array de transações
      const transactions: TransactionInsert[] = [];
      
      for (let i = 0; i < installmentCount; i++) {
        const installmentAmount = i < remainder ? baseInstallment + 0.01 : baseInstallment;
        
        const paymentMonth = formData.payment_month 
          ? addMonths(new Date(formData.payment_month), i)
          : addMonths(new Date(formData.date), i);
        
        const firstDayOfMonth = new Date(paymentMonth.getFullYear(), paymentMonth.getMonth(), 1);
        
        transactions.push({
          ...formData,
          date: format(firstDayOfMonth, "yyyy-MM-dd"),
          amount: Math.round(installmentAmount * 100) / 100,
          description: `${formData.description} - ${cardName} (Compra em ${purchaseDate}) (${i + 1}/${installmentCount})`,
          payment_month: format(paymentMonth, "yyyy-MM-dd"),
          split_override: isShared && useCustomSplit ? (splitMembers as any) : null,
        });
      }
      
      // Salvar todas as parcelas sequencialmente sem mostrar toast individual
      for (const transaction of transactions) {
        await onSave(transaction);
      }
    } else {
      // Lançamento único
      await onSave({
        ...formData,
        split_override: isShared && useCustomSplit ? (splitMembers as any) : null,
      });
    }
    
    onOpenChange(false);
  };

  const addSplitMember = () => {
    setSplitMembers([...splitMembers, { user_id: "", percent: 0 }]);
  };

  const removeSplitMember = (index: number) => {
    setSplitMembers(splitMembers.filter((_, i) => i !== index));
  };

  const updateSplitMember = (index: number, field: keyof SplitMember, value: any) => {
    const updated = [...splitMembers];
    updated[index] = { ...updated[index], [field]: value };
    setSplitMembers(updated);
  };

  const totalPercent = splitMembers.reduce((sum, m) => sum + m.percent, 0);

  // Filtrar apenas subcategorias (que possuem parent_id)
  const filteredCategories = categories.filter((c) => 
    c.account_id === formData.account_id && c.parent_id !== null
  );
  const filteredCreditCards = creditCards?.filter((c) => c.account_id === formData.account_id) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar Lançamento" : "Novo Lançamento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account">Conta *</Label>
              <Select
                value={formData.account_id}
                onValueChange={(value) => setFormData({ ...formData, account_id: value, category_id: "" })}
              >
                <SelectTrigger id="account">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account && <p className="text-sm text-destructive">{errors.account}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Subcategoria *</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                disabled={!formData.account_id}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione a subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Nenhuma subcategoria disponível. Crie subcategorias primeiro.
                    </div>
                  ) : (
                    filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Compra no supermercado"
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="credit_card">Cartão de Crédito (Opcional)</Label>
            <Select
              value={formData.credit_card_id || "none"}
              onValueChange={(value) => 
                setFormData({ ...formData, credit_card_id: value === "none" ? null : value })
              }
              disabled={!formData.account_id}
            >
              <SelectTrigger id="credit_card">
                <SelectValue placeholder="Selecione o cartão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cartão</SelectItem>
                {filteredCreditCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.credit_card_id && (
            <>
              <div className="space-y-2">
                <Label htmlFor="payment_month">Mês de Pagamento</Label>
                <Input
                  id="payment_month"
                  type="month"
                  value={formData.payment_month ? format(new Date(formData.payment_month), "yyyy-MM") : ""}
                  onChange={(e) => setFormData({ ...formData, payment_month: e.target.value + "-01" })}
                />
                <p className="text-xs text-muted-foreground">
                  Calculado automaticamente. Ajuste se necessário.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="installment_type">Tipo de Pagamento</Label>
                <Select
                  value={installmentType}
                  onValueChange={(value: "single" | "installments") => setInstallmentType(value)}
                >
                  <SelectTrigger id="installment_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">À vista</SelectItem>
                    <SelectItem value="installments">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {installmentType === "installments" && (
                <div className="space-y-2">
                  <Label htmlFor="installment_count">Número de Parcelas</Label>
                  <Select
                    value={installmentCount.toString()}
                    onValueChange={(value) => setInstallmentCount(Number(value))}
                  >
                    <SelectTrigger id="installment_count">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 2).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}x de R$ {(formData.amount / num).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    As parcelas iniciais podem ter centavos de diferença para ajuste.
                  </p>
                </div>
              )}
            </>
          )}

          {isShared && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="custom-split"
                    checked={useCustomSplit}
                    onCheckedChange={setUseCustomSplit}
                  />
                  <Label htmlFor="custom-split">Usar divisão personalizada</Label>
                </div>

                {useCustomSplit && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Divisão por Membro</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSplitMember}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>

                    {splitMembers.map((member, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="ID do usuário"
                          value={member.user_id}
                          onChange={(e) => updateSplitMember(index, "user_id", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="%"
                          value={member.percent || ""}
                          onChange={(e) => updateSplitMember(index, "percent", Number(e.target.value))}
                          className="w-24"
                          min={0}
                          max={100}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSplitMember(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="flex items-center justify-between text-sm">
                      <span>Total:</span>
                      <span className={totalPercent === 100 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                        {totalPercent}%
                      </span>
                    </div>

                    {errors.split && <p className="text-sm text-destructive">{errors.split}</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {transaction ? "Salvar" : "Criar Lançamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
