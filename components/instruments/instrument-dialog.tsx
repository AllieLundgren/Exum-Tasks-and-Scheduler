"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createInstrument, updateInstrument } from "@/lib/actions/instruments";

type Instrument = {
  id: string;
  name: string;
  description: string | null;
};

export function InstrumentDialog({ instrument }: { instrument?: Instrument }) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(instrument);

  async function action(formData: FormData) {
    if (isEdit) {
      await updateInstrument(formData);
    } else {
      await createInstrument(formData);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"} />}
      >
        {isEdit ? "Edit" : "New Instrument"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Instrument" : "New Instrument"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={instrument!.id} />}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Orbitrap #2"
              defaultValue={instrument?.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Optional notes about this instrument"
              defaultValue={instrument?.description ?? ""}
            />
          </div>
          <DialogFooter>
            <Button type="submit">{isEdit ? "Save changes" : "Create instrument"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
