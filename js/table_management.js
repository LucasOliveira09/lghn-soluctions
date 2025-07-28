const firebaseConfig = {
    apiKey: "AIzaSyCtz28du4JtLnPi-MlOgsiXRlb8k02Jwgc",
    authDomain: "cardapioweb-99e7b.firebaseapp.com",
    databaseURL: "https://cardapioweb-99e7b-default-rtdb.firebaseio.com",
    projectId: "cardapioweb-99e7b",
    storageBucket: "cardapioweb-99e7b.firebasestorage.app",
    messagingSenderId: "110849299422",
    appId: "1:110849299422:web:44083feefdd967f4f9434f",
    measurementId: "G-Y4KFGTHFP1"
};

firebase.initializeApp(firebaseConfig);

// --- INICIALIZAÇÃO DOS SERVIÇOS DO FIREBASE ---
const auth = firebase.auth();
const database = firebase.database();
const mesasRef = database.ref('central/mesas');
const pedidosRef = database.ref('central/pedidos');
const ingredientesRef = database.ref('central/ingredientes');
const produtosRef = database.ref('central/produtos');

// --- VARIÁVEIS GLOBAIS ---
let currentMesaIdForCheckout = null;
let currentMesaDataForCheckout = {}; // Armazena todos os dados da mesa atual
let allIngredients = {};
let allProducts = {};

// --- MAPEAMENTO DOS ELEMENTOS DO DOM ---
const DOM_TABLE_MGMT = {};

document.addEventListener('DOMContentLoaded', () => {
    // Atribui os elementos ao objeto DOM
    Object.assign(DOM_TABLE_MGMT, {
        btnVoltar: document.getElementById('btn-voltar'),
        numMesasInput: document.getElementById('num-mesas'),
        btnConfigurarMesas: document.getElementById('btn-configurar-mesas'),
        mesasContainer: document.getElementById('mesas-container'),
        modalMesaDetalhes: document.getElementById('modal-mesa-detalhes'),
        closeModalButton: document.querySelector('#modal-mesa-detalhes .close-modal'),
        modalMesaNumero: document.getElementById('modal-mesa-numero'),
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
        pagamentoMetodoAtual: document.getElementById('pagamento-metodo-atual'),
        trocoInputGroup: document.getElementById('troco-input-group'),
        trocoRecebidoInput: document.getElementById('troco-recebido'),
        btnAdicionarPagamento: document.getElementById('btn-adicionar-pagamento'),
        dividirPorInput: document.getElementById('dividir-por-input'),
        btnDividirRestante: document.getElementById('btn-dividir-restante'),
        historicoPagamentosContainer: document.getElementById('historico-pagamentos'),
        emptyPaymentsMessage: document.getElementById('empty-payments-message'),
        btnCancelarPedidoMesa: document.getElementById('btn-cancelar-pedido-mesa'),
        btnFinalizarContaMesa: document.getElementById('btn-finalizar-conta-mesa'),
    });

    // --- VERIFICAÇÃO DE AUTENTICAÇÃO ---
    auth.onAuthStateChanged(user => {
        if (user) {
            document.body.style.display = 'flex'; // Mostra o corpo da página se logado
            loadAdminData();
            mesasRef.on('value', renderMesas); // Ouve mudanças nas mesas em tempo real
        } else {
            window.location.replace('login.html'); // Redireciona se não estiver logado
        }
    });

    // --- EVENT LISTENERS ---
    if (DOM_TABLE_MGMT.btnVoltar) {
        DOM_TABLE_MGMT.btnVoltar.addEventListener('click', () => {
            window.location.href = 'painel.html';
        });
    }

    if (DOM_TABLE_MGMT.btnConfigurarMesas) {
        DOM_TABLE_MGMT.btnConfigurarMesas.addEventListener('click', configureTables);
    }
    
    // Listeners do Modal
    if (DOM_TABLE_MGMT.closeModalButton) {
        DOM_TABLE_MGMT.closeModalButton.addEventListener('click', closeMesaDetalhesModal);
    }
    
    DOM_TABLE_MGMT.btnAdicionarPagamento.addEventListener('click', addMesaPayment);
    DOM_TABLE_MGMT.btnFinalizarContaMesa.addEventListener('click', finalizeMesaAccount);
    DOM_TABLE_MGMT.btnCancelarPedidoMesa.addEventListener('click', cancelMesaOrderAdmin);
    DOM_TABLE_MGMT.btnDividirRestante.addEventListener('click', splitMesaBill);

    // Listeners que atualizam o estado dos botões
    DOM_TABLE_MGMT.valorAPagarInput.addEventListener('input', updateCheckoutStatus);
    DOM_TABLE_MGMT.pagamentoMetodoAtual.addEventListener('change', updateCheckoutStatus);
    DOM_TABLE_MGMT.trocoRecebidoInput.addEventListener('input', updateCheckoutStatus);
    DOM_TABLE_MGMT.dividirPorInput.addEventListener('input', updateCheckoutStatus);
});

