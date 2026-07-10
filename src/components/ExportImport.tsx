import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { HIcon } from "./icons/HIcon";
import type { DbBundle } from "@/db/client";
import { Button } from "@/components/ui/button";
import { exportAll, importAll, type ExportPayload } from "@/db/queries";
import { ImportPreviewDialog } from "./ImportPreviewDialog";

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
    const [previewPayload, setPreviewPayload] = useState<ExportPayload | null>(
      null,
    );
    const [importing, setImporting] = useState(false);

    async function handleExport() {
      if (!bundle) return;
      try {
        const payload = await exportAll(bundle.db);
        const json = JSON.stringify(payload, null, 2);
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `traker-backup-${stamp}.json`;

        if (Capacitor.isNativePlatform()) {
          // WebView Android não baixa blob: + <a download> — gravamos no
          // cache do app e abrimos o share sheet (salvar em Arquivos,
          // Drive, enviar etc.). Toast só depois da gravação confirmada.
          const written = await Filesystem.writeFile({
            path: filename,
            data: json,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });
          try {
            await Share.share({
              title: "Backup do Streaks",
              url: written.uri,
              dialogTitle: "Salvar/compartilhar backup",
            });
          } catch {
            // usuário cancelou o share — o arquivo foi gravado mesmo assim
          }
        } else {
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }

        const habitCount = payload.habits.length;
        const completionCount = payload.completions.length;
        const noteCount = payload.completions.filter(
          (c) => c.note && c.note.length > 0,
        ).length;

        toast.success("Backup exportado", {
          description: `${habitCount} ${habitCount === 1 ? "hábito" : "hábitos"} · ${completionCount} ${completionCount === 1 ? "marcação" : "marcações"}${noteCount > 0 ? ` · ${noteCount} ${noteCount === 1 ? "nota" : "notas"}` : ""}.`,
        });
      } catch (err) {
        toast.error("Falha ao exportar", {
          description: (err as Error).message,
        });
      }
    }

    async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      const text = await file.text();
      let payload: ExportPayload;
      try {
        payload = JSON.parse(text);
      } catch {
        toast.error("Arquivo inválido (JSON malformado)");
        return;
      }

      const version = (payload as { version?: number }).version;
      if (version !== 1 && version !== 2) {
        toast.error("Versão de backup não suportada", {
          description: `Este app só importa versões 1 ou 2 (recebido: ${version ?? "desconhecida"}).`,
        });
        return;
      }

      setPreviewPayload(payload);
    }

    async function confirmImport() {
      if (!bundle || !previewPayload) return;
      setImporting(true);
      try {
        await importAll(bundle.db, previewPayload);
        const habitCount = previewPayload.habits.length;
        toast.success("Backup restaurado", {
          description: `${habitCount} ${habitCount === 1 ? "hábito" : "hábitos"} importado${habitCount === 1 ? "" : "s"}.`,
        });
        setPreviewPayload(null);
      } catch (err) {
        toast.error("Falha ao importar", {
          description: (err as Error).message,
        });
      } finally {
        setImporting(false);
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
        >
          <HIcon name="download" size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInput.current?.click()}
          disabled={!bundle}
          aria-label="Importar backup"
        >
          <HIcon name="upload" size={16} />
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileSelected}
        />
        <ImportPreviewDialog
          open={previewPayload !== null}
          payload={previewPayload}
          onCancel={() => setPreviewPayload(null)}
          onConfirm={confirmImport}
          confirming={importing}
        />
      </>
    );
  },
);
