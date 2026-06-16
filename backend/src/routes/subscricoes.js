import { Router } from "express";
import db from "../db/database.js";
import { autenticar } from "../middleware/auth.js";

const router = Router();

// GET /api/subscricoes  -> UC subscritas pelo aluno autenticado
router.get("/subscricoes", autenticar, (req, res) => {
  const ucs = db
    .prepare(`SELECT u.* FROM uc u
              JOIN subscricao s ON s.uc_id = u.id
              WHERE s.utilizador_id = ? ORDER BY u.ano, u.sigla`)
    .all(req.utilizador.id);
  res.json(ucs);
});

// POST /api/subscricoes  -> subscreve uma UC [RF08]
router.post("/subscricoes", autenticar, (req, res) => {
  const { uc_id } = req.body;
  if (!uc_id) return res.status(400).json({ erro: "uc_id e obrigatorio." });
  try {
    db.prepare("INSERT INTO subscricao (utilizador_id, uc_id) VALUES (?, ?)")
      .run(req.utilizador.id, uc_id);
  } catch {
    return res.status(409).json({ erro: "Ja subscreveu esta UC." });
  }
  res.status(201).json({ ok: true });
});

// DELETE /api/subscricoes/:ucId  -> cancela subscricao
router.delete("/subscricoes/:ucId", autenticar, (req, res) => {
  db.prepare("DELETE FROM subscricao WHERE utilizador_id = ? AND uc_id = ?")
    .run(req.utilizador.id, req.params.ucId);
  res.status(204).end();
});

// GET /api/notificacoes  -> notificacoes do aluno [RF10]
router.get("/notificacoes", autenticar, (req, res) => {
	const ns = db
		.prepare(`SELECT n.id, n.mensagem, n.lida, n.criada_em, n.aviso_id,
                a.assunto, a.corpo, a.enviado_em,
                uc.sigla, uc.nome AS uc_nome
              FROM notificacao n
              LEFT JOIN aviso a ON a.id = n.aviso_id
              LEFT JOIN uc ON uc.id = a.uc_id
              WHERE n.utilizador_id = ?
              ORDER BY n.criada_em DESC`)
		.all(req.utilizador.id);
	res.json(ns);
});

// PUT /api/notificacoes/:id/lida  -> marca como lida
router.put("/notificacoes/:id/lida", autenticar, (req, res) => {
  db.prepare("UPDATE notificacao SET lida = 1 WHERE id = ? AND utilizador_id = ?")
    .run(req.params.id, req.utilizador.id);
  res.json({ ok: true });
});

export default router;
