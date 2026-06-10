import { Router } from "express";
import db from "../db/database.js";
import { autenticar, exigirCoordenador } from "../middleware/auth.js";
import { enviarEmail, criarNotificacao } from "../services/email.js";

const router = Router();

// ---------- Unidades Curriculares ----------

// GET /api/ucs  -> lista todas as UC (publico autenticado)
router.get("/ucs", autenticar, (req, res) => {
  const ucs = db.prepare("SELECT * FROM uc ORDER BY ano, sigla").all();
  res.json(ucs);
});

// POST /api/ucs  -> cria UC (coordenador) [RF02]
router.post("/ucs", autenticar, exigirCoordenador, (req, res) => {
  const { sigla, nome, ano } = req.body;
  if (!sigla || !nome || !ano) {
    return res.status(400).json({ erro: "Sigla, nome e ano sao obrigatorios." });
  }
  const info = db
    .prepare("INSERT INTO uc (sigla, nome, ano) VALUES (?, ?, ?)")
    .run(sigla, nome, ano);
  res.status(201).json({ id: info.lastInsertRowid, sigla, nome, ano });
});

// DELETE /api/ucs/:id  -> remove UC (coordenador) [RF02]
router.delete("/ucs/:id", autenticar, exigirCoordenador, (req, res) => {
  db.prepare("DELETE FROM uc WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

// ---------- Datas de Avaliacao ----------

// GET /api/datas  -> coordenador ve todas; aluno ve apenas as das UC subscritas [RF09]
router.get("/datas", autenticar, (req, res) => {
  if (req.utilizador.perfil === "coordenador") {
    const datas = db
      .prepare(`SELECT d.*, u.sigla, u.nome AS uc_nome
                FROM data_avaliacao d JOIN uc u ON u.id = d.uc_id
                ORDER BY d.data`)
      .all();
    return res.json(datas);
  }
  const datas = db
    .prepare(`SELECT d.*, u.sigla, u.nome AS uc_nome
              FROM data_avaliacao d
              JOIN uc u ON u.id = d.uc_id
              JOIN subscricao s ON s.uc_id = d.uc_id
              WHERE s.utilizador_id = ?
              ORDER BY d.data`)
    .all(req.utilizador.id);
  res.json(datas);
});

// POST /api/datas  -> cria data (coordenador) [RF03]
router.post("/datas", autenticar, exigirCoordenador, (req, res) => {
  const { uc_id, tipo, data, sala, epoca } = req.body;
  if (!uc_id || !tipo || !data || !epoca) {
    return res.status(400).json({ erro: "uc_id, tipo, data e epoca sao obrigatorios." });
  }
  const info = db
    .prepare("INSERT INTO data_avaliacao (uc_id, tipo, data, sala, epoca) VALUES (?, ?, ?, ?, ?)")
    .run(uc_id, tipo, data, sala || null, epoca);
  res.status(201).json({ id: info.lastInsertRowid, uc_id, tipo, data, sala, epoca });
});

// PUT /api/datas/:id  -> altera data e notifica subscritores [RF03, RF10]
router.put("/datas/:id", autenticar, exigirCoordenador, async (req, res) => {
  const atual = db.prepare("SELECT * FROM data_avaliacao WHERE id = ?").get(req.params.id);
  if (!atual) return res.status(404).json({ erro: "Data nao encontrada." });

  const { tipo, data, sala, epoca } = req.body;
  db.prepare("UPDATE data_avaliacao SET tipo = ?, data = ?, sala = ?, epoca = ? WHERE id = ?")
    .run(tipo ?? atual.tipo, data ?? atual.data, sala ?? atual.sala, epoca ?? atual.epoca, req.params.id);

  // Notificar todos os alunos subscritores da UC desta data
  const uc = db.prepare("SELECT * FROM uc WHERE id = ?").get(atual.uc_id);
  const subscritores = db
    .prepare(`SELECT u.id, u.email, u.nome FROM utilizador u
              JOIN subscricao s ON s.utilizador_id = u.id
              WHERE s.uc_id = ?`)
    .all(atual.uc_id);

  const msg = `A data de ${tipo ?? atual.tipo} de ${uc.sigla} foi atualizada para ${data ?? atual.data}.`;
  for (const sub of subscritores) {
    criarNotificacao(sub.id, msg);
    await enviarEmail({ para: sub.email, assunto: `[ESTá na Agenda] Alteracao em ${uc.sigla}`, texto: msg });
  }

  res.json({ ok: true, notificados: subscritores.length });
});

// DELETE /api/datas/:id  -> remove data (coordenador) [RF03]
router.delete("/datas/:id", autenticar, exigirCoordenador, (req, res) => {
  db.prepare("DELETE FROM data_avaliacao WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
