import { prisma } from "@/lib/db";
import { computeUsageBreakdown } from "@/lib/business-hours";
import { UsagePieChart } from "@/components/analytics/usage-pie-chart";
import { DateRangeForm } from "@/components/analytics/date-range-form";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfNextMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const now = new Date();

  const rangeStart = from ? new Date(`${from}T00:00:00`) : startOfMonth(now);
  const rangeEnd = to
    ? new Date(new Date(`${to}T00:00:00`).getTime() + 24 * 60 * 60 * 1000)
    : startOfNextMonth(now);

  const instruments = await prisma.instrument.findMany({
    where: { status: { not: "no_longer_in_use" } },
    orderBy: { name: "asc" },
  });

  const overall = await computeUsageBreakdown(instruments, rangeStart, rangeEnd);

  const perInstrument = await Promise.all(
    instruments.map(async (instrument) => ({
      instrument,
      breakdown: await computeUsageBreakdown([instrument], rangeStart, rangeEnd),
    })),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <DateRangeForm
          from={toDateInputValue(rangeStart)}
          to={toDateInputValue(new Date(rangeEnd.getTime() - 24 * 60 * 60 * 1000))}
        />
      </div>

      {instruments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No instruments to track yet — add one to start tracking usage.
        </p>
      ) : (
        <>
          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Overall</h2>
            <div className="max-w-sm">
              <UsagePieChart title="All Instruments" breakdown={overall} />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">By Instrument</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {perInstrument.map(({ instrument, breakdown }) => (
                <UsagePieChart key={instrument.id} title={instrument.name} breakdown={breakdown} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
