const axios = require('axios');

async function calcularFrete(cepDestino, items) {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  const baseUrl = process.env.MELHOR_ENVIO_URL || 'https://sandbox.melhorenvio.com.br/api/v2/me';
  const cepOrigem = process.env.CEP_ORIGEM || '01001000';

  if (!token) {
    throw new Error("Token do Melhor Envio não configurado.");
  }

  // Prepara os produtos para o payload do Melhor Envio
  // Melhor Envio pede 'weight', 'width', 'height', 'length', 'insurance_value', 'quantity'
  const products = items.map(item => ({
    id: item.id || 'cafe',
    weight: (item.peso_gramas || 250) / 1000, // converte gramas para kg
    width: 15, // dimensão fictícia padrão
    height: 15,
    length: 15,
    insurance_value: item.preco,
    quantity: item.quantidade
  }));

  const payload = {
    from: { postal_code: cepOrigem },
    to: { postal_code: cepDestino.replace(/\D/g, '') },
    products: products
  };

  try {
    const response = await axios.post(`${baseUrl}/shipment/calculate`, payload, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // Retorna as transportadoras com o preço formatado e dias para entrega
    return response.data;
  } catch (err) {
    console.error("Erro no Melhor Envio:", err.response?.data || err.message);
    throw new Error("Não foi possível calcular o frete com o Melhor Envio.");
  }
}

module.exports = {
  calcularFrete
};