// --- CARREGAMENTO DE DADOS INICIAIS ---
async function loadAdminData() {
    try {
        const [ingredientsSnapshot, productsSnapshot] = await Promise.all([
            ingredientesRef.once('value'),
            produtosRef.once('value')
        ]);
        allIngredients = ingredientsSnapshot.val() || {};
        allProducts = productsSnapshot.val() || {};
        console.log("Admin: Dados de ingredientes e produtos carregados.");
    } catch (error) {
        console.error("Admin: Erro ao carregar dados iniciais:", error);
        alert("Erro fatal ao carregar dados essenciais. Verifique a conexão e as regras do Firebase.");
    }
}

// --- FUNÇÕES DE GERENCIAMENTO DE MESAS (Renderização e Configuração) ---
function configureTables() {
    const numMesas = parseInt(DOM_TABLE_MGMT.numMesasInput.value, 10);
    if (isNaN(numMesas) || numMesas < 1 || numMesas > 20) {
        alert("Por favor, insira um número de mesas válido entre 1 e 20.");
        return;
    }

    if (confirm(`Deseja configurar ${numMesas} mesas? Isso redefinirá o estado de TODAS as mesas existentes.`)) {
        mesasRef.remove()
            .then(() => {
                const updates = {};
                for (let i = 1; i <= numMesas; i++) {
                    updates[i] = {
                        numero: i, status: 'Livre', cliente: '', garcom: '',
                        observacoes: '', pedido: null, total: 0,
                        pagamentosRegistrados: null, lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    };
                }
                return mesasRef.update(updates);
            })
            .then(() => alert(`${numMesas} mesas configuradas com sucesso!`))
            .catch(error => console.error("Erro ao configurar mesas:", error));
    }
}

function renderMesas(snapshot) {
    DOM_TABLE_MGMT.mesasContainer.innerHTML = '';
    const mesasData = snapshot.val() || {};
    const sortedMesas = Object.values(mesasData).sort((a, b) => a.numero - b.numero);

    if (sortedMesas.length === 0) {
        DOM_TABLE_MGMT.mesasContainer.innerHTML = '<p class="text-gray-600 text-center col-span-full">Nenhuma mesa configurada. Defina o número de mesas e clique em "Configurar Mesas".</p>';
        return;
    }

    DOM_TABLE_MGMT.numMesasInput.value = sortedMesas.length;

    sortedMesas.forEach(mesa => {
        let statusClass, statusColor, iconColor;
        switch (mesa.status) {
            case 'Livre':
                statusClass = 'table-status-free';
                statusColor = 'text-green-700';
                iconColor = 'text-green-500';
                break;
            case 'Ocupada':
                statusClass = 'table-status-occupied';
                statusColor = 'text-red-700';
                iconColor = 'text-red-500';
                break;
            case 'Aguardando Pagamento':
                statusClass = 'table-status-awaiting-payment';
                statusColor = 'text-yellow-700';
                iconColor = 'text-yellow-500';
                break;
        }

        const card = document.createElement('div');
        card.className = `table-card bg-white p-4 rounded-lg shadow-md border-2 text-center flex flex-col items-center justify-center ${statusClass}`;
        card.dataset.mesaNumero = mesa.numero;

        const totalDisplay = (mesa.total || 0).toFixed(2).replace('.', ',');
        
        // --- HTML DO CARTÃO ATUALIZADO ---
        card.innerHTML = `
            <i class="fas fa-utensils text-4xl mb-2 ${iconColor}"></i>
            <h3 class="text-2xl font-bold">Mesa ${mesa.numero}</h3>
            <span class="text-sm font-semibold ${statusColor}">${mesa.status}</span>
            ${mesa.status !== 'Livre' ? `
                <div class="mt-2 text-sm">
                    <p class="truncate"><strong>Cliente:</strong> ${mesa.cliente || 'N/A'}</p>
                    <p class="truncate"><strong>Garçom:</strong> ${mesa.garcom || 'N/A'}</p>
                    <p class="font-bold text-blue-600 mt-1">R$ ${totalDisplay}</p>
                </div>
            ` : ''}
        `;
        card.addEventListener('click', () => openMesaDetalhesModal(mesa.numero));
        DOM_TABLE_MGMT.mesasContainer.appendChild(card);
    });
}

