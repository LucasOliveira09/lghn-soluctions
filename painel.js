// Configuração do Firebase (SUBSTITUA PELAS SUAS CREDENCIAIS REAIS)
const firebaseConfig = {
    apiKey: "AIzaSyCtz28du4JtLnPi-MlOgsiXRlb8k02Jwgc",
    authDomain: "cardapioweb-99e7b.firebaseapp.com",
    databaseURL: "https://cardapioweb-99e7b-default-rtdb.firebaseio.com",
    projectId: "cardapioweb-99e7b",
    storageBucket: "cardapioweb-99e7b.firebasestorage.app",
    messagingSenderId: "110849299422",
    appId: "1:110849299422:web:60285eb408825c3ff9434f",
    measurementId: "G-QP7K16G4NM"
};

firebase.initializeApp(firebaseConfig);

const database = firebase.database();
const pedidosRef = database.ref('pedidos');
const promocoesRef = firebase.database().ref('promocoes');
const mesasRef = database.ref('mesas');
const cuponsRef = database.ref('cupons');
const produtosRef = database.ref('produtos');
const ingredientesRef = database.ref('ingredientes');
const comprasRef = database.ref('compras');

// Objeto para armazenar referências a elementos do DOM.
// Isso ajuda a manter o código mais limpo e organizado, e a evitar 'null' errors.
const DOM = {};

// Variáveis de estado global
let allIngredients = {}; // Armazena todos os ingredientes para referência rápida
let currentRecipeProduct = null; // Produto atualmente selecionado para configurar a receita
let currentPurchaseItems = []; // Array temporário para itens da compra (único para ambas as seções)

// --- LISTENERS GLOBAIS DO FIREBASE ---
// Este listener é CRÍTICO pois atualiza 'allIngredients' e as listas de estoque/ponto de pedido.
// Ele é disparado sempre que há uma mudança nos dados de 'ingredientes' no Firebase.
ingredientesRef.on('value', (snapshot) => {
    // Garante que os elementos DOM existem antes de tentar manipulá-los
    // Se eles ainda não foram inicializados (ex: primeira carga da página), a função retorna.
    if (!DOM.listaIngredientesDetalheContainer || !DOM.ingredientesPontoPedidoList ||
        !DOM.listaConsumoDiarioContainer || !DOM.listaConsumoMensalContainer) {
        console.warn("Elementos DOM de estoque ainda não carregados. Ignorando atualização de ingredientes.");
        return;
    }

    DOM.listaIngredientesDetalheContainer.innerHTML = '';
    DOM.ingredientesPontoPedidoList.innerHTML = '';
    DOM.listaConsumoDiarioContainer.innerHTML = ''; // Limpa antes de preencher
    DOM.listaConsumoMensalContainer.innerHTML = ''; // Limpa antes de preencher

    allIngredients = {}; // Limpa o objeto global de ingredientes

    const ingredientesEmPontoDePedido = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera a hora para comparação de dia (apenas a data)

    snapshot.forEach(childSnapshot => {
        const ingredienteId = childSnapshot.key;
        const ingrediente = childSnapshot.val();
        allIngredients[ingredienteId] = ingrediente; // Armazena globalmente

        // Lógica de "reset" diário automático:
        // Se a data da última atualização do consumo diário for ANTES de hoje, zera o consumo diário.
        const ultimaAtualizacaoDiariaTimestamp = ingrediente.ultimaAtualizacaoConsumo || 0;
        const ultimaAtualizacaoDiariaDate = new Date(ultimaAtualizacaoDiariaTimestamp);
        ultimaAtualizacaoDiariaDate.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data

        if (ultimaAtualizacaoDiariaDate.getTime() < hoje.getTime()) {
            ingredientesRef.child(ingredienteId).update({
                quantidadeUsadaDiaria: 0,
                custoUsadoDiario: 0,
                ultimaAtualizacaoConsumo: firebase.database.ServerValue.TIMESTAMP // Atualiza o timestamp para "hoje"
            }).catch(e => console.error("Erro ao zerar consumo diário automático:", e));
        }

        const isBelowMin = (ingrediente.quantidadeAtual || 0) <= (ingrediente.estoqueMinimo || 0) && (ingrediente.estoqueMinimo || 0) > 0;
        const statusClass = isBelowMin ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50';

        // Renderiza o card de ingrediente para a seção DETALHADA de gerenciamento
        const ingredienteCard = document.createElement('div');
        ingredienteCard.className = `p-4 rounded-lg shadow-sm border ${statusClass}`;
        ingredienteCard.innerHTML = `
            <h4 class="font-semibold text-gray-800">${ingrediente.nome}</h4>
            <p class="text-sm text-gray-600">Unidade: ${ingrediente.unidadeMedida}</p>
            <p class="text-sm text-gray-600">Estoque Mínimo: ${ingrediente.estoqueMinimo || 0} ${ingrediente.unidadeMedida}</p>
            <p class="text-sm text-gray-600">Custo Médio: R$ ${(ingrediente.custoUnitarioMedio || 0).toFixed(2)}/${ingrediente.unidadeMedida}</p>
            <div class="flex items-center gap-2 mb-2">
                <label for="qtd-atual-${ingredienteId}" class="text-sm">Estoque Atual:</label>
                <input type="number" id="qtd-atual-${ingredienteId}" value="${(ingrediente.quantidadeAtual || 0).toFixed(2)}" step="0.01" min="0"
                       class="w-24 p-1 border rounded text-center text-blue-700 font-bold">
                <span>${ingrediente.unidadeMedida}</span>
            </div>
            <div class="flex gap-2 mt-3">
                <button class="btn-update-ingrediente bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm" data-id="${ingredienteId}">Atualizar</button>
                <button class="btn-delete-ingrediente bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm" data-id="${ingredienteId}">Excluir</button>
            </div>
        `;
        DOM.listaIngredientesDetalheContainer.appendChild(ingredienteCard);

        // Adiciona ao relatório de ponto de pedido
        if (isBelowMin) {
            ingredientesEmPontoDePedido.push(ingrediente);
        }
    });

    // Atualiza os Event Listeners para os botões de atualização/deleção do gerenciamento detalhado
    DOM.listaIngredientesDetalheContainer.querySelectorAll('.btn-update-ingrediente').forEach(button => {
        button.addEventListener('click', handleUpdateIngrediente);
    });
    DOM.listaIngredientesDetalheContainer.querySelectorAll('.btn-delete-ingrediente').forEach(button => {
        button.addEventListener('click', handleDeleteIngrediente);
    });

    // Renderiza os relatórios no painel principal
    renderIngredientesPontoPedido(ingredientesEmPontoDePedido);
    renderConsumoDiario(); // Chama para renderizar o consumo de ontem (baseado nos dados recém-carregados)
    renderConsumoMensal(); // Chama para renderizar o consumo do mês (baseado nos dados recém-carregados)

    // Garante que os selects de ingredientes para receitas e compras estejam atualizados
    popularIngredientesParaReceitaSelects();
    popularIngredientesParaCompraSelects();
});

// Listener de pedidos (já existente no seu código)
pedidosRef.on('value', (snapshot) => {
    DOM.pedidosOnline = {};
    snapshot.forEach((child) => {
        DOM.pedidosOnline[child.key] = child.val();
    });

    renderizarPedidos();
    aplicarFiltroDatas();

    const totalPedidosAtual = Object.keys(DOM.pedidosOnline).length;
    if (totalPedidosAtual > DOM.totalPedidosAnteriores) {
        tocarNotificacao();
    }
    DOM.totalPedidosAnteriores = totalPedidosAtual;
});

// Listener de mesas (já existente no seu código)
mesasRef.on('value', (snapshot) => {
    const mesasData = snapshot.val() || {};
    renderMesas(mesasData);
});

// --- FUNÇÕES GERAIS DO PAINEL ---
function tocarNotificacao() {
    const som = document.getElementById('notificacao-som');
    if (som) {
        som.currentTime = 0;
        som.play().catch((err) => {
            console.warn('Não foi possível reproduzir o som:', err);
        });
    }
}

function renderizarPedidos() {
    if (!DOM.pedidosAtivosContainer) return;
    DOM.pedidosAtivosContainer.innerHTML = '';
    Object.entries(DOM.pedidosOnline).forEach(([pedidoId, pedido]) => {
        if (pedido.status !== 'Finalizado' && pedido.status !== 'Recusado' && pedido.tipoAtendimento !== 'Mesa' && pedido.tipoAtendimento !== 'Presencial') {
            const pedidoDiv = document.createElement('div');
            pedidoDiv.className = 'bg-white p-4 rounded shadow mb-4';
            pedidoDiv.innerHTML = gerarHtmlPedido(pedido, pedidoId);
            DOM.pedidosAtivosContainer.appendChild(pedidoDiv);
        }
    });
}

