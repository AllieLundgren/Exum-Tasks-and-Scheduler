"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createDemoTask, createBlankTask } from "@/lib/actions/tasks";
import { BLANK_CATEGORY_LABELS, DEMO_SUBSTAGE_LABELS, DEMO_PROCESSING_SUBSTAGES } from "@/lib/task-helpers";

export function NewTaskForm({ users }: { users: { id: string; name: string | null }[] }) {
  return (
    <Tabs defaultValue="demo" className="max-w-lg">
      <TabsList>
        <TabsTrigger value="demo">Demo</TabsTrigger>
        <TabsTrigger value="blank">Other Task</TabsTrigger>
      </TabsList>

      <TabsContent value="demo">
        <form action={createDemoTask} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="demo-title">Customer / Company Name</Label>
            <Input id="demo-title" name="title" placeholder="e.g. Acme Corp" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-description">Description</Label>
            <Textarea
              id="demo-description"
              name="description"
              placeholder="Optional notes, timeline expectations, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-assignee">Assign whole demo to (optional)</Label>
            <Select name="assignedToId">
              <SelectTrigger className="w-full" id="demo-assignee">
                <SelectValue placeholder="Leave unassigned" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Sample Prep and Data Collection are always included. Select which Data Processing
              substeps this demo needs:
            </p>
            <div className="space-y-2 rounded-md border p-3">
              {DEMO_PROCESSING_SUBSTAGES.map((substage) => (
                <label
                  key={substage}
                  htmlFor={`substage-${substage}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={`substage-${substage}`}
                    name={`substage_${substage}`}
                    value="on"
                    defaultChecked
                  />
                  {DEMO_SUBSTAGE_LABELS[substage]}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit">Create Demo</Button>
        </form>
      </TabsContent>

      <TabsContent value="blank">
        <form action={createBlankTask} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="blank-title">Title</Label>
            <Input id="blank-title" name="title" placeholder="e.g. Clean ion source" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blank-category">Category</Label>
            <Select name="category" required>
              <SelectTrigger className="w-full" id="blank-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BLANK_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="blank-description">Description</Label>
            <Textarea
              id="blank-description"
              name="description"
              placeholder="Optional notes, timeline expectations, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blank-assignee">Assign to (optional)</Label>
            <Select name="assignedToId">
              <SelectTrigger className="w-full" id="blank-assignee">
                <SelectValue placeholder="Leave unassigned" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Create Task</Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
