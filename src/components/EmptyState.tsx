import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-12 text-center transition-all duration-300 hover:border-muted-foreground/40 hover:bg-muted/50">
      <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-6 animate-scale-in">
        <Icon className="h-10 w-10 text-primary" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm text-muted-foreground max-w-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-8 hover-scale">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
