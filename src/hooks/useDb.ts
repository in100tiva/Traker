import { useEffect, useState } from "react";
import { getDb, type DB } from "@/db/client";

export function useDb(): DB | null {
  const [db, setDb] = useState<DB | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDb().then((d) => {
      if (!cancelled) setDb(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return db;
}
