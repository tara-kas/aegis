import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  // Encounter statuses
  "planned": "bg-secondary text-secondary-foreground",
  "in-progress": "bg-clinical-blue text-clinical-blue-foreground",
  "completed": "bg-vital-green text-vital-green-foreground",
  "cancelled": "bg-muted text-muted-foreground",
  "on-hold": "bg-alert-amber text-alert-amber-foreground",
  "discharged": "bg-accent text-accent-foreground",
  // Observation statuses
  "registered": "bg-secondary text-secondary-foreground",
  "preliminary": "bg-alert-amber text-alert-amber-foreground",
  "final": "bg-vital-green text-vital-green-foreground",
  "amended": "bg-clinical-blue text-clinical-blue-foreground",
  "corrected": "bg-clinical-blue text-clinical-blue-foreground",
  "entered-in-error": "bg-critical-red text-critical-red-foreground",
  "unknown": "bg-muted text-muted-foreground",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("text-xs font-medium", statusColors[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </Badge>
  );
}
