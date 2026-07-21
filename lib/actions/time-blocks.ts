"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { TimeBlockCategory } from "@/lib/generated/prisma/client";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session;
}

export async function createTimeBlock(input: {
  instrumentId: string;
  category: TimeBlockCategory;
  startsAt: string;
  endsAt: string;
  notes?: string;
}) {
  const session = await requireSession();

  await prisma.timeBlock.create({
    data: {
      instrumentId: input.instrumentId,
      userId: session.user!.id!,
      category: input.category,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      notes: input.notes || null,
    },
  });
  revalidatePath(`/instruments/${input.instrumentId}`);
}

export async function updateTimeBlock(input: {
  id: string;
  instrumentId: string;
  category: TimeBlockCategory;
  startsAt: string;
  endsAt: string;
  notes?: string;
}) {
  await requireSession();

  await prisma.timeBlock.update({
    where: { id: input.id },
    data: {
      category: input.category,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      notes: input.notes || null,
    },
  });
  revalidatePath(`/instruments/${input.instrumentId}`);
}

export async function deleteTimeBlock(id: string, instrumentId: string) {
  await requireSession();
  await prisma.timeBlock.delete({ where: { id } });
  revalidatePath(`/instruments/${instrumentId}`);
}
