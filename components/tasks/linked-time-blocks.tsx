"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTimeBlock } from "@/lib/actions/time-blocks";

type Block = {
  id: string;
  instrumentId: string;
  instrumentName: string;
  startsAt: string;
  endsAt: string;
};

export function LinkedTimeBlocks({ blocks, taskId }: { blocks: Block[]; taskId: string }) {
  const [isPending, startTransition] = useTransition();
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-1">
      {blocks.map((b) => (
        <div key={b.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span>
            {b.instrumentName}: {new Date(b.startsAt).toLocaleString()} –{" "}
            {new Date(b.endsAt).toLocaleString()}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => startTransition(() => deleteTimeBlock(b.id, b.instrumentId, taskId))}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
