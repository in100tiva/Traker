import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDb, type DbBundle } from "@/db/client";

export interface UseDbResult {
  bundle: DbBundle | null;
  error: Error | null;
}

export function useDb(): UseDbResult {
  const [bundle, setBundle] = useState<DbBundle | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDb()
      .then((d) => {
        if (!cancelled) setBundle(d);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[db] init failed", err);
        setError(err as Error);
        toast.error("Falha ao inicializar o banco local", {
          description: (err as Error).message,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { bundle, error };
}
