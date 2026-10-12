// Testes da logica de negocio, executados diretamente contra a BD.
// Correr com: node --experimental-sqlite src/db/teste_logica.mjs
import db from "./database.js";
import bcrypt from "bcryptjs";

let falhas = 0;
function check(cond, msg) {
  if (!cond) { console.log("  FALHA -", msg); falhas++; }
  else console.log("  OK    -", msg);
}

const coord = db.prepare("SELECT * FROM utilizador WHERE perfil='coordenador'").get();
const ana = db.prepare("SELECT * FROM utilizador WHERE email='ana.silva@ipcbcampus.pt'").get();
check(coord && coord.perfil === "coordenador", "coordenador existe");
check(ana && ana.perfil === "aluno", "aluna Ana existe");

check(ana.password_hash !== "aluno123" && bcrypt.compareSync("aluno123", ana.password_hash),
  "password da Ana esta cifrada e validavel (RNF02)");

const datasAna = db.prepare(`SELECT d.*, u.sigla FROM data_avaliacao d
  JOIN uc u ON u.id=d.uc_id JOIN subscricao s ON s.uc_id=d.uc_id
  WHERE s.utilizador_id=? ORDER BY d.data`).all(ana.id);
const siglas = [...new Set(datasAna.map((d) => d.sigla))].sort();
check(JSON.stringify(siglas) === JSON.stringify(["ES", "SO"]),
  `Ana ve apenas datas de ES e SO (viu: ${siglas.join(",")}) (RF09)`);

const provaES = datasAna.find((d) => d.sigla === "ES");
db.prepare("UPDATE data_avaliacao SET data=?, sala=? WHERE id=?")
  .run("2026-06-18T09:00", "AnfB", provaES.id);
const subs = db.prepare(`SELECT u.id FROM utilizador u
  JOIN subscricao s ON s.utilizador_id=u.id WHERE s.uc_id=?`).all(provaES.uc_id);
for (const s of subs) {
  db.prepare("INSERT INTO notificacao (utilizador_id, mensagem) VALUES (?,?)")
    .run(s.id, "Data de ES alterada");
}
const notifs = db.prepare("SELECT * FROM notificacao WHERE utilizador_id=?").all(ana.id);
check(notifs.length >= 1, `Ana recebeu notificacao de alteracao (RF10)`);

const inq = db.prepare("INSERT INTO inquerito (uc_id, pergunta) VALUES (?,?)")
  .run(provaES.uc_id, "Horario foi adequado?");
db.prepare("INSERT INTO resposta (inquerito_id, utilizador_id, conteudo) VALUES (?,?,?)")
  .run(inq.lastInsertRowid, ana.id, "Sim");
let duplicou = false;
try {
  db.prepare("INSERT INTO resposta (inquerito_id, utilizador_id, conteudo) VALUES (?,?,?)")
    .run(inq.lastInsertRowid, ana.id, "Outra");
} catch { duplicou = true; }
check(duplicou, "resposta duplicada ao mesmo inquerito e bloqueada (RF11)");

console.log(falhas === 0 ? "\nTodos os testes passaram." : `\n${falhas} teste(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
