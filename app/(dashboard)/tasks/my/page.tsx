import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoGroupCard } from "@/components/tasks/demo-group-card";
import {
  STATUS_LABELS,
  BLANK_CATEGORY_LABELS,
  deriveDemoStatus,
  demoProgressLabel,
  groupDemoSubtasksByTask,
} from "@/lib/task-helpers";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function StatusBucket({
  blankItems,
  demoGroups,
  badgeLabel,
  badgeVariant,
  emptyText,
}: {
  blankItems: { id: string; title: string; category: string | null }[];
  demoGroups: ReturnType<typeof groupDemoSubtasksByTask>;
  badgeLabel: string;
  badgeVariant: "default" | "secondary";
  emptyText: string;
}) {
  if (blankItems.length === 0 && demoGroups.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {demoGroups.map((group) => (
        <DemoGroupCard key={group.taskId} title={group.title} taskId={group.taskId} stages={group.stages} />
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
              <Badge variant={badgeVariant}>{badgeLabel}</Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function MyTasksPage() {
  const session = await requireSession();
  const userId = session.user.id;

  const [blankAssignedToMe, demoSubtasksAssignedToMe, createdByMe] = await Promise.all([
    prisma.task.findMany({
      where: { kind: "blank", assignedToId: userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.demoSubtask.findMany({
      where: { assignedToId: userId },
      include: { task: { select: { title: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { createdById: userId },
      include: { subtasks: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const needsResponseBlank = blankAssignedToMe.filter((t) => t.status === "assigned");
  const needsResponseDemo = groupDemoSubtasksByTask(
    demoSubtasksAssignedToMe.filter((s) => s.status === "assigned"),
  );

  const inProgressBlank = blankAssignedToMe.filter((t) => t.status === "in_progress");
  const inProgressDemo = groupDemoSubtasksByTask(
    demoSubtasksAssignedToMe.filter((s) => s.status === "in_progress"),
  );

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">My Tasks</h1>

      <Section title="Needs your response">
        <StatusBucket
          blankItems={needsResponseBlank}
          demoGroups={needsResponseDemo}
          badgeLabel="Needs response"
          badgeVariant="secondary"
          emptyText="Nothing waiting on you."
        />
      </Section>

      <Section title="In progress">
        <StatusBucket
          blankItems={inProgressBlank}
          demoGroups={inProgressDemo}
          badgeLabel="In Progress"
          badgeVariant="default"
          emptyText="Nothing in progress."
        />
      </Section>

      <Section title="Created by me">
        {createdByMe.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t created any tasks yet.</p>
        ) : (
          createdByMe.map((task) => {
            const effectiveStatus = task.kind === "demo" ? deriveDemoStatus(task.subtasks) : task.status;
            return (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.kind === "demo" ? demoProgressLabel(task.subtasks) : STATUS_LABELS[effectiveStatus]}
                      </p>
                    </div>
                    <Badge variant={effectiveStatus === "done" ? "default" : "secondary"}>
                      {STATUS_LABELS[effectiveStatus]}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </Section>
    </div>
  );
}
