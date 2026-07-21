import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/instruments");

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-lg border p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold">Lab Instrument Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in with your company Microsoft account to continue.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/instruments" });
          }}
        >
          <Button type="submit" className="w-full">
            Sign in with Microsoft
          </Button>
        </form>
      </div>
    </div>
  );
}
