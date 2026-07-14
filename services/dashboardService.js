const { supabase } = require("../config/supabase");

function getDateRange(period) {
  const now = new Date();
  let startDate = null;

  switch (period) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "ano":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "tudo":
    default:
      startDate = null; // sem filtro
      break;
  }
  return startDate;
}

const VALID_STATUSES = ["PREPARANDO", "ENTREGUE", "ENVIADO"];

async function getDashboardStats(period = "tudo") {
  const startDate = getDateRange(period);

  // Construindo Queries de Pedidos
  let queryPedidos = supabase
    .from("pedido")
    .select(`
      id,
      valor_total,
      status,
      data_criacao,
      item_pedido (
        quantidade,
        preco_unitario,
        variante_cafe (
          cafe ( id, nome )
        )
      )
    `);

  if (startDate) {
    queryPedidos = queryPedidos.gte("data_criacao", startDate.toISOString());
  }

  const { data: pedidos, error: errPedidos } = await queryPedidos;
  if (errPedidos) throw errPedidos;

  // KPIs — só conta pedidos com status válido (preparando, entregue, enviado)
  const vendasMes = pedidos
    .filter(p => VALID_STATUSES.includes(p.status))
    .reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);

  const totalPedidos = pedidos.length;

  // Clientes (total geral — tabela cliente não tem data_criacao)
  const { count: totalClientes, error: errClientes } = await supabase
    .from("cliente")
    .select("*", { count: "exact", head: true });
  
  // Cafes Ativos (geral, não afetado pela data para saber o catálogo atual)
  const { count: totalCafes, error: errCafes } = await supabase.from("cafe").select("*", { count: "exact", head: true });

  // 1. Receita ao Longo do Tempo (Gráfico de Linha)
  // Agrupar por data (YYYY-MM-DD se <= 30 dias, YYYY-MM se > 30)
  const isDaily = period === "7d" || period === "30d";
  
  const receitaMap = {};
  pedidos.forEach(p => {
    if (!VALID_STATUSES.includes(p.status)) return;
    const date = new Date(p.data_criacao);
    let key;
    if (isDaily) {
      key = date.toISOString().split("T")[0]; // YYYY-MM-DD
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
    }
    
    if (!receitaMap[key]) receitaMap[key] = 0;
    receitaMap[key] += Number(p.valor_total);
  });

  const receitaTempo = Object.keys(receitaMap).sort().map(dateKey => ({
    data: dateKey,
    receita: receitaMap[dateKey]
  }));

  // 2. Pedidos por Status (Gráfico de Rosca)
  const statusMap = {};
  pedidos.forEach(p => {
    statusMap[p.status] = (statusMap[p.status] || 0) + 1;
  });
  const pedidosPorStatus = Object.keys(statusMap).map(status => ({
    name: status,
    value: statusMap[status]
  }));

  // 3. Top Cafés (Gráfico de Barras) - Todo o histórico, sem filtro de data
  const { data: allPedidos, error: errAll } = await supabase
    .from("pedido")
    .select(`
      status,
      item_pedido (
        quantidade,
        variante_cafe (
          cafe ( nome )
        )
      )
    `);
    
  const cafeMap = {};
  if (allPedidos) {
    allPedidos.forEach(p => {
      if (!VALID_STATUSES.includes(p.status)) return;
      if (p.item_pedido) {
        p.item_pedido.forEach(item => {
          const cafeName = item.variante_cafe?.cafe?.nome;
          if (cafeName) {
            if (!cafeMap[cafeName]) cafeMap[cafeName] = 0;
            cafeMap[cafeName] += item.quantidade;
          }
        });
      }
    });
  }
  
  const topCafes = Object.keys(cafeMap)
    .map(name => ({ name, quantidade: cafeMap[name] }))
    .sort((a, b) => b.quantidade - a.quantidade);

  // 4. Últimos Pedidos (Tabela)
  const { data: ultimosPedidos, error: errUltimos } = await supabase
    .from("pedido")
    .select(`
      id,
      valor_total,
      status,
      data_criacao,
      cliente:id_cliente (
        pessoa ( nome )
      )
    `)
    .order("data_criacao", { ascending: false })
    .limit(5);

  return {
    vendasMes,
    totalPedidos,
    totalClientes: totalClientes || 0,
    totalCafes: totalCafes || 0,
    ultimosPedidos: ultimosPedidos || [],
    receitaTempo,
    pedidosPorStatus,
    topCafes
  };
}

module.exports = { getDashboardStats };
