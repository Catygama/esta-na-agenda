import { useState } from "react";
import { api, guardarSessao } from "../api.js";

export default function Login({ aoEntrar }) {
  const [modoRegisto, setModoRegisto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [aCarregar, setACarregar] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    setErro("");
    setACarregar(true);
    try {
      const caminho = modoRegisto ? "/auth/registo" : "/auth/login";
      const corpo = modoRegisto ? { nome, email, password } : { email, password };
      const resposta = await api.post(caminho, corpo);
      guardarSessao(resposta);
      aoEntrar(resposta.utilizador);
    } catch (e) {
      setErro(e.message);
    } finally {
      setACarregar(false);
    }
  }

  return (
    <div className="login-ecra">
      <div className="login-cartao">
        <div className="marca">
          <span className="est">EST</span>á na Agenda
        </div>
        <p className="marca-sub">As tuas datas de avaliação, sem o PDF.</p>

        {erro && <div className="erro-msg">{erro}</div>}

        <form onSubmit={submeter}>
          {modoRegisto && (
            <div className="campo">
              <label htmlFor="nome">Nome completo</label>
              <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
          )}
          <div className="campo">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="password">Palavra-passe</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" style={{ width: "100%" }} disabled={aCarregar}>
            {aCarregar ? "A entrar…" : modoRegisto ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <button className="alternar" onClick={() => { setModoRegisto(!modoRegisto); setErro(""); }}>
          {modoRegisto ? "Já tenho conta — entrar" : "Sou aluno e quero criar conta"}
        </button>
      </div>
    </div>
  );
}
