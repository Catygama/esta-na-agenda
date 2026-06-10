import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db/database.js";
import { gerarToken } from "../middleware/auth.js";

const router = Router();

const DOMINIOS_PERMITIDOS = ["ipcb.pt", "ipcbcampus.pt"];

function emailInstitucional(email) {
  const dominio = String(email).split("@")[1]?.toLowerCase();
  return DOMINIOS_PERMITIDOS.includes(dominio);
}

// POST /api/auth/registo  -> cria um aluno (coordenadores criam-se via seed)
router.post("/registo", (req, res) => {
  const { nome, email, password } = req.body;
  if (!nome || !email || !password) {
    return res.status(400).json({ erro: "Nome, email e password sao obrigatorios." });
  }
  const existe = db.prepare("SELECT id FROM utilizador WHERE email = ?").get(email);
  if (existe) {
    return res.status(409).json({ erro: "Ja existe uma conta com este email." });
  }
  const hash = bcrypt.hashSync(password, 10); // RNF02
  const info = db
    .prepare("INSERT INTO utilizador (nome, email, password_hash, perfil) VALUES (?, ?, ?, 'aluno')")
    .run(nome, email, hash);
  const utilizador = { id: info.lastInsertRowid, nome, email, perfil: "aluno" };
  res.status(201).json({ token: gerarToken(utilizador), utilizador });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const u = db.prepare("SELECT * FROM utilizador WHERE email = ?").get(email);
  if (!u || !bcrypt.compareSync(password, u.password_hash)) {
    return res.status(401).json({ erro: "Credenciais invalidas." });
  }
  const utilizador = { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil };
  res.json({ token: gerarToken(utilizador), utilizador });
});

export default router;
