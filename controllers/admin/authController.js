const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const usuarioService = require("../../services/usuarioService");

/**
 * POST /api/admin/auth/login
 * Body: { email, senha }
 */
async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const user = await usuarioService.findByEmail(email);

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Verifica se é admin
    if (user.tipo !== "admin") {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }

    // Compara hash
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Gera JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, nome: user.nome, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/auth/me
 * Retorna dados do admin autenticado (requer token)
 */
async function me(req, res) {
  res.json({ user: req.admin });
}

module.exports = { login, me };
