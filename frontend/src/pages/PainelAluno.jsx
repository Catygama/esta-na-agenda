import { useEffect, useState } from "react";
import { api } from "../api.js";
import { DataItem, Toast, Vazio } from "../components/Comuns.jsx";

export default function PainelAluno() {
	const [ucs, setUcs] = useState([]);
	const [subscritas, setSubscritas] = useState([]);
	const [datas, setDatas] = useState([]);
	const [inqueritos, setInqueritos] = useState([]);
	const [rascunhosTexto, setRascunhosTexto] = useState({});
	const [escolhas, setEscolhas] = useState({});
	const [toast, setToast] = useState("");
	const [filtroEpoca, setFiltroEpoca] = useState("Todas");

	const idsSubscritos = new Set(subscritas.map((u) => u.id));

	const datasFiltradas =
		filtroEpoca === "Todas" ? datas : datas.filter((d) => d.epoca === filtroEpoca);

	async function carregar() {
		const [todasUcs, minhas, asDatas, osInqueritos] = await Promise.all([
			api.get("/ucs"),
			api.get("/subscricoes"),
			api.get("/datas"),
			api.get("/inqueritos"),
		]);
		setUcs(todasUcs);
		setSubscritas(minhas);
		setDatas(asDatas);
		setInqueritos(osInqueritos);
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

	function marcarRespondido(inqId) {
		setInqueritos((atual) => atual.map((i) => (i.id === inqId ? { ...i, respondido: 1 } : i)));
		setRascunhosTexto((v) => {
			const novo = { ...v };
			delete novo[inqId];
			return novo;
		});
		setEscolhas((v) => {
			const novo = { ...v };
			delete novo[inqId];
			return novo;
		});
	}

	async function enviarRespostaTexto(inq) {
		const conteudo = (rascunhosTexto[inq.id] || "").trim();
		if (!conteudo) {
			mostrarToast("Escreva uma resposta antes de submeter.");
			return;
		}
		try {
			await api.post(`/inqueritos/${inq.id}/respostas`, { conteudo });
			marcarRespondido(inq.id);
			mostrarToast("Resposta submetida.");
		} catch (err) {
			if (err.message && err.message.toLowerCase().includes("ja respondeu")) {
				marcarRespondido(inq.id);
			}
			mostrarToast(err.message || "Erro ao submeter resposta.");
		}
	}

	async function enviarRespostaEscolha(inq) {
		const opcaoId = escolhas[inq.id];
		if (!opcaoId) {
			mostrarToast("Escolha uma opção antes de submeter.");
			return;
		}
		try {
			await api.post(`/inqueritos/${inq.id}/respostas`, { opcao_id: opcaoId });
			marcarRespondido(inq.id);
			mostrarToast("Resposta submetida.");
		} catch (err) {
			if (err.message && err.message.toLowerCase().includes("ja respondeu")) {
				marcarRespondido(inq.id);
			}
			mostrarToast(err.message || "Erro ao submeter resposta.");
		}
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

			<h2 className="seccao-titulo">Inquéritos</h2>
			<div className="cartao">
				{inqueritos.length === 0 ? (
					<Vazio texto="Sem inquéritos das disciplinas que segue." />
				) : (
					inqueritos.map((inq) => {
						const respondido = Number(inq.respondido) === 1;
						const ehEscolha = inq.tipo === "escolha";
						return (
							<div key={inq.id} className="inq-linha">
								<div className="inq-cabecalho">
									<div className="inq-info">
										<span className="etiqueta-tipo">{inq.sigla}</span>
										<span className="inq-pergunta">{inq.pergunta}</span>
									</div>
									{respondido && <span className="inq-respondido">Respondido</span>}
								</div>

								{!respondido && ehEscolha && (
									<div className="inq-form">
										<div className="chips">
											{(inq.opcoes || []).map((o) => {
												const ativa = escolhas[inq.id] === o.id;
												return (
													<button
														key={o.id}
														type="button"
														className={`chip${ativa ? " ativo" : ""}`}
														aria-pressed={ativa}
														onClick={() => setEscolhas((v) => ({ ...v, [inq.id]: o.id }))}
													>
														<span className="chip-sigla">{o.texto}</span>
													</button>
												);
											})}
										</div>
										<button
											onClick={() => enviarRespostaEscolha(inq)}
											disabled={!escolhas[inq.id]}
										>
											Submeter
										</button>
									</div>
								)}

								{!respondido && !ehEscolha && (
									<div className="inq-form">
										<textarea
											rows="2"
											value={rascunhosTexto[inq.id] || ""}
											onChange={(e) => setRascunhosTexto((v) => ({ ...v, [inq.id]: e.target.value }))}
											placeholder="A tua resposta…"
										/>
										<button onClick={() => enviarRespostaTexto(inq)}>Submeter</button>
									</div>
								)}
							</div>
						);
					})
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
