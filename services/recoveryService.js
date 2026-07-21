const { supabase } = require("../config/supabase");
const emailService = require("./emailService");

class RecoveryService {
  /**
   * Busca pedidos não pagos (AGUARDANDO_PAGAMENTO) que ainda não receberam
   * e-mail de recuperação e os envia.
   * @param {number} minutesThreshold - Quantos minutos aguardar antes de considerar abandonado (default: 5 min para testes)
   */
  static async processAbandonedOrders(minutesThreshold = 5) {
    try {
      console.log(`[RecoveryService] Iniciando varredura de pedidos abandonados (> ${minutesThreshold} min)...`);
      
      const thresholdTime = new Date(Date.now() - minutesThreshold * 60 * 1000).toISOString();

      // Busca pedidos AGUARDANDO_PAGAMENTO que ainda não receberam email de recuperacao
      // e que foram criados ANTES do limite de tempo (threshold)
      const { data: pedidos, error } = await supabase
        .from("pedido")
        .select(`
          id,
          status,
          data_criacao,
          cliente:id_cliente (
            id_pessoa,
            cpf,
            pessoa ( nome, email )
          )
        `)
        .eq("status", "AGUARDANDO_PAGAMENTO")
        .eq("email_recuperacao_enviado", false)
        .lt("data_criacao", thresholdTime);

      if (error) {
        throw new Error(`Erro ao buscar pedidos abandonados: ${error.message}`);
      }

      if (!pedidos || pedidos.length === 0) {
        console.log("[RecoveryService] Nenhum pedido abandonado encontrado no momento.");
        return { processed: 0, success: true };
      }

      console.log(`[RecoveryService] Encontrados ${pedidos.length} pedidos abandonados. Processando e-mails...`);

      let processedCount = 0;

      for (const pedido of pedidos) {
        if (!pedido.cliente || !pedido.cliente.pessoa || !pedido.cliente.pessoa.email) {
          console.warn(`[RecoveryService] Pedido ${pedido.id} não possui e-mail de cliente associado. Pulando.`);
          continue;
        }

        const clienteData = pedido.cliente.pessoa;
        
        try {
          // 1. Enviar e-mail de recuperação
          await emailService.sendRecoveryEmail(pedido, clienteData);
          
          // 2. Marcar como enviado no banco de dados para evitar reenvio
          const { error: updateError } = await supabase
            .from("pedido")
            .update({ email_recuperacao_enviado: true })
            .eq("id", pedido.id);

          if (updateError) {
            console.error(`[RecoveryService] Erro ao atualizar status de recuperação do pedido ${pedido.id}:`, updateError.message);
          } else {
            console.log(`[RecoveryService] E-mail de recuperação enviado com sucesso para ${clienteData.email} (Pedido ${pedido.id}).`);
            processedCount++;
          }
        } catch (err) {
          console.error(`[RecoveryService] Erro ao processar pedido ${pedido.id}:`, err);
        }
      }

      console.log(`[RecoveryService] Varredura concluída. Foram enviados ${processedCount} e-mails de recuperação.`);
      return { processed: processedCount, success: true };

    } catch (err) {
      console.error("[RecoveryService] Exceção durante processamento:", err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = RecoveryService;
