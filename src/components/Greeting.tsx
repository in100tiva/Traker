import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function greetingFor(hour: number): string {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

interface Props {
  pendingCount: number;
  totalCount: number;
}

export function Greeting({ pendingCount, totalCount }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const status =
    totalCount === 0
      ? "Nenhum hábito ativo ainda."
      : pendingCount === 0
        ? "Tudo feito por hoje 🎉"
        : pendingCount === 1
          ? "1 hábito pendente hoje"
          : `${pendingCount} hábitos pendentes hoje`;

  return (
    <div>
      <h1 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
        {greetingFor(now.getHours())}
      </h1>
      <p className="text-xs text-muted-foreground md:text-sm">
        {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })} · {status}
      </p>
    </div>
  );
}
