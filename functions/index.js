// SINTAXE V2: Importa apenas os módulos necessários
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onValueCreated } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// Inicializa o Admin SDK (sem mudanças aqui)
admin.initializeApp();

const db = admin.database();

// ===========================================================================
// FUNÇÃO 1: deletarGarcom (Convertida para V2)
// ===========================================================================
// SINTAXE V2: A função agora é chamada com onCall() importado
exports.deletarGarcom = onCall(async (request) => {
  // SINTAXE V2: O 'context' agora faz parte do objeto 'request'. Acessamos com 'request.auth'.
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "A função só pode ser chamada por um usuário autenticado."
    );
  }

  // SINTAXE V2: Os dados enviados pelo cliente agora estão em 'request.data'.
  const uid = request.data.uid;
  if (!uid || typeof uid !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "O UID do garçom é obrigatório e deve ser uma string."
    );
  }

  try {
    await admin.auth().deleteUser(uid);
    await db.ref(`garcons_info/${uid}`).remove();
    console.log(`Sucesso ao deletar garçom com UID: ${uid}`);
    return { success: true, message: "Garçom deletado com sucesso!" };
  } catch (error) {
    console.error(`Erro ao deletar garçom com UID: ${uid}`, error);
    throw new HttpsError("unknown", error.message, error);
  }
});


// ===========================================================================
// FUNÇÃO 2: deduzirEstoqueDoPedido (Convertida para V2)
// ===========================================================================
// SINTAXE V2: Usamos 'onValueCreated' e passamos a instância e o caminho como opções.
exports.deduzirEstoqueDoPedido = onValueCreated(
  {
    ref: "/pedidos/{pedidoId}",
    // A CORREÇÃO ESTÁ NESTA LINHA:
    instance: "cardapioweb-99e7b-default-rtdb", 
  },
  async (event) => {
    const snapshot = event.data;
    const pedidoId = event.params.pedidoId;
    const pedidoData = snapshot.val();

    console.log(`[DEDUCAO_ESTOQUE_V2] Processando pedido ${pedidoId}...`);

    if (!pedidoData.cart || pedidoData.cart.length === 0) {
      console.log(`Pedido ${pedidoId} não tem itens. Ignorando.`);
      return null;
    }

    for (const itemPedido of pedidoData.cart) {
      const { originalProductId, productCategory, pizzaSize, quantity } = itemPedido;

      if (!originalProductId || !productCategory) {
        console.warn(`Item '${itemPedido.name}' (Pedido: ${pedidoId}) sem ID/Categoria. Pulando.`);
        continue;
      }
      
      const produtoSnap = await db.ref(`produtos/${productCategory}/${originalProductId}`).once("value");
      const produtoData = produtoSnap.val();

      if (!produtoData || !produtoData.receita) {
        console.warn(`Receita não encontrada para produto ID: ${originalProductId} (Pedido: ${pedidoId}).`);
        continue;
      }

      let receitaParaDeducao = (productCategory === 'pizzas' && pizzaSize)
        ? produtoData.receita[pizzaSize] || {}
        : produtoData.receita || {};

      for (const ingredienteId in receitaParaDeducao) {
        const quantidadeNecessaria = receitaParaDeducao[ingredienteId] * quantity;
        const ingredienteRef = db.ref(`ingredientes/${ingredienteId}`);
        
        await ingredienteRef.transaction(currentData => {
          if (currentData === null) return undefined;
          
          currentData.quantidadeAtual = (currentData.quantidadeAtual || 0) - quantidadeNecessaria;
          currentData.quantidadeUsadaDiaria = (currentData.quantidadeUsadaDiaria || 0) + quantidadeNecessaria;
          currentData.custoUsadaDiaria = (currentData.custoUsadaDiaria || 0) + (quantidadeNecessaria * (currentData.custoUnitarioMedio || 0));
          currentData.quantidadeUsadaMensal = (currentData.quantidadeUsadaMensal || 0) + quantidadeNecessaria;
          currentData.custoUsadoMensal = (currentData.custoUsadoMensal || 0) + (quantidadeNecessaria * (currentData.custoUnitarioMedio || 0));
          currentData.ultimaAtualizacaoConsumo = admin.database.ServerValue.TIMESTAMP;
          
          return currentData;
        });
      }
    }
    console.log(`Dedução de estoque V2 concluída para o Pedido: ${pedidoId}.`);
    return null;
  }
);


// ===========================================================================
// FUNÇÃO 3: resetarConsumoDiarioEMensal (Convertida para V2)
// ===========================================================================
// SINTAXE V2: Usamos onSchedule e passamos as opções como um objeto.
exports.resetarConsumoDiarioEMensal = onSchedule(
  {
    schedule: "0 0 * * *", // Todos os dias à meia-noite
    timeZone: "America/Sao_Paulo",
  },
  async (event) => {
    console.log("[RESET_CONSUMO_V2] Iniciando reset de consumo...");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const configRef = db.ref('config');
    const ingredientesRef = db.ref('ingredientes');
    const lastResetSnap = await configRef.child('ultimaDataResetConsumo').once('value');
    const lastResetTimestamp = lastResetSnap.val();
    let ultimaDataReset = lastResetTimestamp ? new Date(lastResetTimestamp) : null;
    if(ultimaDataReset) ultimaDataReset.setHours(0, 0, 0, 0);

    // Se o reset já foi feito hoje, não faz nada
    if (ultimaDataReset && hoje.getTime() === ultimaDataReset.getTime()) {
      console.log("[RESET_CONSUMO_V2] Reset não necessário, já executado hoje.");
      return null;
    }

    const resetMensal = !ultimaDataReset || hoje.getMonth() !== ultimaDataReset.getMonth();

    const snapshotIngredientes = await ingredientesRef.once('value');
    const updates = {};

    snapshotIngredientes.forEach(childSnap => {
        const ingredienteId = childSnap.key;
        updates[`${ingredienteId}/quantidadeUsadaDiaria`] = 0;
        updates[`${ingredienteId}/custoUsadaDiaria`] = 0;
        if (resetMensal) {
          updates[`${ingredienteId}/quantidadeUsadaMensal`] = 0;
          updates[`${ingredienteId}/custoUsadoMensal`] = 0;
        }
    });

    if (Object.keys(updates).length > 0) {
        await ingredientesRef.update(updates);
        await configRef.update({ 'ultimaDataResetConsumo': admin.database.ServerValue.TIMESTAMP });
        console.log(`[RESET_CONSUMO_V2] Reset diário concluído. Reset mensal: ${resetMensal}`);
    }

    return null;
  }
);