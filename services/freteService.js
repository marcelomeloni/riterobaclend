const axios = require('axios');

// Dimensões reais das embalagens por peso
function getDimensoes(pesoGramas) {
  if (pesoGramas >= 1000) {
    // Embalagem 1kg: 40 x 13,5 x 8,5 cm — peso bruto ~1,15 kg
    return { width: 14, height: 9, length: 40, weight: 1.15 };
  } else {
    // Embalagem 250g: 20 x 13 x 7 cm — peso bruto ~0,35 kg
    return { width: 13, height: 7, length: 20, weight: 0.35 };
  }
}

async function calcularFrete(cepDestino, items) {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  const baseUrl = process.env.MELHOR_ENVIO_URL || 'https://sandbox.melhorenvio.com.br/api/v2/me';
  const cepOrigem = process.env.CEP_ORIGEM || '13084012';

  if (!token) {
    throw new Error("Token do Melhor Envio não configurado.");
  }

  // Prepara os produtos com as dimensões reais da embalagem
  const products = items.map(item => {
    const pesoGramas = item.peso_gramas || 250;
    const dim = getDimensoes(pesoGramas);
    return {
      id: item.id || 'cafe',
      weight: dim.weight,
      width: dim.width,
      height: dim.height,
      length: dim.length,
      insurance_value: item.preco || 0,
      quantity: item.quantidade
    };
  });

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

    // Filtra apenas SEDEX dos Correios
    const todas = response.data;
    const apenasCorreios = Array.isArray(todas)
      ? todas.filter(o => !o.error && o.name && o.name.toUpperCase().includes('SEDEX'))
      : todas;

    return apenasCorreios;
  } catch (err) {
    console.error("Erro no Melhor Envio:", err.response?.data || err.message);
    throw new Error("Não foi possível calcular o frete com o Melhor Envio.");
  }
}

module.exports = {
  calcularFrete
};
