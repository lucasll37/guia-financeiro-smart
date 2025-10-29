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
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center transition-all duration-300 hover:border-muted-foreground/40 hover:bg-muted/50 h-[280px]">
      <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-4 animate-scale-in">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed px-2">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-4 hover-scale">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
