import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DEMO_STAGE_LABELS, DEMO_SUBSTAGE_LABELS } from "@/lib/task-helpers";

type Stage = {
  id: string;
  stageType: string;
  substageType: string | null;
};

export function DemoGroupCard({
  title,
  taskId,
  stages,
}: {
  title: string;
  taskId: string;
  stages: Stage[];
}) {
  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="flex items-center gap-2">
          <Badge variant="secondary">
            {stages.length} stage{stages.length === 1 ? "" : "s"}
          </Badge>
          <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="divide-y border-t">
        {stages.map((s) => (
          <Link
            key={s.id}
            href={`/tasks/${taskId}`}
            className="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            {DEMO_STAGE_LABELS[s.stageType]}
            {s.substageType && ` — ${DEMO_SUBSTAGE_LABELS[s.substageType]}`}
          </Link>
        ))}
      </div>
    </details>
  );
}
