import { prisma } from "@/lib/db";

export type UsageBreakdown = {
  usageMinutes: number;
  maintenanceMinutes: number;
  downtimeMinutes: number;
  businessMinutes: number;
};

function toMinutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function atStartOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Ensures a sensible default (Mon-Fri, 9am-midnight) exists so analytics has
// something to compute against before anyone builds a settings screen for it.
export async function ensureDefaultBusinessHours() {
  const count = await prisma.businessHoursConfig.count();
  if (count > 0) return;
  await prisma.businessHoursConfig.createMany({
    data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: "09:00",
      endTime: "24:00",
      isActive: true,
    })),
  });
}

async function getActiveBusinessHoursByDay() {
  await ensureDefaultBusinessHours();
  const rows = await prisma.businessHoursConfig.findMany({ where: { isActive: true } });
  const byDay = new Map<number, { start: number; end: number }>();
  for (const row of rows) {
    byDay.set(row.dayOfWeek, {
      start: toMinutesSinceMidnight(row.startTime),
      end: toMinutesSinceMidnight(row.endTime),
    });
  }
  return byDay;
}

export async function computeUsageBreakdown(
  instrumentIds: string[],
  rangeStart: Date,
  rangeEnd: Date,
): Promise<UsageBreakdown> {
  const businessByDay = await getActiveBusinessHoursByDay();

  if (instrumentIds.length === 0) {
    return { usageMinutes: 0, maintenanceMinutes: 0, downtimeMinutes: 0, businessMinutes: 0 };
  }

  let businessMinutesPerInstrument = 0;
  for (let d = atStartOfDay(rangeStart); d < rangeEnd; d.setDate(d.getDate() + 1)) {
    const cfg = businessByDay.get(d.getDay());
    if (cfg) businessMinutesPerInstrument += Math.max(0, cfg.end - cfg.start);
  }
  const businessMinutes = businessMinutesPerInstrument * instrumentIds.length;

  const blocks = await prisma.timeBlock.findMany({
    where: {
      instrumentId: { in: instrumentIds },
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
    },
    select: { startsAt: true, endsAt: true, category: true },
  });

  let usageMinutes = 0;
  let maintenanceMinutes = 0;

  for (const block of blocks) {
    const clippedStart = block.startsAt < rangeStart ? rangeStart : block.startsAt;
    const clippedEnd = block.endsAt > rangeEnd ? rangeEnd : block.endsAt;

    for (let d = atStartOfDay(clippedStart); d < clippedEnd; d.setDate(d.getDate() + 1)) {
      const cfg = businessByDay.get(d.getDay());
      if (!cfg) continue;

      const dayBizStart = new Date(d);
      dayBizStart.setMinutes(cfg.start);
      const dayBizEnd = new Date(d);
      dayBizEnd.setMinutes(cfg.end);

      const overlapStart = clippedStart > dayBizStart ? clippedStart : dayBizStart;
      const overlapEnd = clippedEnd < dayBizEnd ? clippedEnd : dayBizEnd;
      const minutes = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
      if (minutes <= 0) continue;

      if (block.category === "maintenance") maintenanceMinutes += minutes;
      else usageMinutes += minutes;
    }
  }

  const downtimeMinutes = Math.max(0, businessMinutes - usageMinutes - maintenanceMinutes);
  return { usageMinutes, maintenanceMinutes, downtimeMinutes, businessMinutes };
}
