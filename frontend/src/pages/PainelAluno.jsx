import { useEffect, useState } from "react";
import { api } from "../api.js";
import { DataItem, Toast, Vazio } from "../components/Comuns.jsx";

export default function PainelAluno() {
  const [ucs, setUcs] = useState([]);
  const [subscritas, setSubscritas] = useState([]);
  const [datas, setDatas] = useState([]);
  const [toast, setToast] = useState("");
  const [filtroEpoca, setFiltroEpoca] = useState("Todas");

  const idsSubscritos = new Set(subscritas.map((u) => u.id));

  // Filtra as datas pela época selecionada (caso de uso «extend»: Filtrar por época)
  const datasFiltradas =
    filtroEpoca === "Todas" ? datas : datas.filter((d) => d.epoca === filtroEpoca);

  async function carregar() {
    const [todasUcs, minhas, asDatas] = await Promise.all([
      api.get("/ucs"),
      api.get("/subscricoes"),
      api.get("/datas"),
    ]);
    setUcs(todasUcs);
    setSubscritas(minhas);
    setDatas(asDatas);
  }

  useEffect(() => { carregar(); }, []);

  function mostrarToast(t) { setToast(t); setTimeout(() => setToast(""), 2500); }

  async function alternarSubscricao(uc) {
    if (idsSubscritos.has(uc.id)) {
      await api.del(`/subscricoes/${uc.id}`);
      mostrarToast(`Deixou de seguir ${uc.sigla}`);
    } else {
      await api.post("/subscricoes", { uc_id: uc.id });
      mostrarToast(`A seguir ${uc.sigla}`);
    }
    await carregar();
  }

  return (
    <div className="conteudo">
      <div className="seccao-cabecalho">
        <h2 className="seccao-titulo">As minhas datas</h2>
        {datas.length > 0 && (
          <select
            className="filtro-epoca"
            value={filtroEpoca}
            onChange={(e) => setFiltroEpoca(e.target.value)}
            aria-label="Filtrar datas por época"
          >
            <option>Todas</option>
            <option>Normal</option>
            <option>Recurso</option>
            <option>Especial</option>
          </select>
        )}
      </div>
      <div className="cartao">
        {datas.length === 0 ? (
          <Vazio texto="Ainda não segue nenhuma UC. Escolha as suas disciplinas abaixo." />
        ) : datasFiltradas.length === 0 ? (
          <Vazio texto={`Não há datas na época de ${filtroEpoca}.`} />
        ) : (
          datasFiltradas.map((d) => <DataItem key={d.id} data={d} />)
        )}
      </div>

      <h2 className="seccao-titulo">Disciplinas</h2>
      <div className="cartao">
        {ucs.map((uc) => {
          const segue = idsSubscritos.has(uc.id);
          return (
            <div key={uc.id} className="uc-linha">
              <div className="uc-nome">
                {uc.sigla} <small>{uc.nome} · {uc.ano}.º ano</small>
              </div>
              <button className={segue ? "perigo" : "secundario"} onClick={() => alternarSubscricao(uc)}>
                {segue ? "Deixar de seguir" : "Seguir"}
              </button>
            </div>
          );
        })}
      </div>

      <Toast mensagem={toast} />
    </div>
  );
}
 