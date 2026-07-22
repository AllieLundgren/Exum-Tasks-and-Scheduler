import { prisma } from "@/lib/db";
import type { InstrumentStatus } from "@/lib/generated/prisma/client";

export type UsageBreakdown = {
  usageMinutes: number;
  maintenanceRequiredMinutes: number;
  downtimeMinutes: number;
  businessMinutes: number;
};

export type InstrumentForAnalytics = {
  id: string;
  status: InstrumentStatus;
  statusSince: Date;
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

// Sums business-hours minutes that fall inside [start, end), clipping each day's
// window at both the business-hours boundaries and the requested range.
function businessMinutesInRange(
  start: Date,
  end: Date,
  businessByDay: Map<number, { start: number; end: number }>,
): number {
  let total = 0;
  for (let d = atStartOfDay(start); d < end; d.setDate(d.getDate() + 1)) {
    const cfg = businessByDay.get(d.getDay());
    if (!cfg) continue;

    const dayBizStart = new Date(d);
    dayBizStart.setMinutes(cfg.start);
    const dayBizEnd = new Date(d);
    dayBizEnd.setMinutes(cfg.end);

    const overlapStart = start > dayBizStart ? start : dayBizStart;
    const overlapEnd = end < dayBizEnd ? end : dayBizEnd;
    const minutes = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
    if (minutes > 0) total += minutes;
  }
  return total;
}

// Usage = any actual booked time (any category, including maintenance work — the
// machine isn't idle while someone's in there). Maintenance Required = business
// hours since the instrument was flagged that AREN'T already covered by a booking
// (so a tech booking real repair time during the flagged window counts as Usage,
// not as still-idle-and-blocked). Downtime is whatever's left.
export async function computeUsageBreakdown(
  instruments: InstrumentForAnalytics[],
  rangeStart: Date,
  rangeEnd: Date,
): Promise<UsageBreakdown> {
  const businessByDay = await getActiveBusinessHoursByDay();

  if (instruments.length === 0) {
    return { usageMinutes: 0, maintenanceRequiredMinutes: 0, downtimeMinutes: 0, businessMinutes: 0 };
  }

  const blocks = await prisma.timeBlock.findMany({
    where: {
      instrumentId: { in: instruments.map((i) => i.id) },
      startsAt: { lt: rangeEnd },
      endsAt: { gt: rangeStart },
    },
    select: { instrumentId: true, startsAt: true, endsAt: true },
  });

  const blocksByInstrument = new Map<string, typeof blocks>();
  for (const block of blocks) {
    const arr = blocksByInstrument.get(block.instrumentId);
    if (arr) arr.push(block);
    else blocksByInstrument.set(block.instrumentId, [block]);
  }

  let totalUsage = 0;
  let totalMaintenanceRequired = 0;
  let totalBusiness = 0;

  for (const instrument of instruments) {
    totalBusiness += businessMinutesInRange(rangeStart, rangeEnd, businessByDay);

    const flaggedStart =
      instrument.status === "maintenance_required"
        ? instrument.statusSince > rangeStart
          ? instrument.statusSince
          : rangeStart
        : null;

    let usageMinutes = 0;
    let usageMinutesDuringFlagged = 0;

    for (const block of blocksByInstrument.get(instrument.id) ?? []) {
      const clippedStart = block.startsAt < rangeStart ? rangeStart : block.startsAt;
      const clippedEnd = block.endsAt > rangeEnd ? rangeEnd : block.endsAt;
      usageMinutes += businessMinutesInRange(clippedStart, clippedEnd, businessByDay);

      if (flaggedStart) {
        const overlapStart = clippedStart < flaggedStart ? flaggedStart : clippedStart;
        if (overlapStart < clippedEnd) {
          usageMinutesDuringFlagged += businessMinutesInRange(overlapStart, clippedEnd, businessByDay);
        }
      }
    }

    let maintenanceRequiredMinutes = 0;
    if (flaggedStart && flaggedStart < rangeEnd) {
      const flaggedWindowMinutes = businessMinutesInRange(flaggedStart, rangeEnd, businessByDay);
      maintenanceRequiredMinutes = Math.max(0, flaggedWindowMinutes - usageMinutesDuringFlagged);
    }

    totalUsage += usageMinutes;
    totalMaintenanceRequired += maintenanceRequiredMinutes;
  }

  const downtimeMinutes = Math.max(0, totalBusiness - totalUsage - totalMaintenanceRequired);
  return {
    usageMinutes: totalUsage,
    maintenanceRequiredMinutes: totalMaintenanceRequired,
    downtimeMinutes,
    businessMinutes: totalBusiness,
  };
}
