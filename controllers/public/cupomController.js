const cupomService = require("../../services/cupomService");

async function validar(req, res, next) {
  try {
    const { codigo } = req.body;
    
    if (!codigo) {
      return res.status(400).json({ error: "Código do cupom é obrigatório." });
    }

    const cupom = await cupomService.validarCupom(codigo);
    res.json({ cupom });
  } catch (err) {
    if (err.message.includes("inválido") || err.message.includes("inativo") || err.message.includes("expirou") || err.message.includes("limite")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = {
  validar
};
