import { Button } from "@/components/ui/button";

export function DateRangeForm({ from, to }: { from: string; to: string }) {
  return (
    <form className="flex items-end gap-2" method="get">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground" htmlFor="from">
          From
        </label>
        <input
          id="from"
          name="from"
          type="date"
          defaultValue={from}
          className="block rounded-md border px-2 py-1 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground" htmlFor="to">
          To
        </label>
        <input
          id="to"
          name="to"
          type="date"
          defaultValue={to}
          className="block rounded-md border px-2 py-1 text-sm"
        />
      </div>
      <Button type="submit" size="sm">
        Apply
      </Button>
    </form>
  );
}
