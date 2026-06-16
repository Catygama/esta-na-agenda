import { Router } from "express";
import db from "../db/database.js";
import { autenticar, exigirCoordenador } from "../middleware/auth.js";
import { enviarEmail, criarNotificacao } from "../services/email.js";

const router = Router();

// ---------- Avisos por email ----------

// POST /api/avisos  -> coordenador envia aviso a subscritores de UC(s) selecionadas [RF04]
router.post("/avisos", autenticar, exigirCoordenador, async (req, res) => {
	const { uc_ids, assunto, corpo } = req.body;
	if (!Array.isArray(uc_ids) || uc_ids.length === 0 || !assunto || !corpo) {
		return res.status(400).json({ erro: "uc_ids (lista), assunto e corpo sao obrigatorios." });
	}

	const destinatariosUnicos = new Set();
	let enviados = 0;

	for (const uc_id of uc_ids) {
		const info = db.prepare("INSERT INTO aviso (uc_id, assunto, corpo) VALUES (?, ?, ?)").run(uc_id, assunto, corpo);
		const avisoId = info.lastInsertRowid;

		const uc = db.prepare("SELECT sigla FROM uc WHERE id = ?").get(uc_id);
		const sigla = uc?.sigla || "UC";

		const destinatariosUc = db
			.prepare(`SELECT u.id, u.email FROM utilizador u
                JOIN subscricao s ON s.utilizador_id = u.id
                WHERE s.uc_id = ?`)
			.all(uc_id);

		for (const d of destinatariosUc) {
			criarNotificacao(d.id, `[${sigla}] ${assunto}`, avisoId);
			if (!destinatariosUnicos.has(d.email)) {
				destinatariosUnicos.add(d.email);
				const r = await enviarEmail({ para: d.email, assunto: `[ESTá na Agenda] ${assunto}`, texto: corpo });
				if (r.ok) enviados++;
			}
		}
	}

	res.status(201).json({ destinatarios: destinatariosUnicos.size, enviados });
});

// ---------- Inqueritos ----------

const TIPOS_INQUERITO = new Set(["texto", "escolha"]);

// Carrega as opcoes de um conjunto de inqueritos -> { inquerito_id: [{id, texto}] }
function carregarOpcoesPorInquerito(inqueritoIds) {
	if (inqueritoIds.length === 0) return {};
	const placeholders = inqueritoIds.map(() => "?").join(",");
	const linhas = db
		.prepare(`SELECT id, inquerito_id, texto FROM opcao_inquerito
              WHERE inquerito_id IN (${placeholders})
              ORDER BY id`)
		.all(...inqueritoIds);
	const mapa = {};
	for (const id of inqueritoIds) mapa[id] = [];
	for (const o of linhas) {
		mapa[o.inquerito_id].push({ id: o.id, texto: o.texto });
	}
	return mapa;
}

// POST /api/inqueritos  -> cria inquerito (tipo='texto' ou 'escolha') [RF05]
router.post("/inqueritos", autenticar, exigirCoordenador, (req, res) => {
	const { uc_ids, pergunta, tipo = "texto", opcoes } = req.body;

	if (!Array.isArray(uc_ids) || uc_ids.length === 0 || !pergunta || typeof pergunta !== "string") {
		return res.status(400).json({ erro: "uc_ids (lista) e pergunta sao obrigatorios." });
	}
	if (!TIPOS_INQUERITO.has(tipo)) {
		return res.status(400).json({ erro: "tipo deve ser 'texto' ou 'escolha'." });
	}

	let opcoesLimpas = [];
	if (tipo === "escolha") {
		if (!Array.isArray(opcoes)) {
			return res.status(400).json({ erro: "opcoes (lista) e obrigatoria para tipo 'escolha'." });
		}
		opcoesLimpas = opcoes
			.map((o) => (typeof o === "string" ? o.trim() : ""))
			.filter((o) => o.length > 0);
		if (opcoesLimpas.length < 2) {
			return res.status(400).json({ erro: "tipo 'escolha' exige pelo menos 2 opcoes nao vazias." });
		}
	}

	const inserirInquerito = db.prepare("INSERT INTO inquerito (uc_id, pergunta, tipo) VALUES (?, ?, ?)");
	const inserirOpcao = db.prepare("INSERT INTO opcao_inquerito (inquerito_id, texto) VALUES (?, ?)");

	const criados = [];
	db.exec("BEGIN");
	try {
		for (const uc_id of uc_ids) {
			const info = inserirInquerito.run(uc_id, pergunta, tipo);
			const inqueritoId = info.lastInsertRowid;
			if (tipo === "escolha") {
				for (const texto of opcoesLimpas) {
					inserirOpcao.run(inqueritoId, texto);
				}
			}
			criados.push(inqueritoId);
		}
		db.exec("COMMIT");
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ erro: err.message || "Erro a criar inquerito." });
	}

	res.status(201).json({ ids: criados });
});

