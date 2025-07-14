const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Função "chamável" que deleta um usuário do Firebase Authentication
 * e também remove suas informações do Realtime Database.
 *
 * @param {object} data - O objeto de dados enviado pelo cliente.
 * @param {string} data.uid - O UID do garçom a ser deletado.
 * @param {functions.https.CallableContext} context - O contexto da chamada.
 */
exports.deletarGarcom = functions.https.onCall(async (data, context) => {
  // Opcional, mas recomendado: Verificar se o usuário que chama a função é um admin.
  // Por enquanto, vamos apenas verificar se ele está autenticado.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "A função só pode ser chamada por um usuário autenticado."
    );
  }

  const uid = data.uid;
  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O UID do garçom é obrigatório e deve ser uma string."
    );
  }

  try {
    // Deleta o usuário do Firebase Authentication
    await admin.auth().deleteUser(uid);

    // Deleta as informações do usuário do Realtime Database
    await admin.database().ref(`garcons_info/${uid}`).remove();

    console.log(`Sucesso ao deletar garçom com UID: ${uid}`);
    return { success: true, message: "Garçom deletado com sucesso!" };
  } catch (error) {
    console.error(`Erro ao deletar garçom com UID: ${uid}`, error);
    // Transforma o erro em um erro que o cliente pode entender
    throw new functions.https.HttpsError(
      "unknown",
      error.message,
      error
    );
  }
});

const db = admin.database();
const ingredientesRef = db.ref('ingredientes');
const produtosRef = db.ref('produtos');
const configRef = db.ref('config'); // Para guardar a data do último reset

