import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "esta-na-agenda.db");

// Camada de compatibilidade: usa better-sqlite3 se disponivel (recomendado),
// senao recorre ao modulo nativo node:sqlite (Node >= 22, flag experimental).
let db;
let prepare;

try {
  const { default: Database } = await import("better-sqlite3");
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  prepare = (sql) => db.prepare(sql);
} catch {
  const { DatabaseSync } = await import("node:sqlite");
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON");
  // Adaptar a API de node:sqlite para a mesma forma de better-sqlite3
  prepare = (sql) => {
    const stmt = db.prepare(sql);
    return {
      get: (...a) => stmt.get(...a),
      all: (...a) => stmt.all(...a),
      run: (...a) => {
        const r = stmt.run(...a);
        return { lastInsertRowid: r.lastInsertRowid, changes: r.changes };
      },
    };
  };
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS utilizador (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('aluno','coordenador'))
);
CREATE TABLE IF NOT EXISTS uc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sigla TEXT NOT NULL, nome TEXT NOT NULL, ano INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS data_avaliacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uc_id INTEGER NOT NULL REFERENCES uc(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, data TEXT NOT NULL, sala TEXT, epoca TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS subscricao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utilizador_id INTEGER NOT NULL REFERENCES utilizador(id) ON DELETE CASCADE,
  uc_id INTEGER NOT NULL REFERENCES uc(id) ON DELETE CASCADE,
  UNIQUE (utilizador_id, uc_id)
);
CREATE TABLE IF NOT EXISTS aviso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uc_id INTEGER NOT NULL REFERENCES uc(id) ON DELETE CASCADE,
  assunto TEXT NOT NULL, corpo TEXT NOT NULL,
  enviado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS inquerito (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uc_id INTEGER NOT NULL REFERENCES uc(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS resposta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inquerito_id INTEGER NOT NULL REFERENCES inquerito(id) ON DELETE CASCADE,
  utilizador_id INTEGER NOT NULL REFERENCES utilizador(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL, UNIQUE (inquerito_id, utilizador_id)
);
CREATE TABLE IF NOT EXISTS notificacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utilizador_id INTEGER NOT NULL REFERENCES utilizador(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL, lida INTEGER NOT NULL DEFAULT 0,
  criada_em TEXT NOT NULL DEFAULT (datetime('now')),
  aviso_id INTEGER REFERENCES aviso(id) ON DELETE SET NULL
);
`;
db.exec(SCHEMA);

// Migracao idempotente: garante a coluna aviso_id em bases de dados antigas.
try {
	db.exec("ALTER TABLE notificacao ADD COLUMN aviso_id INTEGER REFERENCES aviso(id) ON DELETE SET NULL");
} catch {
	// coluna ja existe
}

export default { prepare, exec: (s) => db.exec(s) };
