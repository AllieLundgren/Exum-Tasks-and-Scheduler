import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstrumentDialog } from "@/components/instruments/instrument-dialog";
import { InstrumentStatusSelect } from "@/components/instruments/instrument-status-select";
import { INSTRUMENT_STATUS_LABELS, INSTRUMENT_STATUS_BADGE_VARIANT } from "@/lib/instrument-helpers";

export default async function InstrumentsPage() {
  const instruments = await prisma.instrument.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Instruments</h1>
        <InstrumentDialog />
      </div>

      {instruments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No instruments yet. Add your first mass spectrometer to start scheduling.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instruments.map((instrument) => (
            <Card key={instrument.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{instrument.name}</CardTitle>
                  {instrument.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {instrument.description}
                    </p>
                  )}
                </div>
                <Badge variant={INSTRUMENT_STATUS_BADGE_VARIANT[instrument.status]}>
                  {INSTRUMENT_STATUS_LABELS[instrument.status]}
                </Badge>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Link
                  href={`/instruments/${instrument.id}`}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  View calendar
                </Link>
                <div className="ml-auto flex items-center gap-2">
                  <InstrumentDialog
                    instrument={{
                      id: instrument.id,
                      name: instrument.name,
                      description: instrument.description,
                    }}
                  />
                  <InstrumentStatusSelect id={instrument.id} status={instrument.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
