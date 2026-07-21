import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  STATUS_LABELS,
  BLANK_CATEGORY_LABELS,
  deriveDemoStatus,
  demoProgressLabel,
} from "@/lib/task-helpers";
import type { TaskStatus } from "@/lib/generated/prisma/client";

const KIND_FILTERS = [
  { value: "all", label: "All" },
  { value: "demo", label: "Demo" },
  { value: "blank", label: "Other" },
];

const STATUS_FILTERS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "unassigned", label: "Unassigned" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; status?: string }>;
}) {
  const { kind = "all", status = "all" } = await searchParams;

  const tasks = await prisma.task.findMany({
    include: {
      subtasks: true,
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const filtered = tasks.filter((task) => {
    if (kind !== "all" && task.kind !== kind) return false;
    if (status !== "all") {
      const effectiveStatus = task.kind === "demo" ? deriveDemoStatus(task.subtasks) : task.status;
      if (effectiveStatus !== status) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <Link href="/tasks/new">
          <Button>New Task</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1">
          {KIND_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/tasks?kind=${f.value}&status=${status}`}
              className={`rounded-md px-3 py-1 text-sm ${
                kind === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/tasks?kind=${kind}&status=${f.value}`}
              className={`rounded-md px-3 py-1 text-sm ${
                status === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tasks match this filter.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((task) => {
            const effectiveStatus = task.kind === "demo" ? deriveDemoStatus(task.subtasks) : task.status;
            return (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.kind === "demo" ? "Demo" : BLANK_CATEGORY_LABELS[task.category ?? ""]}
                      </p>
                    </div>
                    <Badge variant={effectiveStatus === "done" ? "default" : "secondary"}>
                      {STATUS_LABELS[effectiveStatus]}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    {task.kind === "demo" ? (
                      <p>{demoProgressLabel(task.subtasks)}</p>
                    ) : (
                      <p>{task.assignedTo?.name ?? "Unassigned"}</p>
                    )}
                    <p>Created by {task.createdBy.name ?? "Unknown"}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
