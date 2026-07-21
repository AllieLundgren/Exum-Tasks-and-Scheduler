"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import type { TimeBlockCategory } from "@/lib/generated/prisma/client";

export async function createTimeBlock(input: {
  instrumentId: string;
  category: TimeBlockCategory;
  startsAt: string;
  endsAt: string;
  notes?: string;
  taskId?: string;
  subtaskId?: string;
}) {
  const session = await requireSession();

  await prisma.timeBlock.create({
    data: {
      instrumentId: input.instrumentId,
      userId: session.user.id,
      category: input.category,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      notes: input.notes || null,
      taskId: input.taskId || null,
      subtaskId: input.subtaskId || null,
    },
  });
  revalidatePath(`/instruments/${input.instrumentId}`);
  if (input.taskId) revalidatePath(`/tasks/${input.taskId}`);
}

export async function updateTimeBlock(input: {
  id: string;
  instrumentId: string;
  category: TimeBlockCategory;
  startsAt: string;
  endsAt: string;
  notes?: string;
  taskId?: string;
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
  if (input.taskId) revalidatePath(`/tasks/${input.taskId}`);
}

export async function deleteTimeBlock(id: string, instrumentId: string, taskId?: string) {
  await requireSession();
  await prisma.timeBlock.delete({ where: { id } });
  revalidatePath(`/instruments/${instrumentId}`);
  if (taskId) revalidatePath(`/tasks/${taskId}`);
}
