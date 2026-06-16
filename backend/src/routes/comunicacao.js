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

// POST /api/inqueritos  -> cria inquerito para uma ou mais UC [RF05]
router.post("/inqueritos", autenticar, exigirCoordenador, (req, res) => {
  const { uc_ids, pergunta } = req.body;
  if (!Array.isArray(uc_ids) || uc_ids.length === 0 || !pergunta) {
    return res.status(400).json({ erro: "uc_ids (lista) e pergunta sao obrigatorios." });
  }
  const criados = [];
  for (const uc_id of uc_ids) {
    const info = db.prepare("INSERT INTO inquerito (uc_id, pergunta) VALUES (?, ?)").run(uc_id, pergunta);
    criados.push(info.lastInsertRowid);
  }
  res.status(201).json({ ids: criados });
});

// GET /api/inqueritos  -> aluno ve inqueritos das UC subscritas; coordenador ve todos [RF11]
router.get("/inqueritos", autenticar, (req, res) => {
  if (req.utilizador.perfil === "coordenador") {
    const todos = db
      .prepare(`SELECT i.*, u.sigla FROM inquerito i JOIN uc u ON u.id = i.uc_id ORDER BY i.id DESC`)
      .all();
    return res.json(todos);
  }
  const lista = db
    .prepare(`SELECT i.*, u.sigla FROM inquerito i
              JOIN uc u ON u.id = i.uc_id
              JOIN subscricao s ON s.uc_id = i.uc_id
              WHERE s.utilizador_id = ? ORDER BY i.id DESC`)
    .all(req.utilizador.id);
  res.json(lista);
});

// POST /api/inqueritos/:id/respostas  -> aluno responde [RF11]
router.post("/inqueritos/:id/respostas", autenticar, (req, res) => {
  const { conteudo } = req.body;
  if (!conteudo) return res.status(400).json({ erro: "conteudo e obrigatorio." });
  try {
    db.prepare("INSERT INTO resposta (inquerito_id, utilizador_id, conteudo) VALUES (?, ?, ?)")
      .run(req.params.id, req.utilizador.id, conteudo);
  } catch {
    return res.status(409).json({ erro: "Ja respondeu a este inquerito." });
  }
  res.status(201).json({ ok: true });
});

// GET /api/inqueritos/:id/respostas  -> coordenador consulta respostas [RF06]
router.get("/inqueritos/:id/respostas", autenticar, exigirCoordenador, (req, res) => {
  const respostas = db
    .prepare(`SELECT r.conteudo, u.nome FROM resposta r
              JOIN utilizador u ON u.id = r.utilizador_id
              WHERE r.inquerito_id = ?`)
    .all(req.params.id);
  res.json(respostas);
});

export default router;
