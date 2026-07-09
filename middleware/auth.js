const jwt = require("jsonwebtoken");


/**
 * Middleware que verifica a validade do token (qualquer tipo de usuário).
 */
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de autenticação não fornecido." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Injeta os dados do usuário no request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      nome: decoded.nome,
      tipo: decoded.tipo,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado. Faça login novamente." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido." });
    }
    return res.status(500).json({ error: "Erro interno de autenticação." });
  }
};

/**
 * Middleware que verifica se o usuário é um admin autenticado.
 */
const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.tipo !== "admin") {
      return res.status(403).json({ error: "Acesso restrito a administradores." });
    }
    // Mantém compatibilidade
    req.admin = req.user;
    next();
  });
};

/**
 * Middleware que verifica se o usuário é um cliente autenticado.
 */
const requireClient = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.tipo !== "cliente") {
      return res.status(403).json({ error: "Acesso restrito a clientes." });
    }
    next();
  });
};

module.exports = { requireAuth, requireAdmin, requireClient };
