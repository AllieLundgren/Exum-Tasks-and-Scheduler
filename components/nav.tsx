import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/instruments", label: "Instruments" },
  { href: "/tasks", label: "Tasks" },
  { href: "/tasks/my", label: "My Tasks" },
  { href: "/analytics", label: "Analytics" },
];

export function Nav({ userName }: { userName?: string | null }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <nav className="flex items-center gap-6">
          <span className="font-semibold">Lab Tracker</span>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {userName && <span className="text-sm text-muted-foreground">{userName}</span>}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
