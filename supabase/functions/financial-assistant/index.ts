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
              name: acc.name,
              type: acc.type,
              currency: acc.currency,
              balance: balance.toFixed(2),
              transaction_count: transactions.length,
            };
          });

          return JSON.stringify(summary || []);
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
            name: inv.name,
            type: inv.type,
            balance: Number(inv.balance).toFixed(2),
            monthly_rate: Number(inv.monthly_rate).toFixed(2),
            fees: Number(inv.fees).toFixed(2),
          }));

          return JSON.stringify(summary || []);
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

**Diretrizes:**
- Seja amigável, claro e conciso
- Use emojis ocasionalmente para tornar as respostas mais agradáveis
- Sempre que possível, cite números específicos dos dados do usuário
- Forneça insights acionáveis e sugestões práticas
- Quando der tutoriais, seja didático e passo-a-passo
- Para análises financeiras, seja preciso e baseado em dados
- Se não tiver dados suficientes, explique isso educadamente e sugira o que o usuário pode fazer

**Exemplos de perguntas que você pode responder:**
- "Quanto gastei este mês?"
- "Qual minha maior categoria de gasto?"
- "Como estou em relação às minhas metas?"
- "Como adicionar uma nova transação?"
- "Qual o saldo das minhas contas?"
- "Me dê insights sobre meus gastos"

Use as ferramentas disponíveis para buscar dados reais do usuário e fornecer respostas precisas.`;

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