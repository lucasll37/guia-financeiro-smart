import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Autorização necessária");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Ferramentas disponíveis para o assistente
    const tools = [
      {
        type: "function",
        function: {
          name: "get_accounts_summary",
          description: "Retorna resumo de todas as contas do usuário com saldos e informações básicas",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_account_details",
          description: "Retorna detalhes completos de uma conta específica incluindo membros e configurações",
          parameters: {
            type: "object",
            properties: {
              account_id: {
                type: "string",
                description: "ID da conta",
              },
            },
            required: ["account_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_recent_transactions",
          description: "Retorna transações recentes do usuário, opcionalmente filtradas por período",
          parameters: {
            type: "object",
            properties: {
              days: {
                type: "number",
                description: "Número de dias para buscar transações (padrão: 30)",
              },
              account_id: {
                type: "string",
                description: "ID da conta específica (opcional)",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_spending_by_category",
          description: "Analisa gastos por categoria em um período específico",
          parameters: {
            type: "object",
            properties: {
              days: {
                type: "number",
                description: "Número de dias para análise (padrão: 30)",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_goals_progress",
          description: "Retorna progresso de todas as metas financeiras do usuário",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_monthly_summary",
          description: "Gera resumo financeiro mensal com receitas, despesas e saldo",
          parameters: {
            type: "object",
            properties: {
              month: {
                type: "string",
                description: "Mês no formato YYYY-MM (padrão: mês atual)",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_investments_summary",
          description: "Retorna resumo de todos os investimentos do usuário",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_investment_details",
          description: "Retorna detalhes completos de um investimento específico incluindo retornos históricos",
          parameters: {
            type: "object",
            properties: {
              investment_id: {
                type: "string",
                description: "ID do investimento",
              },
            },
            required: ["investment_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_credit_cards",
          description: "Lista todos os cartões de crédito do usuário com limites e datas",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_credit_card_invoice",
          description: "Retorna detalhes de fatura de cartão de crédito para um mês específico",
          parameters: {
            type: "object",
            properties: {
              card_id: {
                type: "string",
                description: "ID do cartão de crédito",
              },
              month: {
                type: "string",
                description: "Mês no formato YYYY-MM (padrão: mês atual)",
              },
            },
            required: ["card_id"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_budgets",
          description: "Lista todos os orçamentos configurados pelo usuário",
          parameters: {
            type: "object",
            properties: {
              period: {
                type: "string",
                description: "Período específico (opcional)",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_forecasts",
          description: "Lista todas as previsões de gastos configuradas",
          parameters: {
            type: "object",
            properties: {
              account_id: {
                type: "string",
                description: "ID da conta específica (opcional)",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_categories",
          description: "Lista todas as categorias personalizadas do usuário organizadas hierarquicamente",
          parameters: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description: "Tipo de categoria: receita ou despesa (opcional)",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_notifications",
          description: "Lista notificações recentes do usuário",
          parameters: {
            type: "object",
            properties: {
              unread_only: {
                type: "boolean",
                description: "Se true, retorna apenas não lidas (padrão: false)",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_user_profile",
          description: "Retorna informações do perfil do usuário",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_subscription_info",
          description: "Retorna informações sobre a assinatura e limites do plano do usuário",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_spending_trends",
          description: "Analisa tendências de gastos ao longo de vários meses",
          parameters: {
            type: "object",
            properties: {
              months: {
                type: "number",
                description: "Número de meses para análise (padrão: 6)",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "compare_periods",
          description: "Compara gastos entre dois períodos diferentes",
          parameters: {
            type: "object",
            properties: {
              period1_start: {
                type: "string",
                description: "Data inicial do primeiro período (YYYY-MM-DD)",
              },
              period1_end: {
                type: "string",
                description: "Data final do primeiro período (YYYY-MM-DD)",
              },
              period2_start: {
                type: "string",
                description: "Data inicial do segundo período (YYYY-MM-DD)",
              },
              period2_end: {
                type: "string",
                description: "Data final do segundo período (YYYY-MM-DD)",
              },
            },
            required: ["period1_start", "period1_end", "period2_start", "period2_end"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_account_members",
          description: "Lista membros compartilhados de uma conta específica",
          parameters: {
            type: "object",
            properties: {
              account_id: {
                type: "string",
                description: "ID da conta",
              },
            },
            required: ["account_id"],
          },
        },
      },
    ];

    // Executa tool calls
    const executeToolCall = async (toolCall: ToolCall) => {
      const { name, arguments: argsStr } = toolCall.function;
      const args = JSON.parse(argsStr);

      console.log(`Executando ferramenta: ${name}`, args);

      switch (name) {
        case "get_accounts_summary": {
          const { data: accounts } = await supabase
            .from("accounts")
            .select(`
              id, name, type, currency,
              transactions(amount, date)
            `)
            .eq("owner_id", user.id)
            .is("deleted_at", null);

          const summary = accounts?.map(acc => {
            const transactions = acc.transactions || [];
            const balance = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
            return {
              id: acc.id,
              name: acc.name,
              type: acc.type,
              currency: acc.currency,
              balance: balance.toFixed(2),
              transaction_count: transactions.length,
            };
          });

          return JSON.stringify(summary || []);
        }

        case "get_account_details": {
          const { data: account } = await supabase
            .from("accounts")
            .select(`
              *,
              account_members(
                id,
                role,
                status,
                profiles(name, email)
              )
            `)
            .eq("id", args.account_id)
            .eq("owner_id", user.id)
            .single();

          return JSON.stringify(account || {});
        }

        case "get_recent_transactions": {
          const days = args.days || 30;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);

          let query = supabase
            .from("transactions")
            .select(`
              id, description, amount, date,
              categories(name, type, color),
              accounts(name)
            `)
            .eq("created_by", user.id)
            .gte("date", startDate.toISOString().split("T")[0])
            .order("date", { ascending: false })
            .limit(20);

          if (args.account_id) {
            query = query.eq("account_id", args.account_id);
          }

          const { data: transactions } = await query;

          return JSON.stringify(transactions || []);
        }

        case "get_spending_by_category": {
          const days = args.days || 30;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);

          const { data: transactions } = await supabase
            .from("transactions")
            .select(`
              amount,
              categories(name, type)
            `)
            .eq("created_by", user.id)
            .gte("date", startDate.toISOString().split("T")[0])
            .lt("amount", 0);

          const byCategory: Record<string, number> = {};
          transactions?.forEach((t: any) => {
            if (t.categories) {
              const cat = t.categories.name;
              byCategory[cat] = (byCategory[cat] || 0) + Math.abs(Number(t.amount));
            }
          });

          const sorted = Object.entries(byCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([category, amount]) => ({
              category,
              amount: amount.toFixed(2),
            }));

          return JSON.stringify(sorted);
        }

        case "get_goals_progress": {
          const { data: goals } = await supabase
            .from("goals")
            .select("*")
            .eq("user_id", user.id);

          const summary = goals?.map(g => ({
            name: g.name,
            target: Number(g.target_amount).toFixed(2),
            current: Number(g.current_amount).toFixed(2),
            progress: ((Number(g.current_amount) / Number(g.target_amount)) * 100).toFixed(1),
            deadline: g.deadline,
          }));

          return JSON.stringify(summary || []);
        }

        case "get_monthly_summary": {
          const month = args.month || new Date().toISOString().slice(0, 7);
          const startDate = `${month}-01`;
          const endDate = new Date(month + "-01");
          endDate.setMonth(endDate.getMonth() + 1);

          const { data: transactions } = await supabase
            .from("transactions")
            .select("amount, date")
            .eq("created_by", user.id)
            .gte("date", startDate)
            .lt("date", endDate.toISOString().split("T")[0]);

          let income = 0;
          let expense = 0;

          transactions?.forEach((t: any) => {
            const amount = Number(t.amount);
            if (amount > 0) income += amount;
            else expense += Math.abs(amount);
          });

          return JSON.stringify({
            month,
            income: income.toFixed(2),
            expense: expense.toFixed(2),
            balance: (income - expense).toFixed(2),
            transaction_count: transactions?.length || 0,
          });
        }

        case "get_investments_summary": {
          const { data: investments } = await supabase
            .from("investment_assets")
            .select("*")
            .eq("owner_id", user.id);

          const summary = investments?.map(inv => ({
            id: inv.id,
            name: inv.name,
            type: inv.type,
            balance: Number(inv.balance).toFixed(2),
            monthly_rate: Number(inv.monthly_rate).toFixed(2),
            fees: Number(inv.fees).toFixed(2),
          }));

          return JSON.stringify(summary || []);
        }

        case "get_investment_details": {
          const { data: investment } = await supabase
            .from("investment_assets")
            .select(`
              *,
              investment_monthly_returns(
                month,
                actual_return,
                contribution,
                balance_after,
                inflation_rate,
                notes
              )
            `)
            .eq("id", args.investment_id)
            .eq("owner_id", user.id)
            .single();

          return JSON.stringify(investment || {});
        }

        case "get_credit_cards": {
          const { data: accounts } = await supabase
            .from("accounts")
            .select("id")
            .eq("owner_id", user.id)
            .is("deleted_at", null);

          const accountIds = accounts?.map(a => a.id) || [];

          const { data: cards } = await supabase
            .from("credit_cards")
            .select("*")
            .in("account_id", accountIds);

          return JSON.stringify(cards || []);
        }

        case "get_credit_card_invoice": {
          const month = args.month || new Date().toISOString().slice(0, 7);
          
          const { data: transactions } = await supabase
            .from("transactions")
            .select(`
              *,
              categories(name, type, color)
            `)
            .eq("credit_card_id", args.card_id)
            .eq("payment_month", `${month}-01`)
            .order("date", { ascending: false });

          const total = transactions?.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

          return JSON.stringify({
            card_id: args.card_id,
            month,
            transactions: transactions || [],
            total: total.toFixed(2),
          });
        }

        case "get_budgets": {
          const { data: accounts } = await supabase
            .from("accounts")
            .select("id")
            .eq("owner_id", user.id)
            .is("deleted_at", null);

          const accountIds = accounts?.map(a => a.id) || [];

          let query = supabase
            .from("budgets")
            .select(`
              *,
              categories(name, type, color),
              accounts(name)
            `)
            .in("account_id", accountIds);

          if (args.period) {
            query = query.eq("period", args.period);
          }

          const { data: budgets } = await query;

          return JSON.stringify(budgets || []);
        }

        case "get_forecasts": {
          let query = supabase
            .from("account_period_forecasts")
            .select(`
              *,
              categories(name, type, color),
              accounts(name)
            `);

          if (args.account_id) {
            query = query.eq("account_id", args.account_id);
          } else {
            const { data: accounts } = await supabase
              .from("accounts")
              .select("id")
              .eq("owner_id", user.id)
              .is("deleted_at", null);

            const accountIds = accounts?.map(a => a.id) || [];
            query = query.in("account_id", accountIds);
          }

          const { data: forecasts } = await query;

          return JSON.stringify(forecasts || []);
        }

        case "get_categories": {
          const { data: accounts } = await supabase
            .from("accounts")
            .select("id")
            .eq("owner_id", user.id)
            .is("deleted_at", null);

          const accountIds = accounts?.map(a => a.id) || [];

          let query = supabase
            .from("categories")
            .select("*")
            .in("account_id", accountIds);

          if (args.type) {
            query = query.eq("type", args.type);
          }

          const { data: categories } = await query;

          // Organizar hierarquicamente
          const parents = categories?.filter(c => !c.parent_id) || [];
          const categoriesWithChildren = parents.map(parent => ({
            ...parent,
            subcategories: categories?.filter(c => c.parent_id === parent.id) || [],
          }));

          return JSON.stringify(categoriesWithChildren);
        }

        case "get_notifications": {
          let query = supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (args.unread_only) {
            query = query.eq("read", false);
          }

          const { data: notifications } = await query;

          return JSON.stringify(notifications || []);
        }

        case "get_user_profile": {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          return JSON.stringify(profile || {});
        }

        case "get_subscription_info": {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select(`
              *,
              plan_limits:plan_limits!plan(*)
            `)
            .eq("user_id", user.id)
            .single();

          return JSON.stringify(subscription || {});
        }

        case "get_spending_trends": {
          const months = args.months || 6;
          const trends = [];
          
          for (let i = 0; i < months; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const month = date.toISOString().slice(0, 7);
            const startDate = `${month}-01`;
            const endDate = new Date(month + "-01");
            endDate.setMonth(endDate.getMonth() + 1);

            const { data: transactions } = await supabase
              .from("transactions")
              .select("amount")
              .eq("created_by", user.id)
              .gte("date", startDate)
              .lt("date", endDate.toISOString().split("T")[0]);

            let income = 0;
            let expense = 0;

            transactions?.forEach((t: any) => {
              const amount = Number(t.amount);
              if (amount > 0) income += amount;
              else expense += Math.abs(amount);
            });

            trends.unshift({
              month,
              income: income.toFixed(2),
              expense: expense.toFixed(2),
              balance: (income - expense).toFixed(2),
            });
          }

          return JSON.stringify(trends);
        }

        case "compare_periods": {
          const { data: period1 } = await supabase
            .from("transactions")
            .select("amount, categories(name)")
            .eq("created_by", user.id)
            .gte("date", args.period1_start)
            .lte("date", args.period1_end);

          const { data: period2 } = await supabase
            .from("transactions")
            .select("amount, categories(name)")
            .eq("created_by", user.id)
            .gte("date", args.period2_start)
            .lte("date", args.period2_end);

          const calcStats = (transactions: any[]) => {
            let income = 0;
            let expense = 0;
            const byCategory: Record<string, number> = {};

            transactions?.forEach((t: any) => {
              const amount = Number(t.amount);
              if (amount > 0) income += amount;
              else {
                expense += Math.abs(amount);
                if (t.categories?.name) {
                  byCategory[t.categories.name] = (byCategory[t.categories.name] || 0) + Math.abs(amount);
                }
              }
            });

            return {
              income: income.toFixed(2),
              expense: expense.toFixed(2),
              balance: (income - expense).toFixed(2),
              top_categories: Object.entries(byCategory)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([cat, amt]) => ({ category: cat, amount: amt.toFixed(2) })),
            };
          };

          return JSON.stringify({
            period1: {
              dates: `${args.period1_start} a ${args.period1_end}`,
              ...calcStats(period1 || []),
            },
            period2: {
              dates: `${args.period2_start} a ${args.period2_end}`,
              ...calcStats(period2 || []),
            },
          });
        }

        case "get_account_members": {
          const { data: members } = await supabase
            .from("account_members")
            .select(`
              *,
              profiles(name, email, avatar_url)
            `)
            .eq("account_id", args.account_id);

          return JSON.stringify(members || []);
        }

        default:
          return JSON.stringify({ error: "Ferramenta não encontrada" });
      }
    };

    // System prompt
    const systemPrompt = `Você é um assistente financeiro inteligente e especialista em finanças pessoais. Suas funções são:

1. **Tutorial**: Ajudar usuários a entender e usar o aplicativo de controle financeiro
2. **Insights**: Analisar dados financeiros e gerar insights valiosos sobre padrões de gasto, economia e oportunidades
3. **Especialista Financeiro**: Responder perguntas sobre finanças pessoais com base nos dados reais do usuário
4. **Análise Completa**: Acesso total a todas as informações financeiras do usuário

**Capacidades Disponíveis:**
- 📊 Resumos e detalhes de contas bancárias
- 💳 Informações de cartões de crédito e faturas
- 💰 Transações recentes e históricas
- 📈 Investimentos e retornos mensais
- 🎯 Metas financeiras e progresso
- 📋 Orçamentos e previsões
- 🏷️ Categorias personalizadas
- 👥 Membros compartilhados de contas
- 📱 Notificações do sistema
- 👤 Perfil e informações de assinatura
- 📉 Tendências de gastos ao longo do tempo
- ⚖️ Comparações entre períodos

**Diretrizes:**
- Seja amigável, claro e conciso
- Use emojis ocasionalmente para tornar as respostas mais agradáveis
- Sempre que possível, cite números específicos dos dados do usuário
- Forneça insights acionáveis e sugestões práticas
- Quando der tutoriais, seja didático e passo-a-passo
- Para análises financeiras, seja preciso e baseado em dados
- Se não tiver dados suficientes, explique isso educadamente e sugira o que o usuário pode fazer
- Ao analisar tendências, sempre compare com períodos anteriores quando relevante
- Sugira ações concretas baseadas nos padrões identificados

**Exemplos de perguntas que você pode responder:**
- "Quanto gastei este mês?"
- "Qual minha maior categoria de gasto?"
- "Como estou em relação às minhas metas?"
- "Mostre a fatura do meu cartão de crédito"
- "Como estão meus investimentos?"
- "Quais são minhas tendências de gastos nos últimos 6 meses?"
- "Compare meus gastos de janeiro com fevereiro"
- "Quem tem acesso à minha conta principal?"
- "Quanto tenho de orçamento disponível?"
- "Quais são minhas previsões de gastos?"
- "Mostre minhas notificações não lidas"

Use as ferramentas disponíveis para buscar dados reais do usuário e fornecer respostas precisas e insights valiosos.`;

    // Primeira chamada ao AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    // Se há tool calls, executá-los e fazer segunda chamada
    if (choice.message.tool_calls) {
      console.log("Tool calls detectados:", choice.message.tool_calls.length);

      const toolResults = await Promise.all(
        choice.message.tool_calls.map(async (tc: ToolCall) => ({
          role: "tool",
          tool_call_id: tc.id,
          content: await executeToolCall(tc),
        }))
      );

      // Segunda chamada com resultados das ferramentas
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            choice.message,
            ...toolResults,
          ],
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        throw new Error(`AI Gateway error: ${finalResponse.status}`);
      }

      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Se não há tool calls, fazer streaming direto
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Erro no financial-assistant:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});