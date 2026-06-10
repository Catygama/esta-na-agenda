const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Etiqueta de data no estilo "folha de calendario" (assinatura visual da app)
export function DataItem({ data, children }) {
  const d = new Date(data.data);
  const hora = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="data-item">
      <div className="data-cal">
        <div className="mes">{MESES[d.getMonth()]}</div>
        <div className="dia">{String(d.getDate()).padStart(2, "0")}</div>
      </div>
      <div className="data-info">
        <div className="uc">
          {data.sigla} <span className="etiqueta-tipo">{data.tipo}</span>
        </div>
        <div className="meta">
          {hora} · {data.sala || "sala a definir"} · época {data.epoca}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Toast({ mensagem }) {
  if (!mensagem) return null;
  return <div className="toast">{mensagem}</div>;
}

export function Vazio({ texto }) {
  return <div className="vazio">{texto}</div>;
}
