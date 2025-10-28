import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  resend: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });

    // Enviar email de boas-vindas estilizado
    if (!error && data.user) {
      try {
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-welcome-email', {
          body: {
            user: {
              id: data.user.id,
              email: data.user.email,
            }
          }
        });

        // Verificar se o email foi enviado com sucesso
        if (emailError || (emailResponse && !emailResponse.success)) {
          console.error('Erro ao enviar email de confirmação:', emailError || emailResponse);
          
          // Se for erro do Resend sobre domínio não verificado
          if (emailResponse?.data?.error?.message?.includes('verify a domain')) {
            throw new Error('RESEND_DOMAIN_NOT_VERIFIED');
          }
        } else {
          console.log('Email de confirmação enviado com sucesso');
        }
      } catch (emailError: any) {
        console.error('Erro ao enviar email de confirmação:', emailError);
        // Propagar erro específico do Resend
        if (emailError.message === 'RESEND_DOMAIN_NOT_VERIFIED') {
          throw emailError;
        }
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Limpar estado local imediatamente
    setSession(null);
    setUser(null);

    // Redirecionar para a Landing Page imediatamente (sem passar por /auth)
    navigate("/", { replace: true });

    // Fazer logout no backend em background para evitar flash de rota protegida
    try {
      // Não aguardar (para não bloquear a navegação)
      void supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    return { error };
  };

  const resend = async (email: string) => {
    try {
      // Chamar a edge function de email de boas-vindas (sem precisar do ID)
      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          user: {
            email: email,
          }
        }
      });

      if (emailError || (emailResponse && !emailResponse.success)) {
        console.error('Erro ao reenviar email:', emailError || emailResponse);
        
        if (emailResponse?.error?.message?.includes('verify a domain')) {
          throw new Error('RESEND_DOMAIN_NOT_VERIFIED');
        }
        
        return { error: emailError || new Error(emailResponse?.error || 'Erro ao enviar email') };
      }

      console.log('Email reenviado com sucesso');
      return { error: null };
    } catch (emailError: any) {
      console.error('Erro ao reenviar email de confirmação:', emailError);
      
      if (emailError.message === 'RESEND_DOMAIN_NOT_VERIFIED') {
        throw emailError;
      }
      
      return { error: emailError };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        resend,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
