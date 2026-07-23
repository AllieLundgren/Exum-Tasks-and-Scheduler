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
};

type BusinessHoursByDay = Map<number, { start: number; end: number }>;

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

async function getActiveBusinessHoursByDay(): Promise<BusinessHoursByDay> {
  await ensureDefaultBusinessHours();
  const rows = await prisma.businessHoursConfig.findMany({ where: { isActive: true } });
  const byDay: BusinessHoursByDay = new Map();
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
function businessMinutesInRange(start: Date, end: Date, businessByDay: BusinessHoursByDay): number {
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

function usageMinutesInInterval(
  blocks: { startsAt: Date; endsAt: Date }[],
  intervalStart: Date,
  intervalEnd: Date,
  businessByDay: BusinessHoursByDay,
): number {
  let total = 0;
  for (const block of blocks) {
    const clippedStart = block.startsAt < intervalStart ? intervalStart : block.startsAt;
    const clippedEnd = block.endsAt > intervalEnd ? intervalEnd : block.endsAt;
    if (clippedStart < clippedEnd) total += businessMinutesInRange(clippedStart, clippedEnd, businessByDay);
  }
  return total;
}

// Replays an instrument's status history to reconstruct exactly which status was
// in effect at every point within [rangeStart, rangeEnd) — a flag-then-unflag
// cycle within the range produces its own maintenance_required interval, rather
// than only ever reflecting whatever the *current* status happens to be.
function reconstructStatusIntervals(
  events: { status: InstrumentStatus; startedAt: Date }[],
  rangeStart: Date,
  rangeEnd: Date,
): { status: InstrumentStatus; start: Date; end: Date }[] {
  const sorted = [...events].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  let statusAtRangeStart: InstrumentStatus = "active";
  for (const ev of sorted) {
    if (ev.startedAt > rangeStart) break;
    statusAtRangeStart = ev.status;
  }

  const eventsWithinRange = sorted.filter((ev) => ev.startedAt > rangeStart && ev.startedAt < rangeEnd);

  const intervals: { status: InstrumentStatus; start: Date; end: Date }[] = [];
  let cursor = rangeStart;
  let currentStatus = statusAtRangeStart;
  for (const ev of eventsWithinRange) {
    intervals.push({ status: currentStatus, start: cursor, end: ev.startedAt });
    cursor = ev.startedAt;
    currentStatus = ev.status;
  }
  intervals.push({ status: currentStatus, start: cursor, end: rangeEnd });
  return intervals;
}

// Usage = any actual booked time (any category, including maintenance work — the
// machine isn't idle while someone's in there). Maintenance Required = business
// hours during a maintenance_required window that AREN'T already covered by a
// booking (so a tech booking real repair time during the flagged window counts as
// Usage, not as still-idle-and-blocked). This is computed per flagged interval
// from the instrument's full status history, so it stays correct even after the
// status is later changed back. Downtime is whatever's left.
export async function computeUsageBreakdown(
  instruments: InstrumentForAnalytics[],
  rangeStart: Date,
  rangeEnd: Date,
): Promise<UsageBreakdown> {
  const businessByDay = await getActiveBusinessHoursByDay();

  if (instruments.length === 0) {
    return { usageMinutes: 0, maintenanceRequiredMinutes: 0, downtimeMinutes: 0, businessMinutes: 0 };
  }

  const instrumentIds = instruments.map((i) => i.id);

  const [blocks, statusEvents] = await Promise.all([
    prisma.timeBlock.findMany({
      where: {
        instrumentId: { in: instrumentIds },
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      select: { instrumentId: true, startsAt: true, endsAt: true },
    }),
    prisma.instrumentStatusEvent.findMany({
      where: { instrumentId: { in: instrumentIds }, startedAt: { lt: rangeEnd } },
      select: { instrumentId: true, status: true, startedAt: true },
    }),
  ]);

  const blocksByInstrument = new Map<string, typeof blocks>();
  for (const block of blocks) {
    const arr = blocksByInstrument.get(block.instrumentId);
    if (arr) arr.push(block);
    else blocksByInstrument.set(block.instrumentId, [block]);
  }

  const eventsByInstrument = new Map<string, typeof statusEvents>();
  for (const ev of statusEvents) {
    const arr = eventsByInstrument.get(ev.instrumentId);
    if (arr) arr.push(ev);
    else eventsByInstrument.set(ev.instrumentId, [ev]);
  }

  let totalUsage = 0;
  let totalMaintenanceRequired = 0;
  let totalBusiness = 0;

  for (const instrument of instruments) {
    totalBusiness += businessMinutesInRange(rangeStart, rangeEnd, businessByDay);

    const instrumentBlocks = blocksByInstrument.get(instrument.id) ?? [];
    totalUsage += usageMinutesInInterval(instrumentBlocks, rangeStart, rangeEnd, businessByDay);

    const intervals = reconstructStatusIntervals(
      eventsByInstrument.get(instrument.id) ?? [],
      rangeStart,
      rangeEnd,
    );
    for (const interval of intervals) {
      if (interval.status !== "maintenance_required") continue;
      const windowMinutes = businessMinutesInRange(interval.start, interval.end, businessByDay);
      const bookedMinutes = usageMinutesInInterval(instrumentBlocks, interval.start, interval.end, businessByDay);
      totalMaintenanceRequired += Math.max(0, windowMinutes - bookedMinutes);
    }
  }

  const downtimeMinutes = Math.max(0, totalBusiness - totalUsage - totalMaintenanceRequired);
  return {
    usageMinutes: totalUsage,
    maintenanceRequiredMinutes: totalMaintenanceRequired,
    downtimeMinutes,
    businessMinutes: totalBusiness,
  };
}