// --- FUNÇÕES DO MODAL DE CHECKOUT ---
async function openMesaDetalhesModal(mesaNumero) {
    try {
        const snapshot = await mesasRef.child(mesaNumero).once('value');
        if (!snapshot.exists()) {
            alert('Mesa não encontrada ou foi removida.');
            return;
        }
        currentMesaIdForCheckout = mesaNumero;
        currentMesaDataForCheckout = snapshot.val();

        // Preenche informações básicas
        DOM_TABLE_MGMT.modalMesaNumero.textContent = currentMesaDataForCheckout.numero;
        DOM_TABLE_MGMT.mesaDetalhesCliente.textContent = currentMesaDataForCheckout.cliente || 'N/A';
        DOM_TABLE_MGMT.mesaDetalhesGarcom.textContent = currentMesaDataForCheckout.garcom || 'N/A';
        DOM_TABLE_MGMT.mesaDetalhesObs.textContent = currentMesaDataForCheckout.observacoes || 'N/A';

        // Renderiza itens e histórico
        renderMesaItemsForCheckout();
        renderPagamentoHistory();
        updateCheckoutStatus(); // Atualiza todos os totais e status de botões

        // Mostra o modal
        DOM_TABLE_MGMT.modalMesaDetalhes.classList.remove('hidden');
        DOM_TABLE_MGMT.modalMesaDetalhes.classList.add('flex');
    } catch (error) {
        console.error("Erro ao abrir modal:", error);
        alert("Erro ao carregar detalhes da mesa.");
    }
}

function closeMesaDetalhesModal() {
    DOM_TABLE_MGMT.modalMesaDetalhes.classList.add('hidden');
    DOM_TABLE_MGMT.modalMesaDetalhes.classList.remove('flex');
    currentMesaIdForCheckout = null;
    currentMesaDataForCheckout = {};
}

