import nodemailer from "nodemailer";
import db from "../db/database.js";

// Em desenvolvimento usamos o transporte "stream" (nao envia de verdade,
// imprime o email na consola). Em producao, configurar SMTP via .env.
let transporter;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  transporter = nodemailer.createTransport({ jsonTransport: true });
}

// Envia um email e devolve true/false. Regista sempre na consola (RNF07).
export async function enviarEmail({ para, assunto, texto }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || "esta-na-agenda@estcb.pt",
      to: para,
      subject: assunto,
      text: texto,
    });
    console.log(`[EMAIL] enviado para ${para} | assunto: ${assunto}`);
    return { ok: true, info };
  } catch (erro) {
    console.error(`[EMAIL] falha ao enviar para ${para}:`, erro.message);
    return { ok: false, erro: erro.message };
  }
}

// Cria uma notificacao no painel do aluno (opcionalmente ligada a um aviso)
export function criarNotificacao(utilizadorId, mensagem, avisoId = null) {
	db.prepare(
		"INSERT INTO notificacao (utilizador_id, mensagem, aviso_id) VALUES (?, ?, ?)"
	).run(utilizadorId, mensagem, avisoId);
}
