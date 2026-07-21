"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTask } from "@/lib/actions/tasks";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={isPending}
      onClick={() => {
        if (window.confirm("Delete this task? This can't be undone.")) {
          startTransition(() => deleteTask(taskId));
        }
      }}
    >
      Delete Task
    </Button>
  );
}
