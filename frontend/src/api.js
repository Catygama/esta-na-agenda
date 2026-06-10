// Camada fina sobre fetch que injeta o token JWT e trata erros.

const TOKEN_KEY = "esta_na_agenda_token";
const PERFIL_KEY = "esta_na_agenda_perfil";
const NOME_KEY = "esta_na_agenda_nome";

export function guardarSessao({ token, utilizador }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PERFIL_KEY, utilizador.perfil);
  localStorage.setItem(NOME_KEY, utilizador.nome);
}
export function limparSessao() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PERFIL_KEY);
  localStorage.removeItem(NOME_KEY);
}
export function sessaoAtual() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  return { token, perfil: localStorage.getItem(PERFIL_KEY), nome: localStorage.getItem(NOME_KEY) };
}

async function pedido(metodo, caminho, corpo) {
  const token = localStorage.getItem(TOKEN_KEY);
  const cabecalhos = { "Content-Type": "application/json" };
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  const resp = await fetch(`/api${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  if (resp.status === 204) return null;
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || "Ocorreu um erro inesperado.");
  return dados;
}

export const api = {
  get: (c) => pedido("GET", c),
  post: (c, corpo) => pedido("POST", c, corpo),
  put: (c, corpo) => pedido("PUT", c, corpo),
  del: (c) => pedido("DELETE", c),
};
