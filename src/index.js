require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const prisma = new PrismaClient();

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

// Login real (retorna JWT)
app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;

  if (usuario !== USUARIO_FIXO || senha !== SENHA_FIXA) {
    return res.status(401).json({ message: "Usuário ou senha inválidos" });
  }

  const token = jwt.sign({ usuario }, JWT_SECRET, { expiresIn: "8h" });
  return res.json({ token });
});

// ✅ Cadastrar fazenda (protegido)
app.post("/fazendas", autenticarToken, async (req, res) => {
  try {
    const { nome, localidade, cep, area } = req.body;

    if (!nome || String(nome).trim().length < 2) {
      return res.status(400).json({ message: "Nome da fazenda é obrigatório." });
    }

    const fazenda = await prisma.fazenda.create({
      data: {
        nome: String(nome).trim(),
        localidade: localidade ? String(localidade).trim() : null,
        cep: cep ? String(cep).trim() : null,
        area:
          area !== undefined && area !== null && area !== ""
            ? Number(area)
            : null,
      },
    });

    return res.status(201).json(fazenda);
    } catch (err) {
    console.error("ERRO CADASTRAR FAZENDA:", err);
    return res.status(500).json({
      message: "Erro ao cadastrar fazenda.",
      detail: String(err?.message || err),
    });
  }


// ✅ Listar fazendas (protegido)
app.get("/fazendas", autenticarToken, async (req, res) => {
  try {
    const fazendas = await prisma.fazenda.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.json(fazendas);
  } catch (err) {
    return res.status(500).json({ message: "Erro ao listar fazendas." });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