// ===========================================================================
// 1. Função: deduzirEstoqueDoPedido
// Acionada quando um novo pedido é adicionado à coleção 'pedidos'.
// ===========================================================================
exports.deduzirEstoqueDoPedido = functions.database.ref('/pedidos/{pedidoId}')
    .onCreate(async (snapshot, context) => {
        const pedidoData = snapshot.val(); // Contém os dados do novo pedido
        const pedidoId = context.params.pedidoId; // ID único do pedido gerado pelo Firebase

        console.log(`[DEDUCAO_ESTOQUE] Processando pedido ${pedidoId} para dedução de estoque...`);

        // Verifica se o pedido tem a estrutura esperada (campo 'cart' com itens)
        if (!pedidoData.cart || pedidoData.cart.length === 0) {
            console.log(`[DEDUCAO_ESTOQUE] Pedido ${pedidoId} não tem itens no carrinho. Ignorando dedução de estoque.`);
            return null; // Encerra a função se não houver itens para processar
        }

        // Itera sobre cada item que foi vendido no pedido
        for (const itemPedido of pedidoData.cart) {
            // Desestrutura os dados do item do carrinho.
            // Estes campos (originalProductId, productCategory, pizzaSize) DEVEM ser adicionados no seu frontend
            // quando o item é colocado no carrinho antes de enviar o pedido para o Firebase.
            const { originalProductId, productCategory, pizzaSize, quantity } = itemPedido;

            // Validação básica dos dados do item
            if (!originalProductId || !productCategory) {
                console.warn(`[DEDUCAO_ESTOQUE] Item do pedido '${itemPedido.name}' (Pedido: ${pedidoId}) não possui ID ou Categoria original. Pulando dedução para este item.`);
                continue; // Pula para o próximo item do pedido se faltarem informações cruciais
            }

            // 2. Buscar a receita do produto correspondente no banco de dados
            const produtoSnap = await produtosRef.child(productCategory).child(originalProductId).once('value');
            const produtoData = produtoSnap.val();

            // Verifica se o produto e sua receita foram encontrados
            if (!produtoData || !produtoData.receita) {
                console.warn(`[DEDUCAO_ESTOQUE] Receita não encontrada para o produto ID: ${originalProductId} na categoria: ${productCategory} (Pedido: ${pedidoId}).`);
                continue;
            }

            // Determina qual parte da receita usar (para pizzas, usa o tamanho específico; para outros, a receita principal)
            let receitaParaDeducao = {};
            if (productCategory === 'pizzas' && pizzaSize) {
                receitaParaDeducao = produtoData.receita[pizzaSize] || {};
            } else {
                receitaParaDeducao = produtoData.receita || {};
            }

            // Verifica se a receita tem ingredientes definidos
            if (Object.keys(receitaParaDeducao).length === 0) {
                console.log(`[DEDUCAO_ESTOQUE] Receita vazia para '${itemPedido.name}' (Pedido: ${pedidoId}). Nenhuma dedução de estoque para este item.`);
                continue;
            }

            // 3. Itera sobre cada ingrediente dentro da receita do item vendido
            for (const ingredienteId in receitaParaDeducao) {
                // Calcula a quantidade TOTAL do ingrediente a ser deduzida:
                // (quantidade do ingrediente na receita) * (quantidade do item no pedido)
                const quantidadeNecessaria = receitaParaDeducao[ingredienteId] * quantity;

                // 4. Atualiza o estoque do ingrediente no Firebase usando uma transação.
                // A transação é vital para garantir que, mesmo com múltiplos pedidos simultâneos,
                // o estoque seja atualizado corretamente e evite condições de corrida.
                const ingredientUpdateResult = await ingredientesRef.child(ingredienteId).transaction(currentData => {
                    // Se o ingrediente não existe ou não tem dados, retorna null para abortar a transação
                    if (currentData === null) {
                        console.warn(`[DEDUCAO_ESTOQUE] Ingrediente ${ingredienteId} não encontrado no banco de dados. Pulando atualização.`);
                        return undefined; // Retorna undefined para abortar a transação e não escrever nada
                    }

                    // Pega os valores atuais (ou 0 se não existirem)
                    const oldQuantidadeAtual = currentData.quantidadeAtual || 0;
                    const oldCustoUnitarioMedio = currentData.custoUnitarioMedio || 0;

                    // Inicializa os campos de consumo se não existirem
                    currentData.quantidadeUsadaDiaria = currentData.quantidadeUsadaDiaria || 0;
                    currentData.custoUsadaDiaria = currentData.custoUsadaDiaria || 0;
                    currentData.quantidadeUsadaMensal = currentData.quantidadeUsadaMensal || 0;
                    currentData.custoUsadoMensal = currentData.custoUsadoMensal || 0;

                    // Dedução do estoque atual
                    currentData.quantidadeAtual = oldQuantidadeAtual - quantidadeNecessaria;
                    if (currentData.quantidadeAtual < 0) {
                        console.warn(`[DEDUCAO_ESTOQUE] ALERTA: Estoque de ${currentData.nome} (ID: ${ingredienteId}) ficou negativo após o Pedido: ${pedidoId}. Estava em ${oldQuantidadeAtual.toFixed(3)}, consumiu ${quantidadeNecessaria.toFixed(3)}.`);
                        // Opcional: Você pode escolher deixar o valor negativo para indicar um débito,
                        // ou forçar para 0 se o estoque não puder ir abaixo de zero.
                        // currentData.quantidadeAtual = 0; // Se preferir não ter estoque negativo
                    }

                    // Atualiza os contadores de consumo diário e mensal
                    currentData.quantidadeUsadaDiaria += quantidadeNecessaria;
                    currentData.custoUsadaDiaria += (quantidadeNecessaria * oldCustoUnitarioMedio);
                    currentData.quantidadeUsadaMensal += quantidadeNecessaria;
                    currentData.custoUsadoMensal += (quantidadeNecessaria * oldCustoUnitarioMedio);
                    
                    // Registra o timestamp da última atualização para referência (útil para resets)
                    currentData.ultimaAtualizacaoConsumo = admin.database.ServerValue.TIMESTAMP;

                    // Retorna os dados atualizados para serem salvos no banco de dados
                    return currentData;
                });

                // Verifica se a transação foi bem-sucedida (committed)
                if (ingredientUpdateResult.committed) {
                    console.log(`[DEDUCAO_ESTOQUE] Estoque de ingrediente ${ingredienteId} atualizado para o Pedido: ${pedidoId}.`);
                } else {
                    console.warn(`[DEDUCAO_ESTOQUE] Transação para ingrediente ${ingredienteId} não foi bem-sucedida para o Pedido: ${pedidoId}. Tentativas falhas ou abortada.`);
                }
            }
        }

        console.log(`[DEDUCAO_ESTOQUE] Dedução de estoque concluída para o Pedido: ${pedidoId}.`);
        return null; // As funções Cloud Functions devem retornar null para indicar que terminaram com sucesso
    });

