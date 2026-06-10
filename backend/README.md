# ESTá na Agenda — Backend

Backend da aplicação **ESTá na Agenda** (EST — Escola Superior de Tecnologia), uma plataforma onde coordenadores de curso divulgam datas de avaliação e os alunos subscrevem apenas as que lhes interessam, recebendo alertas e respondendo a inquéritos.

Projeto desenvolvido no âmbito do exame prático de Engenharia de Software, LEI — IPCB/ESTCB, 2025/26.

## Stack

- Node.js + Express (API REST)
- SQLite (base de dados)
- JWT (autenticação)
- bcryptjs (cifragem de passwords)
- Nodemailer (envio de avisos por email)

## Instalação

```bash
cd backend
npm install
cp .env.example .env      # editar conforme necessário
```

### Nota sobre a base de dados

O projeto usa `better-sqlite3` por omissão (recomendado). Caso não seja possível
compilá-lo no teu ambiente, o código recorre automaticamente ao módulo nativo
`node:sqlite` (Node 22+), bastando arrancar com a flag `--experimental-sqlite`.

Para instalar o `better-sqlite3` (recomendado na tua máquina):

```bash
npm install better-sqlite3
```

## Arranque

```bash
# 1. Popular a base de dados com dados de exemplo
npm run seed

# 2. Arrancar o servidor
npm start
# ou, se usares o SQLite nativo:
node --experimental-sqlite src/server.js
```

O servidor fica disponível em `http://localhost:3001`.

## Contas de exemplo (após `npm run seed`)

| Perfil       | Email                   | Password   |
|--------------|-------------------------|------------|
| Coordenador  | coordenador@estcb.pt    | coord123   |
| Aluno        | ana@aluno.estcb.pt      | aluno123   |

## Endpoints principais

| Método | Rota                              | Perfil       | Descrição                              |
|--------|-----------------------------------|--------------|----------------------------------------|
| POST   | /api/auth/registo                 | público      | Registo de aluno                       |
| POST   | /api/auth/login                   | público      | Autenticação                           |
| GET    | /api/ucs                          | autenticado  | Listar unidades curriculares           |
| POST   | /api/ucs                          | coordenador  | Criar UC                               |
| GET    | /api/datas                        | autenticado  | Datas (aluno vê só as subscritas)      |
| POST   | /api/datas                        | coordenador  | Criar data                             |
| PUT    | /api/datas/:id                    | coordenador  | Alterar data (notifica subscritores)   |
| GET    | /api/subscricoes                  | aluno        | UC subscritas                          |
| POST   | /api/subscricoes                  | aluno        | Subscrever UC                          |
| GET    | /api/notificacoes                 | aluno        | Notificações                           |
| POST   | /api/avisos                       | coordenador  | Enviar aviso por email                 |
| POST   | /api/inqueritos                   | coordenador  | Criar inquérito                        |
| GET    | /api/inqueritos                   | autenticado  | Listar inquéritos                      |
| POST   | /api/inqueritos/:id/respostas     | aluno        | Responder a inquérito                  |
| GET    | /api/inqueritos/:id/respostas     | coordenador  | Consultar respostas                    |

## Testes

```bash
node --experimental-sqlite src/db/teste_logica.mjs
```

Valida: cifragem de passwords, filtro de datas por subscrição, notificações de
alteração e integridade das respostas a inquéritos.
