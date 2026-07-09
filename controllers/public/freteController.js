const freteService = require("../../services/freteService");

async function calcularFrete(req, res, next) {
  try {
    const { cepDestino, items } = req.body;
    
    if (!cepDestino || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "CEP de destino e itens do carrinho são obrigatórios." });
    }

    const opcoesDeFrete = await freteService.calcularFrete(cepDestino, items);
    res.json(opcoesDeFrete);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  calcularFrete
};
