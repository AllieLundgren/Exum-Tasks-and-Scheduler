import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { InstrumentCalendar } from "@/components/calendar/instrument-calendar";
import { Badge } from "@/components/ui/badge";
import { INSTRUMENT_STATUS_LABELS, INSTRUMENT_STATUS_BADGE_VARIANT } from "@/lib/instrument-helpers";

export default async function InstrumentCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const instrument = await prisma.instrument.findUnique({ where: { id } });
  if (!instrument) notFound();

  const timeBlocks = await prisma.timeBlock.findMany({
    where: { instrumentId: id },
    include: { user: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{instrument.name}</h1>
          {instrument.description && (
            <p className="text-sm text-muted-foreground">{instrument.description}</p>
          )}
        </div>
        <Badge variant={INSTRUMENT_STATUS_BADGE_VARIANT[instrument.status]}>
          {INSTRUMENT_STATUS_LABELS[instrument.status]}
        </Badge>
      </div>

      {instrument.status === "maintenance_required" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Flagged as needing maintenance since{" "}
          {instrument.statusSince.toLocaleString()}. Business hours are shown as blocked below
          until this is set back to Active — maintenance work can still be booked during that
          time.
        </div>
      )}

      <InstrumentCalendar
        instrumentId={instrument.id}
        maintenanceRequiredSince={
          instrument.status === "maintenance_required" ? instrument.statusSince.toISOString() : null
        }
        timeBlocks={timeBlocks.map((tb) => ({
          id: tb.id,
          category: tb.category,
          startsAt: tb.startsAt.toISOString(),
          endsAt: tb.endsAt.toISOString(),
          notes: tb.notes,
          userName: tb.user.name,
        }))}
      />
    </div>
  );
}
