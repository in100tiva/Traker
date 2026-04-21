import { forwardRef, useImperativeHandle, useRef } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import type { DbBundle } from "@/db/client";
import { Button } from "@/components/ui/button";
import { exportAll, importAll, type ExportPayload } from "@/db/queries";

interface Props {
  bundle: DbBundle | null;
}

export interface ExportImportHandle {
  triggerExport: () => void;
  triggerImport: () => void;
}

export const ExportImport = forwardRef<ExportImportHandle, Props>(
  function ExportImport({ bundle }, ref) {
    const fileInput = useRef<HTMLInputElement>(null);

    async function handleExport() {
      if (!bundle) return;
      try {
        const payload = await exportAll(bundle.db);
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        a.download = `traker-backup-${stamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Backup exportado");
      } catch (err) {
        toast.error("Falha ao exportar", {
          description: (err as Error).message,
        });
      }
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !bundle) return;

      const text = await file.text();
      let payload: ExportPayload;
      try {
        payload = JSON.parse(text);
      } catch {
        toast.error("Arquivo inválido (JSON malformado)");
        return;
      }

      const proceed = window.confirm(
        `Importar ${payload.habits?.length ?? 0} hábitos e ${payload.completions?.length ?? 0} marcações? Isso SUBSTITUIRÁ todos os dados atuais.`,
      );
      if (!proceed) return;

      try {
        await importAll(bundle.db, payload);
        toast.success("Backup restaurado");
      } catch (err) {
        toast.error("Falha ao importar", {
          description: (err as Error).message,
        });
      }
    }

    useImperativeHandle(ref, () => ({
      triggerExport: handleExport,
      triggerImport: () => fileInput.current?.click(),
    }));

    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExport}
          disabled={!bundle}
          aria-label="Exportar backup"
          className="hidden md:inline-flex"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInput.current?.click()}
          disabled={!bundle}
          aria-label="Importar backup"
          className="hidden md:inline-flex"
        >
          <Upload className="h-4 w-4" />
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
      </>
    );
  },
);
