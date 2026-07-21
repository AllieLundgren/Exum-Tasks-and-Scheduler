"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

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

export async function setInstrumentActive(id: string, isActive: boolean) {
  await requireSession();
  await prisma.instrument.update({ where: { id }, data: { isActive } });
  revalidatePath("/instruments");
}
