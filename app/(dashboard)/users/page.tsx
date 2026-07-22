import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoGroupCard } from "@/components/tasks/demo-group-card";
import { BLANK_CATEGORY_LABELS, STATUS_LABELS, groupDemoSubtasksByTask } from "@/lib/task-helpers";

const OUTSTANDING_STATUSES = ["assigned", "in_progress"] as const;

export default async function UsersPage() {
  const session = await requireSession();

  const [users, blankTasks, demoSubtasks] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: session.user.id } },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: {
        kind: "blank",
        status: { in: [...OUTSTANDING_STATUSES] },
        assignedToId: { not: null },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.demoSubtask.findMany({
      where: {
        status: { in: [...OUTSTANDING_STATUSES] },
        assignedToId: { not: null },
      },
      include: { task: { select: { title: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No other users yet.</p>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const blankItems = blankTasks.filter((t) => t.assignedToId === user.id);
            const demoGroups = groupDemoSubtasksByTask(
              demoSubtasks.filter((s) => s.assignedToId === user.id),
            );
            const total = blankItems.length + demoGroups.reduce((n, g) => n + g.stages.length, 0);

            return (
              <details key={user.id} className="group rounded-lg border">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium">{user.name ?? user.email}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={total > 0 ? "secondary" : "outline"}>
                      {total > 0 ? `${total} outstanding` : "All caught up"}
                    </Badge>
                    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                {total > 0 && (
                  <div className="space-y-2 border-t p-3">
                    {demoGroups.map((g) => (
                      <DemoGroupCard key={g.taskId} title={g.title} taskId={g.taskId} stages={g.stages} />
                    ))}
                    {blankItems.map((item) => (
                      <Link key={item.id} href={`/tasks/${item.id}`}>
                        <Card className="transition-colors hover:bg-muted/50">
                          <CardContent className="flex items-center justify-between py-3">
                            <div>
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {BLANK_CATEGORY_LABELS[item.category ?? ""]}
                              </p>
                            </div>
                            <Badge variant="secondary">{STATUS_LABELS[item.status]}</Badge>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
