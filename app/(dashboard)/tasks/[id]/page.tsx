import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatusControls } from "@/components/tasks/task-status-controls";
import { AcceptAllButton } from "@/components/tasks/accept-all-button";
import { BookInstrumentTimeDialog } from "@/components/tasks/book-instrument-time-dialog";
import { LinkedTimeBlocks } from "@/components/tasks/linked-time-blocks";
import {
  assignDemoSubtask,
  respondToDemoSubtask,
  setDemoSubtaskStatus,
  assignBlankTask,
  respondToBlankTask,
  setBlankTaskStatus,
} from "@/lib/actions/tasks";
import {
  DEMO_STAGE_LABELS,
  DEMO_SUBSTAGE_LABELS,
  BLANK_CATEGORY_LABELS,
  INSTRUMENT_RELEVANT_BLANK_CATEGORIES,
} from "@/lib/task-helpers";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      subtasks: {
        orderBy: { orderIndex: "asc" },
        include: {
          assignedTo: { select: { id: true, name: true } },
          timeBlocks: { include: { instrument: { select: { id: true, name: true } } } },
        },
      },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      timeBlocks: { include: { instrument: { select: { id: true, name: true } } } },
    },
  });
  if (!task) notFound();

  const [users, instruments] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.instrument.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const hasAcceptableSubtasks = task.subtasks.some(
    (s) => s.assignedToId === session.user.id && s.status === "assigned",
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {task.kind === "demo" ? "Demo" : BLANK_CATEGORY_LABELS[task.category ?? ""]}
        </p>
        <h1 className="text-2xl font-semibold">{task.title}</h1>
        {task.description && (
          <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Created by {task.createdBy.name ?? "Unknown"}
        </p>
      </div>

      {task.kind === "demo" ? (
        <div className="space-y-3">
          {hasAcceptableSubtasks && <AcceptAllButton taskId={task.id} />}
          {task.subtasks.map((subtask) => {
            const canBookInstrument =
              subtask.stageType === "data_collection" &&
              subtask.status === "in_progress" &&
              subtask.assignedToId === session.user.id;

            return (
              <Card key={subtask.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {DEMO_STAGE_LABELS[subtask.stageType]}
                    {subtask.substageType && ` — ${DEMO_SUBSTAGE_LABELS[subtask.substageType]}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <TaskStatusControls
                    status={subtask.status}
                    assignedTo={subtask.assignedTo}
                    currentUserId={session.user.id}
                    users={users}
                    onAssign={assignDemoSubtask.bind(null, task.id, subtask.id)}
                    onRespond={respondToDemoSubtask.bind(null, task.id, subtask.id)}
                    onSetStatus={setDemoSubtaskStatus.bind(null, task.id, subtask.id)}
                  />
                  <LinkedTimeBlocks
                    taskId={task.id}
                    blocks={subtask.timeBlocks.map((tb) => ({
                      id: tb.id,
                      instrumentId: tb.instrumentId,
                      instrumentName: tb.instrument.name,
                      startsAt: tb.startsAt.toISOString(),
                      endsAt: tb.endsAt.toISOString(),
                    }))}
                  />
                  {canBookInstrument && (
                    <BookInstrumentTimeDialog
                      instruments={instruments}
                      category="demo"
                      taskId={task.id}
                      subtaskId={subtask.id}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <TaskStatusControls
              status={task.status}
              assignedTo={task.assignedTo}
              currentUserId={session.user.id}
              users={users}
              onAssign={assignBlankTask.bind(null, task.id)}
              onRespond={respondToBlankTask.bind(null, task.id)}
              onSetStatus={setBlankTaskStatus.bind(null, task.id)}
            />
            <LinkedTimeBlocks
              taskId={task.id}
              blocks={task.timeBlocks.map((tb) => ({
                id: tb.id,
                instrumentId: tb.instrumentId,
                instrumentName: tb.instrument.name,
                startsAt: tb.startsAt.toISOString(),
                endsAt: tb.endsAt.toISOString(),
              }))}
            />
            {task.category &&
              INSTRUMENT_RELEVANT_BLANK_CATEGORIES.has(task.category) &&
              task.status === "in_progress" &&
              task.assignedToId === session.user.id && (
                <BookInstrumentTimeDialog
                  instruments={instruments}
                  category={task.category}
                  taskId={task.id}
                />
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
