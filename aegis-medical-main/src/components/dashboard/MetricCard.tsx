import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "clinical" | "vital" | "alert" | "default";
}

const accentStyles = {
  clinical: "text-clinical-blue",
  vital: "text-vital-green",
  alert: "text-alert-amber",
  default: "text-primary",
};

export default function MetricCard({ title, value, icon: Icon, accent = "default" }: MetricCardProps) {
  return (
    <Card className="animate-slide-in">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("rounded-lg bg-surface-sunken p-2.5", accentStyles[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
