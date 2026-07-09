/**
 * Error handler global do Express.
 * Captura erros não tratados e devolve um JSON padronizado.
 */
const errorHandler = (err, _req, res, _next) => {
  console.error("🔴 Erro:", err.message);

  // Erros de CORS
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ error: err.message });
  }

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Erro interno do servidor."
      : err.message || "Erro interno do servidor.";

  res.status(statusCode).json({ error: message });
};

module.exports = { errorHandler };