// --- LÓGICA DE PAGAMENTO ---
async function addMesaPayment() {
    const valorPago = parseFloat(DOM_TABLE_MGMT.valorAPagarInput.value);
    const metodo = DOM_TABLE_MGMT.pagamentoMetodoAtual.value;

    // Validações
    if (isNaN(valorPago) || valorPago <= 0) {
        alert('Por favor, digite um valor válido para o pagamento.');
        return;
    }
    if (!metodo) {
        alert('Selecione um método de pagamento.');
        return;
    }
    const valorRestante = parseFloat(DOM_TABLE_MGMT.mesaRestantePagar.textContent.replace('R$ ', '').replace(',', '.'));
    if (valorPago > valorRestante + 0.01) { // 0.01 de margem para erros de float
        alert(`O valor do pagamento (R$ ${valorPago.toFixed(2)}) não pode ser maior que o valor restante (R$ ${valorRestante.toFixed(2)}).`);
        return;
    }
    
    let troco = 0;
    let valorRecebido = valorPago;
    if (metodo === 'Dinheiro') {
        const recebidoInput = parseFloat(DOM_TABLE_MGMT.trocoRecebidoInput.value);
        if (isNaN(recebidoInput) || recebidoInput < valorPago) {
            alert(`Para pagamento em dinheiro, o valor recebido (R$ ${recebidoInput.toFixed(2)}) deve ser maior ou igual ao valor pago (R$ ${valorPago.toFixed(2)}).`);
            return;
        }
        valorRecebido = recebidoInput;
        troco = valorRecebido - valorPago;
    }

    const novoPagamento = {
        metodo: metodo,
        valorPago: valorPago,
        valorRecebido: valorRecebido,
        troco: troco,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    const pagamentosAtuais = currentMesaDataForCheckout.pagamentosRegistrados || [];
    pagamentosAtuais.push(novoPagamento);

    try {
        await mesasRef.child(currentMesaIdForCheckout).child('pagamentosRegistrados').set(pagamentosAtuais);
        alert(`Pagamento de R$ ${valorPago.toFixed(2)} registrado com sucesso! ${troco > 0 ? `Troco: R$ ${troco.toFixed(2)}` : ''}`);
        
        // Limpa campos e atualiza a UI
        DOM_TABLE_MGMT.valorAPagarInput.value = '';
        DOM_TABLE_MGMT.pagamentoMetodoAtual.value = '';
        DOM_TABLE_MGMT.trocoRecebidoInput.value = '';
        
        // Recarrega os dados da mesa para refletir a atualização
        const snapshot = await mesasRef.child(currentMesaIdForCheckout).once('value');
        currentMesaDataForCheckout = snapshot.val();
        renderPagamentoHistory();
        updateCheckoutStatus();
        
    } catch (error) {
        console.error("Erro ao adicionar pagamento:", error);
        alert("Erro ao salvar pagamento.");
    }
}

function renderPagamentoHistory() {
    DOM_TABLE_MGMT.historicoPagamentosContainer.innerHTML = '';
    const pagamentos = currentMesaDataForCheckout.pagamentosRegistrados || [];

    if (pagamentos.length === 0) {
        DOM_TABLE_MGMT.emptyPaymentsMessage.classList.remove('hidden');
        return;
    }

    DOM_TABLE_MGMT.emptyPaymentsMessage.classList.add('hidden');
    pagamentos.forEach((p, index) => {
        const trocoInfo = p.metodo === 'Dinheiro' && p.troco > 0 ? ` (Troco: R$ ${p.troco.toFixed(2)})` : '';
        const paymentDiv = document.createElement('div');
        paymentDiv.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md mb-1 text-sm';
        paymentDiv.innerHTML = `
            <span>${index + 1}. ${p.metodo} - R$ ${p.valorPago.toFixed(2)}${trocoInfo}</span>
            <button class="text-red-500 hover:text-red-700 remove-payment-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
        `;
        // Adicionar listener para remover pagamento (funcionalidade avançada)
        DOM_TABLE_MGMT.historicoPagamentosContainer.appendChild(paymentDiv);
    });
}

function renderMesaItemsForCheckout() {
    DOM_TABLE_MGMT.mesaItensSelecaoContainer.innerHTML = '';
    const pedido = currentMesaDataForCheckout.pedido || [];

    if (pedido.length === 0) {
        DOM_TABLE_MGMT.emptyItemsMessage.classList.remove('hidden');
        return;
    }
    
    DOM_TABLE_MGMT.emptyItemsMessage.classList.add('hidden');
    pedido.forEach(item => {
        const sizeInfo = item.pizzaSize || item.size ? ` (${item.pizzaSize || item.size})` : '';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center border-b pb-2 mb-2';
        itemDiv.innerHTML = `
            <div>
                <p class="font-medium">${item.quantity}x ${item.name}${sizeInfo}</p>
                <p class="text-xs text-gray-500">R$ ${item.price.toFixed(2)}/un.</p>
            </div>
            <p class="font-semibold">R$ ${(item.price * item.quantity).toFixed(2)}</p>
        `;
        DOM_TABLE_MGMT.mesaItensSelecaoContainer.appendChild(itemDiv);
    });
}

function updateCheckoutStatus() {
    const mesa = currentMesaDataForCheckout;
    const totalOriginal = mesa.total || 0;
    const totalPago = (mesa.pagamentosRegistrados || []).reduce((sum, p) => sum + p.valorPago, 0);
    const restante = totalOriginal - totalPago;

    DOM_TABLE_MGMT.mesaTotalOriginal.textContent = `R$ ${totalOriginal.toFixed(2)}`;
    DOM_TABLE_MGMT.mesaTotalPago.textContent = `R$ ${totalPago.toFixed(2)}`;
    DOM_TABLE_MGMT.mesaRestantePagar.textContent = `R$ ${restante.toFixed(2)}`;

    const podePagar = restante > 0.009 && mesa.status !== 'Livre';
    DOM_TABLE_MGMT.valorAPagarInput.disabled = !podePagar;
    DOM_TABLE_MGMT.pagamentoMetodoAtual.disabled = !podePagar;
    DOM_TABLE_MGMT.btnAdicionarPagamento.disabled = !podePagar;
    DOM_TABLE_MGMT.btnDividirRestante.disabled = !podePagar;

    DOM_TABLE_MGMT.mesaDetalhesStatus.textContent = mesa.status;
    DOM_TABLE_MGMT.mesaDetalhesStatus.className = `font-semibold ${mesa.status === 'Livre' ? 'text-green-600' : 'text-red-600'}`;
    
    // Habilitar finalização só se a conta estiver paga
    const contaPaga = restante < 0.01;
    DOM_TABLE_MGMT.btnFinalizarContaMesa.disabled = !contaPaga || mesa.status === 'Livre';
    DOM_TABLE_MGMT.btnCancelarPedidoMesa.disabled = mesa.status === 'Livre';

    // Mostrar campo de troco
    DOM_TABLE_MGMT.trocoInputGroup.classList.toggle('hidden', DOM_TABLE_MGMT.pagamentoMetodoAtual.value !== 'Dinheiro');
}

function splitMesaBill() {
    const numPessoas = parseInt(DOM_TABLE_MGMT.dividirPorInput.value, 10);
    const restante = parseFloat(DOM_TABLE_MGMT.mesaRestantePagar.textContent.replace('R$ ', ''));

    if (isNaN(numPessoas) || numPessoas <= 0) {
        alert('Digite um número válido de pessoas.');
        return;
    }
    const valorPorPessoa = restante / numPessoas;
    DOM_TABLE_MGMT.valorAPagarInput.value = valorPorPessoa.toFixed(2);
    alert(`Valor por pessoa: R$ ${valorPorPessoa.toFixed(2)}.`);
}

// --- FUNÇÕES DE FINALIZAÇÃO E CANCELAMENTO ---
async function finalizeMesaAccount() {
    const mesa = currentMesaDataForCheckout;
    if (confirm(`Confirmar FINALIZAÇÃO da conta da Mesa ${mesa.numero}?`)) {
        try {
            // 1. Dar baixa no estoque
            if (mesa.pedido && Array.isArray(mesa.pedido)) {
                await deductIngredientsFromStock(mesa.pedido);
            }

            // 2. Criar registro em 'pedidos'
            const novoPedidoId = pedidosRef.push().key;
            const totalPago = (mesa.pagamentosRegistrados || []).reduce((sum, p) => sum + p.valorPago, 0);
            const pedidoFinalizado = {
                tipoAtendimento: 'Presencial',
                mesaNumero: mesa.numero,
                nomeCliente: mesa.cliente,
                garcom: mesa.garcom,
                observacao: mesa.observacoes,
                cart: mesa.pedido,
                totalPedido: mesa.total,
                totalOriginal: mesa.total,
                totalPago: totalPago,
                pagamentosRegistrados: mesa.pagamentosRegistrados,
                status: 'Finalizado',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            await pedidosRef.child(novoPedidoId).set(pedidoFinalizado);

            // 3. Resetar a mesa
            await mesasRef.child(currentMesaIdForCheckout).update({
                status: 'Livre', cliente: '', garcom: '', observacoes: '',
                pedido: null, total: 0, pagamentosRegistrados: null,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP
            });

            alert(`Conta da Mesa ${mesa.numero} finalizada e mesa liberada!`);
            closeMesaDetalhesModal();
        } catch (error) {
            console.error("Erro ao finalizar conta da mesa:", error);
            alert("Erro ao finalizar conta. Verifique o console.");
        }
    }
}

function cancelMesaOrderAdmin() {
    const mesa = currentMesaDataForCheckout;
    if ((mesa.pagamentosRegistrados || []).length > 0) {
        alert('Não é possível cancelar um pedido com pagamentos já registrados.');
        return;
    }
    if (confirm(`Tem certeza que deseja CANCELAR o pedido da Mesa ${mesa.numero}? A mesa será liberada.`)) {
        mesasRef.child(currentMesaIdForCheckout).update({
            status: 'Livre', cliente: '', garcom: '', observacoes: '',
            pedido: null, total: 0, pagamentosRegistrados: null,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            alert(`Pedido da Mesa ${mesa.numero} cancelado e mesa liberada.`);
            closeMesaDetalhesModal();
        })
        .catch(error => console.error("Erro ao cancelar pedido:", error));
    }
}

// --- FUNÇÃO DE BAIXA DE ESTOQUE (CONSISTENTE COM painel.js) ---
async function deductIngredientsFromStock(cart) {
    if (!cart || cart.length === 0) return;

    const updates = {};
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    for (const item of cart) {
        // A lógica de encontrar a receita precisa de IDs e categorias no item do carrinho
        // Ex: item.originalProductId, item.productCategory
        const productCategory = item.productCategory;
        const productId = item.originalProductId;
        let recipe = {};

        if (productCategory && productId && allProducts[productCategory] && allProducts[productCategory][productId]) {
            const productData = allProducts[productCategory][productId];
            if (productCategory === 'pizzas' && item.pizzaSize) {
                recipe = productData.receita?.[item.pizzaSize.toLowerCase()] || {};
            } else {
                recipe = productData.receita || {};
            }
        } else {
             console.warn(`Receita para "${item.name}" não encontrada. Verifique se 'productCategory' e 'originalProductId' estão no item do carrinho.`);
             continue; // Pula para o próximo item se a receita não for encontrada
        }

        for (const ingredientId in recipe) {
            const quantityPerItem = recipe[ingredientId];
            const totalQuantityUsed = quantityPerItem * item.quantity;
            const ingrediente = allIngredients[ingredientId];

            if (ingrediente) {
                const custoUnitario = ingrediente.custoUnitarioMedio || 0;
                const totalCostUsed = totalQuantityUsed * custoUnitario;

                // Prepara os updates para o ingrediente
                updates[`/ingredientes/${ingredientId}/quantidadeAtual`] = firebase.database.ServerValue.increment(-totalQuantityUsed);
                updates[`/ingredientes/${ingredientId}/quantidadeUsadaMensal`] = firebase.database.ServerValue.increment(totalQuantityUsed);
                updates[`/ingredientes/${ingredientId}/custoUsadoMensal`] = firebase.database.ServerValue.increment(totalCostUsed);
                
                // Lógica de update diário (requer leitura prévia ou uma cloud function para resetar)
                // A forma mais segura no cliente é sobrescrever
                const lastUpdate = new Date(ingrediente.ultimaAtualizacaoConsumo || 0);
                let newDailyQty, newDailyCost;
                if(lastUpdate.getDate() !== currentDay || lastUpdate.getMonth() !== currentMonth || lastUpdate.getFullYear() !== currentYear) {
                    newDailyQty = totalQuantityUsed;
                    newDailyCost = totalCostUsed;
                } else {
                    newDailyQty = (ingrediente.quantidadeUsadaDiaria || 0) + totalQuantityUsed;
                    newDailyCost = (ingrediente.custoUsadaDiaria || 0) + totalCostUsed;
                }
                updates[`/ingredientes/${ingredientId}/quantidadeUsadaDiaria`] = newDailyQty;
                updates[`/ingredientes/${ingredientId}/custoUsadaDiaria`] = newDailyCost;
                updates[`/ingredientes/${ingredientId}/ultimaAtualizacaoConsumo`] = firebase.database.ServerValue.TIMESTAMP;
            }
        }
    }
    
    if (Object.keys(updates).length > 0) {
        // Atualiza os dados locais para baixa de estoque diária
        Object.keys(updates).forEach(path => {
            const parts = path.split('/');
            if(parts[1] === 'ingredientes' && allIngredients[parts[2]]){
                if(parts[3] === 'quantidadeUsadaDiaria') allIngredients[parts[2]].quantidadeUsadaDiaria = updates[path];
                if(parts[3] === 'custoUsadaDiaria') allIngredients[parts[2]].custoUsadaDiaria = updates[path];
            }
        });
        await database.ref().update(updates);
        console.log("Estoque e consumo dos ingredientes atualizados com sucesso.");
    }
}