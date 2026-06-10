import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

export default function Sino() {
  const [notifs, setNotifs] = useState([]);
  const [aberto, setAberto] = useState(false);
  const refContentor = useRef(null);

  const naoLidas = notifs.filter((n) => !n.lida).length;

  async function carregar() {
    try {
      const lista = await api.get("/notificacoes");
      setNotifs(lista);
    } catch {
      // silencioso: se falhar, o sino fica sem contador
    }
  }

  useEffect(() => {
    carregar();
    // Atualiza periodicamente para apanhar novas notificacoes
    const intervalo = setInterval(carregar, 30000);
    return () => clearInterval(intervalo);
  }, []);

  // Fecha o painel ao clicar fora
  useEffect(() => {
    function aoClicarFora(e) {
      if (refContentor.current && !refContentor.current.contains(e.target)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  async function marcarLida(id) {
    await api.put(`/notificacoes/${id}/lida`);
    setNotifs((atual) => atual.map((n) => (n.id === id ? { ...n, lida: 1 } : n)));
  }

  async function marcarTodasLidas() {
    const porLer = notifs.filter((n) => !n.lida);
    await Promise.all(porLer.map((n) => api.put(`/notificacoes/${n.id}/lida`)));
    setNotifs((atual) => atual.map((n) => ({ ...n, lida: 1 })));
  }

  return (
    <div className="sino-contentor" ref={refContentor}>
      <button
        className="sino-botao"
        onClick={() => setAberto((v) => !v)}
        aria-label={`Notificações${naoLidas > 0 ? `, ${naoLidas} por ler` : ""}`}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {naoLidas > 0 && <span className="sino-contador">{naoLidas}</span>}
      </button>

      {aberto && (
        <div className="sino-painel">
          <div className="sino-cabecalho">
            <strong>Notificações</strong>
            {naoLidas > 0 && (
              <button className="sino-marcar" onClick={marcarTodasLidas}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="sino-vazio">Sem notificações.</div>
          ) : (
            notifs.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={`sino-item${n.lida ? "" : " por-ler"}`}
                onClick={() => !n.lida && marcarLida(n.id)}
              >
                {!n.lida && <span className="sino-ponto" />}
                <span>{n.mensagem}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
