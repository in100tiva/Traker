import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDb, type DbBundle } from "@/db/client";

export function useDb(): DbBundle | null {
  const [db, setDb] = useState<DbBundle | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDb()
      .then((d) => {
        if (!cancelled) setDb(d);
      })
      .catch((err) => {
        console.error("[db] init failed", err);
        toast.error("Falha ao inicializar o banco local", {
          description: (err as Error).message,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return db;
}
