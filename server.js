require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { errorHandler } = require("./middleware/errorHandler");

// ─── Routes Admin ───
const cafeRoutes = require("./routes/admin/cafeRoutes");
const varianteCafeRoutes = require("./routes/admin/varianteCafeRoutes");
const cupomRoutes = require("./routes/admin/cupomRoutes");
const pedidoRoutes = require("./routes/admin/pedidoRoutes");
const pontoDeVendaRoutes = require("./routes/admin/pontoDeVendaRoutes");
const usuarioRoutes = require("./routes/admin/usuarioRoutes");
const authRoutes = require("./routes/admin/authRoutes");
const dashboardRoutes = require("./routes/admin/dashboardRoutes");

// ─── Routes Public ───
const publicRoutes = require("./routes/public");

const app = express();

// ──────────────────────────────────────
// Segurança & Middleware Global
// ──────────────────────────────────────

// Helmet – HTTP headers de segurança
app.use(helmet());

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",");
app.use(
  cors({
    origin: (origin, cb) => {
      // Permite requests sem origin (Postman, curl, etc) em dev
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS bloqueado para esta origem"));
    },
    credentials: true,
  })
);

// Rate Limiter global – 200 reqs / 15min por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente mais tarde." },
});
app.use(limiter);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logger
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ──────────────────────────────────────
// Rotas
// ──────────────────────────────────────

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth (login) – rota pública
app.use("/api/admin/auth", authRoutes);

// Rotas protegidas (Admin)
app.use("/api/admin/cafes", cafeRoutes);
app.use("/api/admin/variantes", varianteCafeRoutes);
app.use("/api/admin/cupons", cupomRoutes);
app.use("/api/admin/pedidos", pedidoRoutes);
app.use("/api/admin/pontos-de-venda", pontoDeVendaRoutes);
app.use("/api/admin/usuarios", usuarioRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);

// Rotas públicas (E-commerce app)
app.use("/api/public", publicRoutes);

// ──────────────────────────────────────
// Error Handler global
// ──────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────
// Start
// ──────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n☕ Ritero Backend rodando na porta ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
