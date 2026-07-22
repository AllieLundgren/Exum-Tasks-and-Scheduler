import type { InstrumentStatus } from "@/lib/generated/prisma/client";

export const INSTRUMENT_STATUS_LABELS: Record<InstrumentStatus, string> = {
  active: "Active",
  maintenance_required: "Maintenance Required",
  no_longer_in_use: "No Longer In Use",
};

export const INSTRUMENT_STATUS_BADGE_VARIANT: Record<InstrumentStatus, "default" | "destructive" | "secondary"> = {
  active: "default",
  maintenance_required: "destructive",
  no_longer_in_use: "secondary",
};
