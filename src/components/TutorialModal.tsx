import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Loader2 } from "lucide-react";

interface TutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialModal({ open, onOpenChange }: TutorialModalProps) {
  const { tutorialVideoUrl, isLoading } = useAppSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Tutorial</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tutorialVideoUrl ? (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              src={tutorialVideoUrl}
              title="Tutorial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum vídeo de tutorial configurado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