// ===========================================================================
// 2. Função: resetarConsumoDiarioEMensal
// Acionada via agendamento (Cloud Scheduler) para zerar contadores de consumo.
// Esta função é agendada para rodar uma vez por dia, à meia-noite.
// ===========================================================================
// A string de agendamento '0 0 * * *' significa:
// '0' minutos, '0' horas, '*' todos os dias do mês, '*' todos os meses, '*' todos os dias da semana.
// Ou seja, todos os dias à meia-noite (00:00).
exports.resetarConsumoDiarioEMensal = functions.pubsub.schedule('0 0 * * *')
    .timeZone('America/Sao_Paulo') // Define o fuso horário para garantir que rode à meia-noite correta
    .onRun(async (context) => {
        console.log('[RESET_CONSUMO] Iniciando reset de consumo diário e mensal...');

        const now = new Date();
        // now.setDate(1); // Descomente para testar o reset mensal no dia 1
        now.setHours(0, 0, 0, 0); // Zera a hora para facilitar a comparação apenas da data

        let resetDiarioNecessario = false;
        let resetMensalNecessario = false;

        try {
            // Busca a data do último reset global para saber se precisamos resetar hoje
            const lastResetSnapshot = await configRef.child('ultimaDataResetConsumo').once('value');
            const ultimaDataResetTimestamp = lastResetSnapshot.val();

            if (ultimaDataResetTimestamp) {
                const ultimaDataReset = new Date(ultimaDataResetTimestamp);
                ultimaDataReset.setHours(0, 0, 0, 0);

                // Se a data do último reset for diferente de hoje, precisamos resetar o diário
                if (hoje.getTime() !== ultimaDataReset.getTime()) {
                    resetDiarioNecessario = true;
                }

                // Verifica se o mês atual é diferente do mês do último reset OU se o ano é diferente
                if (hoje.getMonth() !== ultimaDataReset.getMonth() || hoje.getFullYear() !== ultimaDataReset.getFullYear()) {
                    resetMensalNecessario = true;
                }
            } else {
                // Se nunca houve um reset registrado, assume que é o primeiro rodada e reseta tudo
                resetDiarioNecessario = true;
                resetMensalNecessario = true;
            }

            if (!resetDiarioNecessario && !resetMensalNecessario) {
                console.log("[RESET_CONSUMO] Reset de consumo diário/mensal não necessário. A data já foi processada hoje.");
                return null;
            }

            // Pega todos os ingredientes
            const snapshotIngredientes = await ingredientesRef.once('value');
            const updates = {}; // Objeto para agrupar todas as atualizações de ingredientes

            snapshotIngredientes.forEach(childSnap => {
                const ingredienteId = childSnap.key;

                // Prepara a atualização para zerar o consumo diário
                if (resetDiarioNecessario) {
                    updates[`${ingredienteId}/quantidadeUsadaDiaria`] = 0;
                    updates[`${ingredienteId}/custoUsadaDiaria`] = 0;
                }

                // Prepara a atualização para zerar o consumo mensal (apenas se for o primeiro dia do mês ou se o mês mudou)
                if (resetMensalNecessario) {
                    updates[`${ingredienteId}/quantidadeUsadaMensal`] = 0;
                    updates[`${ingredienteId}/custoUsadoMensal`] = 0;
                }
            });

            // Aplica todas as atualizações de uma vez para os ingredientes (operação mais eficiente)
            if (Object.keys(updates).length > 0) {
                await ingredientesRef.update(updates);
                console.log('[RESET_CONSUMO] Consumo de ingredientes resetado com sucesso!');
            } else {
                console.log('[RESET_CONSUMO] Nenhum ingrediente para resetar ou nenhuma alteração necessária.');
            }
            
            await configRef.child('ultimaDataResetConsumo').set(admin.database.ServerValue.TIMESTAMP);
            console.log('[RESET_CONSUMO] Data do último reset de consumo atualizada.');

            return null;
        } catch (error) {
            console.error('[RESET_CONSUMO] Erro ao resetar consumo diário e mensal:', error);
            return null;
        }
    });