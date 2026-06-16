import { useState } from "react";
import { sessaoAtual, limparSessao } from "./api.js";
import Login from "./pages/Login.jsx";
import PainelAluno from "./pages/PainelAluno.jsx";
import PainelCoordenador from "./pages/PainelCoordenador.jsx";
import Notificacoes from "./pages/Notificacoes.jsx";
import Sino from "./components/Sino.jsx";

export default function App() {
	const [sessao, setSessao] = useState(sessaoAtual());
	const [vista, setVista] = useState({ pagina: "painel", notifId: null });

	if (!sessao) {
		return <Login aoEntrar={() => setSessao(sessaoAtual())} />;
	}

	function sair() {
		limparSessao();
		setSessao(null);
		setVista({ pagina: "painel", notifId: null });
	}

	function abrirNotificacoes(notifId = null) {
		setVista({ pagina: "notificacoes", notifId });
	}

	function voltarAoPainel() {
		setVista({ pagina: "painel", notifId: null });
	}

	const ehCoordenador = sessao.perfil === "coordenador";

	return (
		<>
			<header className="topo">
				<button
					className="marca marca-botao"
					onClick={voltarAoPainel}
					aria-label="Ir para o painel"
				>
					<span className="est">EST</span>á na Agenda
				</button>
				<div className="topo-dir">
					{!ehCoordenador && <Sino aoAbrirNotificacao={abrirNotificacoes} />}
					<span className="perfil-badge">{ehCoordenador ? "Coordenador" : "Aluno"}</span>
					<span style={{ fontSize: "0.9rem", color: "var(--tinta-suave)" }}>{sessao.nome}</span>
					<button className="secundario" onClick={sair}>Sair</button>
				</div>
			</header>
			{ehCoordenador ? (
				<PainelCoordenador />
			) : vista.pagina === "notificacoes" ? (
				<Notificacoes notifIdInicial={vista.notifId} aoVoltar={voltarAoPainel} />
			) : (
				<PainelAluno />
			)}
		</>
	);
}