// GET /api/inqueritos  -> aluno ve inqueritos das UC subscritas; coordenador ve todos [RF11]
router.get("/inqueritos", autenticar, (req, res) => {
	let lista;
	if (req.utilizador.perfil === "coordenador") {
		lista = db
			.prepare(`SELECT i.id, i.uc_id, i.pergunta, i.tipo, u.sigla, u.nome AS uc_nome
                FROM inquerito i
                JOIN uc u ON u.id = i.uc_id
                ORDER BY i.id DESC`)
			.all();
	} else {
		lista = db
			.prepare(`SELECT i.id, i.uc_id, i.pergunta, i.tipo, u.sigla, u.nome AS uc_nome,
                EXISTS(
                  SELECT 1 FROM resposta r
                  WHERE r.inquerito_id = i.id AND r.utilizador_id = ?
                ) AS respondido
                FROM inquerito i
                JOIN uc u ON u.id = i.uc_id
                JOIN subscricao s ON s.uc_id = i.uc_id
                WHERE s.utilizador_id = ?
                ORDER BY i.id DESC`)
			.all(req.utilizador.id, req.utilizador.id);
	}

	const idsEscolha = lista.filter((i) => i.tipo === "escolha").map((i) => i.id);
	const opcoesPorInq = carregarOpcoesPorInquerito(idsEscolha);

	const comOpcoes = lista.map((i) => ({
		...i,
		opcoes: i.tipo === "escolha" ? (opcoesPorInq[i.id] || []) : [],
	}));

	res.json(comOpcoes);
});

// POST /api/inqueritos/:id/respostas  -> aluno responde (texto ou escolha) [RF11]
router.post("/inqueritos/:id/respostas", autenticar, (req, res) => {
	const inqueritoId = Number(req.params.id);
	const inq = db.prepare("SELECT id, tipo FROM inquerito WHERE id = ?").get(inqueritoId);
	if (!inq) return res.status(404).json({ erro: "Inquerito nao existe." });

	let conteudo = "";
	let opcaoId = null;

	if (inq.tipo === "escolha") {
		const recebido = Number(req.body.opcao_id);
		if (!Number.isInteger(recebido) || recebido <= 0) {
			return res.status(400).json({ erro: "opcao_id (inteiro) e obrigatorio para inqueritos de escolha." });
		}
		const opcao = db
			.prepare("SELECT id FROM opcao_inquerito WHERE id = ? AND inquerito_id = ?")
			.get(recebido, inqueritoId);
		if (!opcao) {
			return res.status(400).json({ erro: "opcao_id nao pertence a este inquerito." });
		}
		opcaoId = opcao.id;
	} else {
		const texto = typeof req.body.conteudo === "string" ? req.body.conteudo.trim() : "";
		if (!texto) {
			return res.status(400).json({ erro: "conteudo e obrigatorio para inqueritos de texto." });
		}
		conteudo = texto;
	}

	try {
		db.prepare("INSERT INTO resposta (inquerito_id, utilizador_id, conteudo, opcao_id) VALUES (?, ?, ?, ?)")
			.run(inqueritoId, req.utilizador.id, conteudo, opcaoId);
	} catch (err) {
		if (/UNIQUE/i.test(err.message || "")) {
			return res.status(409).json({ erro: "Ja respondeu a este inquerito." });
		}
		return res.status(400).json({ erro: err.message || "Resposta invalida." });
	}

	res.status(201).json({ ok: true });
});

// GET /api/inqueritos/:id/respostas  -> coordenador consulta respostas [RF06]
// - tipo 'texto'   -> { tipo, respostas: [{ nome, conteudo }] }
// - tipo 'escolha' -> { tipo, total, opcoes: [{ id, texto, votos }] }
router.get("/inqueritos/:id/respostas", autenticar, exigirCoordenador, (req, res) => {
	const inqueritoId = Number(req.params.id);
	const inq = db.prepare("SELECT id, tipo FROM inquerito WHERE id = ?").get(inqueritoId);
	if (!inq) return res.status(404).json({ erro: "Inquerito nao existe." });

	if (inq.tipo === "escolha") {
		const opcoes = db
			.prepare(`SELECT o.id, o.texto, COUNT(r.id) AS votos
                FROM opcao_inquerito o
                LEFT JOIN resposta r ON r.opcao_id = o.id
                WHERE o.inquerito_id = ?
                GROUP BY o.id
                ORDER BY o.id`)
			.all(inqueritoId);
		const total = opcoes.reduce((acc, o) => acc + Number(o.votos || 0), 0);
		return res.json({ tipo: "escolha", total, opcoes });
	}

	const respostas = db
		.prepare(`SELECT r.conteudo, u.nome FROM resposta r
              JOIN utilizador u ON u.id = r.utilizador_id
              WHERE r.inquerito_id = ?
              ORDER BY r.id`)
		.all(inqueritoId);
	res.json({ tipo: "texto", respostas });
});

export default router;
