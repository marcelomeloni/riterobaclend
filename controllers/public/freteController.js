const freteService = require("../../services/freteService");

async function calcularFrete(req, res, next) {
  try {
    const { cepDestino, items } = req.body;
    
    if (!cepDestino || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "CEP de destino e itens do carrinho são obrigatórios." });
    }

    console.log("=== API FRETE/CALCULAR (FRONTEND REQUEST) ===");
    console.log("CEP Destino:", cepDestino);
    console.log("Items enviados do front:", JSON.stringify(items, null, 2));

    const opcoesDeFrete = await freteService.calcularFrete(cepDestino, items);
    console.log("Opcoes retornadas para o front:", JSON.stringify(opcoesDeFrete.map(o => ({name: o.name, price: o.price, custom_price: o.custom_price})), null, 2));
    res.json(opcoesDeFrete);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  calcularFrete
};
