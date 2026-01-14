require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" })); // importante por causa das imagens base64

const prisma = new PrismaClient();

const PORT = process.env.PORT || 3333;

// Login fixo (por enquanto)
const USUARIO_FIXO = process.env.APP_USER || "admin";
const SENHA_FIXA = process.env.APP_PASS || "123456";
const JWT_SECRET = process.env.JWT_SECRET || "troque_essa_chave_em_producao";

function autenticarToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Token ausente" });

  const [tipo, token] = auth.split(" ");
  if (tipo !== "Bearer" || !token) return res.status(401).json({ message: "Token inválido" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token expirado ou inválido" });
  }
}

function apenasLetras(valor) {
  return /^[A-Za-zÀ-ÿ\s]+$/.test(valor);
}

function toNumberOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

// LISTAR (com filtros simples e ordenação)
app.get("/fazendas", autenticarToken, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const sortBy = String(req.query.sortBy || "createdAt");
    const sortDir = String(req.query.sortDir || "desc") === "asc" ? "asc" : "desc";

    const where = search
      ? {
          OR: [
            { nome: { contains: search, mode: "insensitive" } },
            { numeroCarEstadual: { contains: search, mode: "insensitive" } },
            { ie: { contains: search, mode: "insensitive" } },
            { cep: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const allowedSort = new Set(["createdAt", "nome", "cep", "numeroCarEstadual"]);
    const orderBy = allowedSort.has(sortBy) ? { [sortBy]: sortDir } : { createdAt: "desc" };

    const fazendas = await prisma.fazenda.findMany({ where, orderBy });
    return res.json(fazendas);
  } catch (err) {
    console.error("ERRO LISTAR FAZENDAS:", err);
    return res.status(500).json({ message: "Erro ao listar fazendas." });
  }
});

// CADASTRAR
app.post("/fazendas", autenticarToken, async (req, res) => {
  try {
    const {
      numeroCarEstadual,
      nome,
      ie,
      cep,
      areaTotalHa,
      areaPlantadaHa,
      mapaFazenda,
      observacoes,
    } = req.body;

    if (!nome || String(nome).trim().length < 2) {
      return res.status(400).json({ message: "Nome da fazenda é obrigatório." });
    }
    if (!apenasLetras(String(nome).trim())) {
      return res.status(400).json({ message: "Nome da fazenda deve conter apenas letras." });
    }

    const imagens = Array.isArray(mapaFazenda) ? mapaFazenda.filter(Boolean) : [];

    const fazenda = await prisma.fazenda.create({
      data: {
        numeroCarEstadual: numeroCarEstadual ? String(numeroCarEstadual) : null,
        nome: String(nome).trim(),
        ie: ie ? String(ie) : null,
        cep: cep ? String(cep) : null,
        areaTotalHa: toNumberOrNull(areaTotalHa),
        areaPlantadaHa: toNumberOrNull(areaPlantadaHa),
        mapaFazenda: imagens,
        observacoes: observacoes ? String(observacoes) : null,
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
});

// EDITAR
app.put("/fazendas/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      numeroCarEstadual,
      nome,
      ie,
      cep,
      areaTotalHa,
      areaPlantadaHa,
      mapaFazenda,
      observacoes,
    } = req.body;

    if (!nome || String(nome).trim().length < 2) {
      return res.status(400).json({ message: "Nome da fazenda é obrigatório." });
    }
    if (!apenasLetras(String(nome).trim())) {
      return res.status(400).json({ message: "Nome da fazenda deve conter apenas letras." });
    }

    const imagens = Array.isArray(mapaFazenda) ? mapaFazenda.filter(Boolean) : [];

    const atualizado = await prisma.fazenda.update({
      where: { id },
      data: {
        numeroCarEstadual: numeroCarEstadual ? String(numeroCarEstadual) : null,
        nome: String(nome).trim(),
        ie: ie ? String(ie) : null,
        cep: cep ? String(cep) : null,
        areaTotalHa: toNumberOrNull(areaTotalHa),
        areaPlantadaHa: toNumberOrNull(areaPlantadaHa),
        mapaFazenda: imagens,
        observacoes: observacoes ? String(observacoes) : null,
      },
    });

    return res.json(atualizado);
  } catch (err) {
    console.error("ERRO EDITAR FAZENDA:", err);
    return res.status(500).json({ message: "Erro ao editar fazenda." });
  }
});

// EXCLUIR
app.delete("/fazendas/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.fazenda.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("ERRO EXCLUIR FAZENDA:", err);
    return res.status(500).json({ message: "Erro ao excluir fazenda." });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
