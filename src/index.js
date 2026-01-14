require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3333;

// Login fixo (por enquanto)
const USUARIO_FIXO = process.env.APP_USER || "admin";
const SENHA_FIXA = process.env.APP_PASS || "123456";
const JWT_SECRET = process.env.JWT_SECRET || "troque_essa_chave_em_producao";

// Middleware para proteger rotas
function autenticarToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Token ausente" });

  const [tipo, token] = auth.split(" ");
  if (tipo !== "Bearer" || !token) return res.status(401).json({ message: "Token inválido" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Token expirado ou inválido" });
  }
}

// Healthcheck
app.get("/", (req, res) => {
  res.json({ ok: true, service: "API Sistema Fazendas" });
});

// Login real
app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;

  if (usuario !== USUARIO_FIXO || senha !== SENHA_FIXA) {
    return res.status(401).json({ message: "Usuário ou senha inválidos" });
  }

  const token = jwt.sign({ usuario }, JWT_SECRET, { expiresIn: "8h" });
  return res.json({ token });
});

// Exemplo de rota protegida (teste)
app.get("/privado", autenticarToken, (req, res) => {
  res.json({ message: "Acesso autorizado!", user: req.user });
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
