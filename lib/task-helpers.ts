import type { TaskStatus } from "@/lib/generated/prisma/client";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  in_progress: "In Progress",
  done: "Done",
};

export const BLANK_CATEGORY_LABELS: Record<string, string> = {
  maintenance: "Maintenance",
  applications: "Applications",
  customer_visit: "Customer Visit",
  other: "Other",
};

export const DEMO_STAGE_LABELS: Record<string, string> = {
  sample_prep: "Sample Prep",
  data_collection: "Data Collection",
  data_processing: "Data Processing",
};

export const DEMO_SUBSTAGE_LABELS: Record<string, string> = {
  mapping: "Mapping",
  depth_profiling: "Depth Profiling",
  three_d_modeling: "3D Modeling",
  quantitation: "Quantitation",
  qualitative_analysis: "Qualitative Analysis",
};

// Sample Prep and Data Collection are always part of a demo.
export const DEMO_FIXED_STAGES = [
  { stageType: "sample_prep", substageType: null, orderIndex: 0 },
  { stageType: "data_collection", substageType: null, orderIndex: 1 },
] as const;

// Data Processing substeps vary per demo, so they're a checklist at creation time.
export const DEMO_PROCESSING_SUBSTAGES = [
  "mapping",
  "depth_profiling",
  "three_d_modeling",
  "quantitation",
  "qualitative_analysis",
] as const;

// A demo task books instrument time from its Data Collection stage; a blank task
// books instrument time when its category corresponds to real instrument work.
export const INSTRUMENT_RELEVANT_BLANK_CATEGORIES = new Set([
  "maintenance",
  "applications",
  "customer_visit",
]);

export type DemoSubtaskWithTask = {
  id: string;
  taskId: string;
  stageType: string;
  substageType: string | null;
  status: TaskStatus;
  task: { title: string };
};

export function groupDemoSubtasksByTask(subtasks: DemoSubtaskWithTask[]) {
  const map = new Map<string, { taskId: string; title: string; stages: DemoSubtaskWithTask[] }>();
  for (const s of subtasks) {
    const existing = map.get(s.taskId);
    if (existing) existing.stages.push(s);
    else map.set(s.taskId, { taskId: s.taskId, title: s.task.title, stages: [s] });
  }
  return [...map.values()];
}

export function deriveDemoStatus(subtasks: { status: TaskStatus }[]): TaskStatus {
  if (subtasks.length > 0 && subtasks.every((s) => s.status === "done")) return "done";
  if (subtasks.some((s) => s.status === "in_progress" || s.status === "done")) return "in_progress";
  if (subtasks.some((s) => s.status === "assigned")) return "assigned";
  return "unassigned";
}

export function demoProgressLabel(subtasks: { status: TaskStatus }[]): string {
  const done = subtasks.filter((s) => s.status === "done").length;
  return `${done}/${subtasks.length} stages done`;
}
