"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setInstrumentActive } from "@/lib/actions/instruments";

export function InstrumentActiveToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => setInstrumentActive(id, !isActive))}
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
