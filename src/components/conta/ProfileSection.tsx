import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function ProfileSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setName(data.name || "");
        setAvatarUrl(data.avatar_url || "");
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update({ name, avatar_url: avatarUrl })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setIsEditing(false);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCancel = () => {
    setName(profile?.name || "");
    setAvatarUrl(profile?.avatar_url || "");
    setIsEditing(false);
  };

  if (loadingProfile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Informações Pessoais</CardTitle>
        <CardDescription>Gerencie suas informações de perfil</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-2xl">{initials || "U"}</AvatarFallback>
          </Avatar>
          {isEditing && (
            <div className="flex-1 space-y-2">
              <Label htmlFor="avatar">URL do Avatar</Label>
              <Input
                id="avatar"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ""} disabled />
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                onClick={() => updateProfile.mutate()}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Editar Perfil</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
