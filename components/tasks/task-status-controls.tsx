"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS } from "@/lib/task-helpers";
import type { TaskStatus } from "@/lib/generated/prisma/client";

type User = { id: string; name: string | null };

export function TaskStatusControls({
  status,
  assignedTo,
  currentUserId,
  users,
  onAssign,
  onRespond,
  onSetStatus,
}: {
  status: TaskStatus;
  assignedTo: User | null;
  currentUserId: string;
  users: User[];
  onAssign: (userId: string) => Promise<void>;
  onRespond: (response: "accept" | "decline") => Promise<void>;
  onSetStatus: (status: TaskStatus) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const isMine = assignedTo?.id === currentUserId;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={status === "done" ? "default" : "secondary"}>{STATUS_LABELS[status]}</Badge>

      <Select
        value={assignedTo?.id ?? null}
        onValueChange={(userId) => startTransition(() => onAssign(userId as string))}
        disabled={isPending}
      >
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name ?? u.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isMine && status === "assigned" && (
        <>
          <Button size="sm" disabled={isPending} onClick={() => startTransition(() => onRespond("accept"))}>
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => onRespond("decline"))}
          >
            Decline
          </Button>
        </>
      )}

      {isMine && status === "in_progress" && (
        <Button size="sm" disabled={isPending} onClick={() => startTransition(() => onSetStatus("done"))}>
          Mark Done
        </Button>
      )}
    </div>
  );
}
