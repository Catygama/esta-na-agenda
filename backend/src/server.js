import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import datasRoutes from "./routes/datas.js";
import subscricoesRoutes from "./routes/subscricoes.js";
import comunicacaoRoutes from "./routes/comunicacao.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/saude", (req, res) => res.json({ estado: "ok", app: "ESTá na Agenda" }));

app.use("/api/auth", authRoutes);
app.use("/api", datasRoutes);
app.use("/api", subscricoesRoutes);
app.use("/api", comunicacaoRoutes);

const PORTA = process.env.PORT || 3001;
app.listen(PORTA, () => {
  console.log(`Servidor ESTá na Agenda a correr em http://localhost:${PORTA}`);
});

export default app;
