"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setInstrumentStatus } from "@/lib/actions/instruments";
import { INSTRUMENT_STATUS_LABELS } from "@/lib/instrument-helpers";
import type { InstrumentStatus } from "@/lib/generated/prisma/client";

export function InstrumentStatusSelect({ id, status }: { id: string; status: InstrumentStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) => startTransition(() => setInstrumentStatus(id, value as InstrumentStatus))}
    >
      <SelectTrigger size="sm" className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(INSTRUMENT_STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
