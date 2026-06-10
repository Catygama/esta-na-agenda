import { useState } from "react";
import { sessaoAtual, limparSessao } from "./api.js";
import Login from "./pages/Login.jsx";
import PainelAluno from "./pages/PainelAluno.jsx";
import PainelCoordenador from "./pages/PainelCoordenador.jsx";

export default function App() {
  const [sessao, setSessao] = useState(sessaoAtual());

  if (!sessao) {
    return <Login aoEntrar={() => setSessao(sessaoAtual())} />;
  }

  function sair() {
    limparSessao();
    setSessao(null);
  }

  const ehCoordenador = sessao.perfil === "coordenador";

  return (
    <>
      <header className="topo">
        <div className="marca"><span className="est">EST</span>á na Agenda</div>
        <div className="topo-dir">
          <span className="perfil-badge">{ehCoordenador ? "Coordenador" : "Aluno"}</span>
          <span style={{ fontSize: "0.9rem", color: "var(--tinta-suave)" }}>{sessao.nome}</span>
          <button className="secundario" onClick={sair}>Sair</button>
        </div>
      </header>
      {ehCoordenador ? <PainelCoordenador /> : <PainelAluno />}
    </>
  );
}
