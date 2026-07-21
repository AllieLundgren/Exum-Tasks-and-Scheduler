import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { InstrumentCalendar } from "@/components/calendar/instrument-calendar";

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
      <div>
        <h1 className="text-2xl font-semibold">{instrument.name}</h1>
        {instrument.description && (
          <p className="text-sm text-muted-foreground">{instrument.description}</p>
        )}
      </div>
      <InstrumentCalendar
        instrumentId={instrument.id}
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
