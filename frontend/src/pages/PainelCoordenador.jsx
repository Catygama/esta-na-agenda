import { useEffect, useState } from "react";
import { api } from "../api.js";
import { DataItem, Toast, Vazio } from "../components/Comuns.jsx";

const INQUERITO_INICIAL = { uc_ids: [], pergunta: "", tipo: "texto", opcoes: ["", ""] };

export default function PainelCoordenador() {
	const [ucs, setUcs] = useState([]);
	const [datas, setDatas] = useState([]);
	const [inqueritos, setInqueritos] = useState([]);
	const [toast, setToast] = useState("");

	const [novaData, setNovaData] = useState({ uc_id: "", tipo: "Prova escrita", data: "", sala: "", epoca: "Normal" });
	const [aviso, setAviso] = useState({ uc_id: "", assunto: "", corpo: "" });
	const [novoInquerito, setNovoInquerito] = useState(INQUERITO_INICIAL);

	const [inqAberto, setInqAberto] = useState(null);
	const [respostasPorInq, setRespostasPorInq] = useState({});

	async function carregar() {
		const [asUcs, asDatas, osInqueritos] = await Promise.all([
			api.get("/ucs"),
			api.get("/datas"),
			api.get("/inqueritos"),
		]);
		setUcs(asUcs);
		setDatas(asDatas);
		setInqueritos(osInqueritos);
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

	function alternarUcInquerito(ucId) {
		setNovoInquerito((v) => {
			const tem = v.uc_ids.includes(ucId);
			return { ...v, uc_ids: tem ? v.uc_ids.filter((id) => id !== ucId) : [...v.uc_ids, ucId] };
		});
	}

	function definirTipo(tipo) {
		setNovoInquerito((v) => ({ ...v, tipo }));
	}

	function alterarOpcao(i, valor) {
		setNovoInquerito((v) => {
			const opcoes = [...v.opcoes];
			opcoes[i] = valor;
			return { ...v, opcoes };
		});
	}

	function adicionarOpcao() {
		setNovoInquerito((v) => ({ ...v, opcoes: [...v.opcoes, ""] }));
	}

	function removerOpcao(i) {
		setNovoInquerito((v) => {
			const opcoes = v.opcoes.filter((_, idx) => idx !== i);
			return { ...v, opcoes: opcoes.length === 0 ? [""] : opcoes };
		});
	}

	async function criarInquerito(e) {
		e.preventDefault();
		if (novoInquerito.uc_ids.length === 0) {
			mostrarToast("Selecione pelo menos uma disciplina.");
			return;
		}
		const pergunta = novoInquerito.pergunta.trim();
		if (!pergunta) {
			mostrarToast("Escreva a pergunta.");
			return;
		}

		const payload = {
			uc_ids: novoInquerito.uc_ids.map(Number),
			pergunta,
			tipo: novoInquerito.tipo,
		};

		if (novoInquerito.tipo === "escolha") {
			const opcoesLimpas = novoInquerito.opcoes.map((o) => o.trim()).filter((o) => o.length > 0);
			if (opcoesLimpas.length < 2) {
				mostrarToast("Adicione pelo menos 2 opções não vazias.");
				return;
			}
			payload.opcoes = opcoesLimpas;
		}

		try {
			await api.post("/inqueritos", payload);
			setNovoInquerito(INQUERITO_INICIAL);
			mostrarToast(`Inquérito criado em ${payload.uc_ids.length} disciplina(s).`);
			await carregar();
		} catch (err) {
			mostrarToast(err.message || "Não foi possível criar o inquérito.");
		}
	}

	async function alternarRespostas(inq) {
		if (inqAberto === inq.id) {
			setInqAberto(null);
			return;
		}
		setInqAberto(inq.id);
		if (!respostasPorInq[inq.id]) {
			try {
				const dados = await api.get(`/inqueritos/${inq.id}/respostas`);
				setRespostasPorInq((v) => ({ ...v, [inq.id]: dados }));
			} catch (err) {
				mostrarToast(err.message || "Erro a carregar respostas.");
			}
		}
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

			<h2 className="seccao-titulo">Novo inquérito</h2>
			<div className="cartao painel">
				<form onSubmit={criarInquerito}>
					<div className="campo">
						<div className="campo-cabecalho">
							<label>Disciplinas destinatárias</label>
							<span className="campo-contador">
								{novoInquerito.uc_ids.length === 0
									? "Nenhuma selecionada"
									: `${novoInquerito.uc_ids.length} selecionada${novoInquerito.uc_ids.length === 1 ? "" : "s"}`}
							</span>
						</div>
						{ucs.length === 0 ? (
							<span className="ajuda-campo">Não existem disciplinas.</span>
						) : (
							<div className="chips">
								{ucs.map((u) => {
									const ativo = novoInquerito.uc_ids.includes(u.id);
									return (
										<button
											key={u.id}
											type="button"
											className={`chip${ativo ? " ativo" : ""}`}
											aria-pressed={ativo}
											onClick={() => alternarUcInquerito(u.id)}
										>
											<span className="chip-sigla">{u.sigla}</span>
											<span className="chip-nome">{u.nome}</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					<div className="campo">
						<label>Tipo de inquérito</label>
						<div className="chips">
							<button
								type="button"
								className={`chip${novoInquerito.tipo === "texto" ? " ativo" : ""}`}
								aria-pressed={novoInquerito.tipo === "texto"}
								onClick={() => definirTipo("texto")}
							>
								<span className="chip-sigla">Texto livre</span>
							</button>
							<button
								type="button"
								className={`chip${novoInquerito.tipo === "escolha" ? " ativo" : ""}`}
								aria-pressed={novoInquerito.tipo === "escolha"}
								onClick={() => definirTipo("escolha")}
							>
								<span className="chip-sigla">Escolha múltipla</span>
							</button>
						</div>
					</div>

					<div className="campo">
						<label>Pergunta</label>
						<textarea
							rows="2"
							value={novoInquerito.pergunta}
							onChange={(e) => setNovoInquerito({ ...novoInquerito, pergunta: e.target.value })}
							placeholder="ex.: Como avalias o ritmo das aulas práticas?"
							required
						/>
					</div>

					{novoInquerito.tipo === "escolha" && (
						<div className="campo">
							<div className="campo-cabecalho">
								<label>Opções</label>
								<span className="campo-contador">
									{novoInquerito.opcoes.filter((o) => o.trim()).length} opç{novoInquerito.opcoes.filter((o) => o.trim()).length === 1 ? "ão" : "ões"}
								</span>
							</div>
							<div className="opcoes-lista">
								{novoInquerito.opcoes.map((op, i) => (
									<div key={i} className="opcao-linha">
										<input
											value={op}
											onChange={(e) => alterarOpcao(i, e.target.value)}
											placeholder={`Opção ${i + 1}`}
										/>
										<button
											type="button"
											className="opcao-remover"
											aria-label={`Remover opção ${i + 1}`}
											onClick={() => removerOpcao(i)}
											disabled={novoInquerito.opcoes.length <= 1}
										>×</button>
									</div>
								))}
							</div>
							<button type="button" className="secundario botao-add" onClick={adicionarOpcao}>
								+ Adicionar opção
							</button>
						</div>
					)}

					<button type="submit">Criar inquérito</button>
				</form>
			</div>

			<h2 className="seccao-titulo">Inquéritos publicados</h2>
			<div className="cartao">
				{inqueritos.length === 0 ? (
					<Vazio texto="Ainda não há inquéritos publicados." />
				) : (
					inqueritos.map((inq) => {
						const aberto = inqAberto === inq.id;
						const dados = respostasPorInq[inq.id];
						return (
							<div key={inq.id} className="inq-linha">
								<div className="inq-cabecalho">
									<div className="inq-info">
										<span className="etiqueta-tipo">{inq.sigla}</span>
										<span className="etiqueta-tipo etiqueta-suave">
											{inq.tipo === "escolha" ? "Escolha" : "Texto"}
										</span>
										<span className="inq-pergunta">{inq.pergunta}</span>
									</div>
									<button className="secundario" onClick={() => alternarRespostas(inq)}>
										{aberto ? "Ocultar respostas" : "Ver respostas"}
									</button>
								</div>
								{aberto && (
									<div className="inq-respostas">
										{!dados ? (
											<div className="vazio">A carregar respostas…</div>
										) : dados.tipo === "escolha" ? (
											<ResultadosEscolha total={dados.total} opcoes={dados.opcoes} />
										) : !dados.respostas || dados.respostas.length === 0 ? (
											<div className="vazio">Ainda sem respostas.</div>
										) : (
											dados.respostas.map((r, i) => (
												<div key={i} className="inq-resposta">
													<div className="inq-resposta-autor">{r.nome}</div>
													<div className="inq-resposta-conteudo">{r.conteudo}</div>
												</div>
											))
										)}
									</div>
								)}
							</div>
						);
					})
				)}
			</div>

			<Toast mensagem={toast} />
		</div>
	);
}

function ResultadosEscolha({ total, opcoes }) {
	if (!opcoes || opcoes.length === 0) {
		return <div className="vazio">Sem opções definidas.</div>;
	}
	if (total === 0) {
		return (
			<>
				<div className="vazio resultado-vazio">Ainda sem votos.</div>
				{opcoes.map((o) => (
					<div key={o.id} className="resultado-linha">
						<div className="resultado-rotulo">{o.texto}</div>
						<div className="resultado-barra"><div className="resultado-preenchida" style={{ width: "0%" }} /></div>
						<div className="resultado-meta">0</div>
					</div>
				))}
			</>
		);
	}
	return (
		<>
			{opcoes.map((o) => {
				const votos = Number(o.votos || 0);
				const pct = total > 0 ? Math.round((votos / total) * 100) : 0;
				return (
					<div key={o.id} className="resultado-linha">
						<div className="resultado-rotulo">{o.texto}</div>
						<div className="resultado-barra">
							<div className="resultado-preenchida" style={{ width: `${pct}%` }} />
						</div>
						<div className="resultado-meta">{votos} ({pct}%)</div>
					</div>
				);
			})}
			<div className="resultado-total">Total de respostas: {total}</div>
		</>
	);
}
