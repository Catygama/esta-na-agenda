# ESTá na Agenda

**EST** — Escola Superior de Tecnologia. Plataforma web onde coordenadores de curso divulgam datas de avaliação e os alunos subscrevem apenas as que lhes interessam, recebendo alertas e respondendo a inquéritos.

Projeto desenvolvido no âmbito do exame prático de **Engenharia de Software**, Licenciatura em Engenharia Informática — IPCB / ESTCB, ano letivo 2025/26.

## Problema

O calendário de exames da licenciatura é publicado num PDF estático que cruza, numa só grelha, três anos, dois semestres, três épocas, salas e docentes. Localizar apenas as datas relevantes para cada aluno é moroso e não há notificação quando algo muda. Esta aplicação substitui essa consulta manual por uma plataforma personalizada.

## Estrutura

```
esta-na-agenda/
├── backend/    API REST em Node.js + Express + SQLite
└── frontend/   Interface em React + Vite
```

## Como correr

Precisa de dois terminais.

### Terminal 1 — Backend

```bash
cd backend
npm install
npm install better-sqlite3      # recomendado (ver nota no README do backend)
npm run seed                    # popula dados de exemplo
npm start                       # http://localhost:3001
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Abrir `http://localhost:5173` no browser.

## Contas de exemplo

| Perfil       | Email                   | Password  |
|--------------|-------------------------|-----------|
| Coordenador  | coordenador@ipcb.pt     | coord123  |
| Aluno        | ana.silva@ipcbcampus.pt | aluno123  |

## Funcionalidades

- Autenticação por perfil (aluno / coordenador) com passwords cifradas
- Coordenador: criar, alterar e remover datas de avaliação
- Aluno: subscrever disciplinas e ver apenas as datas que lhe interessam
- Notificação automática aos subscritores quando uma data muda
- Envio de avisos por email segmentado por disciplina
- Inquéritos com recolha de respostas

## Tecnologias

React · Vite · Node.js · Express · SQLite · JWT · bcryptjs · Nodemailer
