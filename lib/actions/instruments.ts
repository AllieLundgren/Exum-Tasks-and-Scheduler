"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import type { InstrumentStatus } from "@/lib/generated/prisma/client";

export async function createInstrument(formData: FormData) {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) throw new Error("Instrument name is required");

  await prisma.instrument.create({
    data: { name, description: description || null },
  });
  revalidatePath("/instruments");
}

export async function updateInstrument(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!id) throw new Error("Missing instrument id");
  if (!name) throw new Error("Instrument name is required");

  await prisma.instrument.update({
    where: { id },
    data: { name, description: description || null },
  });
  revalidatePath("/instruments");
}

export async function setInstrumentStatus(id: string, status: InstrumentStatus) {
  await requireSession();
  const current = await prisma.instrument.findUnique({ where: { id }, select: { status: true } });
  if (!current || current.status === status) return;
  await prisma.instrument.update({ where: { id }, data: { status, statusSince: new Date() } });
  revalidatePath("/instruments");
  revalidatePath(`/instruments/${id}`);
  revalidatePath("/analytics");
}
