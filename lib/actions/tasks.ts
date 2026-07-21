"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import type {
  BlankTaskCategory,
  DemoStageType,
  DemoSubstageType,
  TaskStatus,
} from "@/lib/generated/prisma/client";
import { DEMO_FIXED_STAGES, DEMO_PROCESSING_SUBSTAGES } from "@/lib/task-helpers";

function revalidateTaskPaths(taskId: string) {
  revalidatePath("/tasks");
  revalidatePath("/tasks/my");
  revalidatePath(`/tasks/${taskId}`);
}

export async function createDemoTask(formData: FormData) {
  const session = await requireSession();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "") || null;
  if (!title) throw new Error("Customer/company name is required");

  const selectedSubstages = DEMO_PROCESSING_SUBSTAGES.filter(
    (substage) => formData.get(`substage_${substage}`) === "on",
  );

  const subtasks: { stageType: DemoStageType; substageType: DemoSubstageType | null; orderIndex: number }[] = [
    ...DEMO_FIXED_STAGES.map((s) => ({
      stageType: s.stageType as DemoStageType,
      substageType: s.substageType,
      orderIndex: s.orderIndex,
    })),
    ...selectedSubstages.map((substage, i) => ({
      stageType: "data_processing" as DemoStageType,
      substageType: substage as DemoSubstageType,
      orderIndex: DEMO_FIXED_STAGES.length + i,
    })),
  ];

  const task = await prisma.task.create({
    data: {
      kind: "demo",
      title,
      description: description || null,
      createdById: session.user.id,
      subtasks: {
        create: subtasks.map((s) => ({
          stageType: s.stageType,
          substageType: s.substageType,
          orderIndex: s.orderIndex,
          assignedToId: assignedToId ?? undefined,
          status: assignedToId ? "assigned" : "unassigned",
        })),
      },
    },
  });

  revalidateTaskPaths(task.id);
  redirect(`/tasks/${task.id}`);
}

export async function createBlankTask(formData: FormData) {
  const session = await requireSession();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "") as BlankTaskCategory;
  const assignedToId = String(formData.get("assignedToId") ?? "") || null;
  if (!title) throw new Error("Title is required");
  if (!category) throw new Error("Category is required");

  const task = await prisma.task.create({
    data: {
      kind: "blank",
      title,
      description: description || null,
      category,
      createdById: session.user.id,
      assignedToId,
      status: assignedToId ? "assigned" : "unassigned",
    },
  });

  revalidateTaskPaths(task.id);
  redirect(`/tasks/${task.id}`);
}

export async function assignBlankTask(taskId: string, userId: string) {
  await requireSession();
  await prisma.task.update({
    where: { id: taskId },
    data: { assignedToId: userId, status: "assigned" },
  });
  revalidateTaskPaths(taskId);
}

export async function respondToBlankTask(taskId: string, response: "accept" | "decline") {
  await requireSession();
  await prisma.task.update({
    where: { id: taskId },
    data:
      response === "accept"
        ? { status: "in_progress" }
        : { status: "unassigned", assignedToId: null },
  });
  revalidateTaskPaths(taskId);
}

export async function setBlankTaskStatus(taskId: string, status: TaskStatus) {
  await requireSession();
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  revalidateTaskPaths(taskId);
}

export async function assignDemoSubtask(taskId: string, subtaskId: string, userId: string) {
  await requireSession();
  await prisma.demoSubtask.update({
    where: { id: subtaskId },
    data: { assignedToId: userId, status: "assigned" },
  });
  revalidateTaskPaths(taskId);
}

export async function respondToDemoSubtask(
  taskId: string,
  subtaskId: string,
  response: "accept" | "decline",
) {
  await requireSession();
  await prisma.demoSubtask.update({
    where: { id: subtaskId },
    data:
      response === "accept"
        ? { status: "in_progress" }
        : { status: "unassigned", assignedToId: null },
  });
  revalidateTaskPaths(taskId);
}

export async function setDemoSubtaskStatus(taskId: string, subtaskId: string, status: TaskStatus) {
  await requireSession();
  await prisma.demoSubtask.update({ where: { id: subtaskId }, data: { status } });
  revalidateTaskPaths(taskId);
}

export async function deleteTask(taskId: string) {
  const session = await requireSession();
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { createdById: true } });
  if (!task) throw new Error("Task not found");
  if (task.createdById !== session.user.id) {
    throw new Error("Only the task creator can delete this task");
  }
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/tasks");
  revalidatePath("/tasks/my");
  redirect("/tasks");
}

export async function acceptAllAssignedSubtasks(taskId: string) {
  const session = await requireSession();
  await prisma.demoSubtask.updateMany({
    where: { taskId, assignedToId: session.user.id, status: "assigned" },
    data: { status: "in_progress" },
  });
  revalidateTaskPaths(taskId);
}
