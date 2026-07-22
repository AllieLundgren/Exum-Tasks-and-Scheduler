"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTimeBlock,
  deleteTimeBlock,
  updateTimeBlock,
} from "@/lib/actions/time-blocks";
import type { TimeBlockCategory } from "@/lib/generated/prisma/client";

const CATEGORY_LABELS: Record<TimeBlockCategory, string> = {
  personal_usage: "Personal Usage",
  demo: "Demo",
  maintenance: "Maintenance",
  applications: "Applications",
  customer_visit: "Customer Visit",
  other: "Other",
};

const CATEGORY_COLORS: Record<TimeBlockCategory, string> = {
  personal_usage: "#2563eb",
  demo: "#7c3aed",
  maintenance: "#dc2626",
  applications: "#16a34a",
  customer_visit: "#d97706",
  other: "#6b7280",
};

export type TimeBlockEvent = {
  id: string;
  category: TimeBlockCategory;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  userName: string | null;
};

type DialogState =
  | { mode: "create"; start: string; end: string }
  | { mode: "edit"; id: string; start: string; end: string };

export function InstrumentCalendar({
  instrumentId,
  timeBlocks,
  maintenanceRequiredSince,
}: {
  instrumentId: string;
  timeBlocks: TimeBlockEvent[];
  maintenanceRequiredSince?: string | null;
}) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [category, setCategory] = useState<TimeBlockCategory>("personal_usage");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const events = useMemo(() => {
    const bookedEvents = timeBlocks.map((tb) => ({
      id: tb.id,
      title: `${CATEGORY_LABELS[tb.category]}${tb.userName ? ` — ${tb.userName}` : ""}`,
      start: tb.startsAt,
      end: tb.endsAt,
      backgroundColor: CATEGORY_COLORS[tb.category],
      borderColor: CATEGORY_COLORS[tb.category],
      extendedProps: { category: tb.category, notes: tb.notes },
    }));

    if (!maintenanceRequiredSince) return bookedEvents;

    return [
      ...bookedEvents,
      {
        display: "background" as const,
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: "09:00",
        endTime: "24:00",
        startRecur: maintenanceRequiredSince,
        backgroundColor: "#dc2626",
        title: "Maintenance Required",
      },
    ];
  }, [timeBlocks, maintenanceRequiredSince]);

  function handleSelect(info: DateSelectArg) {
    setCategory("personal_usage");
    setNotes("");
    setDialogState({ mode: "create", start: info.startStr, end: info.endStr });
  }

  function handleEventClick(info: EventClickArg) {
    const props = info.event.extendedProps as { category: TimeBlockCategory; notes: string | null };
    setCategory(props.category);
    setNotes(props.notes ?? "");
    setDialogState({
      mode: "edit",
      id: info.event.id,
      start: info.event.startStr,
      end: info.event.endStr,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dialogState) return;
    setSubmitting(true);
    try {
      if (dialogState.mode === "create") {
        await createTimeBlock({
          instrumentId,
          category,
          startsAt: dialogState.start,
          endsAt: dialogState.end,
          notes,
        });
      } else {
        await updateTimeBlock({
          id: dialogState.id,
          instrumentId,
          category,
          startsAt: dialogState.start,
          endsAt: dialogState.end,
          notes,
        });
      }
      setDialogState(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!dialogState || dialogState.mode !== "edit") return;
    setSubmitting(true);
    try {
      await deleteTimeBlock(dialogState.id, instrumentId);
      setDialogState(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay,dayGridMonth",
        }}
        slotMinTime="09:00:00"
        slotMaxTime="24:00:00"
        businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: "09:00", endTime: "24:00" }}
        height="auto"
        nowIndicator
        selectable
        select={handleSelect}
        eventClick={handleEventClick}
        events={events}
      />

      <Dialog open={dialogState !== null} onOpenChange={(open) => !open && setDialogState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState?.mode === "edit" ? "Edit Time Block" : "New Time Block"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TimeBlockCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            <DialogFooter>
              {dialogState?.mode === "edit" && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={submitting}
                  onClick={handleDelete}
                  className="sm:mr-auto"
                >
                  Delete
                </Button>
              )}
              <Button type="submit" disabled={submitting}>
                {dialogState?.mode === "edit" ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
