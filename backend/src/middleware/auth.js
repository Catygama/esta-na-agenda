import jwt from "jsonwebtoken";

// Em producao o segredo tem de vir do .env: um valor por defeito conhecido
// permitiria a qualquer pessoa forjar tokens (incluindo de coordenador).
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET nao definido. Configure-o no .env antes de arrancar em producao.");
}
const SEGREDO = process.env.JWT_SECRET || "segredo-de-desenvolvimento-trocar-em-producao";

// Gera um token para um utilizador
export function gerarToken(utilizador) {
  return jwt.sign(
    { id: utilizador.id, nome: utilizador.nome, perfil: utilizador.perfil },
    SEGREDO,
    { expiresIn: "8h" }
  );
}

// Exige que o pedido traga um token valido
export function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : null;
  if (!token) {
    return res.status(401).json({ erro: "Autenticacao necessaria." });
  }
  try {
    req.utilizador = jwt.verify(token, SEGREDO);
    next();
  } catch {
    return res.status(401).json({ erro: "Token invalido ou expirado." });
  }
}

// Exige que o utilizador autenticado seja coordenador (RNF03)
export function exigirCoordenador(req, res, next) {
  if (!req.utilizador || req.utilizador.perfil !== "coordenador") {
    return res.status(403).json({ erro: "Acesso restrito a coordenadores." });
  }
  next();
}

export { SEGREDO };
