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
    console.log("[Admin Login] Attempting login for email:", email);

    if (!email || !senha) {
      console.log("[Admin Login] Missing email or password");
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const user = await usuarioService.findByEmail(email);
    console.log("[Admin Login] user found in DB:", user ? "YES" : "NO", user?.email);

    if (!user) {
      console.log("[Admin Login] User not found returning 401");
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Verifica se é admin
    if (user.tipo !== "admin") {
      console.log("[Admin Login] Access denied, user.tipo is:", user.tipo);
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }

    // Compara hash
    const senhaValida = await bcrypt.compare(senha, user.senha);
    console.log("[Admin Login] Password match:", senhaValida);

    if (!senhaValida) {
      console.log("[Admin Login] Password mismatch returning 401");
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Gera JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, nome: user.nome, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    console.log("[Admin Login] Success! Token generated.");
    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo },
    });
  } catch (err) {
    console.error("[Admin Login] Error during login:", err);
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
