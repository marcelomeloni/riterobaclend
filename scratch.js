const NfeCryptoService = require('./services/nfe/nfeCryptoService');
const NfeXmlService = require('./services/nfe/nfeXmlService');
const fs = require('fs');
const config = NfeService = require('./services/nfe/nfeService').getSefazConfig();

const { privateKeyPem, x509 } = NfeCryptoService.loadCertificate(config.pfxPath, config.pfxPassword);

// Create a dummy order for testing
const order = {
  numero_nfe: 12345,
  cliente: { pessoa: { nome: "Teste" }, cpf: "12345678909" },
  endereco: { logradouro: "Rua", numero: "1", bairro: "Centro", uf: "SP", cep: "01000000" },
  item_pedido: [
    { quantidade: 1, preco: 10, variante_cafe: { id: "1" } }
  ]
};

const { xml, chave } = NfeXmlService.buildNfeXml(order, config);
console.log("=== UNSIGNED XML ===");
console.log(xml);

const signedXml = NfeCryptoService.signXml(xml, privateKeyPem, x509);
console.log("\n=== SIGNED XML ===");
console.log(signedXml);

const containsNewlines = /[\r\n]/.test(signedXml);
console.log("\nCONTAINS NEWLINES?", containsNewlines);

fs.writeFileSync('signed_test.xml', signedXml);
