"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acceptAllAssignedSubtasks } from "@/lib/actions/tasks";

export function AcceptAllButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => acceptAllAssignedSubtasks(taskId))}
    >
      Accept all my assigned stages
    </Button>
  );
}
