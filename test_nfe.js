require("dotenv").config();
const { supabase } = require("./config/supabase");
const NfeService = require("./services/nfe/nfeService");

async function runTest() {
  try {
    console.log("=== INICIANDO TESTE DE EMISSAO NFE ===");

    // Find the most recent order to test
    const { data: pedidos, error } = await supabase
      .from("pedido")
      .select("id")
      .order("data_criacao", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Erro ao buscar pedido:", error);
      return;
    }

    if (!pedidos || pedidos.length === 0) {
      console.log("Nenhum pedido encontrado no banco de dados para testar.");
      return;
    }

    const testOrderId = pedidos[0].id;
    console.log(`Pedido selecionado para teste: ${testOrderId}`);

    // Call the NfeService
    const resultado = await NfeService.emitInvoice(testOrderId);
    console.log("=== SUCESSO ===");
    console.log(resultado);
  } catch (err) {
    console.error("=== ERRO NO TESTE ===");
    console.error(err.message);
    if (err.response) {
      console.error(err.response.data);
    }
  }
}

runTest();
