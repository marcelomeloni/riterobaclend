const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

// Como não há domínio verificado, o "from" tem que ser onboarding@resend.dev
// E o "to" será o e-mail do próprio cliente, porém para testes sem domínio,
// a API do resend só entregará caso o e-mail do cliente seja o mesmo que cadastrou a conta no Resend.
// UPDATE: Utilizando contato@ritero.com.br conforme solicitado
const FROM_EMAIL = "Ritero Cafés <contato@ritero.com.br>";

async function sendOrderConfirmation(pedido, cliente) {
  try {
    const HEADER_IMAGE = "https://ccyqvsfnygvrmpffldvo.supabase.co/storage/v1/object/sign/cafes/headeremail.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yMTczOWU0Mi1iYjEzLTQ0YjUtYmFmMy1jZjllOGM0YjFjYjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYWZlcy9oZWFkZXJlbWFpbC5wbmciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzgzMjc2NTAxLCJleHAiOjE4MTQ4MTI1MDF9.8L8QuuXssJWXL5Eamt94jZzqXqgsSsECF7n8ia5RuNA";
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
    
    // Gerar o HTML dos itens
    let itensHtml = "";
    if (pedido.item_pedido && pedido.item_pedido.length > 0) {
      itensHtml = pedido.item_pedido.map(item => {
        const cafe = item.variante_cafe?.cafe || {};
        const thumbnail = cafe.imagem_url || "https://ccyqvsfnygvrmpffldvo.supabase.co/storage/v1/object/public/cafes/rapadura.png";
        // Simulando a variação baseada no peso do pedido
        const variacaoStr = item.preco_unitario > 100 ? "1kg" : "250g";
        
        return `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #EBE9E4; text-align: left;">
              <img src="${thumbnail}" alt="${cafe.nome || 'Café'}" width="64" style="border-radius: 8px; display: inline-block; vertical-align: middle; background-color: #F3F4F6;" />
              <div style="display: inline-block; vertical-align: middle; margin-left: 16px;">
                <p style="margin: 0; font-weight: 500; color: #111;">${cafe.nome || 'Café Especial'}</p>
                <p style="margin: 4px 0 0; font-size: 14px; color: #888888;">Torra Média - Pacote de ${variacaoStr}</p>
              </div>
            </td>
            <td style="padding: 16px 0; border-bottom: 1px solid #EBE9E4; text-align: center; color: #666;">
              ${item.quantidade}x
            </td>
            <td style="padding: 16px 0; border-bottom: 1px solid #EBE9E4; text-align: right; font-weight: 600; color: #111;">
              R$ ${item.preco_unitario.toFixed(2).replace('.', ',')}
            </td>
          </tr>
        `;
      }).join("");
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: cliente.email,
      subject: `Seu café especial está garantido! ☕ (Pedido #${pedido.id.substring(0, 8)})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600&family=Fraunces:opsz,wght@9..144,400;600&display=swap');
            body { font-family: 'Work Sans', Helvetica, Arial, sans-serif; background-color: #F7F5F0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; }
            .header-image { width: 100%; height: auto; display: block; }
            .content { padding: 40px; }
            h1 { font-family: 'Fraunces', serif; color: #111111; font-size: 28px; margin-top: 0; }
            p { color: #4A4A4A; font-size: 16px; line-height: 1.6; margin-top: 0; }
            
            .order-card { background-color: #FDFBF7; border: 1px solid #EBE9E4; border-radius: 12px; padding: 24px; margin: 32px 0; }
            table { width: 100%; border-collapse: collapse; }
            
            .totals { margin-top: 16px; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 15px; color: #666; }
            .totals-row.bold { font-weight: 600; color: #111; font-size: 18px; margin-top: 16px; border-top: 1px solid #EBE9E4; padding-top: 16px; }
            
            .cta-container { text-align: center; margin: 40px 0; }
            .cta-button { background-color: #D35400; color: #FFFFFF !important; padding: 16px 32px; border-radius: 50px; text-decoration: none !important; font-weight: 600; font-size: 16px; display: inline-block; }
            
            .wow-factor { background-color: #FFF9F2; border-left: 3px solid #D35400; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 40px; }
            .wow-title { font-family: 'Fraunces', serif; font-weight: 600; color: #D35400; margin-bottom: 8px; font-size: 18px; }
            .wow-text { font-size: 15px; color: #666; margin: 0; line-height: 1.6; }
            
            .footer { background-color: #111111; padding: 40px; text-align: center; color: #d1d5db; font-size: 14px; }
            .footer p { margin-bottom: 8px; color: #d1d5db; font-size: 14px; }
            .footer a { color: #FFFFFF; text-decoration: underline; }
          </style>
        </head>
        <body>
          <!-- Pré-header invisível -->
          <div style="display: none; max-height: 0px; overflow: hidden;">
            Já recebemos seu pedido e nossos mestres de torra estão em ação.
          </div>

          <div class="container">
            <!-- Header -->
            <img src="${HEADER_IMAGE}" alt="Ritero Cafés Especiais" class="header-image" />
            
            <!-- Abertura Afetiva -->
            <div class="content">
              <h1>Prepare sua melhor xícara, ${cliente.nome.split(' ')[0]}!</h1>
              <p>Recebemos o seu pedido com sucesso. Nossa equipe já está separando os grãos para garantir que seu café chegue fresquinho e cheio de sabor.</p>
              
              <!-- Resumo do Pedido -->
              <div class="order-card">
                <h3 style="margin-top: 0; margin-bottom: 24px; font-family: 'Fraunces', serif; color: #111; font-size: 20px;">Resumo da Compra (#${pedido.id.substring(0, 8)})</h3>
                <table>
                  <tbody>
                    ${itensHtml}
                  </tbody>
                </table>
                
                <div class="totals">
                  <table style="width: 100%;">
                    <tr>
                      <td style="padding-top: 16px; color: #666;">Subtotal</td>
                      <td style="padding-top: 16px; color: #111; text-align: right;">R$ ${pedido.valor_pedidos.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    ${pedido.valor_desconto > 0 ? `
                    <tr>
                      <td style="padding-top: 8px; color: #2E7D32;">Desconto</td>
                      <td style="padding-top: 8px; color: #2E7D32; text-align: right;">- R$ ${pedido.valor_desconto.toFixed(2).replace('.', ',')}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding-top: 8px; color: #666;">Frete</td>
                      <td style="padding-top: 8px; color: #111; text-align: right;">R$ ${pedido.valor_frete.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr>
                      <td style="padding-top: 16px; border-top: 1px solid #EBE9E4; color: #111; font-weight: 600; font-size: 18px;">Total</td>
                      <td style="padding-top: 16px; border-top: 1px solid #EBE9E4; color: #111; font-weight: 600; font-size: 18px; text-align: right;">R$ ${pedido.valor_total.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  </table>
                </div>
              </div>
              
              <!-- Call to Action -->
              <div class="cta-container">
                <a href="${FRONTEND_URL}/minha-conta" class="cta-button">Acompanhar Entrega</a>
                <p style="margin-top: 16px; font-size: 14px; color: #888;">Em breve enviaremos o código de rastreio.</p>
              </div>

              <!-- Fator Uau (Wow Factor) -->
              <div class="wow-factor">
                <div class="wow-title">✨ Dica do Barista</div>
                <p class="wow-text">Sabia que os grãos perdem sabor se guardados na geladeira? Mantenha o seu Ritero na embalagem original, bem fechada, num armário fresco e escuro. Se for moer em casa, moa apenas a quantidade exata antes do preparo!</p>
              </div>
              
            </div>

            <!-- Footer -->
            <div class="footer">
              <p>Ficou com alguma dúvida? Fale com a gente em <a href="mailto:suporte@ritero.com.br">suporte@ritero.com.br</a></p>
              <p style="margin-top: 24px; color: #666;">Ritero Cafés Especiais LTDA - CNPJ: 12.345.678/0001-90<br/>São Paulo, SP - Brasil</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) console.error("Erro ao enviar email de confirmação:", error);
    return data;
  } catch (error) {
    console.error("Exceção ao enviar email de confirmação:", error);
  }
}

async function sendOrderShipped(pedido, cliente) {
  try {
    const HEADER_IMAGE = "https://ccyqvsfnygvrmpffldvo.supabase.co/storage/v1/object/sign/cafes/headeremail.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yMTczOWU0Mi1iYjEzLTQ0YjUtYmFmMy1jZjllOGM0YjFjYjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYWZlcy9oZWFkZXJlbWFpbC5wbmciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzgzMjc2NTAxLCJleHAiOjE4MTQ4MTI1MDF9.8L8QuuXssJWXL5Eamt94jZzqXqgsSsECF7n8ia5RuNA";
    
    // Pega o código real salvo no pedido ou gera um mock
    const trackingCode = pedido.codigo_rastreio || ("BR" + pedido.id.substring(0, 8).toUpperCase() + "RIT");
    
    // Link direto para um serviço de rastreio de Correios (LinkTrack)
    const trackingUrl = `https://linketrack.com/track?codigo=${trackingCode}`;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: cliente.email,
      subject: `O aroma está a caminho! Seu café saiu para entrega 🚚☕ (Pedido #${pedido.id.substring(0, 8)})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600&family=Fraunces:opsz,wght@9..144,400;600&display=swap');
            body { font-family: 'Work Sans', Helvetica, Arial, sans-serif; background-color: #F7F5F0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; }
            .header-image { width: 100%; height: auto; display: block; }
            .content { padding: 40px; }
            h1 { font-family: 'Fraunces', serif; color: #111111; font-size: 28px; margin-top: 0; line-height: 1.2; }
            p { color: #4A4A4A; font-size: 16px; line-height: 1.6; margin-top: 0; }
            
            .cta-container { text-align: center; margin: 40px 0; background-color: #FDFBF7; padding: 32px; border-radius: 12px; border: 1px solid #EBE9E4; }
            .cta-button { background-color: #D35400; color: #FFFFFF !important; padding: 16px 32px; border-radius: 50px; text-decoration: none !important; font-weight: 600; font-size: 16px; display: inline-block; }
            
            .tracking-info { margin-top: 24px; }
            .tracking-code { font-family: 'Courier New', Courier, monospace; font-size: 18px; font-weight: bold; color: #111; background-color: #EBE9E4; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-top: 8px; letter-spacing: 2px; }
            
            .wow-factor { background-color: #FFF9F2; border-left: 3px solid #D35400; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 40px; }
            .wow-title { font-family: 'Fraunces', serif; font-weight: 600; color: #D35400; margin-bottom: 8px; font-size: 18px; }
            .wow-text { font-size: 15px; color: #666; margin: 0; line-height: 1.6; }
            
            .footer { background-color: #111111; padding: 40px; text-align: center; color: #d1d5db; font-size: 14px; }
            .footer p { margin-bottom: 8px; color: #d1d5db; font-size: 14px; }
            .footer a { color: #FFFFFF; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div style="display: none; max-height: 0px; overflow: hidden;">Os grãos que você escolheu acabaram de sair da nossa torrefação.</div>
          <div class="container">
            <img src="${HEADER_IMAGE}" alt="Ritero Cafés Especiais" class="header-image" />
            
            <div class="content">
              <h1>A viagem começou, ${cliente.nome.split(' ')[0]}! 🚚</h1>
              <p>O seu pedido já saiu aqui de Espírito Santo do Pinhal e começou a viagem até a sua casa.</p>
              <p>Nossos grãos foram embalados com todo o cuidado para garantir o frescor máximo quando você abrir o pacote.</p>
              
              <div class="cta-container">
                <a href="${trackingUrl}" target="_blank" class="cta-button">Acompanhar Entrega (Correios)</a>
                <div class="tracking-info">
                  <p style="margin: 0; font-size: 14px; color: #666;">Seu código de rastreio:</p>
                  <div class="tracking-code">${trackingCode}</div>
                  <p style="margin-top: 16px; font-size: 14px; color: #888;">Prazo estimado: 3 a 5 dias úteis</p>
                </div>
              </div>

              <div class="wow-factor">
                <div class="wow-title">🎶 Prepare o Terreno</div>
                <p class="wow-text">Aproveite a espera para deixar seus equipamentos limpos e brilhando. Que tal curtir a nossa playlist <a href="#" style="color: #D35400; text-decoration: underline; font-weight: 600;">Ritero: Para ouvir tomando café</a> enquanto organiza o seu cantinho do café?</p>
              </div>
            </div>

            <div class="footer">
              <p>Ficou com alguma dúvida? Fale com a gente em <a href="mailto:suporte@ritero.com.br">suporte@ritero.com.br</a></p>
              <p style="margin-top: 24px; color: #666;">Ritero Cafés Especiais LTDA - CNPJ: 12.345.678/0001-90<br/>São Paulo, SP - Brasil</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) console.error("Erro ao enviar email de envio:", error);
    return data;
  } catch (error) {
    console.error("Exceção ao enviar email de envio:", error);
  }
}

async function sendOrderDelivered(pedido, cliente) {
  try {
    const HEADER_IMAGE = "https://ccyqvsfnygvrmpffldvo.supabase.co/storage/v1/object/sign/cafes/headeremail.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yMTczOWU0Mi1iYjEzLTQ0YjUtYmFmMy1jZjllOGM0YjFjYjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYWZlcy9oZWFkZXJlbWFpbC5wbmciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzgzMjc2NTAxLCJleHAiOjE4MTQ4MTI1MDF9.8L8QuuXssJWXL5Eamt94jZzqXqgsSsECF7n8ia5RuNA";
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: cliente.email,
      subject: `Chegou! 📦 Seu café Ritero acabou de ser entregue (Pedido #${pedido.id.substring(0, 8)})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600&family=Fraunces:opsz,wght@9..144,400;600&display=swap');
            body { font-family: 'Work Sans', Helvetica, Arial, sans-serif; background-color: #F7F5F0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; }
            .header-image { width: 100%; height: auto; display: block; }
            .content { padding: 40px; }
            h1 { font-family: 'Fraunces', serif; color: #111111; font-size: 28px; margin-top: 0; line-height: 1.2; }
            p { color: #4A4A4A; font-size: 16px; line-height: 1.6; margin-top: 0; }
            
            .review-box { text-align: center; margin: 40px 0; background-color: #FDFBF7; padding: 40px 32px; border-radius: 12px; border: 1px solid #EBE9E4; }
            .stars { font-size: 28px; color: #D4AF37; margin-bottom: 16px; letter-spacing: 4px; }
            .cta-button { background-color: #D35400; color: #FFFFFF !important; padding: 16px 32px; border-radius: 50px; text-decoration: none !important; font-weight: 600; font-size: 16px; display: inline-block; margin-top: 8px; }
            
            .support-box { background-color: #FFF9F2; border-left: 3px solid #D35400; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 40px; }
            .support-title { font-family: 'Fraunces', serif; font-weight: 600; color: #D35400; margin-bottom: 8px; font-size: 16px; }
            .support-text { font-size: 14px; color: #666; margin: 0; line-height: 1.5; }
            
            .footer { background-color: #111111; padding: 40px; text-align: center; color: #d1d5db; font-size: 14px; }
            .footer p { margin-bottom: 8px; color: #d1d5db; font-size: 14px; }
            .footer a { color: #FFFFFF; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div style="display: none; max-height: 0px; overflow: hidden;">Prepare a água quente e conte para nós o que achou da experiência.</div>
          <div class="container">
            <img src="${HEADER_IMAGE}" alt="Ritero Cafés Especiais" class="header-image" />
            <div class="content">
              <h1>A espera acabou, ${cliente.nome.split(' ')[0]}! 📦</h1>
              <p>O seu pacote acabou de ser entregue no seu endereço. Esperamos que a experiência desde a abertura da caixa até o último gole seja incrível.</p>
              
              <div class="review-box">
                <div class="stars">★★★★★</div>
                <h3 style="font-family: 'Fraunces', serif; margin: 0 0 8px; color: #111; font-size: 20px;">O que você achou?</h3>
                <p style="margin-bottom: 24px; font-size: 15px; color: #666;">Sua opinião ajuda outros apaixonados por café a fazerem a escolha certa. Leva só um minutinho.</p>
                <a href="${FRONTEND_URL}/minha-conta" class="cta-button">Avaliar meus cafés</a>
              </div>

              <div class="support-box">
                <div class="support-title">Rede de Segurança Ritero</div>
                <p class="support-text">Teve algum problema com a caixa ou com os grãos durante o transporte? Não se preocupe. <strong>Responda este e-mail</strong> agora mesmo que a nossa equipe resolve na hora para você.</p>
              </div>
            </div>
            <div class="footer">
              <p>Ficou com alguma dúvida? Fale com a gente em <a href="mailto:suporte@ritero.com.br">suporte@ritero.com.br</a></p>
              <p style="margin-top: 24px; color: #666;">Ritero Cafés Especiais LTDA - CNPJ: 12.345.678/0001-90<br/>São Paulo, SP - Brasil</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) console.error("Erro ao enviar email de entrega:", error);
    return data;
  } catch (error) {
    console.error("Exceção ao enviar email de entrega:", error);
  }
}
async function sendRecoveryEmail(pedido, cliente) {
  try {
    const HEADER_IMAGE = "https://ccyqvsfnygvrmpffldvo.supabase.co/storage/v1/object/sign/cafes/headeremail.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yMTczOWU0Mi1iYjEzLTQ0YjUtYmFmMy1jZjllOGM0YjFjYjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYWZlcy9oZWFkZXJlbWFpbC5wbmciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzgzMjc2NTAxLCJleHAiOjE4MTQ4MTI1MDF9.8L8QuuXssJWXL5Eamt94jZzqXqgsSsECF7n8ia5RuNA";
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
    const itensHtml = pedido.itens && pedido.itens.length > 0 
      ? `<div style="margin: 30px 0; padding: 20px; background-color: #FFF9F2; border-radius: 8px; border: 1px solid #EED4C2;">
          <p style="font-weight: 600; margin-top: 0; margin-bottom: 12px; font-family: 'Fraunces', serif; font-size: 18px; color: #111;">Itens do seu pedido:</p>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${pedido.itens.map(item => `
              <li style="padding: 12px 0; border-bottom: 1px dashed #EED4C2; color: #444;">
                <div style="font-weight: 600; color: #111;">${item.quantidade}x ${item.cafe?.nome || 'Café Especial Ritero'}</div>
                <div style="font-size: 14px; margin-top: 4px;">${item.peso_gramas}g • ${item.moagem}</div>
              </li>
            `).join('')}
          </ul>
        </div>` 
      : '';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: cliente.email,
      subject: \`Esqueceu seu café na bancada? ☕\`,
      html: \`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600&family=Fraunces:opsz,wght@9..144,400;600&display=swap');
            body { font-family: 'Work Sans', Helvetica, Arial, sans-serif; background-color: #F7F5F0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; }
            .header-image { width: 100%; height: auto; display: block; }
            .content { padding: 40px; }
            h1 { font-family: 'Fraunces', serif; color: #111111; font-size: 28px; margin-top: 0; }
            p { color: #4A4A4A; font-size: 16px; line-height: 1.6; margin-top: 0; }
            
            .cta-container { text-align: center; margin: 40px 0; }
            .cta-button { background-color: #D35400; color: #FFFFFF !important; padding: 16px 32px; border-radius: 50px; text-decoration: none !important; font-weight: 600; font-size: 16px; display: inline-block; }
            
            .wow-factor { background-color: #FFF9F2; border-left: 3px solid #D35400; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 40px; }
            .wow-title { font-family: 'Fraunces', serif; font-weight: 600; color: #D35400; margin-bottom: 8px; font-size: 18px; }
            .wow-text { font-size: 15px; color: #666; margin: 0; line-height: 1.6; }
            
            .footer { background-color: #111111; padding: 40px; text-align: center; color: #d1d5db; font-size: 14px; }
            .footer p { margin-bottom: 8px; color: #d1d5db; font-size: 14px; }
            .footer a { color: #FFFFFF; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${HEADER_IMAGE}" alt="Ritero Cafés Especiais" class="header-image" />
            
            <div class="content">
              <h1>Oi ${cliente.nome.split(' ')[0]}!</h1>
              <p>Vimos que você iniciou um pedido, mas o pagamento não foi concluído.</p>
              <p>Como os códigos de pagamento (como o PIX) costumam expirar por segurança, nós cancelamos aquele pedido para você.</p>
              
              ${itensHtml}

              <p>Mas não se preocupe! Seu café especial continua esperando por você. Volte ao site e refaça seu pedido para não perder essa safra.</p>
              
              <div class="cta-container">
                <a href="${FRONTEND_URL}/cafes" class="cta-button">Refazer meu pedido</a>
              </div>

              <div class="wow-factor">
                <div class="wow-title">🎁 Um empurrãozinho</div>
                <p class="wow-text">Que tal usar o cupom <strong>VOLTA5</strong> para garantir 5% de desconto no seu novo pedido? Aproveite!</p>
              </div>
              
            </div>

            <div class="footer">
              <p>Ficou com alguma dúvida? Fale com a gente em <a href="mailto:suporte@ritero.com.br">suporte@ritero.com.br</a></p>
              <p style="margin-top: 24px; color: #666;">Ritero Cafés Especiais LTDA - CNPJ: 12.345.678/0001-90<br/>São Paulo, SP - Brasil</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) console.error("Erro ao enviar email de recuperação:", error);
    return data;
  } catch (error) {
    console.error("Exceção ao enviar email de recuperação:", error);
  }
}

module.exports = {
  sendOrderConfirmation,
  sendOrderShipped,
  sendOrderDelivered,
  sendRecoveryEmail,
};
