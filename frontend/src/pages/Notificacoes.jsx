import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Vazio } from "../components/Comuns.jsx";

function formatarData(iso) {
	if (!iso) return "";
	const isoUtc = iso.includes("T") ? iso : iso.replace(" ", "T") + "Z";
	const d = new Date(isoUtc);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString("pt-PT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function Notificacoes({ notifIdInicial, aoVoltar }) {
	const [notifs, setNotifs] = useState([]);
	const [selecionadaId, setSelecionadaId] = useState(notifIdInicial ?? null);
	const [aCarregar, setACarregar] = useState(true);

	async function carregar() {
		try {
			const lista = await api.get("/notificacoes");
			setNotifs(lista);
			if (selecionadaId == null && lista.length > 0) {
				setSelecionadaId(lista[0].id);
			}
		} finally {
			setACarregar(false);
		}
	}

	useEffect(() => { carregar(); }, []);

	const selecionada = useMemo(
		() => notifs.find((n) => n.id === selecionadaId) || null,
		[notifs, selecionadaId]
	);

	const naoLidas = notifs.filter((n) => !n.lida).length;

	function notificarSino() {
		window.dispatchEvent(new Event("notificacoes:atualizadas"));
	}

	async function abrir(notif) {
		setSelecionadaId(notif.id);
		if (!notif.lida) {
			try {
				await api.put(`/notificacoes/${notif.id}/lida`);
				setNotifs((atual) => atual.map((n) => (n.id === notif.id ? { ...n, lida: 1 } : n)));
				notificarSino();
			} catch {
				// se falhar, fica como esta
			}
		}
	}

	async function marcarTodasLidas() {
		const porLer = notifs.filter((n) => !n.lida);
		if (porLer.length === 0) return;
		await Promise.all(porLer.map((n) => api.put(`/notificacoes/${n.id}/lida`)));
		setNotifs((atual) => atual.map((n) => ({ ...n, lida: 1 })));
		notificarSino();
	}

	async function alternarLida(notif) {
		if (!notif.lida) {
			await api.put(`/notificacoes/${notif.id}/lida`);
			setNotifs((atual) => atual.map((n) => (n.id === notif.id ? { ...n, lida: 1 } : n)));
			notificarSino();
		}
	}

	return (
		<div className="conteudo">
			<div className="notif-cabecalho">
				<button className="secundario notif-voltar" onClick={aoVoltar}>← Voltar</button>
				<h2 className="seccao-titulo">Notificações{naoLidas > 0 ? ` (${naoLidas} por ler)` : ""}</h2>
				{naoLidas > 0 && (
					<button className="secundario" onClick={marcarTodasLidas}>
						Marcar todas como lidas
					</button>
				)}
			</div>

			<div className="cartao notif-layout">
				<aside className="notif-lista">
					{aCarregar ? (
						<div className="vazio">A carregar…</div>
					) : notifs.length === 0 ? (
						<Vazio texto="Sem notificações." />
					) : (
						notifs.map((n) => {
							const ativa = n.id === selecionadaId;
							return (
								<button
									key={n.id}
									className={`notif-lista-item${ativa ? " ativa" : ""}${n.lida ? "" : " por-ler"}`}
									onClick={() => abrir(n)}
								>
									<div className="notif-lista-topo">
										{!n.lida && <span className="sino-ponto" aria-hidden="true" />}
										<span className="notif-lista-titulo">
											{n.assunto || n.mensagem}
										</span>
									</div>
									<div className="notif-lista-meta">
										{n.sigla ? <span className="etiqueta-tipo">{n.sigla}</span> : null}
										<span>{formatarData(n.criada_em)}</span>
									</div>
								</button>
							);
						})
					)}
				</aside>

				<section className="notif-detalhe">
					{!selecionada ? (
						<Vazio texto="Selecione uma notificação para ver o conteúdo." />
					) : (
						<>
							<div className="notif-detalhe-topo">
								<div>
									<h3 className="notif-detalhe-titulo">
										{selecionada.assunto || selecionada.mensagem}
									</h3>
									<div className="notif-detalhe-meta">
										{selecionada.sigla && (
											<span className="etiqueta-tipo">
												{selecionada.sigla}
												{selecionada.uc_nome ? ` · ${selecionada.uc_nome}` : ""}
											</span>
										)}
										<span>{formatarData(selecionada.criada_em)}</span>
									</div>
								</div>
								{!selecionada.lida && (
									<button className="secundario" onClick={() => alternarLida(selecionada)}>
										Marcar como lida
									</button>
								)}
							</div>

							<div className="notif-detalhe-corpo">
								{selecionada.corpo ? (
									selecionada.corpo.split("\n").map((linha, i) => <p key={i}>{linha || "\u00a0"}</p>)
								) : (
									<p className="vazio-inline">
										Esta notificação não tem conteúdo adicional.
									</p>
								)}
							</div>
						</>
					)}
				</section>
			</div>
		</div>
	);
}
