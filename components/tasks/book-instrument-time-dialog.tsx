"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTimeBlock } from "@/lib/actions/time-blocks";
import type { TimeBlockCategory } from "@/lib/generated/prisma/client";

export function BookInstrumentTimeDialog({
  instruments,
  category,
  taskId,
  subtaskId,
}: {
  instruments: { id: string; name: string }[];
  category: TimeBlockCategory;
  taskId: string;
  subtaskId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [instrumentId, setInstrumentId] = useState<string | null>(instruments[0]?.id ?? null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  if (instruments.length === 0) {
    return <p className="text-xs text-muted-foreground">No active instruments to book.</p>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instrumentId || !start || !end) return;
    setSubmitting(true);
    try {
      await createTimeBlock({
        instrumentId,
        category,
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(end).toISOString(),
        notes,
        taskId,
        subtaskId,
      });
      setOpen(false);
      setStart("");
      setEnd("");
      setNotes("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Book Instrument Time</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book Instrument Time</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Instrument</Label>
            <Select value={instrumentId} onValueChange={(v) => setInstrumentId(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {instruments.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="book-start">Start</Label>
              <Input
                id="book-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="book-end">End</Label>
              <Input
                id="book-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-notes">Notes</Label>
            <Textarea
              id="book-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              Book
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
