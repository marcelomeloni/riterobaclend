const jwt = require("jsonwebtoken");
const clienteService = require("../../services/clienteService");

/**
 * POST /api/public/auth/register
 * Body: { nome, email, senha, cpf, telefone }
 */
async function register(req, res, next) {
  try {
    const { nome, email, senha, cpf, telefone } = req.body;

    if (!nome || !email || !senha || !cpf || !telefone) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const cliente = await clienteService.register({ nome, email, senha, cpf, telefone });

    // Gera JWT
    const token = jwt.sign(
      { id: cliente.id, email: cliente.email, nome: cliente.nome, tipo: cliente.tipo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(201).json({ token, user: cliente });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/auth/login
 * Body: { email, senha }
 */
async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const cliente = await clienteService.login(email, senha);

    // Gera JWT
    const token = jwt.sign(
      { id: cliente.id, email: cliente.email, nome: cliente.nome, tipo: cliente.tipo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({ token, user: cliente });
  } catch (err) {
    if (err.message === "Credenciais inválidas." || err.message === "Acesso restrito a clientes.") {
        return res.status(401).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * GET /api/public/auth/me
 * Retorna dados do cliente autenticado
 */
async function me(req, res, next) {
  try {
    const cliente = await clienteService.getMe(req.user.id);
    res.json({ user: cliente });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
