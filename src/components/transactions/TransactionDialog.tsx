import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Trash2, CalendarIcon } from "lucide-react";
import { format, addMonths, startOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useToast } from "@/hooks/use-toast";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (transaction: TransactionInsert & { _silent?: boolean }) => Promise<void>;
  transaction?: any;
  accounts: Account[];
  categories: Category[];
  currentUserId: string;
  defaultAccountId?: string; // Conta pré-selecionada do contexto
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
  defaultAccountId,
}: TransactionDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<TransactionInsert>({
    account_id: defaultAccountId || "",
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
        account_id: defaultAccountId || "",
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
  }, [transaction, currentUserId, open, defaultAccountId]);

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
      const transactions: (TransactionInsert & { _silent?: boolean })[] = [];
      
      // Pegar ano e mês do payment_month para evitar problemas de timezone
      const [year, month] = formData.payment_month 
        ? formData.payment_month.split('-').map(Number)
        : [new Date().getFullYear(), new Date().getMonth() + 1];
      
      for (let i = 0; i < installmentCount; i++) {
        const installmentAmount = i < remainder ? baseInstallment + 0.01 : baseInstallment;
        
        // Calcular ano e mês da parcela atual
        let parcelMonth = month + i;
        let parcelYear = year;
        
        // Ajustar ano se o mês ultrapassar 12
        while (parcelMonth > 12) {
          parcelMonth -= 12;
          parcelYear += 1;
        }
        
        // Criar data como string diretamente para evitar timezone
        const parcelDate = `${parcelYear}-${String(parcelMonth).padStart(2, '0')}-01`;
        
        transactions.push({
          ...formData,
          date: parcelDate,
          amount: Math.round(installmentAmount * 100) / 100,
          description: `${formData.description} - ${cardName} (Compra em ${purchaseDate}) (${i + 1}/${installmentCount})`,
          payment_month: parcelDate,
          split_override: isShared && useCustomSplit ? (splitMembers as any) : null,
          _silent: true, // Marcar como silencioso
        });
      }
      
      // Salvar todas as parcelas sequencialmente
      for (const transaction of transactions) {
        await onSave(transaction);
      }
      
      // Mostrar toast único ao final
      toast({
        title: "Lançamentos criados",
        description: `${installmentCount} parcelas foram criadas com sucesso`,
      });
      
      onOpenChange(false);
    } else {
      // Lançamento único
      let transactionData = {
        ...formData,
        split_override: isShared && useCustomSplit ? (splitMembers as any) : null,
      };

      // Se for compra de cartão de crédito, adicionar data real na descrição e usar primeiro dia do mês de pagamento
      if (formData.credit_card_id && formData.payment_month) {
        const selectedCard = creditCards?.find(c => c.id === formData.credit_card_id);
        const cardName = selectedCard?.name || "Cartão";
        const purchaseDate = format(new Date(formData.date), "dd/MM/yyyy");
        
        transactionData = {
          ...transactionData,
          description: `${formData.description} - ${cardName} (Compra em ${purchaseDate})`,
          date: formData.payment_month, // Usar primeiro dia do mês de pagamento
        };
      }

      await onSave(transactionData);
      onOpenChange(false);
    }
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
  
  // Agrupar subcategorias por categoria pai
  const groupedSubcategories = useMemo(() => {
    const groups: Record<string, { parent: Category; subcategories: Category[] }> = {};
    
    filteredCategories.forEach((subcat) => {
      const parent = categories.find((c) => c.id === subcat.parent_id);
      if (parent) {
        if (!groups[parent.id]) {
          groups[parent.id] = { parent, subcategories: [] };
        }
        groups[parent.id].subcategories.push(subcat);
      }
    });
    
    return Object.values(groups).sort((a, b) => a.parent.name.localeCompare(b.parent.name));
  }, [filteredCategories, categories]);
  
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
          <div className={cn("grid gap-4", defaultAccountId ? "grid-cols-1" : "grid-cols-2")}>
            {!defaultAccountId && (
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
            )}

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
                  {groupedSubcategories.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Nenhuma subcategoria disponível. Crie subcategorias primeiro.
                    </div>
                  ) : (
                    groupedSubcategories.map(({ parent, subcategories }) => (
                      <div key={parent.id}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: parent.color }}
                          />
                          {parent.name}
                        </div>
                        {subcategories.map((category) => (
                          <SelectItem key={category.id} value={category.id} className="pl-6">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(new Date(formData.date), "dd/MM/yyyy") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date ? new Date(formData.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setFormData({ ...formData, date: format(date, "yyyy-MM-dd") });
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <DecimalInput
                id="amount"
                value={typeof formData.amount === 'number' ? formData.amount : (parseFloat(String(formData.amount)) || null)}
                onValueChange={(num) => {
                  setFormData({ ...formData, amount: num ?? 0 });
                }}
                placeholder="0.00"
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.payment_month && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.payment_month 
                        ? format(parseISO(formData.payment_month), "MMMM 'de' yyyy", { locale: ptBR }) 
                        : "Selecione o mês"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.payment_month ? parseISO(formData.payment_month) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const firstDay = startOfMonth(date);
                          setFormData({ ...formData, payment_month: format(firstDay, "yyyy-MM-dd") });
                        }
                      }}
                      initialFocus
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
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
                        <DecimalInput
                          placeholder="%"
                          value={member.percent ?? null}
                          onValueChange={(num) => {
                            updateSplitMember(index, "percent", (num ?? 0));
                          }}
                          className="w-24"
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
