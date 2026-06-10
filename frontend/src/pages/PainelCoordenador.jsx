import { useEffect, useState } from "react";
import { api } from "../api.js";
import { DataItem, Toast, Vazio } from "../components/Comuns.jsx";

export default function PainelCoordenador() {
  const [ucs, setUcs] = useState([]);
  const [datas, setDatas] = useState([]);
  const [toast, setToast] = useState("");

  // formulario de nova data
  const [novaData, setNovaData] = useState({ uc_id: "", tipo: "Prova escrita", data: "", sala: "", epoca: "Normal" });
  // formulario de aviso
  const [aviso, setAviso] = useState({ uc_id: "", assunto: "", corpo: "" });

  async function carregar() {
    const [asUcs, asDatas] = await Promise.all([api.get("/ucs"), api.get("/datas")]);
    setUcs(asUcs);
    setDatas(asDatas);
    if (asUcs.length && !novaData.uc_id) {
      setNovaData((v) => ({ ...v, uc_id: asUcs[0].id }));
      setAviso((v) => ({ ...v, uc_id: asUcs[0].id }));
    }
  }
  useEffect(() => { carregar(); }, []);

  function mostrarToast(t) { setToast(t); setTimeout(() => setToast(""), 2800); }

  async function criarData(e) {
    e.preventDefault();
    await api.post("/datas", { ...novaData, uc_id: Number(novaData.uc_id) });
    setNovaData((v) => ({ ...v, data: "", sala: "" }));
    mostrarToast("Data criada.");
    await carregar();
  }

  async function removerData(id) {
    await api.del(`/datas/${id}`);
    mostrarToast("Data removida.");
    await carregar();
  }

  async function enviarAviso(e) {
    e.preventDefault();
    const r = await api.post("/avisos", {
      uc_ids: [Number(aviso.uc_id)],
      assunto: aviso.assunto,
      corpo: aviso.corpo,
    });
    setAviso((v) => ({ ...v, assunto: "", corpo: "" }));
    mostrarToast(`Aviso enviado a ${r.destinatarios} aluno(s).`);
  }

  return (
    <div className="conteudo">
      <h2 className="seccao-titulo">Nova data de avaliação</h2>
      <div className="cartao painel">
        <form onSubmit={criarData}>
          <div className="linha-form">
            <div className="campo">
              <label>Disciplina</label>
              <select value={novaData.uc_id} onChange={(e) => setNovaData({ ...novaData, uc_id: e.target.value })}>
                {ucs.map((u) => <option key={u.id} value={u.id}>{u.sigla} — {u.nome}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Tipo</label>
              <select value={novaData.tipo} onChange={(e) => setNovaData({ ...novaData, tipo: e.target.value })}>
                <option>Prova escrita</option>
                <option>Defesa exame prático</option>
                <option>Entrega de trabalho</option>
              </select>
            </div>
          </div>
          <div className="linha-form">
            <div className="campo">
              <label>Data e hora</label>
              <input type="datetime-local" value={novaData.data} onChange={(e) => setNovaData({ ...novaData, data: e.target.value })} required />
            </div>
            <div className="campo">
              <label>Sala</label>
              <input value={novaData.sala} onChange={(e) => setNovaData({ ...novaData, sala: e.target.value })} placeholder="ex.: AnfB" />
            </div>
          </div>
          <div className="campo">
            <label>Época</label>
            <select value={novaData.epoca} onChange={(e) => setNovaData({ ...novaData, epoca: e.target.value })}>
              <option>Normal</option><option>Recurso</option><option>Especial</option>
            </select>
          </div>
          <button type="submit">Criar data</button>
        </form>
      </div>

      <h2 className="seccao-titulo">Datas publicadas</h2>
      <div className="cartao">
        {datas.length === 0 ? (
          <Vazio texto="Ainda não há datas publicadas." />
        ) : (
          datas.map((d) => (
            <DataItem key={d.id} data={d}>
              <button className="perigo" onClick={() => removerData(d.id)}>Remover</button>
            </DataItem>
          ))
        )}
      </div>

      <h2 className="seccao-titulo">Enviar aviso por email</h2>
      <div className="cartao painel">
        <form onSubmit={enviarAviso}>
          <div className="campo">
            <label>Disciplina destinatária</label>
            <select value={aviso.uc_id} onChange={(e) => setAviso({ ...aviso, uc_id: e.target.value })}>
              {ucs.map((u) => <option key={u.id} value={u.id}>{u.sigla} — {u.nome}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Assunto</label>
            <input value={aviso.assunto} onChange={(e) => setAviso({ ...aviso, assunto: e.target.value })} required />
          </div>
          <div className="campo">
            <label>Mensagem</label>
            <textarea rows="3" value={aviso.corpo} onChange={(e) => setAviso({ ...aviso, corpo: e.target.value })} required />
          </div>
          <button type="submit">Enviar aos subscritores</button>
        </form>
      </div>

      <Toast mensagem={toast} />
    </div>
  );
}
