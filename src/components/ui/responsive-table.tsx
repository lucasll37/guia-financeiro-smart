import { ReactNode } from "react";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className="w-full overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="min-w-[640px]">
        <Table className={cn("w-full", className)}>
          {children}
        </Table>
      </div>
    </div>
  );
}