function aplicarFiltroDatas() {
    if (!DOM.pedidosFinalizadosContainer) return;
    DOM.pedidosFinalizadosContainer.innerHTML = '';

    let dataInicioTimestamp = DOM.inputDataInicio.value ? new Date(DOM.inputDataInicio.value).setHours(0, 0, 0, 0) : null;
    let dataFimTimestamp = DOM.inputDataFim.value ? new Date(DOM.inputDataFim.value).setHours(23, 59, 59, 999) : null;

    let pedidosFiltrados = Object.entries(DOM.pedidosOnline).filter(([id, pedido]) => {
        if (pedido.status !== 'Finalizado' || !pedido.timestamp) return false;

        const ts = pedido.timestamp;

        if (dataInicioTimestamp && ts < dataInicioTimestamp) return false;
        if (dataFimTimestamp && ts > dataFimTimestamp) return false;

        return true;
    });

    const totalPedidos = pedidosFiltrados.length;
    const totalVendido = pedidosFiltrados.reduce((acc, [_, p]) => acc + (p.totalPedido || p.totalOriginal || 0), 0);

    DOM.totalPedidosEl.textContent = totalPedidos;
    DOM.totalVendidoEl.textContent = totalVendido.toFixed(2);

    if (totalPedidos === 0) {
        DOM.pedidosFinalizadosContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum pedido finalizado no período selecionado.</p>`;
        return;
    }

    pedidosFiltrados.forEach(([pedidoId, pedido]) => {
        const pedidoDiv = document.createElement('div');
        pedidoDiv.className = 'bg-white p-4 rounded shadow mb-4';
        pedidoDiv.innerHTML = gerarHtmlPedido(pedido, pedidoId);
        DOM.pedidosFinalizadosContainer.appendChild(pedidoDiv);
    });
}

function aceitarPedido(pedidoId) {
    database.ref('pedidos/' + pedidoId).once('value')
        .then(snapshot => {
            const pedido = snapshot.val();
            if (!pedido.telefone) {
                alert('Não foi possível encontrar o telefone do cliente.');
                console.error('Erro: Telefone do cliente não encontrado no pedido.');
                return;
            }
            database.ref('pedidos/' + pedidoId).update({ status: 'Aceito' });
            const itensPedido = pedido.cart.map(item => `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}`).join('\n');
            const enderecoTexto = pedido.tipoEntrega === 'Entrega' ? `${pedido.endereco.rua}, ${pedido.endereco.numero} - ${pedido.endereco.bairro}` : 'Retirada no local';
            const trocoPara = pedido.dinheiroTotal ? parseFloat(pedido.dinheiroTotal) : 0;
            const trocoTexto = trocoPara > 0 ? `Troco para: R$ ${trocoPara.toFixed(2)}` : 'Sem troco';
            const obsTexto = pedido.observacao || 'Nenhuma';
            const mensagem = `✅ *Seu pedido foi aceito!*

🛒 *Itens:*
${itensPedido}

💳 *Pagamento:* ${pedido.pagamento}
💰 *${trocoTexto}*
📄 *Observação:* ${obsTexto}
🚚 *Tipo de Entrega:* ${pedido.tipoEntrega}
📍 *Endereço:* ${enderecoTexto}
💵 *Total:* R$ ${pedido.totalPedido.toFixed(2)}

Aguarde que logo estará a caminho! 🍽️`;
            const telefoneLimpo = pedido.telefone.replace(/\D/g, '');
            window.open(`https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`, '_blank');
        })
        .catch(err => {
            console.error('Erro ao aceitar pedido:', err);
            alert('Erro ao aceitar pedido. Verifique o console para mais detalhes.');
        });
}

function saiuParaEntrega(pedidoId) {
    database.ref('pedidos/' + pedidoId).once('value').then(snapshot => {
        const pedido = snapshot.val();
        if (!pedido.telefone) {
            alert('Não foi possível encontrar o telefone do cliente.');
            return;
        }

        database.ref('pedidos/' + pedidoId).update({
            status: pedido.tipoEntrega === 'Retirada' ? 'Pronto para Retirada' : 'Saiu para Entrega'
        });

        const telefoneLimpo = pedido.telefone.replace(/\D/g, '');
        let mensagem = '';
        if (pedido.tipoEntrega === 'Retirada') {
            mensagem =
                `✅ *Seu pedido está pronto para retirada!*

👤 *Cliente:* ${pedido.nomeCliente || '-'}
📦 *Pedido:* ${pedido.cart.map(item => `${item.quantity}x ${item.name}`).join(', ')}
💵 *Total:* R$ ${pedido.totalPedido.toFixed(2)}

Pode vir buscar quando quiser. Agradecemos pela preferência! 🙏`;
        } else {
            mensagem =
                `🚚 *Seu pedido saiu para entrega!* 👤 *Cliente:* ${pedido.nomeCliente || '-'}
📦 *Pedido:* ${pedido.cart.map(item => `${item.quantity}x ${item.name}`).join(', ')}
💵 *Total:* R$ ${pedido.totalPedido.toFixed(2)}

Nosso entregador está a caminho. 🛵 Agradecemos pela preferência! 🙏`;
        }
        window.open(`https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`, '_blank');
    });
}

async function finalizarPedido(pedidoId) {
    try {
        const pedidoSnapshot = await pedidosRef.child(pedidoId).once('value');
        const pedido = pedidoSnapshot.val();

        if (!pedido) {
            console.error(`Pedido com ID ${pedidoId} não encontrado.`);
            alert('Erro: Pedido não encontrado para finalizar.');
            return;
        }

        // Lógica de registro de consumo de ingredientes aprimorada para PIZZAS E OUTROS PRODUTOS
        if (pedido.cart && Array.isArray(pedido.cart)) {
            for (const itemPedido of pedido.cart) {
                let produtoRefPath = null;
                const categories = ['pizzas', 'bebidas', 'esfirras', 'calzone', 'promocoes', 'novidades'];

                for (const cat of categories) {
                    const productsSnapshot = await produtosRef.child(cat).orderByChild('nome').equalTo(itemPedido.name).once('value');
                    if (productsSnapshot.exists()) {
                        const productId = Object.keys(productsSnapshot.val())[0];
                        produtoRefPath = `${cat}/${productId}`;
                        break;
                    }
                }

                if (produtoRefPath) {
                    const produtoSnapshot = await produtosRef.child(produtoRefPath).once('value');
                    const produtoAssociado = produtoSnapshot.val();

                    if (produtoAssociado) {
                        let receitaParaConsumo = null;
                        let isPizza = produtoAssociado.tipo === 'pizza';

                        if (isPizza && itemPedido.size) { // Assumindo que itemPedido.size virá do carrinho para pizzas
                            receitaParaConsumo = produtoAssociado.receita?.[itemPedido.size];
                        } else {
                            receitaParaConsumo = produtoAssociado.receita; // Para outros produtos ou pizzas sem tamanho especificado
                        }

                        if (receitaParaConsumo) {
                            for (const ingredienteId in receitaParaConsumo) {
                                const quantidadePorUnidadeProduto = receitaParaConsumo[ingredienteId];
                                const quantidadeTotalConsumida = quantidadePorUnidadeProduto * itemPedido.quantity;
                                const custoUnitario = allIngredients[ingredienteId]?.custoUnitarioMedio || 0; // Pega o custo médio do ingrediente
                                const custoTotalConsumido = quantidadeTotalConsumida * custoUnitario;

                                const ingredienteRef = ingredientesRef.child(ingredienteId);
                                await ingredienteRef.transaction(currentData => {
                                    if (currentData) {
                                        currentData.quantidadeUsadaMensal = (currentData.quantidadeUsadaMensal || 0) + quantidadeTotalConsumida;
                                        currentData.custoUsadoMensal = (currentData.custoUsadoMensal || 0) + custoTotalConsumido;
                                        currentData.quantidadeUsadaDiaria = (currentData.quantidadeUsadaDiaria || 0) + quantidadeTotalConsumida;
                                        currentData.custoUsadoDiaria = (currentData.custoUsadoDiaria || 0) + custoTotalConsumido;
                                        currentData.ultimaAtualizacaoConsumo = firebase.database.ServerValue.TIMESTAMP;
                                    }
                                    return currentData;
                                });
                                console.log(`Consumo de ${allIngredients[ingredienteId]?.nome || ingredienteId} incrementado: Qtd: ${quantidadeTotalConsumida.toFixed(3)}, Custo: R$ ${custoTotalConsumido.toFixed(2)}`);
                            }
                        } else {
                            console.warn(`Receita para o produto "${itemPedido.name}" (Tamanho: ${itemPedido.size || 'N/A'}) não encontrada ou não configurada. O consumo de ingredientes não será registrado para este item.`);
                        }
                    } else {
                        console.warn(`Produto "${itemPedido.name}" não encontrado no Firebase para dedução de estoque.`);
                    }
                } else {
                    console.warn(`Produto "${itemPedido.name}" não encontrado em nenhuma categoria para dedução de estoque.`);
                }
            }
        }

        await pedidosRef.child(pedidoId).update({
            status: 'Finalizado',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        const mensagem = `✅ *Pedido finalizado!*

Muito obrigado, ${pedido.nomeCliente || ''}, por confiar em nosso serviço. 😄
Esperamos vê-lo novamente em breve! 🍽️🍕`;

        const telefoneLimpo = pedido.telefone ? pedido.telefone.replace(/\D/g, '') : '';
        if (telefoneLimpo) {
            window.open(`https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`, '_blank');
        } else {
            console.warn('Telefone do cliente não disponível para enviar mensagem de finalização.');
        }

    } catch (error) {
        console.error('Erro ao finalizar pedido e registrar consumo:', error);
        alert('Erro ao finalizar pedido. Verifique o console para mais detalhes.');
    }
}


function recusarPedido(pedidoId) {
    if (confirm('Deseja realmente recusar o pedido?')) {
        database.ref('pedidos/' + pedidoId).update({ status: 'Recusado' });
    }
}

function gerarHtmlPedido(pedido, pedidoId) {
    if (!pedido || !pedido.cart || !Array.isArray(pedido.cart)) {
        return `<div class="text-red-600 font-semibold">Erro: pedido inválido ou sem produtos.</div>`;
    }

    let enderecoTexto = pedido.tipoEntrega === 'Entrega' ?
        `<p class="text-sm mb-1"><strong>Endereço:</strong> ${pedido.endereco.rua}, ${pedido.endereco.numero} - ${pedido.endereco.bairro}</p>` :
        `<p class="text-sm font-semibold text-blue-600 mb-1">Retirada no local</p>`;

    let produtos = pedido.cart.map(item => {
        let sizeInfo = item.size ? ` (${item.size})` : '';
        return `
        <li class="flex justify-between text-sm">
            <span>${item.quantity}x ${item.name}${sizeInfo}</span>
            <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
        </li>`;
    }).join('');

    let horario = pedido.timestamp ?
        new Date(pedido.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) :
        'Sem horário';

    let clienteInfo = `
        <p class="text-sm mb-1"><strong>Cliente:</strong> ${pedido.nomeCliente || '-'}</p>
        <p class="text-sm mb-1"><strong>Telefone:</strong> ${pedido.telefone || '-'}</p>
    `;

    let tipoAtendimentoInfo = '';
    if (pedido.tipoAtendimento === 'Mesa' || pedido.tipoAtendimento === 'Presencial') {
        tipoAtendimentoInfo = `<p class="text-sm mb-1"><strong>Atendimento:</strong> Presencial (Mesa ${pedido.mesaNumero || 'N/A'})</p>`;
        const totalExibido = (pedido.totalOriginal || pedido.totalPedido).toFixed(2);
        produtos += `<li class="flex justify-between text-sm mt-2 font-bold text-gray-800"><span>TOTAL ORIGINAL:</span><span>R$ ${totalExibido}</span></li>`;
        if (pedido.pagamentosRegistrados && pedido.pagamentosRegistrados.length > 0) {
            produtos += `<li class="flex justify-between text-sm font-bold text-gray-800"><span>PAGAMENTOS:</span></li>`;
            pedido.pagamentosRegistrados.forEach(pag => {
                produtos += `<li class="flex justify-between text-sm text-gray-700 ml-4"><span>- ${pag.metodo}:</span><span>R$ ${pag.valorPago.toFixed(2)}</span>`;
                if (pag.troco !== undefined && pag.troco !== null) {
                    produtos += `<span class="ml-2">(Troco: R$ ${pag.troco.toFixed(2)})</span>`;
                }
                produtos += `</li>`;
            });
        }
    }

    return `
    <div class="flex flex-col justify-between h-full">
        <div>
            <h2 class="text-lg font-bold mb-2">Pedido (${horario})</h2>
            ${clienteInfo}
            ${tipoAtendimentoInfo}
            ${enderecoTexto}
            <p class="text-sm"><strong>Pagamento:</strong> ${pedido.pagamento} ${pedido.dinheiroTotal ? '(Troco p/ R$ ' + parseFloat(pedido.dinheiroTotal).toFixed(2) + ')' : ''}</p>
            <p class="text-sm"><strong>Obs:</strong> ${pedido.observacao || '-'}</p>
            <p class="text-sm"><strong>Entrega:</strong> ${pedido.tipoEntrega || 'N/A'}</p>
            <ul class="my-2 space-y-1">${produtos}</ul>
            <p class="font-bold text-green-600 text-lg">Total Final: R$ ${(pedido.totalPago || pedido.totalPedido).toFixed(2)}</p>
        </div>

        <div>
            <p class="mt-2 font-medium">Status:
                <span class="${getStatusColor(pedido.status)}">${pedido.status}</span>
            </p>

            ${pedido.status === 'Aguardando' ? `
            <div class="flex gap-2 mt-4">
                <button onclick="aceitarPedido('${pedidoId}')" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
                    Aceitar
                </button>
                <button onclick="recusarPedido('${pedidoId}')" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
                    Recusar
                </button>
            </div>
            ` : pedido.status === 'Aceito' ? `
            <div class="flex gap-2 mt-4">
                <button onclick="imprimirPedido('${pedidoId}')" class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition">
                    Imprimir Comanda
                </button>
                <button onclick="saiuParaEntrega('${pedidoId}')" class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition">
                    ${pedido.tipoEntrega === 'Retirada' ? 'Pronto para Retirada' : 'Saiu para Entrega'}
                </button>
                <button onclick="finalizarPedido('${pedidoId}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
                    Finalizar Pedido
                </button>
                <button onclick="editarPedido('${pedidoId}')" class="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition">
                    ✏️ Editar
                </button>
            </div>
            ` : pedido.status === 'Saiu para Entrega' || pedido.status === 'Pronto para Retirada' ? `
            <div class="flex gap-2 mt-4">
                <button onclick="finalizarPedido('${pedidoId}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
                    Finalizar Pedido
                </button>
            </div>
            ` : ``}
        </div>
    </div>
    `;
}

function getStatusColor(status) {
    switch (status) {
        case 'Aguardando':
            return 'text-yellow-500';
        case 'Aceito':
            return 'text-green-500';
        case 'Recusado':
            return 'text-red-500';
        case 'Finalizado':
            return 'text-blue-500';
        case 'Saiu para Entrega':
        case 'Pronto para Retirada':
            return 'text-purple-500';
        default:
            return 'text-gray-500';
    }
}

function calcularTempoDecorrido(data) {
    const agora = new Date();
    const diffMs = agora - data;
    const minutos = Math.floor(diffMs / 60000);
    if (minutos < 1) return "menos de 1 minuto";
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    return `${horas}h ${minutos % 60}min`;
}

function ativaAba(ativa, ...inativas) {
    ativa.classList.remove('hidden');
    inativas.forEach(aba => aba.classList.add('hidden'));
}

function estilizaBotaoAtivo(botaoAtivo, ...inativos) {
    botaoAtivo.classList.add('bg-blue-600', 'text-white');
    botaoAtivo.classList.remove('bg-blue-700');

    inativos.forEach(botao => {
        botao.classList.remove('bg-blue-600', 'text-white');
        botao.classList.add('bg-blue-700');
    });
}

// --- INICIALIZAÇÃO DO DOM E EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicialização das referências DOM
    Object.assign(DOM, {
        pedidosAtivosContainer: document.getElementById('pedidos-ativos-container'),
        pedidosFinalizadosContainer: document.getElementById('pedidos-finalizados-container'),
        inputDataInicio: document.getElementById('data-inicio'),
        inputDataFim: document.getElementById('data-fim'),
        btnFiltrar: document.getElementById('btn-filtrar'),
        totalPedidosEl: document.getElementById('total-pedidos'),
        totalVendidoEl: document.getElementById('total-vendido'),
        btnAtivos: document.getElementById('btn-ativos'),
        btnFinalizados: document.getElementById('btn-finalizados'),
        btnEditarCardapio: document.getElementById('btn-editar-cardapio'),
        btnEditarHorario: document.getElementById('btn-editar-horario'),
        btnGerenciarMesas: document.getElementById('btn-gerenciar-mesas'),
        btnConfiguracoesGerais: document.getElementById('btn-configuracoes-gerais'),
        btnRelatorios: document.getElementById('btn-relatorios'),
        btnGerenciarCupom: document.getElementById('btn-gerenciar-cupom'),

        btnGerenciarEstoque: document.getElementById('btn-gerenciar-estoque'),
        abaGerenciarEstoque: document.getElementById('aba-gerenciar-estoque'),

        // Elementos da seção de ANÁLISE RÁPIDA
        dataDiaAnteriorSpan: document.getElementById('data-dia-anterior'),
        totalGastoDiarioSpan: document.getElementById('total-gasto-diario'),
        listaConsumoDiarioContainer: document.getElementById('lista-consumo-diario'),
        nomeMesAtualSpan: document.getElementById('nome-mes-atual'),
        totalGastoMensalSpan: document.getElementById('total-gasto-mensal'),
        listaConsumoMensalContainer: document.getElementById('lista-consumo-mensal'),

        ingredientesPontoPedidoList: document.getElementById('ingredientes-ponto-pedido-list'),
        ingredientesPontoPedidoCount: document.getElementById('ingredientes-ponto-pedido-count'),
        btnResetarConsumoDiario: document.getElementById('btn-resetar-consumo-diario'),
        btnResetarConsumoMensal: document.getElementById('btn-resetar-consumo-mensal'),
        toggleGerenciamentoAvancado: document.getElementById('toggle-gerenciamento-avancado'),
        gerenciamentoDetalhadoContainer: document.getElementById('gerenciamento-detalhado-container'),

        // Elementos da seção de GERENCIAMENTO DETALHADO
        ingredienteNomeDetalheInput: document.getElementById('ingrediente-nome-detalhe'),
        ingredienteUnidadeDetalheInput: document.getElementById('ingrediente-unidade-detalhe'),
        ingredienteEstoqueMinimoDetalheInput: document.getElementById('ingrediente-estoque-minimo-detalhe'),
        btnSalvarIngredienteDetalhe: document.getElementById('btn-salvar-ingrediente-detalhe'),
        listaIngredientesDetalheContainer: document.getElementById('lista-ingredientes-detalhe-container'),

        receitaProdutoSelectCategoriaDetalhe: document.getElementById('receita-produto-select-categoria-detalhe'),
        receitaProdutoSelectDetalhe: document.getElementById('receita-produto-select-detalhe'),
        receitaConfigDetalheContainer: document.getElementById('receita-config-detalhe-container'),
        currentRecipeProductNameDetalhe: document.getElementById('current-recipe-product-name-detalhe'),
        ingredientesParaReceitaDetalheList: document.getElementById('ingredientes-para-receita-detalhe-list'),
        receitaIngredienteSelectDetalhe: document.getElementById('receita-ingrediente-select-detalhe'),
        receitaQuantidadeDetalheInput: document.getElementById('receita-quantidade-detalhe'),
        btnAddIngredienteReceitaDetalhe: document.getElementById('btn-add-ingrediente-receita-detalhe'),
        btnSalvarReceitaDetalhe: document.getElementById('btn-salvar-receita-detalhe'),
        pizzaTamanhoSelectContainerDetalhe: document.getElementById('pizza-size-select-container-detalhe'),
        pizzaTamanhoSelectDetalhe: document.getElementById('pizza-tamanho-select-detalhe'),
        currentPizzaSizeDetalheSpan: document.getElementById('current-pizza-size-detalhe'),

        compraDataDetalheInput: document.getElementById('compra-data-detalhe'),
        compraFornecedorDetalheInput: document.getElementById('compra-fornecedor-detalhe'),
        itensCompraDetalheListContainer: document.getElementById('itens-compra-detalhe-list'),
        compraIngredienteSelectDetalhe: document.getElementById('compra-ingrediente-select-detalhe'),
        compraQuantidadeDetalheInput: document.getElementById('compra-quantidade-detalhe'),
        compraPrecoUnitarioDetalheInput: document.getElementById('compra-preco-unitario-detalhe'),
        btnAddItemCompraDetalhe: document.getElementById('btn-add-item-compra-detalhe'),
        btnRegistrarCompraDetalhe: document.getElementById('btn-registrar-compra-detalhe'),


        abaAtivos: document.getElementById('aba-ativos'),
        abaFinalizados: document.getElementById('aba-finalizados'),
        EditarCardapio: document.getElementById('editar-cardapio'),
        editarHorario: document.getElementById('editar-horario'),
        abaGerenciarMesas: document.getElementById('aba-gerenciar-mesas'),
        abaConfiguracoesGerais: document.getElementById('aba-configuracoes-gerais'),
        abaRelatorios: document.getElementById('aba-relatorios'),
        abaGerenciarCupom: document.getElementById('aba-gerenciar-cupom'),

        searchInput: document.getElementById('search-input'),
        categoriaSelect: document.getElementById('categoria-select'),

        menuButton: document.getElementById('menu-button'),
        sidebar: document.getElementById('sidebar'),
        overlay: document.getElementById('overlay'),
        closeSidebarButton: document.getElementById('close-sidebar-button'),

        relatorioDataInicio: document.getElementById('relatorio-data-inicio'),
        relatorioDataFim: document.getElementById('relatorio-data-fim') || document.getElementById('data-fim'),
        btnGerarRelatorios: document.getElementById('btn-gerar-relatorios'),
        topProdutosSummary: document.getElementById('top-produtos-summary'),
        topProdutosChartCanvas: document.getElementById('top-produtos-chart'),
        vendasPorDiaSummary: document.getElementById('vendas-por-dia-summary'),
        vendasPorDiaChartCanvas: document.getElementById('vendas-por-dia-chart'),
        horariosPicoSummary: document.getElementById('horarios-pico-summary'),
        horariosPicoChartCanvas: document.getElementById('horarios-pico-chart'),
        metodosPagamentoSummary: document.getElementById('metodos-pagamento-summary'),
        metodosPagamentoChartCanvas: document.getElementById('metodos-pagamento-chart'),
        btnUltimos7Dias: document.getElementById('btn-ultimos-7-dias'),
        btnUltimoMes: document.getElementById('btn-ultimo-mes'),
        btnUltimos3Meses: document.getElementById('btn-ultimos-3-meses'),
        btnHoje: document.getElementById('btn-hoje'),

        btnSalvarCupom: document.getElementById('btn-salvar-cupom'),
        cupomCodigoInput: document.getElementById('cupom-codigo'),
        cupomValorInput: document.getElementById('cupom-valor'),
        cupomTipoSelect: document.getElementById('cupom-tipo'),
        cupomMinValorInput: document.getElementById('cupom-min-valor'),
        validadeCupomInput: document.getElementById('validade-cupom'),
        listaCuponsContainer: document.getElementById('lista-cupons-container'),

        numMesasInput: document.getElementById('num-mesas'),
        btnConfigurarMesas: document.getElementById('btn-configurar-mesas'),
        mesasContainer: document.getElementById('mesas-container'),
        modalMesaDetalhes: document.getElementById('modal-mesa-detalhes'),
        modalMesaNumero: document.getElementById('modal-mesa-numero'),
        mesaDetalhesInfo: document.getElementById('mesa-detalhes-info'),
        mesaDetalhesStatus: document.getElementById('mesa-detalhes-status'),
        mesaDetalhesCliente: document.getElementById('mesa-detalhes-cliente'),
        mesaDetalhesGarcom: document.getElementById('mesa-detalhes-garcom'),
        mesaDetalhesObs: document.getElementById('mesa-detalhes-obs'),
        mesaItensSelecaoContainer: document.getElementById('mesa-itens-selecao-container'),
        emptyItemsMessage: document.getElementById('empty-items-message'),
        mesaTotalOriginal: document.getElementById('mesa-total-original'),
        mesaTotalPago: document.getElementById('mesa-total-pago'),
        mesaRestantePagar: document.getElementById('mesa-restante-pagar'),
        valorAPagarInput: document.getElementById('valor-a-pagar-input'),
        dividirPorInput: document.getElementById('dividir-por-input'),
        btnDividirRestante: document.getElementById('btn-dividir-restante'),
        pagamentoMetodoAtual: document.getElementById('pagamento-metodo-atual'),
        trocoInputGroup: document.getElementById('troco-input-group'),
        trocoRecebidoInput: document.getElementById('troco-recebido'),
        btnAdicionarPagamento: document.getElementById('btn-adicionar-pagamento'),
        historicoPagamentosContainer: document.getElementById('historico-pagamentos'),
        emptyPaymentsMessage: document.getElementById('empty-payments-message'),
        btnCancelarPedidoMesa: document.getElementById('btn-cancelar-pedido-mesa'),
        btnFinalizarContaMesa: document.getElementById('btn-finalizar-conta-mesa'),
    });


    // --- Event Listeners para os botões do menu principal ---
    DOM.btnAtivos.addEventListener('click', () => {
        ativaAba(DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque);
        estilizaBotaoAtivo(DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque);
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.overlay.classList.add('hidden');
    });

    DOM.btnFinalizados.addEventListener('click', () => {
        ativaAba(DOM.abaFinalizados, DOM.abaAtivos, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque);
        estilizaBotaoAtivo(DOM.btnFinalizados, DOM.btnAtivos, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque);

        const hoje = new Date();
        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(hoje.getDate() - 7);

        DOM.inputDataInicio.value = seteDiasAtras.toISOString().split('T')[0];
        DOM.inputDataFim.value = hoje.toISOString().split('T')[0];

        aplicarFiltroDatas();
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.overlay.classList.add('hidden');
    });

    DOM.btnEditarCardapio.addEventListener('click', () => {
        ativaAba(DOM.EditarCardapio, DOM.abaFinalizados, DOM.abaAtivos, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque);
        estilizaBotaoAtivo(DOM.btnEditarCardapio, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque);
        carregarItensCardapio(DOM.categoriaSelect.value, DOM.searchInput.value);
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.overlay.classList.add('hidden');
    });

    DOM.btnEditarHorario.addEventListener('click', () => {
        ativaAba(DOM.editarHorario, DOM.abaFinalizados, DOM.abaAtivos, DOM.EditarCardapio, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque);
        estilizaBotaoAtivo(DOM.btnEditarHorario, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque);
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.overlay.classList.add('hidden');
    });

    DOM.btnGerenciarMesas.addEventListener('click', () => {
        ativaAba(DOM.abaGerenciarMesas, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque);
        estilizaBotaoAtivo(DOM.btnGerenciarMesas, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque);
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.overlay.classList.add('hidden');
        carregarMesasDoFirebase();
    });

    DOM.btnConfiguracoesGerais.addEventListener('click', () => {
        ativaAba(DOM.abaConfiguracoesGerais, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque);
        estilizaBotaoAtivo(DOM.btnConfiguracoesGerais, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque);
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.overlay.classList.add('hidden');
    });

    DOM.btnGerenciarCupom.addEventListener('click', () => {
        ativaAba(DOM.abaGerenciarCupom, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarEstoque);
        estilizaBotaoAtivo(DOM.btnGerenciarCupom, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarEstoque);
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.overlay.classList.add('hidden');
        carregarCupons();
    });

    DOM.btnGerenciarEstoque.addEventListener('click', () => {
        ativaAba(DOM.abaGerenciarEstoque, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom);
        estilizaBotaoAtivo(DOM.btnGerenciarEstoque, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom);
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.overlay.classList.add('hidden');

        // Resetar campos de gerenciamento detalhado ao abrir a aba
        DOM.ingredienteNomeDetalheInput.value = '';
        DOM.ingredienteUnidadeDetalheInput.value = '';
        DOM.ingredienteEstoqueMinimoDetalheInput.value = '';

        DOM.compraDataDetalheInput.valueAsDate = new Date(); // Data atual
        DOM.compraFornecedorDetalheInput.value = '';
        currentPurchaseItems = [];
        renderItensCompraDetalhe();

        DOM.receitaProdutoSelectCategoriaDetalhe.value = '';
        DOM.receitaProdutoSelectDetalhe.innerHTML = '<option value="">Selecione uma categoria primeiro</option>';
        DOM.receitaProdutoSelectDetalhe.disabled = true;
        DOM.receitaConfigDetalheContainer.classList.add('hidden');
        DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none';
    });

    // --- Event Listeners para Relatórios de Pedidos ---
    DOM.btnGerarRelatorios.addEventListener('click', gerarRelatorios);
    DOM.btnHoje.addEventListener('click', () => setRelatorioDateRange(0, 0));
    DOM.btnUltimos7Dias.addEventListener('click', () => setRelatorioDateRange(6, 0));
    DOM.btnUltimoMes.addEventListener('click', () => setRelatorioDateRange(0, 0, 1));
    DOM.btnUltimos3Meses.addEventListener('click', () => setRelatorioDateRange(0, 0, 3));

    // --- Event Listeners para a aba de Estoque (Relatórios Rápidos e Ações) ---
    DOM.btnResetarConsumoDiario.addEventListener('click', async () => {
        const confirmacao = confirm('Tem certeza que deseja RESETAR o consumo do dia anterior? Isso vai zerar as quantidades e valores diários para todos os ingredientes. Esta ação é para ser feita no início de cada novo dia.');
        if (!confirmacao) return;

        try {
            const updates = {};
            Object.keys(allIngredients).forEach(ingredienteId => {
                updates[ingredienteId + '/quantidadeUsadaDiaria'] = 0;
                updates[ingredienteId + '/custoUsadoDiario'] = 0;
                updates[ingredienteId + '/ultimaAtualizacaoConsumo'] = firebase.database.ServerValue.TIMESTAMP;
            });
            await ingredientesRef.update(updates);
            alert('Consumo do dia anterior resetado com sucesso!');
        } catch (error) {
            console.error('Erro ao resetar consumo diário:', error);
            alert('Erro ao resetar consumo do dia anterior.');
        }
    });

    DOM.btnResetarConsumoMensal.addEventListener('click', async () => {
        const today = new Date();
        const yearMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

        if (confirm(`Tem certeza que deseja RESETAR o consumo mensal de TODOS os ingredientes para o mês de ${yearMonth}? Esta ação salvará o consumo atual em um histórico e zerará os contadores para o novo mês.`)) {
            try {
                const snapshot = await ingredientesRef.once('value');
                const updates = {};
                const consumoHistoricoMensal = {};

                snapshot.forEach(childSnapshot => {
                    const ingredienteId = childSnapshot.key;
                    const ingredienteData = childSnapshot.val();
                    if (ingredienteData.quantidadeUsadaMensal > 0) {
                        consumoHistoricoMensal[ingredienteId] = {
                            nome: ingredienteData.nome,
                            unidadeMedida: ingredienteData.unidadeMedida,
                            quantidadeConsumida: ingredienteData.quantidadeUsadaMensal,
                            custoConsumido: ingredienteData.custoUsadoMensal,
                            timestampReset: firebase.database.ServerValue.TIMESTAMP
                        };
                    }
                    updates[ingredienteId + '/quantidadeUsadaMensal'] = 0;
                    updates[ingredienteId + '/custoUsadoMensal'] = 0;
                });

                if (Object.keys(consumoHistoricoMensal).length > 0) {
                    await database.ref(`historicoConsumo/${yearMonth}`).set(consumoHistoricoMensal);
                    console.log(`Consumo de ${yearMonth} salvo em histórico.`);
                }

                await ingredientesRef.update(updates);
                alert('Consumo mensal de ingredientes resetado com sucesso!');
            } catch (error) {
                console.error('Erro ao resetar consumo:', error);
                alert('Erro ao resetar consumo de ingredientes.');
            }
        }
    });

    DOM.toggleGerenciamentoAvancado.addEventListener('click', () => {
        DOM.gerenciamentoDetalhadoContainer.classList.toggle('hidden');
    });

    // --- Event Listeners para a seção de Gerenciamento Detalhado ---
    DOM.btnSalvarIngredienteDetalhe.addEventListener('click', handleSalvarIngredienteDetalhe);
    DOM.btnAddItemCompraDetalhe.addEventListener('click', handleAddItemCompraDetalhe);
    DOM.btnRegistrarCompraDetalhe.addEventListener('click', handleRegistrarCompraDetalhe);
    DOM.receitaProdutoSelectCategoriaDetalhe.addEventListener('change', handleReceitaProdutoCategoriaChangeDetalhe);
    DOM.receitaProdutoSelectDetalhe.addEventListener('change', handleReceitaProdutoSelectChangeDetalhe);
    DOM.pizzaTamanhoSelectDetalhe.addEventListener('change', handlePizzaTamanhoSelectChangeDetalhe);
    DOM.btnAddIngredienteReceitaDetalhe.addEventListener('click', handleAddIngredienteReceitaDetalhe);
    DOM.btnSalvarReceitaDetalhe.addEventListener('click', handleSalvarReceitaDetalhe);


    // Inicializa a primeira aba ao carregar a página
    DOM.btnAtivos.click();
});

// --- FUNÇÕES DE RELATÓRIOS (Pedidos) ---
function setRelatorioDateRange(daysAgoStart = 0, daysAgoEnd = 0, monthsAgo = 0) {
    const today = new Date();
    let startDate = new Date(today);
    let endDate = new Date(today);

    if (monthsAgo > 0) {
        if (monthsAgo === 1) {
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        } else if (monthsAgo === 3) {
            startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        }
    } else {
        startDate.setDate(today.getDate() - daysAgoStart);
        endDate.setDate(today.getDate() - daysAgoEnd);
    }

    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    };

    DOM.relatorioDataInicio.value = formatDate(startDate);
    DOM.relatorioDataFim.value = formatDate(endDate);

    gerarRelatorios();
}

function gerarRelatorios() {
    const inicio = DOM.relatorioDataInicio.value;
    const fim = DOM.relatorioDataFim.value;

    if (!inicio || !fim) {
        alert("Por favor, selecione as datas de início e fim para gerar os relatórios.");
        return;
    }

    const dataInicioTimestamp = new Date(inicio).setHours(0, 0, 0, 0);
    const dataFimTimestamp = new Date(fim).setHours(23, 59, 59, 999);

    if (dataInicioTimestamp > dataFimTimestamp) {
        alert("A data de início não pode ser posterior à data de fim.");
        return;
    }

    if (topProdutosChartInstance) topProdutosChartInstance.destroy();
    if (vendasPorDiaChartInstance) vendasPorDiaChartInstance.destroy();
    if (horariosPicoChartInstance) horariosPicoChartInstance.destroy();
    if (metodosPagamentoChartInstance) metodosPagamentoChartInstance.destroy();

    DOM.topProdutosSummary.innerHTML = '<p class="text-gray-600">Carregando...</p>';
    DOM.vendasPorDiaSummary.innerHTML = '<p class="text-gray-600">Carregando...</p>';
    DOM.horariosPicoSummary.innerHTML = '<p class="text-gray-600">Carregando...</p>';
    DOM.metodosPagamentoSummary.innerHTML = '<p class="text-gray-600">Carregando...</p>';

    DOM.topProdutosChartCanvas.style.display = 'none';
    DOM.vendasPorDiaChartCanvas.style.display = 'none';
    DOM.horariosPicoChartCanvas.style.display = 'none';
    DOM.metodosPagamentoChartCanvas.style.display = 'none';


    database.ref('pedidos').orderByChild('timestamp').once('value', (snapshot) => {
        const pedidosNoPeriodo = [];
        snapshot.forEach(childSnapshot => {
            const pedido = childSnapshot.val();
            if (pedido.status === 'Finalizado' && pedido.timestamp >= dataInicioTimestamp && pedido.timestamp <= dataFimTimestamp) {
                pedidosNoPeriodo.push(pedido);
            }
        });

        if (pedidosNoPeriodo.length === 0) {
            DOM.topProdutosSummary.innerHTML = '<p class="text-gray-600">Nenhum pedido finalizado no período selecionado.</p>';
            DOM.vendasPorDiaSummary.innerHTML = '<p class="text-gray-600">Nenhum pedido finalizado no período selecionada.</p>';
            DOM.horariosPicoSummary.innerHTML = '<p class="text-gray-600">Nenhum pedido finalizado no período selecionado.</p>';
            DOM.metodosPagamentoSummary.innerHTML = '<p class="text-gray-600">Nenhum pedido finalizado no período selecionado.</p>';

            DOM.topProdutosChartCanvas.style.display = 'none';
            DOM.vendasPorDiaChartCanvas.style.display = 'none';
            DOM.horariosPicoChartCanvas.style.display = 'none';
            DOM.metodosPagamentoChartCanvas.style.display = 'none';
            return;
        }

        analisarProdutosMaisVendidos(pedidosNoPeriodo);
        analisarVendasPorDiaDaSemana(pedidosNoPeriodo);
        analisarHorariosDePico(pedidosNoPeriodo);
        analisarMetodosDePagamento(pedidosNoPeriodo);
    }, (error) => {
        console.error("Erro ao carregar pedidos para relatórios:", error);
        DOM.topProdutosSummary.innerHTML = '<p class="text-red-600">Erro ao carregar dados.</p>';
        DOM.vendasPorDiaSummary.innerHTML = '<p class="text-red-600">Erro ao carregar dados.</p>';
        DOM.horariosPicoSummary.innerHTML = '<p class="text-red-600">Erro ao carregar dados.</p>';
        DOM.metodosPagamentoSummary.innerHTML = '<p class="text-red-600">Erro ao carregar dados.</p>';

        DOM.topProdutosChartCanvas.style.display = 'none';
        DOM.vendasPorDiaChartCanvas.style.display = 'none';
        DOM.horariosPicoChartCanvas.style.display = 'none';
        DOM.metodosPagamentoChartCanvas.style.display = 'none';
    });
}

function analisarProdutosMaisVendidos(pedidos) {
    const contagemProdutos = {};

    pedidos.forEach(pedido => {
        if (pedido.cart && Array.isArray(pedido.cart)) {
            pedido.cart.forEach(item => {
                const nomeProduto = item.name;
                const quantidade = item.quantity;
                contagemProdutos[nomeProduto] = (contagemProdutos[nomeProduto] || 0) + quantidade;
            });
        }
    });

    const produtosOrdenados = Object.entries(contagemProdutos)
        .sort(([, qtdA], [, qtdB]) => qtdB - qtdA)
        .slice(0, 5);

    DOM.topProdutosSummary.innerHTML = '';
    if (produtosOrdenados.length > 0) {
        DOM.topProdutosChartCanvas.style.display = 'block';
        const labels = produtosOrdenados.map(item => item[0]);
        const data = produtosOrdenados.map(item => item[1]);

        topProdutosChartInstance = new Chart(DOM.topProdutosChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Unidades Vendidas',
                    data: data,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 99, 132, 0.8)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.raw + ' unidades';
                            }
                        }
                    }
                }
            }
        });

        DOM.topProdutosSummary.innerHTML = `<p>Os 5 produtos mais vendidos totalizaram **${data.reduce((a, b) => a + b, 0)} unidades**.</p>`;
    } else {
        DOM.topProdutosSummary.innerHTML = '<p class="text-gray-600">Nenhum produto vendido no período.</p>';
        DOM.topProdutosChartCanvas.style.display = 'none';
    }
}

function analisarVendasPorDiaDaSemana(pedidos) {
    const vendasPorDia = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0
    };
    const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    pedidos.forEach(pedido => {
        const data = new Date(pedido.timestamp);
        const diaSemana = data.getDay();
        vendasPorDia[diaSemana] = (vendasPorDia[diaSemana] || 0) + 1;
    });

    const diasParaGrafico = nomesDias.map((name, index) => ({
        day: name,
        count: vendasPorDia[index] || 0
    }));

    const diasOrdenadosParaResumo = Object.entries(vendasPorDia)
        .filter(([, count]) => count > 0)
        .sort(([, countA], [, countB]) => countB - countA);

    DOM.vendasPorDiaSummary.innerHTML = '';
    if (diasParaGrafico.some(d => d.count > 0)) {
        DOM.vendasPorDiaChartCanvas.style.display = 'block';
        const labels = diasParaGrafico.map(item => item.day);
        const data = diasParaGrafico.map(item => item.count);

        vendasPorDiaChartInstance = new Chart(DOM.vendasPorDiaChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pedidos',
                    data: data,
                    backgroundColor: 'rgba(153, 102, 255, 0.8)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.raw + ' pedidos';
                            }
                        }
                    }
                }
            }
        });

        if (diasOrdenadosParaResumo.length > 0) {
            const topDay = nomesDias[parseInt(diasOrdenadosParaResumo[0][0])];
            const topCount = diasOrdenadosParaResumo[0][1];
            DOM.vendasPorDiaSummary.innerHTML = `<p>O dia com mais vendas foi **${topDay}** com **${topCount} pedidos**.</p>`;
        } else {
            DOM.vendasPorDiaSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de vendas por dia.</p>';
        }

    } else {
        DOM.vendasPorDiaSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de vendas por dia.</p>';
        DOM.vendasPorDiaChartCanvas.style.display = 'none';
    }
}

function analisarHorariosDePico(pedidos) {
    const pedidosPorHora = {};
    for (let i = 0; i < 24; i++) {
        pedidosPorHora[i] = 0;
    }

    pedidos.forEach(pedido => {
        const data = new Date(pedido.timestamp);
        const hora = data.getHours();
        pedidosPorHora[hora] = (pedidosPorHora[hora] || 0) + 1;
    });

    const horariosOrdenados = Object.entries(pedidosPorHora)
        .sort(([horaA, ], [horaB, ]) => parseInt(horaA) - parseInt(horaB));

    DOM.horariosPicoSummary.innerHTML = '';
    if (horariosOrdenados.some(h => h[1] > 0)) {
        DOM.horariosPicoChartCanvas.style.display = 'block';
        const labels = horariosOrdenados.map(item => `${item[0]}h`);
        const data = horariosOrdenados.map(item => item[1]);

        horariosPicoChartInstance = new Chart(DOM.horariosPicoChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pedidos',
                    data: data,
                    backgroundColor: 'rgba(255, 159, 64, 0.8)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(255, 159, 64, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: false
                        },
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.raw + ' pedidos';
                            }
                        }
                    }
                }
            }
        });

        const topHorario = horariosOrdenados.reduce((prev, current) => (prev[1] > current[1] ? prev : current), ["0", 0]);
        if (topHorario[1] > 0) {
            DOM.horariosPicoSummary.innerHTML = `<p>O horário de pico foi entre **${topHorario[0]}h e ${parseInt(topHorario[0]) + 1}h** com **${topHorario[1]} pedidos**.</p>`;
        } else {
            DOM.horariosPicoSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de horário de pico.</p>';
        }

    } else {
        DOM.horariosPicoSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de horário de pico.</p>';
        DOM.horariosPicoChartCanvas.style.display = 'none';
    }
}

function analisarMetodosDePagamento(pedidos) {
    const contagemMetodos = {};

    pedidos.forEach(pedido => {
        const metodo = pedido.pagamento || 'Desconhecido';
        contagemMetodos[metodo] = (contagemMetodos[metodo] || 0) + 1;
    });

    const metodosOrdenados = Object.entries(contagemMetodos)
        .sort(([, qtdA], [, qtdB]) => qtdB - qtdA);

    DOM.metodosPagamentoSummary.innerHTML = '';
    if (metodosOrdenados.length > 0) {
        DOM.metodosPagamentoChartCanvas.style.display = 'block';
        const labels = metodosOrdenados.map(item => item[0]);
        const data = metodosOrdenados.map(item => item[1]);

        metodosPagamentoChartInstance = new Chart(DOM.metodosPagamentoChartCanvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 20,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1) + '%';
                                    label += context.parsed + ' pedidos (' + percentage + ')';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        DOM.metodosPagamentoSummary.innerHTML = `<p>O método de pagamento mais usado é **${labels[0]}**.</p>`;
    } else {
        DOM.metodosPagamentoSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de método de pagamento.</p>';
        DOM.metodosPagamentoChartCanvas.style.display = 'none';
    }
}

function gerarNota(pedido) {
    let html = `
    <html>
    <head>
        <title>Nota do Pedido</title>
        <style>
            @page {
                size: A4;
                margin: 10mm;
            }
            html, body {
                width: 100%;
                height: 100%;
                padding: 0;
                margin: 0;
                font-family: Arial, sans-serif;
            }
            body {
                box-sizing: border-box;
                padding: 10mm;
                font-size: 14pt;
            }
            h1 {
                text-align: center;
                font-size: 24pt;
                margin-bottom: 10mm;
            }
            hr {
                border: none;
                border-top: 2pt solid #000;
                margin: 5mm 0;
            }
            .info {
                font-size: 14pt;
                margin: 2mm 0;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10mm;
                font-size: 14pt;
            }
            th, td {
                padding: 2mm 4mm;
                border: 1pt solid #000;
            }
            th {
                background: #eee;
            }
            .total {
                font-size: 18pt;
                font-weight: bold;
                text-align: right;
                margin-top: 10mm;
            }
            .obs {
                font-size: 12pt;
                margin-top: 5mm;
            }
            .footer {
                text-align: center;
                margin-top: auto;
                padding-top: 10mm;
                font-size: 12pt;
            }
        </style>
    </head>
    <body>
        <h1>Nota do Pedido</h1>
        <hr/>
        <div class="info"><strong>Cliente:</strong> ${pedido.nomeCliente || '-'}</div>
        <div class="info"><strong>Telefone:</strong> ${pedido.telefone || '-'}</div>
        <div class="info"><strong>Entrega:</strong> ${pedido.tipoEntrega}</div>
        ${
            pedido.tipoEntrega === 'Entrega' ? `
            <div class="info"><strong>Endereço:</strong> ${pedido.endereco?.rua}, ${pedido.endereco?.numero} - ${pedido.endereco?.bairro}</div>
            <div class="info"><strong>Referência:</strong> ${pedido.referencia || '-'}</div>
            ` : '<div class="info"><strong>Retirada no local</strong></div>'
        }
        <hr/>
        <table>
            <thead>
                <tr>
                    <th>Qtd</th>
                    <th>Produto</th>
                    <th>Unitário</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>`;

    pedido.cart.forEach(item => {
        let sizeInfo = item.size ? ` (${item.size})` : '';
        html += `
            <tr>
                <td>${item.quantity}</td>
                <td>${item.name}${sizeInfo}</td>
                <td>R$ ${(item.price * item.quantity).toFixed(2)}</td>
                <td>R$ ${(item.price * item.quantity).toFixed(2)}</td>
            </tr>`;
    });

    html += `
            </tbody>
        </table>
        <div class="info"><strong>Pagamento:</strong> ${pedido.pagamento} ${pedido.dinheiroTotal ? `(Troco p/ R$ ${parseFloat(pedido.dinheiroTotal).toFixed(2)})` : ''}</div>
        <div class="obs"><strong>Observação:</strong> ${pedido.observacao || '-'}</div>
        <div class="total">Total do pedido: R$ ${pedido.totalPedido.toFixed(2)}</div>
        <div class="footer">Obrigado por comprar conosco! 🍽️</div>
    </body>
    </html>`;

    const printWindow = window.open('', '', 'width=1024,height=768');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function imprimirPedido(pedidoId) {
    database.ref('pedidos/' + pedidoId).once('value').then(snapshot => {
        const pedido = snapshot.val();
        gerarNota(pedido);
    });
}

const imagemUrlInput = document.getElementById('imagemUrl');
const imagemPreview = document.getElementById('imagemPreview');

if (imagemUrlInput && imagemPreview) {
    imagemUrlInput.addEventListener('input', () => {
        const url = imagemUrlInput.value.trim();
        if (url.startsWith('http')) {
            imagemPreview.src = url;
            imagemPreview.classList.remove('hidden');
        } else {
            imagemPreview.src = '';
            imagemPreview.classList.add('hidden');
        }
    });
}

document.getElementById('promoForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const imagem = imagemUrlInput.value.trim();
    const preco = parseFloat(document.getElementById('preco').value);

    if (!imagem.startsWith('http')) {
        alert("Coloque uma URL de imagem válida.");
        return;
    }

    const novaPromo = { titulo, descricao, imagem, preco, ativo: true };

    promocoesRef.push(novaPromo)
        .then(() => {
            alert("Promoção adicionada com sucesso!");
            document.getElementById('promoForm').reset();
            imagemPreview.src = '';
            imagemPreview.classList.add('hidden');
        })
        .catch(error => {
            alert("Erro ao adicionar promoção: " + error.message);
        });
});

let pedidoEmEdicao = null;
let pedidoOriginal = null;

function editarPedido(pedidoId) {
    pedidoEmEdicao = pedidoId;

    database.ref('pedidos/' + pedidoId).once('value').then(snapshot => {
        pedidoOriginal = snapshot.val() || {};
        renderizarItensModal(pedidoOriginal.cart || []);
        document.getElementById('modal-pedido-id').textContent = pedidoId;
        document.getElementById('modal-editar-pedido').classList.remove('hidden');
        document.getElementById('modal-editar-pedido').classList.add('flex');
    });
}

function renderizarItensModal(itens) {
    const container = document.getElementById('modal-itens');
    container.innerHTML = '';

    itens.forEach((item, index) => {
        let sizeInfo = item.size ? ` (${item.size})` : '';
        container.innerHTML += `
            <div class="flex justify-between items-center gap-2 border p-2 rounded">
                <input type="number" min="0" value="${item.quantity}"
                    class="w-16 border p-1 rounded text-center"
                    data-index="${index}"
                    data-name="${item.name}"
                    data-price="${item.price}"
                    data-size="${item.size || ''}"
                />
                <span class="flex-1 ml-2">${item.name}${sizeInfo}</span>
                <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `;
    });

    document.getElementById('btn-salvar-pedido').onclick = salvarPedidoEditado;
}

document.getElementById('btn-adicionar-item')?.addEventListener('click', () => {
    const nome = document.getElementById('novo-item-nome').value.trim();
    const preco = parseFloat(document.getElementById('novo-item-preco').value);
    const qtd = parseInt(document.getElementById('novo-item-quantidade').value, 10);

    if (!nome || isNaN(preco) || isNaN(qtd)) {
        return alert('Preencha todos os campos corretamente.');
    }

    pedidoOriginal.cart = pedidoOriginal.cart || [];
    pedidoOriginal.cart.push({ name: nome, price: preco, quantity: qtd });

    document.getElementById('novo-item-nome').value = '';
    document.getElementById('novo-item-preco').value = '';
    document.getElementById('novo-item-quantidade').value = '1';

    renderizarItensModal(pedidoOriginal.cart);
});

function salvarPedidoEditado() {
    const inputs = document.querySelectorAll('#modal-itens input[type="number"]');

    const novosItens = [];
    inputs.forEach(input => {
        const nome = input.dataset.name;
        const preco = parseFloat(input.dataset.price);
        const qtd = parseInt(input.value, 10);
        const size = input.dataset.size || undefined;

        if (qtd > 0) {
            novosItens.push({ name: nome, price: preco, quantity: qtd, size: size });
        }
    });

    const novoTotalPedido = novosItens.reduce((sum, item) => sum + item.price * item.quantity, 0);

    database.ref('pedidos/' + pedidoEmEdicao).update({ cart: novosItens, totalPedido: novoTotalPedido })
        .then(() => {
            alert('Pedido atualizado com sucesso!');
            fecharModalEditarPedido();
        })
        .catch(error => {
            console.error('Erro ao salvar pedido:', error);
            alert('Erro ao salvar o pedido.');
        });
}

function fecharModalEditarPedido() {
    document.getElementById('modal-editar-pedido').classList.add('hidden');
    pedidoEmEdicao = null;
    pedidoOriginal = null;
}

DOM.btnEditarCardapio.addEventListener("click", () => {
    DOM.abaAtivos.classList.add("hidden");
    DOM.abaFinalizados.classList.add("hidden");
    DOM.promocoes.classList.add("hidden");
    DOM.EditarCardapio.classList.remove("hidden");

    carregarItensCardapio(DOM.categoriaSelect.value, DOM.searchInput.value);
});

DOM.categoriaSelect.addEventListener("change", (e) => {
    carregarItensCardapio(e.target.value, DOM.searchInput.value);
});

DOM.searchInput.addEventListener("input", () => {
    carregarItensCardapio(DOM.categoriaSelect.value, DOM.searchInput.value);
});

function carregarItensCardapio(categoria, searchQuery = '') {
    const container = document.getElementById("itens-cardapio-container");
    container.innerHTML = "Carregando...";

    const ref = database.ref(`produtos/${categoria}`);

    ref.once("value", function(snapshot) {
        container.innerHTML = "";
        let itemsToRender = [];

        snapshot.forEach(function(childSnapshot) {
            const item = childSnapshot.val();
            const key = childSnapshot.key;
            itemsToRender.push({ item, key });
        });

        const lowerCaseSearchQuery = searchQuery.toLowerCase();
        const filteredItems = itemsToRender.filter(({ item }) => {
            const name = (item.nome || item.titulo || '').toLowerCase();
            const description = (item.descricao || '').toLowerCase();
            return name.includes(lowerCaseSearchQuery) || description.includes(lowerCaseSearchQuery);
        });

        if (filteredItems.length === 0) {
            container.innerHTML = `<p class="text-gray-600 text-center col-span-full">Nenhum item encontrado para "${searchQuery}" nesta categoria.</p>`;
            return;
        }

        filteredItems.forEach(({ item, key }) => {
            const card = criarCardItem(item, key, categoria);
            container.appendChild(card);
        });
    });
}

function criarCardItem(item, key, categoriaAtual) {
    const card = document.createElement("div");

    const destaquePromocao = categoriaAtual === "promocoes" ?
        "border-yellow-500 border-2 shadow-lg" :
        "border";

    card.className = `bg-white p-4 rounded ${destaquePromocao} flex flex-col gap-2`;

    card.innerHTML = `
        ${categoriaAtual === "promocoes" ? '<span class="text-yellow-600 font-bold text-sm">🔥 Promoção</span>' : ''}
        <input type="text" value="${item.nome || ''}" placeholder="Nome" class="p-2 border rounded nome">
        <textarea placeholder="Descrição" class="p-2 border rounded descricao">${item.descricao || ''}</textarea>
        <input type="number" value="${item.preco || 0}" step="0.01" class="p-2 border rounded preco">
        <input type="text" value="${item.imagem || ''}" placeholder="URL da Imagem" class="p-2 border rounded imagem">
        <img class="preview-img w-full h-32 object-cover rounded border ${item.imagem ? '' : 'hidden'}" src="${item.imagem || ''}">
    `;

    const tipoLabel = document.createElement("label");
    tipoLabel.className = "text-sm text-gray-700";
    tipoLabel.textContent = "Tipo (Doce ou Salgado)";
    card.appendChild(tipoLabel);

    const selectTipo = document.createElement("select");
    selectTipo.className = "p-2 border rounded tipo";
    selectTipo.innerHTML = `
        <option value="salgado">Salgado</option>
        <option value="doce">Doce</option>
        <option value="pizza">Pizza</option>
        <option value="bebida">Bebida</option>
    `;
    selectTipo.value = item.tipo || "salgado";
    card.appendChild(selectTipo);

    card.innerHTML += `
        <label class="flex items-center gap-2 text-sm text-gray-700 mt-2">
            <input type="checkbox" class="ativo" ${item.ativo ? 'checked' : ''}> Ativo
        </label>
        <div class="flex justify-between gap-2 mt-2">
            <button class="salvar bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 w-full">Salvar</button>
            <button class="excluir bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 w-full">Excluir</button>
        </div>
    `;

    const moveSection = document.createElement("div");
    moveSection.className = "mt-4 pt-4 border-t border-gray-200 flex flex-col gap-2";
    moveSection.innerHTML = `
        <label class="text-sm text-gray-700">Mover para categoria:</label>
        <select class="p-2 border rounded move-category-select">
            <option value="">-- Selecione --</option>
            <option value="pizzas">Pizzas</option>
            <option value="bebidas">Bebidas</option>
            <option value="esfirras">Esfirras</option>
            <option value="calzone">Calzones</option>
            <option value="promocoes">🔥 Promoções</option>
            <option value="novidades">✨ Novidades</option>
        </select>
        <button class="move-item-btn bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 w-full">Mover Item</button>
    `;
    card.appendChild(moveSection);

    const inputImagem = card.querySelector(".imagem");
    const previewImg = card.querySelector(".preview-img");

    inputImagem.addEventListener("input", () => {
        if (inputImagem.value.trim() !== "") {
            previewImg.src = inputImagem.value;
            previewImg.classList.remove("hidden");
        } else {
            previewImg.classList.add("hidden");
        }
    });

    card.querySelector(".salvar").addEventListener("click", function() {
        const nome = card.querySelector(".nome").value;
        const descricao = card.querySelector(".descricao").value;
        const preco = parseFloat(card.querySelector(".preco").value);
        const imagem = inputImagem.value;
        const ativo = card.querySelector(".ativo").checked;
        const tipo = card.querySelector(".tipo").value;

        database.ref(`produtos/${categoriaAtual}/${key}`).update({
            nome,
            descricao,
            preco,
            imagem,
            ativo,
            tipo
        }, function(error) {
            alert(error ? "Erro ao salvar!" : "Item atualizado com sucesso!");
        });
    });

    card.querySelector(".excluir").addEventListener("click", function() {
        if (confirm("Tem certeza que deseja excluir este item?")) {
            database.ref(`produtos/${categoriaAtual}/${key}`).remove(() => {
                card.remove();
                alert("Item excluído com sucesso!");
            });
        }
    });

    card.querySelector(".move-item-btn").addEventListener("click", function() {
        const targetCategorySelect = card.querySelector(".move-category-select");
        const targetCategory = targetCategorySelect.value;

        if (!targetCategory) {
            alert("Por favor, selecione uma categoria de destino para mover o item.");
            return;
        }
        if (targetCategory === categoriaAtual) {
            alert("O item já está nesta categoria.");
            return;
        }

        if (confirm(`Tem certeza que deseja mover "${item.nome || item.titulo}" de "${categoriaAtual}" para "${targetCategory}"?`)) {
            const updatedItemData = {
                nome: card.querySelector(".nome").value,
                descricao: card.querySelector(".descricao").value,
                preco: parseFloat(card.querySelector(".preco").value),
                imagem: inputImagem.value,
                ativo: card.querySelector(".ativo").checked,
                tipo: card.querySelector(".tipo").value,
                receita: item.receita || {}
            };
            moverItemParaCategoria(key, categoriaAtual, targetCategory, updatedItemData);
        }
    });

    return card;
}

function moverItemParaCategoria(itemKey, categoriaOrigem, categoriaDestino, itemData) {
    database.ref(`produtos/${categoriaDestino}`).push(itemData)
        .then(() => {
            return database.ref(`produtos/${categoriaOrigem}/${itemKey}`).remove();
        })
        .then(() => {
            alert(`Item "${itemData.nome || itemData.titulo}" movido com sucesso de "${categoriaOrigem}" para "${categoriaDestino}"!`);
            carregarItensCardapio(categoriaOrigem, DOM.searchInput.value);
        })
        .catch(error => {
            console.error('Erro ao mover item:', error);
            alert('Erro ao mover item. Verifique o console para detalhes.');
        });
}

function mostrarNovoitem() {
    document.getElementById("modal-novo-item").classList.remove("hidden");
    document.getElementById("modal-novo-item").classList.add("flex");
};

document.getElementById("btn-fechar-novo-item").addEventListener("click", () => {
    document.getElementById("modal-novo-item").classList.add("hidden");
});

document.getElementById("novo-imagem").addEventListener("input", () => {
    const url = document.getElementById("novo-imagem").value.trim();
    const preview = document.getElementById("preview-nova-imagem");

    if (url) {
        preview.src = url;
        preview.classList.remove("hidden");
    } else {
        preview.classList.add("hidden");
    }
});

document.getElementById("btn-salvar-novo-item").addEventListener("click", () => {
    const nome = document.getElementById("novo-nome").value.trim();
    const descricao = document.getElementById("novo-descricao").value.trim();
    const preco = parseFloat(document.getElementById("novo-preco").value);
    const imagem = document.getElementById("novo-imagem").value.trim();
    const ativo = document.getElementById("novo-ativo").checked;
    const categoria = document.getElementById("categoria-select").value;
    const tipo = document.getElementById("novo-tipo").value;

    if (!categoria) {
        alert("Selecione uma categoria para salvar o item.");
        return;
    }

    if (!nome || isNaN(preco)) {
        alert("Preencha o nome e o preço corretamente.");
        return;
    }

    const novoItem = { nome, descricao, preco, imagem, ativo, tipo, receita: {} };

    database.ref(`produtos/${categoria}`).push(novoItem, (error) => {
        if (error) {
            alert("Erro ao adicionar item!");
        } else {
            alert("Item adicionado com sucesso!");
            document.getElementById("modal-novo-item").classList.add("hidden");
            carregarItensCardapio(categoria, DOM.searchInput.value);
            limparFormularioNovoItem();
        }
    });
});

function limparFormularioNovoItem() {
    document.getElementById("novo-nome").value = "";
    document.getElementById("novo-descricao").value = "";
    document.getElementById("novo-preco").value = "";
    document.getElementById("novo-imagem").value = "";
    document.getElementById("preview-nova-imagem").classList.add("hidden");
    document.getElementById("novo-ativo").checked = true;
    document.getElementById("novo-tipo").value = "salgado";
}

function salvarHorariosNoFirebase(horarios) {
    const db = firebase.database();
    db.ref('config/horarios')
        .set(horarios)
        .then(() => console.log("Horários salvos com sucesso!"))
        .catch((error) => console.error("Erro ao salvar horários:", error));
}

function checkRestaurantOpen(horarios) {
    const agora = new Date();
    const diaSemana = agora.getDay();
    const horaAtual = agora.getHours();

    const configDia = horarios[diaSemana];
    if (!configDia || !configDia.aberto) return false;

    return horaAtual >= configDia.inicio && horaAtual < configDia.fim;
}

const db = firebase.database();

const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const containerHorario = document.getElementById("dias-container");

if (containerHorario) {
    dias.forEach((dia, i) => {
        const linha = document.createElement("div");
        linha.className = "flex items-center gap-4 border-b pb-3";

        linha.innerHTML = `
            <label class="w-28 font-semibold">${dia}</label>
            <label class="flex items-center gap-2">
                <input type="checkbox" name="aberto-${i}" />
                Aberto
            </label>
            <input type="number" name="inicio-${i}" min="0" max="23" value="18" class="border p-1 w-16" />
            <span>às</span>
            <input type="number" name="fim-${i}" min="0" max="23" value="23" class="border p-1 w-16" />
        `;

        containerHorario.appendChild(linha);
    });
}

db.ref('config/horarios').once('value')
    .then(snapshot => {
        if (snapshot.exists()) {
            const horariosSalvos = snapshot.val();
            for (let i = 0; i <= 6; i++) {
                const diaConfig = horariosSalvos[i];
                if (diaConfig) {
                    document.querySelector(`[name="aberto-${i}"]`).checked = diaConfig.aberto;
                    document.querySelector(`[name="inicio-${i}"]`).value = diaConfig.inicio;
                    document.querySelector(`[name="fim-${i}"]`).value = diaConfig.fim;
                }
            }
        }
    })
    .catch(error => console.error("Erro ao carregar horários do Firebase:", error));


const formHorario = document.getElementById("horario-form");
if (formHorario) {
    formHorario.addEventListener("submit", (e) => {
        e.preventDefault();

        const horarios = {};
        for (let i = 0; i <= 6; i++) {
            const aberto = document.querySelector(`[name="aberto-${i}"]`).checked;
            const inicio = parseInt(document.querySelector(`[name="inicio-${i}"]`).value);
            const fim = parseInt(document.querySelector(`[name="fim-${i}"]`).value);

            if (aberto && (isNaN(inicio) || isNaN(fim) || inicio < 0 || inicio > 23 || fim < 0 || fim > 23 || inicio >= fim)) {
                alert(`Por favor, verifique os horários de ${dias[i]}.`);
                return;
            }
            horarios[i] = { aberto, inicio, fim };
        }

        salvarHorariosNoFirebase(horarios);
    });
}

db.ref('config/horarios').on('value',
    snapshot => {
        const statusElement = document.getElementById("status");
        if (snapshot.exists()) {
            const horarios = snapshot.val();
            const status = checkRestaurantOpen(horarios);
            if (statusElement) {
                statusElement.innerText = "✅ Aberto agora";
            }
        } else {
            console.log("Nenhuma configuração de horários encontrada.");
            if (statusElement) {
                statusElement.innerText = "Horários não configurados.";
            }
        }
    });


DOM.menuButton.addEventListener('click', () => {
    DOM.sidebar.classList.remove('-translate-x-full');
    DOM.overlay.classList.remove('hidden');
});

DOM.closeSidebarButton.addEventListener('click', () => {
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
});

DOM.overlay.addEventListener('click', () => {
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
});


// --- FUNÇÕES DE GERENCIAMENTO DE MESAS (Painel Administrativo) ---

DOM.btnConfigurarMesas.addEventListener('click', () => {
    const numMesas = parseInt(DOM.numMesasInput.value, 10);
    if (isNaN(numMesas) || numMesas < 1 || numMesas > 20) {
        alert("Por favor, insira um número de mesas válido entre 1 e 20.");
        return;
    }

    if (confirm(`Deseja configurar ${numMesas} mesas? Isso redefinirá o estado de todas as mesas existentes.`)) {
        mesasRef.remove()
            .then(() => {
                const updates = {};
                for (let i = 1; i <= numMesas; i++) {
                    updates[i] = {
                        numero: i,
                        status: 'Livre',
                        cliente: '',
                        garcom: '',
                        observacoes: '',
                        pedido: null,
                        total: 0,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    };
                }
                return mesasRef.update(updates);
            })
            .then(() => {
                alert(`${numMesas} mesas configuradas com sucesso!`);
            })
            .catch(error => {
                console.error("Erro ao configurar mesas:", error);
                alert("Erro ao configurar mesas. Verifique o console.");
            });
    }
});

function renderMesas(mesasData) {
    if (!DOM.mesasContainer) return;
    DOM.mesasContainer.innerHTML = '';
    const sortedMesas = Object.values(mesasData).sort((a, b) => a.numero - b.numero);

    sortedMesas.forEach(mesa => {
        const statusClass = mesa.status === 'Livre' ? 'table-status-free' : 'table-status-occupied';
        const card = document.createElement('div');
        card.className = `table-card bg-white p-4 rounded-lg shadow-md border-2 text-center flex flex-col items-center justify-center ${statusClass}`;
        card.dataset.mesaNumero = mesa.numero;

        let ocupiedInfo = '';
        if (mesa.status !== 'Livre' && mesa.cliente) {
            ocupiedInfo = `
                <p class="text-sm font-medium text-gray-700">Cliente: ${mesa.cliente}</p>
                <p class="text-sm text-gray-600">Garçom: ${mesa.garcom || 'N/A'}</p>
                <p class="text-md font-semibold text-blue-600 mt-1">Total: R$ ${mesa.total.toFixed(2)}</p>
            `;
        }

        card.innerHTML = `
            <i class="fas fa-utensils text-4xl mb-2 ${mesa.status === 'Livre' ? 'text-green-700' : 'text-red-700'}"></i>
            <h3 class="text-2xl font-bold">Mesa ${mesa.numero}</h3>
            <span class="text-sm font-semibold ${mesa.status === 'Livre' ? 'text-green-700' : 'text-red-700'}">${mesa.status}</span>
            ${ocupiedInfo}
        `;
        DOM.mesasContainer.appendChild(card);
    });

    DOM.mesasContainer.querySelectorAll('.table-card').forEach(card => {
        card.addEventListener('click', () => abrirModalMesaDetalhes(card.dataset.mesaNumero));
    });
}

function carregarMesasDoFirebase() {
    mesasRef.once('value', (snapshot) => {
        const mesasData = snapshot.val() || {};
        if (Object.keys(mesasData).length === 0) {
            DOM.numMesasInput.value = 10;
            DOM.btnConfigurarMesas.click();
        } else {
            DOM.numMesasInput.value = Object.keys(mesasData).length;
            renderMesas(mesasData);
        }
    }, (error) => {
        console.error("Erro ao carregar mesas iniciais:", error);
        DOM.mesasContainer.innerHTML = '<p class="text-red-600">Erro ao carregar mesas.</p>';
    });
}

function abrirModalMesaDetalhes(mesaNumero) {
    currentMesaIdForCheckout = mesaNumero;

    mesasRef.child(mesaNumero).once('value', (snapshot) => {
        const mesa = snapshot.val();
        if (!mesa) {
            alert('Mesa não encontrada ou foi removida.');
            return;
        }

        DOM.modalMesaNumero.textContent = mesa.numero;
        DOM.mesaDetalhesStatus.textContent = mesa.status;
        DOM.mesaDetalhesStatus.className = `font-semibold ${mesa.status === 'Livre' ? 'text-green-600' : 'text-red-600'}`;
        DOM.mesaDetalhesCliente.textContent = mesa.cliente || 'N/A';
        DOM.mesaDetalhesGarcom.textContent = mesa.garcom || 'N/A';
        DOM.mesaDetalhesObs.textContent = mesa.observacoes || 'N/A';

        currentMesaItemsToPay = mesa.pedido ? mesa.pedido.map(item => ({
            ...item,
            originalQuantity: item.quantity,
            remainingQuantity: item.quantity,
            selectedToPayQuantity: 0
        })) : [];

        currentMesaTotal = mesa.total || 0;
        currentMesaRemainingToPay = mesa.total || 0;
        currentMesaPaymentsHistory = [];
        let totalAlreadyPaid = 0;

        DOM.mesaTotalOriginal.textContent = `R$ ${currentMesaTotal.toFixed(2)}`;
        DOM.mesaTotalPago.textContent = `R$ ${totalAlreadyPaid.toFixed(2)}`;
        DOM.mesaRestantePagar.textContent = `R$ ${currentMesaRemainingToPay.toFixed(2)}`;

        renderMesaItemsForCheckout();
        renderPagamentoHistory();

        DOM.valorAPagarInput.value = '';
        DOM.dividirPorInput.value = '';
        DOM.pagamentoMetodoAtual.value = '';
        DOM.trocoRecebidoInput.value = '';
        DOM.trocoInputGroup.classList.add('hidden');

        DOM.btnAdicionarPagamento.disabled = true;
        DOM.btnDividirRestante.disabled = true;

        if (mesa.status === 'Livre' || !mesa.pedido || mesa.pedido.length === 0) {
            DOM.btnCancelarPedidoMesa.classList.add('hidden');
            DOM.btnFinalizarContaMesa.disabled = true;
            DOM.btnAdicionarPagamento.disabled = true;
            DOM.mesaItensSelecaoContainer.innerHTML = '<p class="text-gray-500 text-center">Nenhum item para exibir ou mesa livre.</p>';
        } else {
            DOM.btnCancelarPedidoMesa.classList.remove('hidden');
        }

        updateCheckoutStatus();
        DOM.modalMesaDetalhes.classList.remove('hidden');
        DOM.modalMesaDetalhes.classList.add('flex');
    }).catch(error => {
        console.error("Erro ao abrir modal de mesa:", error);
        alert("Erro ao carregar detalhes da mesa.");
    });
}

function fecharModalMesaDetalhes() {
    DOM.modalMesaDetalhes.classList.add('hidden');
    currentMesaIdForCheckout = null;
    currentMesaItemsToPay = [];
    currentMesaTotal = 0;
    currentMesaRemainingToPay = 0;
    currentMesaPaymentsHistory = [];
}

function renderMesaItemsForCheckout() {
    if (!DOM.mesaItensSelecaoContainer) return;
    DOM.mesaItensSelecaoContainer.innerHTML = '';
    DOM.emptyItemsMessage.classList.add('hidden');

    const pendingItems = currentMesaItemsToPay.filter(item => item.remainingQuantity > 0);

    if (pendingItems.length === 0) {
        DOM.emptyItemsMessage.classList.remove('hidden');
        DOM.valorAPagarInput.value = currentMesaRemainingToPay.toFixed(2);
        updateCheckoutStatus();
        return;
    }

    pendingItems.forEach((item, index) => {
        let sizeInfo = item.size ? ` (${item.size})` : '';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center gap-2 border-b border-gray-200 py-2 last:border-b-0';
        itemDiv.innerHTML = `
            <div class="flex-1">
                <p class="font-medium text-gray-800">${item.name}${sizeInfo}</p>
                <p class="text-sm text-gray-600">Total: ${item.originalQuantity} un. | Restante: ${item.remainingQuantity} un.</p>
            </div>
            <div class="flex items-center gap-2">
                <button class="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700 decrease-pay-quantity-btn" data-index="${index}" ${item.selectedToPayQuantity === 0 ? 'disabled' : ''}>-</button>
                <input type="number" class="w-16 p-1 border rounded text-center selected-pay-quantity-input"
                        value="${item.selectedToPayQuantity}" min="0" max="${item.remainingQuantity}" step="1" data-index="${index}">
                <button class="px-2 py-1 bg-blue-200 rounded-md hover:bg-blue-300 text-blue-800 increase-pay-quantity-btn" data-index="${index}" ${item.selectedToPayQuantity >= item.remainingQuantity ? 'disabled' : ''}>+</button>
            </div>
            <span class="text-gray-700 font-semibold w-20 text-right">R$ ${(item.price * item.selectedToPayQuantity).toFixed(2)}</span>
        `;
        DOM.mesaItensSelecaoContainer.appendChild(itemDiv);
    });

    DOM.mesaItensSelecaoContainer.querySelectorAll('.decrease-pay-quantity-btn').forEach(button => {
        button.addEventListener('click', handlePayQuantityButton);
    });
    DOM.mesaItensSelecaoContainer.querySelectorAll('.increase-pay-quantity-btn').forEach(button => {
        button.addEventListener('click', handlePayQuantityButton);
    });
    DOM.mesaItensSelecaoContainer.querySelectorAll('.selected-pay-quantity-input').forEach(input => {
        input.addEventListener('input', handlePayQuantityInput);
    });

    DOM.valorAPagarInput.value = calculateSelectedItemsTotalForCurrentPayment().toFixed(2);
    updateCheckoutStatus();
}

function handlePayQuantityButton(event) {
    const button = event.target.closest('button');
    const index = parseInt(button.dataset.index);
    const item = currentMesaItemsToPay.filter(i => i.remainingQuantity > 0)[index];

    if (button.classList.contains('increase-pay-quantity-btn')) {
        if (item.selectedToPayQuantity < item.remainingQuantity) {
            item.selectedToPayQuantity++;
        }
    } else if (button.classList.contains('decrease-pay-quantity-btn')) {
        if (item.selectedToPayQuantity > 0) {
            item.selectedToPayQuantity--;
        }
    }
    renderMesaItemsForCheckout();
    DOM.valorAPagarInput.value = calculateSelectedItemsTotalForCurrentPayment().toFixed(2);
    updateCheckoutStatus();
}

function handlePayQuantityInput(event) {
    const input = event.target;
    const index = parseInt(input.dataset.index);
    const item = currentMesaItemsToPay.filter(i => i.remainingQuantity > 0)[index];

    let newQuantity = parseInt(input.value);
    if (isNaN(newQuantity) || newQuantity < 0) {
        newQuantity = 0;
    }
    if (newQuantity > item.remainingQuantity) {
        newQuantity = item.remainingQuantity;
        input.value = newQuantity;
    }
    item.selectedToPayQuantity = newQuantity;

    DOM.valorAPagarInput.value = calculateSelectedItemsTotalForCurrentPayment().toFixed(2);
    updateCheckoutStatus();
}

function calculateSelectedItemsTotalForCurrentPayment() {
    return currentMesaItemsToPay.reduce((sum, item) => sum + (item.price * item.selectedToPayQuantity), 0);
}

function renderPagamentoHistory() {
    if (!DOM.historicoPagamentosContainer) return;
    DOM.historicoPagamentosContainer.innerHTML = '';
    DOM.emptyPaymentsMessage.classList.add('hidden');

    if (currentMesaPaymentsHistory.length === 0) {
        DOM.emptyPaymentsMessage.classList.remove('hidden');
        return;
    }

    currentMesaPaymentsHistory.forEach((payment, index) => {
        const paymentDiv = document.createElement('div');
        paymentDiv.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';
        let trocoInfo = '';
        if (payment.troco !== null && payment.troco !== undefined && payment.troco > 0) {
            trocoInfo = `<span class="text-xs text-gray-600 ml-2">(Troco: R$ ${payment.troco.toFixed(2)})</span>`;
        } else if (payment.troco !== null && payment.troco !== undefined && payment.troco === 0) {
            trocoInfo = `<span class="text-xs text-gray-600 ml-2">(Sem troco)</span>`;
        }

        paymentDiv.innerHTML = `
            <span>${index + 1}. ${payment.metodo} - R$ ${payment.valorPago.toFixed(2)} ${trocoInfo}</span>
            <button class="text-red-500 hover:text-red-700 remove-payment-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
        `;
        DOM.historicoPagamentosContainer.appendChild(paymentDiv);
    });

    DOM.historicoPagamentosContainer.querySelectorAll('.remove-payment-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const indexToRemove = parseInt(event.target.closest('button').dataset.index);
            removePayment(indexToRemove);
        });
    });
}

function removePayment(index) {
    const payment = currentMesaPaymentsHistory[index];
    currentMesaPaymentsHistory.splice(index, 1);

    const totalPaidSoFar = currentMesaPaymentsHistory.reduce((sum, p) => sum + p.valorPago, 0);
    currentMesaRemainingToPay = currentMesaTotal - totalPaidSoFar;
    DOM.mesaTotalPago.textContent = `R$ ${totalPaidSoFar.toFixed(2)}`;

    updateCheckoutStatus();
    renderPagamentoHistory();
}

function updateCheckoutStatus() {
    const selectedItemsTotal = calculateSelectedItemsTotalForCurrentPayment();
    const currentPaymentMethod = DOM.pagamentoMetodoAtual.value;
    const trocoReceived = parseFloat(DOM.trocoRecebidoInput.value) || 0;
    const totalPaidSoFar = currentMesaPaymentsHistory.reduce((sum, p) => sum + p.valorPago, 0);

    currentMesaRemainingToPay = currentMesaTotal - totalPaidSoFar;
    if (currentMesaRemainingToPay < 0.01 && currentMesaRemainingToPay > -0.01) {
        currentMesaRemainingToPay = 0;
    }

    DOM.mesaTotalPago.textContent = `R$ ${totalPaidSoFar.toFixed(2)}`;
    DOM.mesaRestantePagar.textContent = `R$ ${currentMesaRemainingToPay.toFixed(2)}`;

    const isValorAPagarInputValid = parseFloat(DOM.valorAPagarInput.value) > 0 && parseFloat(DOM.valorAPagarInput.value) <= currentMesaRemainingToPay + 0.01;
    const hasItemsSelected = selectedItemsTotal > 0;

    if (currentPaymentMethod && (isValorAPagarInputValid || hasItemsSelected)) {
        DOM.btnAdicionarPagamento.disabled = false;
    } else {
        DOM.btnAdicionarPagamento.disabled = true;
    }

    const numPessoasDividir = parseInt(DOM.dividirPorInput.value, 10);
    DOM.btnDividirRestante.disabled = currentMesaRemainingToPay <= 0.01 || isNaN(numPessoasDividir) || numPessoasDividir <= 0;

    DOM.btnFinalizarContaMesa.disabled = currentMesaRemainingToPay > 0.01;

    if (currentPaymentMethod === 'Dinheiro') {
        DOM.trocoInputGroup.classList.remove('hidden');
    } else {
        DOM.trocoInputGroup.classList.add('hidden');
        DOM.trocoRecebidoInput.value = '';
    }
}

DOM.valorAPagarInput.addEventListener('input', updateCheckoutStatus);
DOM.pagamentoMetodoAtual.addEventListener('change', updateCheckoutStatus);
DOM.trocoRecebidoInput.addEventListener('input', updateCheckoutStatus);

DOM.btnAdicionarPagamento.addEventListener('click', () => {
    let valueToPay = parseFloat(DOM.valorAPagarInput.value);
    const currentPaymentMethod = DOM.pagamentoMetodoAtual.value;
    const trocoReceived = parseFloat(DOM.trocoRecebidoInput.value) || 0;

    if (isNaN(valueToPay) || valueToPay <= 0) {
        alert('Por favor, digite um valor válido para esta parcela.');
        return;
    }
    if (!currentPaymentMethod) {
        alert('Selecione um método de pagamento.');
        return;
    }
    if (valueToPay > currentMesaRemainingToPay + 0.01) {
        alert(`O valor da parcela (R$ ${valueToPay.toFixed(2)}) é maior que o restante a pagar da mesa (R$ ${currentMesaRemainingToPay.toFixed(2)}).`);
        return;
    }

    let trocoADevolver = 0;
    if (currentPaymentMethod === 'Dinheiro') {
        if (trocoReceived < valueToPay) {
            alert(`O valor recebido (R$ ${trocoReceived.toFixed(2)}) é menor que a parcela a pagar (R$ ${valueToPay.toFixed(2)}).`);
            return;
        }
        trocoADevolver = trocoReceived - valueToPay;
    }

    currentMesaPaymentsHistory.push({
        metodo: currentPaymentMethod,
        valorPago: valueToPay,
        valorRecebido: currentPaymentMethod === 'Dinheiro' ? trocoReceived : null,
        troco: currentPaymentMethod === 'Dinheiro' ? trocoADevolver : null,
        timestamp: Date.now(),
        itemsPaid: currentMesaItemsToPay
            .filter(item => item.selectedToPayQuantity > 0)
            .map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.selectedToPayQuantity,
                size: item.size || undefined
            }))
    });

    currentMesaItemsToPay.forEach(item => {
        item.remainingQuantity -= item.selectedToPayQuantity;
        item.selectedToPayQuantity = 0;
    });

    DOM.valorAPagarInput.value = '';
    DOM.trocoRecebidoInput.value = '';
    DOM.pagamentoMetodoAtual.value = '';

    renderMesaItemsForCheckout();
    renderPagamentoHistory();
    updateCheckoutStatus();

    if (currentPaymentMethod === 'Dinheiro' && trocoADevolver > 0) {
        alert(`Pagamento adicionado com sucesso!\nTROCO A DEVOLVER: R$ ${trocoADevolver.toFixed(2)}`);
    } else {
        alert('Pagamento adicionado com sucesso!');
    }
});

DOM.btnDividirRestante.addEventListener('click', () => {
    const numPessoas = parseInt(DOM.dividirPorInput.value, 10);
    if (isNaN(numPessoas) || numPessoas <= 0) {
        alert('Por favor, digite um número válido de pessoas para dividir.');
        return;
    }
    if (currentMesaRemainingToPay <= 0.01) {
        alert('Não há valor restante para dividir.');
        return;
    }

    const valorPorPessoa = currentMesaRemainingToPay / numPessoas;
    DOM.valorAPagarInput.value = valorPorPessoa.toFixed(2);

    currentMesaItemsToPay.forEach(item => item.selectedToPayQuantity = 0);
    renderMesaItemsForCheckout();

    DOM.dividirPorInput.value = '';

    updateCheckoutStatus();

    alert(`O valor por pessoa (R$ ${valorPorPessoa.toFixed(2)}) foi preenchido no campo "Valor desta Parcela". Agora, selecione o método de pagamento e clique em "Adicionar Pagamento".`);
});

DOM.dividirPorInput.addEventListener('input', updateCheckoutStatus);


DOM.btnCancelarPedidoMesa.addEventListener('click', () => {
    if (!currentMesaIdForCheckout) return;

    if (confirm(`Tem certeza que deseja CANCELAR COMPLETAMENTE o pedido da Mesa ${currentMesaIdForCheckout}? A mesa será liberada e o pedido não será registrado.`)) {
        mesasRef.child(currentMesaIdForCheckout).update({
            status: 'Livre',
            cliente: '',
            garcom: '',
            observacoes: '',
            pedido: null,
            total: 0
        })
            .then(() => {
                alert(`Pedido da Mesa ${currentMesaIdForCheckout} cancelado e mesa liberada.`);
                fecharModalMesaDetalhes();
            })
            .catch(error => {
                console.error("Erro ao cancelar pedido da mesa:", error);
                alert("Erro ao cancelar pedido da mesa.");
            });
    }
});


DOM.btnFinalizarContaMesa.addEventListener('click', () => {
    if (!currentMesaIdForCheckout) return;

    if (currentMesaRemainingToPay > 0.01) {
        alert('Ainda há um valor restante a pagar. Adicione todos os pagamentos antes de finalizar.');
        return;
    }

    if (confirm(`Confirmar FINALIZAÇÃO da conta da Mesa ${currentMesaIdForCheckout}?`)) {
        mesasRef.child(currentMesaIdForCheckout).once('value', async (snapshot) => {
            const mesaAtual = snapshot.val();
            if (!mesaAtual) {
                alert('Erro: Dados da mesa não encontrados para finalizar a conta.');
                return;
            }

            // Lógica de registro de consumo para mesas (replicando o de finalizarPedido)
            if (mesaAtual.pedido && Array.isArray(mesaAtual.pedido)) {
                for (const itemPedido of mesaAtual.pedido) {
                    try {
                        let produtoRefPath = null;
                        const categories = ['pizzas', 'bebidas', 'esfirras', 'calzone', 'promocoes', 'novidades'];

                        for (const cat of categories) {
                            const productsSnapshot = await produtosRef.child(cat).orderByChild('nome').equalTo(itemPedido.name).once('value');
                            if (productsSnapshot.exists()) {
                                const productId = Object.keys(productsSnapshot.val())[0];
                                produtoRefPath = `${cat}/${productId}`;
                                break;
                            }
                        }

                        if (produtoRefPath) {
                            const produtoSnapshot = await produtosRef.child(produtoRefPath).once('value');
                            const produtoAssociado = produtoSnapshot.val();

                            if (produtoAssociado) {
                                let receitaParaConsumo = null;
                                let isPizza = produtoAssociado.tipo === 'pizza';

                                if (isPizza && itemPedido.size) {
                                    receitaParaConsumo = produtoAssociado.receita?.[itemPedido.size];
                                } else {
                                    receitaParaConsumo = produtoAssociado.receita;
                                }

                                if (receitaParaConsumo) {
                                    for (const ingredienteId in receitaParaConsumo) {
                                        const quantidadePorUnidadeProduto = receitaParaConsumo[ingredienteId];
                                        const quantidadeTotalConsumida = quantidadePorUnidadeProduto * itemPedido.quantity;
                                        const custoUnitario = allIngredients[ingredienteId]?.custoUnitarioMedio || 0;
                                        const custoTotalConsumido = quantidadeTotalConsumida * custoUnitario;

                                        const ingredienteRef = ingredientesRef.child(ingredienteId);
                                        await ingredienteRef.transaction(currentData => {
                                            if (currentData) {
                                                currentData.quantidadeUsadaMensal = (currentData.quantidadeUsadaMensal || 0) + quantidadeTotalConsumida;
                                                currentData.custoUsadoMensal = (currentData.custoUsadoMensal || 0) + custoTotalConsumido;
                                                currentData.quantidadeUsadaDiaria = (currentData.quantidadeUsadaDiaria || 0) + quantidadeTotalConsumida;
                                                currentData.custoUsadoDiaria = (currentData.custoUsadoDiaria || 0) + custoTotalConsumido;
                                                currentData.ultimaAtualizacaoConsumo = firebase.database.ServerValue.TIMESTAMP;
                                            }
                                            return currentData;
                                        });
                                        console.log(`Consumo de ${allIngredients[ingredienteId]?.nome || ingredienteId} (mesa) incrementado: Qtd: ${quantidadeTotalConsumida.toFixed(3)}, Custo: R$ ${custoTotalConsumido.toFixed(2)}`);
                                    }
                                } else {
                                    console.warn(`Receita para o produto "${itemPedido.name}" (mesa, Tamanho: ${itemPedido.size || 'N/A'}) não encontrada ou não configurada.`);
                                }
                            } else {
                                console.warn(`Produto "${itemPedido.name}" (mesa) não encontrado para dedução.`);
                            }
                        } else {
                            console.warn(`Produto "${itemPedido.name}" (mesa) não encontrado em nenhuma categoria para dedução.`);
                        }
                    } catch (error) {
                        console.error(`Erro ao registrar consumo para o item ${itemPedido.name} (mesa):`, error);
                    }
                }
            }
            // Fim da lógica de registro de consumo para mesas


            const novoPedidoId = database.ref('pedidos').push().key;
            const pedidoFinalizado = {
                tipoAtendimento: 'Presencial',
                mesaNumero: mesaAtual.numero,
                cliente: mesaAtual.cliente,
                garcom: mesaAtual.garcom,
                observacoes: mesaAtual.observacoes,
                cart: mesaAtual.pedido,
                totalOriginal: mesaAtual.total,
                totalPago: currentMesaTotal,
                pagamentosRegistrados: currentMesaPaymentsHistory,
                status: 'Finalizado',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            database.ref('pedidos/' + novoPedidoId).set(pedidoFinalizado)
                .then(() => {
                    return mesasRef.child(currentMesaIdForCheckout).update({
                        status: 'Livre',
                        cliente: '',
                        garcom: '',
                        observacoes: '',
                        pedido: null,
                        total: 0
                    });
                })
                .then(() => {
                    alert(`Conta da Mesa ${mesaAtual.numero} finalizada e mesa liberada!`);
                    fecharModalMesaDetalhes();
                })
                .catch(error => {
                    console.error("Erro ao finalizar conta da mesa:", error);
                    alert("Erro ao finalizar conta da mesa.");
                });
        });
    }
});

// Cupons
DOM.btnSalvarCupom.addEventListener('click', () => {
    const codigo = DOM.cupomCodigoInput.value.trim().toUpperCase();
    const valor = parseFloat(DOM.cupomValorInput.value);
    const tipo = DOM.cupomTipoSelect.value;
    const valorMinimo = parseFloat(DOM.cupomMinValorInput.value) || 0;
    const validade = DOM.validadeCupomInput.value;

    if (!codigo) {
        alert("O código do cupom é obrigatório.");
        return;
    }
    if (isNaN(valor) || valor <= 0) {
        alert("O valor do desconto deve ser um número positivo.");
        return;
    }
    if (!validade) {
        alert("A data de validade é obrigatória.");
        return;
    }

    const cupomData = {
        codigo: codigo,
        valor: valor,
        tipo: tipo,
        valorMinimo: valorMinimo,
        validade: new Date(validade).getTime() + (23 * 60 * 60 * 1000 + 59 * 60 * 1000), // Fim do dia
        ativo: true,
        usos: 0
    };

    cuponsRef.child(codigo).set(cupomData)
        .then(() => {
            alert(`Cupom "${codigo}" salvo com sucesso!`);
            DOM.cupomCodigoInput.value = '';
            DOM.cupomValorInput.value = '';
            DOM.cupomMinValorInput.value = '';
            DOM.validadeCupomInput.value = '';
            carregarCupons();
        })
        .catch(error => {
            console.error("Erro ao salvar cupom:", error);
            alert("Erro ao salvar cupom: " + error.message);
        });
});

function carregarCupons() {
    cuponsRef.on('value', (snapshot) => {
        if (!DOM.listaCuponsContainer) return;
        const cupons = snapshot.val();
        DOM.listaCuponsContainer.innerHTML = '';

        if (!cupons) {
            DOM.listaCuponsContainer.innerHTML = '<p class="text-gray-600 col-span-full text-center">Nenhum cupom cadastrado.</p>';
            return;
        }

        Object.entries(cupons).forEach(([codigo, cupom]) => {
            const cupomDiv = document.createElement('div');
            cupomDiv.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col justify-between';

            const validadeDate = new Date(cupom.validade);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const expirado = validadeDate < hoje;

            const statusClass = cupom.ativo && !expirado ? 'text-green-600' : 'text-red-600';
            const statusText = expirado ? 'Expirado' : (cupom.ativo ? 'Ativo' : 'Inativo');
            const valorTexto = cupom.tipo === 'porcentagem' ? `${cupom.valor}%` : `R$ ${cupom.valor.toFixed(2)}`;

            cupomDiv.innerHTML = `
                <div class="flex-grow">
                    <h3 class="text-lg font-semibold text-gray-800">${cupom.codigo}</h3>
                    <p class="text-gray-700">Desconto: <strong>${valorTexto}</strong></p>
                    <p class="text-gray-700">Validade: <strong>${new Date(cupom.validade).toLocaleDateString()}</strong></p>
                    ${cupom.valorMinimo > 0 ? `<p class="text-gray-700">Pedido Mínimo: <strong>R$ ${cupom.valorMinimo.toFixed(2)}</strong></p>` : ''}
                    <p class="text-gray-700">Usos: <strong>${cupom.usos || 0}</strong></p>
                    <p class="font-medium ${statusClass}">Status: ${statusText}</p>
                </div>
                <div class="flex gap-2 mt-4">
                    <button class="btn-toggle-ativo bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm flex-1" data-codigo="${codigo}" data-ativo="${cupom.ativo}">
                        ${cupom.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button class="btn-excluir-cupom bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm flex-1" data-codigo="${codigo}">
                        Excluir
                    </button>
                </div>
            `;

            DOM.listaCuponsContainer.appendChild(cupomDiv);
        });
    });

    DOM.listaCuponsContainer.addEventListener('click', (e) => {
        const toggleButton = e.target.closest('.btn-toggle-ativo');
        const deleteButton = e.target.closest('.btn-excluir-cupom');

        if (toggleButton) {
            const codigo = toggleButton.dataset.codigo;
            const ativo = toggleButton.dataset.ativo === 'true';
            cuponsRef.child(codigo).update({ ativo: !ativo })
                .then(() => alert(`Status do cupom ${codigo} alterado!`))
                .catch(error => alert("Erro ao atualizar status do cupom: " + error.message));
        }

        if (deleteButton) {
            const codigo = deleteButton.dataset.codigo;
            if (confirm(`Deseja realmente excluir o cupom ${codigo}?`)) {
                cuponsRef.child(codigo).remove()
                    .then(() => alert(`Cupom ${codigo} excluído com sucesso!`))
                    .catch(error => alert("Erro ao excluir cupom: " + error.message));
            }
        }
    });

    document.addEventListener('input', (event) => {
        if (event.target.classList.contains('uppercase-input')) {
            const input = event.target;
            const start = input.selectionStart;
            const end = input.selectionEnd;
            input.value = input.value.toUpperCase();
            input.setSelectionRange(start, end);
        }
    });
}

    // --- FUNÇÕES DE GERENCIAMENTO DETALHADO (Cadastrar Ingredientes) ---
    async function handleSalvarIngredienteDetalhe() {
        const nome = DOM.ingredienteNomeDetalheInput.value.trim();
        const unidade = DOM.ingredienteUnidadeDetalheInput.value.trim();
        const estoqueMinimo = parseFloat(DOM.ingredienteEstoqueMinimoDetalheInput.value) || 0;

        if (!nome || !unidade) {
            alert('Por favor, preencha o nome e a unidade de medida do ingrediente.');
            return;
        }
        if (isNaN(estoqueMinimo) || estoqueMinimo < 0) {
            alert('Por favor, insira um valor válido para o estoque mínimo.');
            return;
        }

        try {
            const snapshot = await ingredientesRef.orderByChild('nome').equalTo(nome).once('value');
            if (snapshot.exists()) {
                const existingIngredientId = Object.keys(snapshot.val())[0];
                await ingredientesRef.child(existingIngredientId).update({
                    unidadeMedida: unidade,
                    estoqueMinimo: estoqueMinimo
                });
                alert(`Ingrediente "${nome}" atualizado com sucesso!`);
            } else {
                await ingredientesRef.push({
                    nome: nome,
                    unidadeMedida: unidade,
                    quantidadeAtual: 0,
                    custoUnitarioMedio: 0,
                    estoqueMinimo: estoqueMinimo,
                    quantidadeUsadaMensal: 0,
                    custoUsadoMensal: 0,
                    quantidadeUsadaDiaria: 0,
                    custoUsadoDiaria: 0,
                    ultimaAtualizacaoConsumo: firebase.database.ServerValue.TIMESTAMP
                });
                alert(`Ingrediente "${nome}" adicionado com sucesso!`);
            }
            DOM.ingredienteNomeDetalheInput.value = '';
            DOM.ingredienteUnidadeDetalheInput.value = '';
            DOM.ingredienteEstoqueMinimoDetalheInput.value = '';
        } catch (error) {
            console.error('Erro ao salvar ingrediente:', error);
            alert('Erro ao salvar ingrediente. Verifique o console para mais detalhes.');
        }
    }

    async function handleUpdateIngrediente(event) {
        const ingredienteId = event.target.dataset.id;
        const input = document.getElementById(`qtd-atual-${ingredienteId}`); // Este ID é único por ingrediente
        const novaQuantidade = parseFloat(input.value);

        if (isNaN(novaQuantidade) || novaQuantidade < 0) {
            alert('Por favor, insira uma quantidade válida.');
            return;
        }

        try {
            await ingredientesRef.child(ingredienteId).update({ quantidadeAtual: novaQuantidade });
            alert('Estoque atualizado manualmente com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar ingrediente:', error);
            alert('Erro ao atualizar ingrediente.');
        }
    }

    async function handleDeleteIngrediente(event) {
        const ingredienteId = event.target.dataset.id;
        const ingredienteNome = allIngredients[ingredienteId]?.nome || 'este ingrediente';

        if (confirm(`Tem certeza que deseja excluir "${ingredienteNome}"? Isso também removerá ele de todas as receitas.`)) {
            try {
                await ingredientesRef.child(ingredienteId).remove();
                const categorias = ['pizzas', 'bebidas', 'esfirras', 'calzone', 'promocoes', 'novidades'];
                for (const categoria of categorias) {
                    const productsSnapshot = await produtosRef.child(categoria).once('value');
                    if (productsSnapshot.exists()) {
                        productsSnapshot.forEach(produtoChild => {
                            const produtoData = produtoChild.val();
                            if (produtoData.tipo === 'pizza' && produtoData.receita) {
                                // Verifica em ambos os tamanhos
                                if (produtoData.receita.grande && produtoData.receita.grande[ingredienteId]) {
                                    delete produtoData.receita.grande[ingredienteId];
                                }
                                if (produtoData.receita.broto && produtoData.receita.broto[ingredienteId]) {
                                    delete produtoData.receita.broto[ingredienteId];
                                }
                                produtosRef.child(categoria).child(produtoChild.key).update({ receita: produtoData.receita });
                            } else if (produtoData.receita && produtoData.receita[ingredienteId]) {
                                const updatedReceita = { ...produtoData.receita };
                                delete updatedReceita[ingredienteId];
                                produtosRef.child(categoria).child(produtoChild.key).update({ receita: updatedReceita });
                            }
                        });
                    }
                }
                alert(`Ingrediente "${ingredienteNome}" excluído com sucesso!`);
            } catch (error) {
                console.error('Erro ao excluir ingrediente:', error);
                alert('Erro ao excluir ingrediente.');
            }
        }
    }

    // --- FUNÇÕES DE GERENCIAMENTO DETALHADO (Registro de Compras) ---
    function popularIngredientesParaCompraSelects() {
        DOM.compraIngredienteSelectDetalhe.innerHTML = '<option value="">Selecione um ingrediente</option>';
        const sortedIngredients = Object.entries(allIngredients).sort(([, a], [, b]) => a.nome.localeCompare(b.nome));
        sortedIngredients.forEach(([id, ingrediente]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${ingrediente.nome} (${ingrediente.unidadeMedida})`;
            DOM.compraIngredienteSelectDetalhe.appendChild(option);
        });
    }

    function handleAddItemCompraDetalhe() {
        const ingredienteId = DOM.compraIngredienteSelectDetalhe.value;
        const quantidade = parseFloat(DOM.compraQuantidadeDetalheInput.value);
        const precoUnitario = parseFloat(DOM.compraPrecoUnitarioDetalheInput.value);

        if (!ingredienteId || isNaN(quantidade) || quantidade <= 0 || isNaN(precoUnitario) || precoUnitario <= 0) {
            alert('Por favor, selecione um ingrediente e insira quantidades e preços válidos.');
            return;
        }
        if (!allIngredients[ingredienteId]) {
            alert('Ingrediente selecionado não encontrado. Por favor, recarregue a página.');
            return;
        }

        const itemExistenteIndex = currentPurchaseItems.findIndex(item => item.ingredienteId === ingredienteId);

        if (itemExistenteIndex > -1) {
            alert('Este ingrediente já foi adicionado à lista de compra. Remova-o e adicione novamente com a quantidade/preco corretos.');
            return;
        }

        currentPurchaseItems.push({
            ingredienteId: ingredienteId,
            nome: allIngredients[ingredienteId].nome,
            unidadeMedida: allIngredients[ingredienteId].unidadeMedida,
            quantidade: quantidade,
            precoUnitario: precoUnitario
        });

        renderItensCompraDetalhe();
        DOM.compraIngredienteSelectDetalhe.value = '';
        DOM.compraQuantidadeDetalheInput.value = '';
        DOM.compraPrecoUnitarioDetalheInput.value = '';
        DOM.btnRegistrarCompraDetalhe.disabled = currentPurchaseItems.length === 0;
    }

    function renderItensCompraDetalhe() {
        DOM.itensCompraDetalheListContainer.innerHTML = '';
        if (currentPurchaseItems.length === 0) {
            DOM.itensCompraDetalheListContainer.innerHTML = '<p class="text-gray-600 text-center">Nenhum item adicionado a esta compra.</p>';
            return;
        }

        currentPurchaseItems.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';
            itemDiv.innerHTML = `
                <span>${item.nome}: <strong>${item.quantidade.toFixed(3)} ${item.unidadeMedida}</strong> a R$ ${item.precoUnitario.toFixed(2)}/un. (Total: R$ ${(item.quantidade * item.precoUnitario).toFixed(2)})</span>
                <button class="text-red-500 hover:text-red-700 btn-remove-item-compra" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
            `;
            DOM.itensCompraDetalheListContainer.appendChild(itemDiv);
        });

        DOM.itensCompraDetalheListContainer.querySelectorAll('.btn-remove-item-compra').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.target.closest('button').dataset.index);
                currentPurchaseItems.splice(indexToRemove, 1);
                renderItensCompraDetalhe();
                DOM.btnRegistrarCompraDetalhe.disabled = currentPurchaseItems.length === 0;
            });
        });
    }

    async function handleRegistrarCompraDetalhe() {
        const dataCompra = DOM.compraDataDetalheInput.value;
        const fornecedor = DOM.compraFornecedorDetalheInput.value.trim();

        if (!dataCompra) {
            alert('Por favor, preencha a data da compra.');
            return;
        }
        if (currentPurchaseItems.length === 0) {
            alert('Adicione pelo menos um item à compra antes de registrar.');
            return;
        }

        if (confirm('Deseja realmente registrar esta compra e atualizar o estoque?')) {
            try {
                let totalCompra = 0;
                const itemsParaFirebase = {};

                for (const item of currentPurchaseItems) {
                    await recalcularCustoUnitarioMedio(item.ingredienteId, item.quantidade, item.precoUnitario);
                    totalCompra += item.quantidade * item.precoUnitario;
                    itemsParaFirebase[item.ingredienteId] = {
                        nome: item.nome,
                        quantidade: item.quantidade,
                        precoUnitario: item.precoUnitario
                    };
                }

                await comprasRef.push({
                    data: dataCompra,
                    fornecedor: fornecedor || 'Não Informado',
                    itensComprados: itemsParaFirebase,
                    totalCompra: totalCompra.toFixed(2),
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });

                alert('Compra registrada e estoque atualizado com sucesso!');
                DOM.compraDataDetalheInput.valueAsDate = new Date();
                DOM.compraFornecedorDetalheInput.value = '';
                currentPurchaseItems = []; // Limpa a lista para nova compra
                renderItensCompraDetalhe();
                DOM.btnRegistrarCompraDetalhe.disabled = true;
            } catch (error) {
                console.error('Erro ao registrar compra:', error);
                alert('Erro ao registrar compra. Verifique o console.');
            }
        }
    }

    async function recalcularCustoUnitarioMedio(ingredienteId, quantidadeComprada, precoUnitarioCompra) {
        const ingredienteRef = ingredientesRef.child(ingredienteId);
        await ingredienteRef.transaction(currentData => {
            if (currentData) {
                const oldQuantity = currentData.quantidadeAtual || 0;
                const oldCost = currentData.custoUnitarioMedio || 0;

                const newTotalCost = (oldQuantity * oldCost) + (quantidadeComprada * precoUnitarioCompra);
                const newTotalQuantity = oldQuantity + quantidadeComprada;

                currentData.quantidadeAtual = newTotalQuantity;
                currentData.custoUnitarioMedio = newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
            }
            return currentData;
        });
    }

    // --- FUNÇÕES DE GERENCIAMENTO DETALHADO (Configurar Receitas) ---
    function popularIngredientesParaReceitaSelects() {
        DOM.receitaIngredienteSelectDetalhe.innerHTML = '<option value="">Selecione um ingrediente</option>';
        const sortedIngredients = Object.entries(allIngredients).sort(([, a], [, b]) => a.nome.localeCompare(b.nome));
        sortedIngredients.forEach(([id, ingrediente]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${ingrediente.nome} (${ingrediente.unidadeMedida})`;
            DOM.receitaIngredienteSelectDetalhe.appendChild(option);
        });
    }

    async function handleReceitaProdutoCategoriaChangeDetalhe(event) {
        const selectedCategory = event.target.value;
        DOM.receitaProdutoSelectDetalhe.innerHTML = '<option value="">Carregando produtos...</option>';
        DOM.receitaProdutoSelectDetalhe.disabled = true;
        DOM.receitaConfigDetalheContainer.classList.add('hidden');
        DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none';

        if (!selectedCategory) {
            DOM.receitaProdutoSelectDetalhe.innerHTML = '<option value="">Selecione uma categoria primeiro</option>';
            return;
        }

        try {
            const productsSnapshot = await produtosRef.child(selectedCategory).once('value');
            const products = [];
            productsSnapshot.forEach(childSnapshot => {
                const product = childSnapshot.val();
                products.push({ id: childSnapshot.key, nome: product.nome || product.titulo, tipo: product.tipo });
            });

            products.sort((a, b) => a.nome.localeCompare(b.nome));

            DOM.receitaProdutoSelectDetalhe.innerHTML = '<option value="">Selecione um produto</option>';
            products.forEach(prod => {
                const option = document.createElement('option');
                option.value = prod.id;
                option.textContent = prod.nome;
                option.dataset.tipo = prod.tipo;
                DOM.receitaProdutoSelectDetalhe.appendChild(option);
            });
            DOM.receitaProdutoSelectDetalhe.disabled = false;
        } catch (error) {
            console.error('Erro ao carregar produtos por categoria:', error);
            DOM.receitaProdutoSelectDetalhe.innerHTML = '<p>Erro ao carregar produtos</p>';
        }
    }

    async function handleReceitaProdutoSelectChangeDetalhe(event) {
        const selectedProductId = event.target.value;
        const selectedCategory = DOM.receitaProdutoSelectCategoriaDetalhe.value;
        const selectedOption = DOM.receitaProdutoSelectDetalhe.options[DOM.receitaProdutoSelectDetalhe.selectedIndex];
        const productType = selectedOption?.dataset.tipo;

        if (!selectedProductId || !selectedCategory) {
            DOM.receitaConfigDetalheContainer.classList.add('hidden');
            DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none';
            currentRecipeProduct = null;
            return;
        }

        const productName = selectedOption.textContent.trim();
        DOM.currentRecipeProductNameDetalhe.textContent = productName;
        DOM.receitaConfigDetalheContainer.classList.remove('hidden');

        if (productType === 'pizza') {
            DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'block';
            DOM.currentPizzaSizeDetalheSpan.textContent = ` (${DOM.pizzaTamanhoSelectDetalhe.value})`;
        } else {
            DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none';
            DOM.currentPizzaSizeDetalheSpan.textContent = '';
        }

        try {
            const produtoSnapshot = await produtosRef.child(selectedCategory).child(selectedProductId).once('value');
            const produtoData = produtoSnapshot.val();

            currentRecipeProduct = {
                id: selectedProductId,
                nome: productName,
                categoria: selectedCategory,
                tipo: productType,
                receita: produtoData?.receita || {}
            };
            renderIngredientesReceitaDetalhe();
            DOM.btnSalvarReceitaDetalhe.disabled = false;
        } catch (error) {
            console.error('Erro ao carregar receita:', error);
            alert('Erro ao carregar receita para este produto.');
            currentRecipeProduct = null;
            DOM.receitaConfigDetalheContainer.classList.add('hidden');
        }
    }

    function handlePizzaTamanhoSelectChangeDetalhe() {
        if (currentRecipeProduct && currentRecipeProduct.tipo === 'pizza') {
            DOM.currentPizzaSizeDetalheSpan.textContent = ` (${DOM.pizzaTamanhoSelectDetalhe.value})`;
            renderIngredientesReceitaDetalhe();
        }
    }

    function renderIngredientesReceitaDetalhe() {
        DOM.ingredientesParaReceitaDetalheList.innerHTML = '';
        let ingredientesDaReceita = {};

        if (currentRecipeProduct && currentRecipeProduct.tipo === 'pizza') {
            const tamanhoSelecionado = DOM.pizzaTamanhoSelectDetalhe.value;
            ingredientesDaReceita = currentRecipeProduct.receita?.[tamanhoSelecionado] || {};
        } else if (currentRecipeProduct) {
            ingredientesDaReceita = currentRecipeProduct.receita || {};
        }

        const ingredientIds = Object.keys(ingredientesDaReceita);

        if (ingredientIds.length === 0) {
            DOM.ingredientesParaReceitaDetalheList.innerHTML = '<p class="text-gray-600">Nenhum ingrediente adicionado a esta receita.</p>';
            return;
        }

        ingredientIds.forEach(ingredienteId => {
            const quantidade = ingredientesDaReceita[ingredienteId];
            const ingredienteInfo = allIngredients[ingredienteId];

            const listItem = document.createElement('div');
            listItem.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';

            if (ingredienteInfo) {
                listItem.innerHTML = `
                    <span>${ingredienteInfo.nome}: <strong>${quantidade.toFixed(3)} ${ingredienteInfo.unidadeMedida}</strong></span>
                    <button class="text-red-500 hover:text-red-700 btn-remove-ingrediente-receita" data-ingrediente-id="${ingredienteId}"><i class="fas fa-trash-alt"></i></button>
                `;
            } else {
                listItem.classList.remove('bg-gray-100');
                listItem.classList.add('bg-red-100', 'text-red-700');
                listItem.innerHTML = `
                    <span>Ingrediente Desconhecido (ID: ${ingredienteId}): <strong>${quantidade.toFixed(3)}</strong></span>
                    <button class="text-red-500 hover:text-red-700 btn-remove-ingrediente-receita" data-ingrediente-id="${ingredienteId}"><i class="fas fa-trash-alt"></i></button>
                `;
            }
            DOM.ingredientesParaReceitaDetalheList.appendChild(listItem);
        });

        DOM.ingredientesParaReceitaDetalheList.querySelectorAll('.btn-remove-ingrediente-receita').forEach(button => {
            button.addEventListener('click', handleRemoveIngredienteReceitaDetalhe);
        });
    }

    function handleAddIngredienteReceitaDetalhe() {
        if (!currentRecipeProduct) {
            alert('Selecione um produto primeiro.');
            return;
        }

        const ingredienteId = DOM.receitaIngredienteSelectDetalhe.value;
        const quantidade = parseFloat(DOM.receitaQuantidadeDetalheInput.value);

        if (!ingredienteId || isNaN(quantidade) || quantidade <= 0) {
            alert('Selecione um ingrediente e insira uma quantidade válida.');
            return;
        }

        if (!allIngredients[ingredienteId]) {
            alert('Ingrediente selecionado não encontrado. Por favor, recarregue a página.');
            return;
        }

        if (currentRecipeProduct.tipo === 'pizza') {
            const tamanhoSelecionado = DOM.pizzaTamanhoSelectDetalhe.value;
            if (!currentRecipeProduct.receita.hasOwnProperty(tamanhoSelecionado)) {
                currentRecipeProduct.receita[tamanhoSelecionado] = {};
            }
            currentRecipeProduct.receita[tamanhoSelecionado][ingredienteId] = quantidade;
        } else {
            currentRecipeProduct.receita[ingredienteId] = quantidade;
        }
        
        renderIngredientesReceitaDetalhe();
        DOM.receitaIngredienteSelectDetalhe.value = '';
        DOM.receitaQuantidadeDetalheInput.value = '';
    }

    async function handleSalvarReceitaDetalhe() {
        if (!currentRecipeProduct || !currentRecipeProduct.id || !currentRecipeProduct.categoria) {
            alert('Nenhum produto selecionado ou informações incompletas para salvar a receita.');
            return;
        }

        let custoCalculado = 0;
        if (currentRecipeProduct.tipo === 'pizza') {
            if (currentRecipeProduct.receita.grande) {
                custoCalculado += calcularCustoReceita(currentRecipeProduct.receita.grande);
            }
            if (currentRecipeProduct.receita.broto) {
                custoCalculado += calcularCustoReceita(currentRecipeProduct.receita.broto);
            }
        } else {
            custoCalculado = calcularCustoReceita(currentRecipeProduct.receita);
        }

        try {
            await produtosRef.child(currentRecipeProduct.categoria).child(currentRecipeProduct.id).update({
                receita: currentRecipeProduct.receita,
                custoIngredientes: custoCalculado
            });
            alert(`Receita para "${currentRecipeProduct.nome}" salva com sucesso! (Custo da Receita: R$ ${custoCalculado.toFixed(2)})`);
        } catch (error) {
            console.error('Erro ao salvar receita:', error);
            alert('Erro ao salvar receita.');
        }
    }

    function handleRemoveIngredienteReceitaDetalhe(event) {
        const ingredienteIdToRemove = event.target.closest('button').dataset.ingredienteId;
        if (!currentRecipeProduct) return;

        if (confirm('Tem certeza que deseja remover este ingrediente da receita?')) {
            if (currentRecipeProduct.tipo === 'pizza') {
                const tamanhoSelecionado = DOM.pizzaTamanhoSelectDetalhe.value;
                if (currentRecipeProduct.receita?.[tamanhoSelecionado]) {
                    delete currentRecipeProduct.receita[tamanhoSelecionado][ingredienteIdToRemove];
                    if (Object.keys(currentRecipeProduct.receita[tamanhoSelecionado]).length === 0) {
                        delete currentRecipeProduct.receita[tamanhoSelecionado];
                    }
                }
            } else {
                delete currentRecipeProduct.receita[ingredienteIdToRemove];
            }
            renderIngredientesReceitaDetalhe();
        }
    }

    function calcularCustoReceita(receita) {
        let custoTotal = 0;
        for (const ingredienteId in receita) {
            const quantidadeNecessaria = receita[ingredienteId];
            const ingredienteInfo = allIngredients[ingredienteId];
            if (ingredienteInfo && ingredienteInfo.custoUnitarioMedio !== undefined) {
                custoTotal += quantidadeNecessaria * (ingredienteInfo.custoUnitarioMedio || 0);
            } else {
                console.warn(`Ingrediente ${ingredienteId} não encontrado ou sem custo médio para cálculo da receita.`);
            }
        }
        return custoTotal;
    }

    // --- FUNÇÕES DE GERENCIAMENTO DETALHADO (Registro de Compras) ---
    function popularIngredientesParaCompraSelects() {
        DOM.compraIngredienteSelectDetalhe.innerHTML = '<option value="">Selecione um ingrediente</option>';
        const sortedIngredients = Object.entries(allIngredients).sort(([, a], [, b]) => a.nome.localeCompare(b.nome));
        sortedIngredients.forEach(([id, ingrediente]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${ingrediente.nome} (${ingrediente.unidadeMedida})`;
            DOM.compraIngredienteSelectDetalhe.appendChild(option);
        });
    }

    function handleAddItemCompraDetalhe() {
        const ingredienteId = DOM.compraIngredienteSelectDetalhe.value;
        const quantidade = parseFloat(DOM.compraQuantidadeDetalheInput.value);
        const precoUnitario = parseFloat(DOM.compraPrecoUnitarioDetalheInput.value);

        if (!ingredienteId || isNaN(quantidade) || quantidade <= 0 || isNaN(precoUnitario) || precoUnitario <= 0) {
            alert('Por favor, selecione um ingrediente e insira quantidades e preços válidos.');
            return;
        }
        if (!allIngredients[ingredienteId]) {
            alert('Ingrediente selecionado não encontrado. Por favor, recarregue a página.');
            return;
        }

        const itemExistenteIndex = currentPurchaseItems.findIndex(item => item.ingredienteId === ingredienteId);

        if (itemExistenteIndex > -1) {
            alert('Este ingrediente já foi adicionado à lista de compra. Remova-o e adicione novamente com a quantidade/preco corretos.');
            return;
        }

        currentPurchaseItems.push({
            ingredienteId: ingredienteId,
            nome: allIngredients[ingredienteId].nome,
            unidadeMedida: allIngredients[ingredienteId].unidadeMedida,
            quantidade: quantidade,
            precoUnitario: precoUnitario
        });

        renderItensCompraDetalhe();
        DOM.compraIngredienteSelectDetalhe.value = '';
        DOM.compraQuantidadeDetalheInput.value = '';
        DOM.compraPrecoUnitarioDetalheInput.value = '';
        DOM.btnRegistrarCompraDetalhe.disabled = currentPurchaseItems.length === 0;
    }

    function renderItensCompraDetalhe() {
        DOM.itensCompraDetalheListContainer.innerHTML = '';
        if (currentPurchaseItems.length === 0) {
            DOM.itensCompraDetalheListContainer.innerHTML = '<p class="text-gray-600 text-center">Nenhum item adicionado a esta compra.</p>';
            return;
        }

        currentPurchaseItems.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';
            itemDiv.innerHTML = `
                <span>${item.nome}: <strong>${item.quantidade.toFixed(3)} ${item.unidadeMedida}</strong> a R$ ${item.precoUnitario.toFixed(2)}/un. (Total: R$ ${(item.quantidade * item.precoUnitario).toFixed(2)})</span>
                <button class="text-red-500 hover:text-red-700 btn-remove-item-compra" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
            `;
            DOM.itensCompraDetalheListContainer.appendChild(itemDiv);
        });

        DOM.itensCompraDetalheListContainer.querySelectorAll('.btn-remove-item-compra').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.target.closest('button').dataset.index);
                currentPurchaseItems.splice(indexToRemove, 1);
                renderItensCompraDetalhe();
                DOM.btnRegistrarCompraDetalhe.disabled = currentPurchaseItems.length === 0;
            });
        });
    }

    async function handleRegistrarCompraDetalhe() {
        const dataCompra = DOM.compraDataDetalheInput.value;
        const fornecedor = DOM.compraFornecedorDetalheInput.value.trim();

        if (!dataCompra) {
            alert('Por favor, preencha a data da compra.');
            return;
        }
        if (currentPurchaseItems.length === 0) {
            alert('Adicione pelo menos um item à compra antes de registrar.');
            return;
        }

        if (confirm('Deseja realmente registrar esta compra e atualizar o estoque?')) {
            try {
                let totalCompra = 0;
                const itemsParaFirebase = {};

                for (const item of currentPurchaseItems) {
                    await recalcularCustoUnitarioMedio(item.ingredienteId, item.quantidade, item.precoUnitario);
                    totalCompra += item.quantidade * item.precoUnitario;
                    itemsParaFirebase[item.ingredienteId] = {
                        nome: item.nome,
                        quantidade: item.quantidade,
                        precoUnitario: item.precoUnitario
                    };
                }

                await comprasRef.push({
                    data: dataCompra,
                    fornecedor: fornecedor || 'Não Informado',
                    itensComprados: itemsParaFirebase,
                    totalCompra: totalCompra.toFixed(2),
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });

                alert('Compra registrada e estoque atualizado com sucesso!');
                DOM.compraDataDetalheInput.valueAsDate = new Date();
                DOM.compraFornecedorDetalheInput.value = '';
                currentPurchaseItems = []; // Limpa a lista para nova compra
                renderItensCompraDetalhe();
                DOM.btnRegistrarCompraDetalhe.disabled = true;
            } catch (error) {
                console.error('Erro ao registrar compra:', error);
                alert('Erro ao registrar compra. Verifique o console.');
            }
        }
    }

    async function recalcularCustoUnitarioMedio(ingredienteId, quantidadeComprada, precoUnitarioCompra) {
        const ingredienteRef = ingredientesRef.child(ingredienteId);
        await ingredienteRef.transaction(currentData => {
            if (currentData) {
                const oldQuantity = currentData.quantidadeAtual || 0;
                const oldCost = currentData.custoUnitarioMedio || 0;

                const newTotalCost = (oldQuantity * oldCost) + (quantidadeComprada * precoUnitarioCompra);
                const newTotalQuantity = oldQuantity + quantidadeComprada;

                currentData.quantidadeAtual = newTotalQuantity;
                currentData.custoUnitarioMedio = newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
            }
            return currentData;
        });
    }

    // --- FUNÇÕES DE RELATÓRIOS E ANÁLISES RÁPIDAS (Estoque) ---

    // Renderiza a lista de ingredientes em ponto de pedido
    function renderIngredientesPontoPedido(ingredientes) {
        if (!DOM.ingredientesPontoPedidoList) return;
        DOM.ingredientesPontoPedidoList.innerHTML = '';
        DOM.ingredientesPontoPedidoCount.textContent = ingredientes.length;

        if (ingredientes.length === 0) {
            DOM.ingredientesPontoPedidoList.innerHTML = '<p class="text-gray-600 text-center">Nenhum ingrediente abaixo do estoque mínimo.</p>';
            return;
        }

        ingredientes.sort((a,b) => a.nome.localeCompare(b.nome));

        ingredientes.forEach(ingrediente => {
            const listItem = document.createElement('div');
            listItem.className = 'flex justify-between items-center bg-red-100 text-red-800 p-2 rounded-md';
            listItem.innerHTML = `
                <span>${ingrediente.nome}: <strong>${(ingrediente.quantidadeAtual || 0).toFixed(2)} ${ingrediente.unidadeMedida}</strong></span>
                <span class="text-xs">Mínimo: ${ingrediente.estoqueMinimo} ${ingrediente.unidadeMedida}</span>
            `;
            DOM.ingredientesPontoPedidoList.appendChild(listItem);
        });
    }

    // Renderiza o consumo diário (para o dia anterior)
    function renderConsumoDiario() {
        if (!DOM.listaConsumoDiarioContainer || !DOM.dataDiaAnteriorSpan || !DOM.totalGastoDiarioSpan) return;

        DOM.listaConsumoDiarioContainer.innerHTML = '';
        let totalCustoOntem = 0;
        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        DOM.dataDiaAnteriorSpan.textContent = ontem.toLocaleDateString('pt-BR', options);

        const ingredientesConsumidosOntem = [];
        Object.values(allIngredients).forEach(ingrediente => {
            if (ingrediente.quantidadeUsadaDiaria > 0) { // Verifica se há consumo diário registrado
                ingredientesConsumidosOntem.push(ingrediente);
                totalCustoOntem += ingrediente.custoUsadoDiaria || 0;
            }
        });

        if (ingredientesConsumidosOntem.length === 0) {
            DOM.listaConsumoDiarioContainer.innerHTML = '<p class="text-gray-500 text-center">Nenhum consumo registrado para ontem.</p>';
        } else {
            ingredientesConsumidosOntem.sort((a,b) => b.quantidadeUsadaDiaria - a.quantidadeUsadaDiaria);
            ingredientesConsumidosOntem.forEach(ingrediente => {
                const listItem = document.createElement('div');
                listItem.className = 'flex justify-between items-center bg-gray-100 p-1 rounded-sm';
                listItem.innerHTML = `
                    <span>${ingrediente.nome}: <strong>${ingrediente.quantidadeUsadaDiaria.toFixed(3)} ${ingrediente.unidadeMedida}</strong></span>
                    <span class="text-xs">R$ ${ingrediente.custoUsadoDiaria.toFixed(2)}</span>
                `;
                DOM.listaConsumoDiarioContainer.appendChild(listItem);
            });
        }
        DOM.totalGastoDiarioSpan.textContent = `R$ ${totalCustoOntem.toFixed(2)}`;
    }

    // Renderiza o consumo mensal
    function renderConsumoMensal() {
        if (!DOM.listaConsumoMensalContainer || !DOM.totalGastoMensalSpan || !DOM.nomeMesAtualSpan) return;

        DOM.listaConsumoMensalContainer.innerHTML = '';
        let totalCustoMes = 0;
        const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        DOM.nomeMesAtualSpan.textContent = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1);

        const ingredientesConsumidosMes = [];
        Object.values(allIngredients).forEach(ingrediente => {
            if (ingrediente.quantidadeUsadaMensal > 0) {
                ingredientesConsumidosMes.push(ingrediente);
                totalCustoMes += ingrediente.custoUsadoMensal || 0;
            }
        });

        if (ingredientesConsumidosMes.length === 0) {
            DOM.listaConsumoMensalContainer.innerHTML = '<p class="text-gray-500 text-center">Nenhum consumo registrado para este mês.</p>';
        } else {
            ingredientesConsumidosMes.sort((a,b) => b.quantidadeUsadaMensal - a.quantidadeUsadaMensal);
            ingredientesConsumidosMes.forEach(ingrediente => {
                const listItem = document.createElement('div');
                listItem.className = 'flex justify-between items-center bg-gray-100 p-1 rounded-sm';
                listItem.innerHTML = `
                    <span>${ingrediente.nome}: <strong>${ingrediente.quantidadeUsadaMensal.toFixed(3)} ${ingrediente.unidadeMedida}</strong></span>
                    <span class="text-xs">R$ ${ingrediente.custoUsadoMensal.toFixed(2)}</span>
                `;
                DOM.listaConsumoMensalContainer.appendChild(listItem);
            });
        }
        DOM.totalGastoMensalSpan.textContent = `R$ ${totalCustoMes.toFixed(2)}`;
    }