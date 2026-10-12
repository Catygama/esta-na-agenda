import bcrypt from "bcryptjs";
import db from "./database.js";

// Limpar dados existentes
db.exec(`DELETE FROM resposta; DELETE FROM opcao_inquerito; DELETE FROM inquerito;
         DELETE FROM aviso; DELETE FROM notificacao; DELETE FROM subscricao;
         DELETE FROM data_avaliacao; DELETE FROM uc; DELETE FROM utilizador;`);

// --- Utilizadores ---
const hash = (p) => bcrypt.hashSync(p, 10);
const coord = db
  .prepare("INSERT INTO utilizador (nome, email, password_hash, perfil) VALUES (?, ?, ?, 'coordenador')")
  .run("Pedro Santos", "coordenador@ipcb.pt", hash("coord123"));
const ana = db
  .prepare("INSERT INTO utilizador (nome, email, password_hash, perfil) VALUES (?, ?, ?, 'aluno')")
  .run("Ana Silva", "ana.silva@ipcbcampus.pt", hash("aluno123"));

// --- UCs do 2.o ano  ---
const ucs = [
  ["ES", "Engenharia de Software", 2],
  ["SO", "Sistemas Operativos", 2],
  ["LPI", "Linguagens de Programacao para a Internet", 2],
  ["IM", "Informatica Movel", 2],
  ["AI", "Arquitetura Internet", 2],
];
const ucIds = {};
for (const [sigla, nome, ano] of ucs) {
  const info = db.prepare("INSERT INTO uc (sigla, nome, ano) VALUES (?, ?, ?)").run(sigla, nome, ano);
  ucIds[sigla] = info.lastInsertRowid;
}

// --- Datas de avaliacao ---
const datas = [
  [ucIds.ES, "Prova escrita", "2026-06-17T11:30", "D5", "Normal"],
  [ucIds.ES, "Defesa exame pratico", "2026-06-17T14:30", "D6", "Normal"],
  [ucIds.SO, "Prova escrita", "2026-06-16T11:30", "D5", "Normal"],
  [ucIds.LPI, "Prova escrita", "2026-06-15T11:30", "AnfB", "Normal"],
  [ucIds.IM, "Prova escrita", "2026-06-16T11:30", "AnfB", "Normal"],
];
for (const d of datas) {
  db.prepare("INSERT INTO data_avaliacao (uc_id, tipo, data, sala, epoca) VALUES (?, ?, ?, ?, ?)").run(...d);
}

// --- Subscricoes da Ana (ES e SO) ---
db.prepare("INSERT INTO subscricao (utilizador_id, uc_id) VALUES (?, ?)").run(ana.lastInsertRowid, ucIds.ES);
db.prepare("INSERT INTO subscricao (utilizador_id, uc_id) VALUES (?, ?)").run(ana.lastInsertRowid, ucIds.SO);

console.log("Seed concluido.");
console.log("  Coordenador: coordenador@ipcb.pt / coord123");
console.log("  Aluno:       ana.silva@ipcbcampus.pt / aluno123");
