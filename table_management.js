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

const auth = firebase.auth();
const database = firebase.database();
const mesasRef = database.ref('mesas');
const pedidosRef = database.ref('pedidos'); // Para registrar pedidos finalizados
const ingredientesRef = database.ref('ingredientes'); // Para deduzir estoque
const produtosRef = database.ref('produtos'); // Para pegar receitas

// Variáveis globais para o estado do modal de checkout
let currentMesaIdForCheckout = null;
let currentMesaItemsToPay = []; // Itens do pedido da mesa, com `remainingQuantity` e `selectedToPayQuantity`
let currentMesaTotal = 0; // Total original da mesa
let currentMesaRemainingToPay = 0; // Saldo restante a pagar
let currentMesaPaymentsHistory = []; // Histórico de pagamentos para esta mesa
let allIngredients = {}; // Carrega todos os ingredientes para dedução de estoque
let allProducts = {}; // Carrega todos os produtos para pegar as receitas

// Elementos DOM do painel de gerenciamento de mesas (declarado, mas atribuído dentro do DOMContentLoaded)
const DOM_TABLE_MGMT = {};

document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento e atribuição dos elementos DOM AGORA dentro de DOMContentLoaded
    Object.assign(DOM_TABLE_MGMT, {
        numMesasInput: document.getElementById('num-mesas'),
        btnConfigurarMesas: document.getElementById('btn-configurar-mesas'),
        mesasContainer: document.getElementById('mesas-container'),

        modalMesaDetalhes: document.getElementById('modal-mesa-detalhes'),
        modalMesaNumero: document.getElementById('modal-mesa-numero'),
        // Acesso ao close-modal AGORA é seguro, pois modal-mesa-detalhes já existe
        closeModalButton: document.getElementById('modal-mesa-detalhes') ? document.getElementById('modal-mesa-detalhes').querySelector('.close-modal') : null,
        mesaDetalhesStatus: document.getElementById('mesa-detalhes-status'),
        mesaDetalhesCliente: document.getElementById('mesa-detalhes-cliente'),
        mesaDetalhesGarcom: document.getElementById('mesa-detalhes-garcom'),
        mesaDetalhesObs: document.getElementById('mesa-detalhes-obs'),
        btnVoltar: document.getElementById('btn-voltar'),

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

    // --- Autenticação e Carregamento Inicial ---
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Admin: Usuário autenticado:", user.email);
            document.body.style.display = 'flex'; // Mostra o corpo da página
            loadAdminData(); // Carrega produtos e ingredientes
            mesasRef.on('value', renderMesas); // Ouve mudanças nas mesas
        } else {
            console.log("Admin: Nenhum usuário autenticado. Redirecionando para login.html");
            window.location.replace('login.html');
        }
    });

    // --- Listeners de Ações do Administrador ---
     if (DOM_TABLE_MGMT.btnVoltar) {
        DOM_TABLE_MGMT.btnVoltar.addEventListener('click', () => {
            // Apenas redireciona de volta para o painel principal
            window.location.href = 'painel.html';
        });
    }

    if (DOM_TABLE_MGMT.btnConfigurarMesas) {
        DOM_TABLE_MGMT.btnConfigurarMesas.addEventListener('click', configureTables);
    }

    // Listeners do Modal de Detalhes da Mesa
    if (DOM_TABLE_MGMT.closeModalButton) {
        DOM_TABLE_MGMT.closeModalButton.addEventListener('click', closeMesaDetalhesModal);
    }

    // Adicionado verificações de existência para todos os listeners
    if (DOM_TABLE_MGMT.valorAPagarInput) DOM_TABLE_MGMT.valorAPagarInput.addEventListener('input', updateCheckoutStatus);
    if (DOM_TABLE_MGMT.pagamentoMetodoAtual) DOM_TABLE_MGMT.pagamentoMetodoAtual.addEventListener('change', updateCheckoutStatus);
    if (DOM_TABLE_MGMT.trocoRecebidoInput) DOM_TABLE_MGMT.trocoRecebidoInput.addEventListener('input', updateCheckoutStatus);
    if (DOM_TABLE_MGMT.dividirPorInput) DOM_TABLE_MGMT.dividirPorInput.addEventListener('input', updateCheckoutStatus);

    if (DOM_TABLE_MGMT.btnAdicionarPagamento) DOM_TABLE_MGMT.btnAdicionarPagamento.addEventListener('click', addMesaPayment);
    if (DOM_TABLE_MGMT.btnDividirRestante) DOM_TABLE_MGMT.btnDividirRestante.addEventListener('click', splitMesaBill);
    if (DOM_TABLE_MGMT.btnCancelarPedidoMesa) DOM_TABLE_MGMT.btnCancelarPedidoMesa.addEventListener('click', cancelMesaOrderAdmin);
    if (DOM_TABLE_MGMT.btnFinalizarContaMesa) DOM_TABLE_MGMT.btnFinalizarContaMesa.addEventListener('click', finalizeMesaAccount);
});

// --- Funções de Carregamento de Dados Iniciais ---
async function loadAdminData() {
    try {
        console.log("Admin: Carregando dados iniciais (ingredientes, produtos)...");
        const [ingredientsSnapshot, productsSnapshot] = await Promise.all([
            ingredientesRef.once('value'),
            produtosRef.once('value')
        ]);
        allIngredients = ingredientsSnapshot.val() || {};
        allProducts = productsSnapshot.val() || {};
        console.log("Admin: Dados iniciais (ingredientes, produtos) carregados com sucesso.");
    } catch (error) {
        console.error("Admin: Erro ao carregar dados de admin iniciais:", error);
        alert("Erro ao carregar dados essenciais. Verifique a conexão do Firebase e as regras de segurança.");
    }
}

// --- Funções de Gerenciamento de Mesas (Configuração e Renderização) ---
function configureTables() {
    const numMesas = parseInt(DOM_TABLE_MGMT.numMesasInput.value, 10);
    if (isNaN(numMesas) || numMesas < 1 || numMesas > 20) {
        alert("Por favor, insira um número de mesas válido entre 1 e 20.");
        return;
    }

    if (confirm(`Deseja configurar ${numMesas} mesas? Isso redefinirá o estado de TODAS as mesas existentes.`)) {
        console.log("Admin: Configurando mesas...");
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
                        pagamentosRegistrados: null,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    };
                }
                return mesasRef.update(updates);
            })
            .then(() => {
                alert(`${numMesas} mesas configuradas com sucesso!`);
                console.log("Admin: Mesas configuradas com sucesso no Firebase.");
            })
            .catch(error => {
                console.error("Admin: Erro ao configurar mesas no Firebase:", error);
                alert("Erro ao configurar mesas. Verifique o console.");
            });
    }
}

function renderMesas(snapshot) {
    console.log("Admin: Renderizando mesas...");
    if (!DOM_TABLE_MGMT.mesasContainer) {
        console.error("Admin: Container de mesas não encontrado no DOM. Não foi possível renderizar.");
        return;
    }

    DOM_TABLE_MGMT.mesasContainer.innerHTML = '';
    const mesasData = snapshot.val() || {};
    const sortedMesas = Object.values(mesasData).sort((a, b) => a.numero - b.numero);

    if (sortedMesas.length === 0) {
        DOM_TABLE_MGMT.mesasContainer.innerHTML = '<p class="text-gray-600 text-center col-span-full">Nenhuma mesa configurada. Defina o número de mesas e clique em "Configurar Mesas".</p>';
        if (DOM_TABLE_MGMT.numMesasInput) { // Verificação adicional
            DOM_TABLE_MGMT.numMesasInput.value = 10;
        }
        console.log("Admin: Nenhuma mesa encontrada. Exibindo mensagem para configurar.");
        return;
    } else {
        if (DOM_TABLE_MGMT.numMesasInput) { // Verificação adicional
            DOM_TABLE_MGMT.numMesasInput.value = sortedMesas.length;
        }
        console.log(`Admin: ${sortedMesas.length} mesas encontradas.`);
    }

    sortedMesas.forEach(mesa => {
        let statusClass = '';
        if (mesa.status === 'Livre') {
            statusClass = 'table-status-free';
        } else if (mesa.status === 'Ocupada') {
            statusClass = 'table-status-occupied';
        } else if (mesa.status === 'Aguardando Pagamento') {
            statusClass = 'table-status-awaiting-payment';
        }

        const card = document.createElement('div');
        card.className = `table-card bg-white p-4 rounded-lg shadow-md border-2 text-center flex flex-col items-center justify-center ${statusClass}`;
        card.dataset.mesaNumero = mesa.numero;

        let ocupiedInfo = '';
        if (mesa.status !== 'Livre') {
            ocupiedInfo = `
                <p class="text-sm font-medium text-gray-700">Cliente: ${mesa.cliente || 'N/A'}</p>
                <p class="text-sm text-gray-600">Garçom: ${mesa.garcom || 'N/A'}</p>
                <p class="text-md font-semibold text-blue-600 mt-1">Total: R$ ${(mesa.total || 0).toFixed(2)}</p>
            `;
        }

        card.innerHTML = `
            <i class="fas fa-utensils text-4xl mb-2 ${mesa.status === 'Livre' ? 'text-green-700' : (mesa.status === 'Ocupada' ? 'text-red-700' : 'text-yellow-700')}"></i>
            <h3 class="text-2xl font-bold">Mesa ${mesa.numero}</h3>
            <span class="text-sm font-semibold ${mesa.status === 'Livre' ? 'text-green-700' : (mesa.status === 'Ocupada' ? 'text-red-700' : 'text-yellow-700')}">${mesa.status}</span>
            ${ocupiedInfo}
        `;
        DOM_TABLE_MGMT.mesasContainer.appendChild(card);

        card.addEventListener('click', () => openMesaDetalhesModal(mesa.numero));
    });
    console.log("Admin: Mesas renderizadas na UI.");
}

// --- Funções do Modal de Detalhes e Checkout da Mesa ---
async function openMesaDetalhesModal(mesaNumero) {
    currentMesaIdForCheckout = mesaNumero;
    try {
        console.log(`Admin: Abrindo modal para Mesa ${mesaNumero}...`);
        const snapshot = await mesasRef.child(mesaNumero).once('value');
        const mesa = snapshot.val();

        if (!mesa) {
            alert('Mesa não encontrada ou foi removida.');
            console.error(`Admin: Mesa ${mesaNumero} não encontrada no Firebase.`);
            return;
        }

        // Preenche informações básicas da mesa
        DOM_TABLE_MGMT.modalMesaNumero.textContent = mesa.numero;
        DOM_TABLE_MGMT.mesaDetalhesStatus.textContent = mesa.status;
        DOM_TABLE_MGMT.mesaDetalhesStatus.className = `font-semibold ${mesa.status === 'Livre' ? 'text-green-600' : (mesa.status === 'Ocupada' ? 'text-red-600' : 'text-yellow-600')}`;
        DOM_TABLE_MGMT.mesaDetalhesCliente.textContent = mesa.cliente || 'N/A';
        DOM_TABLE_MGMT.mesaDetalhesGarcom.textContent = mesa.garcom || 'N/A';
        DOM_TABLE_MGMT.mesaDetalhesObs.textContent = mesa.observacoes || 'N/A';

        // Inicializa o carrinho de itens para pagamento e histórico
        currentMesaItemsToPay = mesa.pedido ? mesa.pedido.map(item => ({
            ...item,
            originalQuantity: item.quantity,
            remainingQuantity: item.quantity,
            selectedToPayQuantity: 0 // Quantidade que está sendo selecionada para o pagamento atual
        })) : [];

        currentMesaPaymentsHistory = mesa.pagamentosRegistrados || [];
        const totalAlreadyPaid = currentMesaPaymentsHistory.reduce((sum, p) => sum + p.valorPago, 0);

        currentMesaTotal = mesa.total || 0;
        currentMesaRemainingToPay = currentMesaTotal - totalAlreadyPaid;
        if (Math.abs(currentMesaRemainingToPay) < 0.01) { // Ajuste para pequenas diferenças de ponto flutuante
            currentMesaRemainingToPay = 0;
        }

        DOM_TABLE_MGMT.mesaTotalOriginal.textContent = `R$ ${currentMesaTotal.toFixed(2)}`;
        DOM_TABLE_MGMT.mesaTotalPago.textContent = `R$ ${totalAlreadyPaid.toFixed(2)}`;
        DOM_TABLE_MGMT.mesaRestantePagar.textContent = `R$ ${currentMesaRemainingToPay.toFixed(2)}`;

        // Renderiza itens e histórico
        renderMesaItemsForCheckout();
        renderPagamentoHistory();

        // Reseta e atualiza campos de pagamento
        DOM_TABLE_MGMT.valorAPagarInput.value = currentMesaRemainingToPay.toFixed(2);
        DOM_TABLE_MGMT.dividirPorInput.value = '';
        DOM_TABLE_MGMT.pagamentoMetodoAtual.value = '';
        DOM_TABLE_MGMT.trocoRecebidoInput.value = '';
        DOM_TABLE_MGMT.trocoInputGroup.classList.add('hidden'); // Esconde o campo de troco inicialmente

        // Habilita/desabilita botões com base no status da mesa
        if (mesa.status === 'Livre' || !mesa.pedido || mesa.pedido.length === 0) {
            DOM_TABLE_MGMT.btnCancelarPedidoMesa.classList.add('hidden'); // Não há pedido para cancelar
            DOM_TABLE_MGMT.btnFinalizarContaMesa.disabled = true;
            DOM_TABLE_MGMT.mesaItensSelecaoContainer.innerHTML = '<p class="text-gray-500 text-center" id="empty-items-message">Nenhum item para exibir ou mesa livre.</p>';
            DOM_TABLE_MGMT.emptyItemsMessage.classList.remove('hidden');
            console.log(`Admin: Mesa ${mesaNumero} está livre ou sem pedido. Desabilitando ações de checkout.`);
        } else {
            DOM_TABLE_MGMT.btnCancelarPedidoMesa.classList.remove('hidden');
        }

        updateCheckoutStatus(); // Atualiza o status dos botões de pagamento e troco
        DOM_TABLE_MGMT.modalMesaDetalhes.classList.remove('hidden');
        DOM_TABLE_MGMT.modalMesaDetalhes.classList.add('flex'); // Mostra o modal
        console.log(`Admin: Modal da Mesa ${mesaNumero} aberto.`);
    } catch (error) {
        console.error("Admin: Erro ao abrir modal de detalhes da mesa:", error);
        alert("Erro ao carregar detalhes da mesa. Verifique o console para mais informações.");
    }
}

function closeMesaDetalhesModal() {
    console.log("Admin: Fechando modal de detalhes da mesa.");
    DOM_TABLE_MGMT.modalMesaDetalhes.classList.add('hidden');
    DOM_TABLE_MGMT.modalMesaDetalhes.classList.remove('flex');
    currentMesaIdForCheckout = null;
    currentMesaItemsToPay = [];
    currentMesaTotal = 0;
    currentMesaRemainingToPay = 0;
    currentMesaPaymentsHistory = [];
}

function renderMesaItemsForCheckout() {
    if (!DOM_TABLE_MGMT.mesaItensSelecaoContainer) return;
    DOM_TABLE_MGMT.mesaItensSelecaoContainer.innerHTML = '';
    DOM_TABLE_MGMT.emptyItemsMessage.classList.add('hidden');

    const pendingItems = currentMesaItemsToPay.filter(item => item.remainingQuantity > 0.001);

    if (pendingItems.length === 0 && currentMesaRemainingToPay > 0.01) {
        DOM_TABLE_MGMT.emptyItemsMessage.classList.remove('hidden');
        DOM_TABLE_MGMT.emptyItemsMessage.textContent = 'Todos os itens foram marcados para pagamento, mas ainda há um saldo remanescente. Verifique os pagamentos já registrados.';
    } else if (pendingItems.length === 0 && currentMesaRemainingToPay <= 0.01) {
        DOM_TABLE_MGMT.emptyItemsMessage.classList.remove('hidden');
        DOM_TABLE_MGMT.emptyItemsMessage.textContent = 'Todos os itens foram pagos.';
    } else if (pendingItems.length > 0) {
        DOM_TABLE_MGMT.emptyItemsMessage.classList.add('hidden');
    }

    pendingItems.forEach((item, index) => {
        let sizeInfo = item.pizzaSize || item.size ? ` (${item.pizzaSize || item.size})` : '';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center gap-2 border-b border-gray-200 py-2 last:border-b-0';
        itemDiv.innerHTML = `
            <div class="flex-1">
                <p class="font-medium text-gray-800">${item.name}${sizeInfo}</p>
                <p class="text-sm text-gray-600">Total: ${item.originalQuantity} un. | Restante: ${item.remainingQuantity.toFixed(2)} un.</p>
            </div>
            <div class="flex items-center gap-2">
                <button class="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700 decrease-pay-quantity-btn" data-index="${index}" ${item.selectedToPayQuantity === 0 ? 'disabled' : ''}>-</button>
                <input type="number" class="w-16 p-1 border rounded text-center selected-pay-quantity-input"
                        value="${item.selectedToPayQuantity.toFixed(0)}" min="0" max="${item.remainingQuantity.toFixed(0)}" step="1" data-index="${index}">
                <button class="px-2 py-1 bg-blue-200 rounded-md hover:bg-blue-300 text-blue-800 increase-pay-quantity-btn" data-index="${index}" ${item.selectedToPayQuantity >= item.remainingQuantity ? 'disabled' : ''}>+</button>
            </div>
            <span class="text-gray-700 font-semibold w-20 text-right">R$ ${(item.price * item.selectedToPayQuantity).toFixed(2)}</span>
        `;
        DOM_TABLE_MGMT.mesaItensSelecaoContainer.appendChild(itemDiv);
    });

    DOM_TABLE_MGMT.mesaItensSelecaoContainer.querySelectorAll('.decrease-pay-quantity-btn').forEach(button => {
        button.addEventListener('click', handlePayQuantityButton);
    });
    DOM_TABLE_MGMT.mesaItensSelecaoContainer.querySelectorAll('.increase-pay-quantity-btn').forEach(button => {
        button.addEventListener('click', handlePayQuantityButton);
    });
    DOM_TABLE_MGMT.mesaItensSelecaoContainer.querySelectorAll('.selected-pay-quantity-input').forEach(input => {
        input.addEventListener('input', handlePayQuantityInput);
    });

    DOM_TABLE_MGMT.valorAPagarInput.value = calculateSelectedItemsTotalForCurrentPayment().toFixed(2);
    updateCheckoutStatus();
}

function handlePayQuantityButton(event) {
    const button = event.target.closest('button');
    const indexInFilteredList = parseInt(button.dataset.index);
    const item = currentMesaItemsToPay.filter(i => i.remainingQuantity > 0.001)[indexInFilteredList];

    if (!item) return;

    const step = 1;

    if (button.classList.contains('increase-pay-quantity-btn')) {
        item.selectedToPayQuantity = Math.min(item.remainingQuantity, item.selectedToPayQuantity + step);
    } else if (button.classList.contains('decrease-pay-quantity-btn')) {
        item.selectedToPayQuantity = Math.max(0, item.selectedToPayQuantity - step);
    }
    item.selectedToPayQuantity = Math.round(item.selectedToPayQuantity);

    renderMesaItemsForCheckout();
}

function handlePayQuantityInput(event) {
    const input = event.target;
    const indexInFilteredList = parseInt(input.dataset.index);
    const item = currentMesaItemsToPay.filter(i => i.remainingQuantity > 0.001)[indexInFilteredList];

    if (!item) return;

    let newQuantity = parseInt(input.value, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
        newQuantity = 0;
    }
    newQuantity = Math.min(newQuantity, Math.round(item.remainingQuantity));

    item.selectedToPayQuantity = newQuantity;
    input.value = newQuantity.toFixed(0);

    DOM_TABLE_MGMT.valorAPagarInput.value = calculateSelectedItemsTotalForCurrentPayment().toFixed(2);
    updateCheckoutStatus();
}

function calculateSelectedItemsTotalForCurrentPayment() {
    return currentMesaItemsToPay.reduce((sum, item) => sum + (item.price * item.selectedToPayQuantity), 0);
}

function renderPagamentoHistory() {
    if (!DOM_TABLE_MGMT.historicoPagamentosContainer) return;
    DOM_TABLE_MGMT.historicoPagamentosContainer.innerHTML = '';
    DOM_TABLE_MGMT.emptyPaymentsMessage.classList.add('hidden');

    if (currentMesaPaymentsHistory.length === 0) {
        DOM_TABLE_MGMT.emptyPaymentsMessage.classList.remove('hidden');
        return;
    }

    currentMesaPaymentsHistory.forEach((payment, index) => {
        const paymentDiv = document.createElement('div');
        paymentDiv.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md mb-1';
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
        DOM_TABLE_MGMT.historicoPagamentosContainer.appendChild(paymentDiv);
    });

    DOM_TABLE_MGMT.historicoPagamentosContainer.querySelectorAll('.remove-payment-btn').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (event) => {
            const indexToRemove = parseInt(event.target.closest('button').dataset.index);
            removeMesaPayment(indexToRemove);
        });
    });
}

async function removeMesaPayment(index) {
    const payment = currentMesaPaymentsHistory[index];
    if (!payment) return;

    if (!confirm(`Tem certeza que deseja remover este pagamento de R$ ${payment.valorPago.toFixed(2)} (${payment.metodo})?`)) {
        return;
    }

    currentMesaPaymentsHistory.splice(index, 1);

    if (payment.itemsPaid) {
        payment.itemsPaid.forEach(paidItem => {
            const originalItem = currentMesaItemsToPay.find(item =>
                item.name === paidItem.name && (item.size || '') === (paidItem.size || '')
            );
            if (originalItem) {
                originalItem.remainingQuantity += paidItem.quantity;
                if (originalItem.remainingQuantity > originalItem.originalQuantity + 0.001) {
                    originalItem.remainingQuantity = originalItem.originalQuantity;
                }
            }
        });
    }

    const totalPaidSoFar = currentMesaPaymentsHistory.reduce((sum, p) => sum + p.valorPago, 0);
    currentMesaRemainingToPay = currentMesaTotal - totalPaidSoFar;
    if (Math.abs(currentMesaRemainingToPay) < 0.01) {
        currentMesaRemainingToPay = 0;
    }

    currentMesaItemsToPay.forEach(item => item.selectedToPayQuantity = 0);

    try {
        await mesasRef.child(currentMesaIdForCheckout).update({
            pagamentosRegistrados: currentMesaPaymentsHistory.length > 0 ? currentMesaPaymentsHistory : null
        });
        alert('Pagamento removido com sucesso!');
        console.log(`Admin: Pagamento removido para Mesa ${currentMesaIdForCheckout}.`);
    } catch (error) {
        console.error('Admin: Erro ao remover pagamento no Firebase:', error);
        alert('Erro ao remover pagamento. Verifique o console.');
        return;
    }

    renderMesaItemsForCheckout();
    renderPagamentoHistory();
    updateCheckoutStatus();
}

function updateCheckoutStatus() {
    let valueToPayInput = parseFloat(DOM_TABLE_MGMT.valorAPagarInput.value) || 0;
    const currentPaymentMethod = DOM_TABLE_MGMT.pagamentoMetodoAtual.value;
    const trocoReceived = parseFloat(DOM_TABLE_MGMT.trocoRecebidoInput.value) || 0;

    const totalPaidSoFar = currentMesaPaymentsHistory.reduce((sum, p) => sum + p.valorPago, 0);

    currentMesaRemainingToPay = currentMesaTotal - totalPaidSoFar;
    if (Math.abs(currentMesaRemainingToPay) < 0.01) {
        currentMesaRemainingToPay = 0;
    }

    DOM_TABLE_MGMT.mesaTotalPago.textContent = `R$ ${totalPaidSoFar.toFixed(2)}`;
    DOM_TABLE_MGMT.mesaRestantePagar.textContent = `R$ ${currentMesaRemainingToPay.toFixed(2)}`;

    if (currentMesaRemainingToPay <= 0) {
        DOM_TABLE_MGMT.valorAPagarInput.value = '0.00';
        DOM_TABLE_MGMT.valorAPagarInput.disabled = true;
        DOM_TABLE_MGMT.pagamentoMetodoAtual.disabled = true;
        DOM_TABLE_MGMT.trocoRecebidoInput.disabled = true;
        DOM_TABLE_MGMT.btnAdicionarPagamento.disabled = true;
        DOM_TABLE_MGMT.btnDividirRestante.disabled = true;
        DOM_TABLE_MGMT.btnFinalizarContaMesa.disabled = false;
        DOM_TABLE_MGMT.trocoInputGroup.classList.add('hidden');
    } else {
        DOM_TABLE_MGMT.valorAPagarInput.disabled = false;
        DOM_TABLE_MGMT.pagamentoMetodoAtual.disabled = false;
        DOM_TABLE_MGMT.trocoRecebidoInput.disabled = false;
        DOM_TABLE_MGMT.btnFinalizarContaMesa.disabled = true;
        
        const numPessoasDividir = parseInt(DOM_TABLE_MGMT.dividirPorInput.value, 10);
        DOM_TABLE_MGMT.btnDividirRestante.disabled = isNaN(numPessoasDividir) || numPessoasDividir <= 0;

        const hasValueToPay = valueToPayInput > 0;
        const isValueWithinRemaining = valueToPayInput <= currentMesaRemainingToPay + 0.01;

        const anyItemSelected = currentMesaItemsToPay.some(item => item.selectedToPayQuantity > 0);
        const payingFullRemaining = Math.abs(valueToPayInput - currentMesaRemainingToPay) < 0.01;

        if (currentPaymentMethod === 'Dinheiro') {
            DOM_TABLE_MGMT.trocoInputGroup.classList.remove('hidden');
            const hasEnoughChange = trocoReceived >= valueToPayInput;
            DOM_TABLE_MGMT.btnAdicionarPagamento.disabled = !(hasValueToPay && currentPaymentMethod && isValueWithinRemaining && hasEnoughChange && (anyItemSelected || payingFullRemaining));
        } else {
            DOM_TABLE_MGMT.trocoInputGroup.classList.add('hidden');
            DOM_TABLE_MGMT.trocoRecebidoInput.value = '';
            DOM_TABLE_MGMT.btnAdicionarPagamento.disabled = !(hasValueToPay && currentPaymentMethod && isValueWithinRemaining && (anyItemSelected || payingFullRemaining));
        }
    }
}

async function addMesaPayment() {
    console.log("Admin: Adicionando pagamento...");
    let valueToPay = parseFloat(DOM_TABLE_MGMT.valorAPagarInput.value);
    const currentPaymentMethod = DOM_TABLE_MGMT.pagamentoMetodoAtual.value;
    const trocoReceived = parseFloat(DOM_TABLE_MGMT.trocoRecebidoInput.value) || 0;

    if (isNaN(valueToPay) || valueToPay <= 0) {
        alert('Por favor, digite um valor válido e positivo para esta parcela.');
        return;
    }
    if (!currentPaymentMethod) {
        alert('Selecione um método de pagamento.');
        return;
    }
    if (valueToPay > currentMesaRemainingToPay + 0.01) {
        alert(`O valor (R$ ${valueToPay.toFixed(2)}) excede o restante a pagar (R$ ${currentMesaRemainingToPay.toFixed(2)}).`);
        return;
    }

    let itemsPaidInThisInstallment = [];
    let totalFromSelectedItems = calculateSelectedItemsTotalForCurrentPayment();

    if (totalFromSelectedItems > 0.01) {
        itemsPaidInThisInstallment = currentMesaItemsToPay
            .filter(item => item.selectedToPayQuantity > 0.001)
            .map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.selectedToPayQuantity,
                size: item.size || undefined,
                originalProductId: item.originalProductId,
                productCategory: item.productCategory
            }));
        
        if (Math.abs(valueToPay - totalFromSelectedItems) > 0.01) {
            if (!confirm(`Você selecionou itens totalizando R$ ${totalFromSelectedItems.toFixed(2)}, mas digitou R$ ${valueToPay.toFixed(2)}. Deseja usar o valor digitado ou o valor dos itens selecionados? (OK para usar o digitado, Cancelar para usar o dos itens)`)) {
                valueToPay = totalFromSelectedItems;
                DOM_TABLE_MGMT.valorAPagarInput.value = valueToPay.toFixed(2);
            }
        }

    } else if (Math.abs(valueToPay - currentMesaRemainingToPay) < 0.01) {
        let amountToDistribute = valueToPay;
        const itemsToDistributeTo = currentMesaItemsToPay.filter(item => item.remainingQuantity > 0.001);
        const totalValueToDistributeOver = itemsToDistributeTo.reduce((sum, item) => sum + (item.price * item.remainingQuantity), 0);

        itemsToDistributeTo.forEach(item => {
            if (item.remainingQuantity > 0.001 && amountToDistribute > 0.001 && totalValueToDistributeOver > 0.001) {
                const proportion = (item.price * item.remainingQuantity) / totalValueToDistributeOver;
                let quantityToPayForThisItem = (amountToDistribute * proportion) / item.price;

                if (quantityToPayForThisItem > item.remainingQuantity) {
                    quantityToPayForThisItem = item.remainingQuantity;
                }
                
                itemsPaidInThisInstallment.push({
                    name: item.name,
                    price: item.price,
                    quantity: parseFloat(quantityToPayForThisItem.toFixed(3)),
                    size: item.size || undefined,
                    originalProductId: item.originalProductId,
                    productCategory: item.productCategory
                });
                amountToDistribute -= (quantityToPayForThisItem * item.price);
            }
        });
        const distributedSum = itemsPaidInThisInstallment.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const diff = valueToPay - distributedSum;
        if (Math.abs(diff) > 0.01 && itemsPaidInThisInstallment.length > 0) {
            itemsPaidInThisInstallment[0].quantity += (diff / itemsPaidInThisInstallment[0].price);
            if (itemsPaidInThisInstallment[0].quantity < 0) itemsPaidInThisInstallment[0].quantity = 0;
        }

    } else {
        alert('Por favor, selecione os itens a serem pagos ou insira o valor total restante no campo "Valor desta Parcela".');
        return;
    }

    if (currentPaymentMethod === 'Dinheiro') {
        if (trocoReceived < valueToPay) {
            alert(`O valor recebido (R$ ${trocoReceived.toFixed(2)}) é menor que a parcela a pagar (R$ ${valueToPay.toFixed(2)}).`);
            return;
        }
    }

    const trocoADevolver = currentPaymentMethod === 'Dinheiro' ? trocoReceived - valueToPay : 0;

    itemsPaidInThisInstallment.forEach(paidItem => {
        const originalItem = currentMesaItemsToPay.find(item =>
            item.name === paidItem.name && (item.size || '') === (paidItem.size || '')
        );
        if (originalItem) {
            originalItem.remainingQuantity -= paidItem.quantity;
            if (originalItem.remainingQuantity < 0.001) originalItem.remainingQuantity = 0;
        }
    });

    currentMesaPaymentsHistory.push({
        metodo: currentPaymentMethod,
        valorPago: valueToPay,
        valorRecebido: currentPaymentMethod === 'Dinheiro' ? trocoReceived : null,
        troco: currentPaymentMethod === 'Dinheiro' ? trocoADevolver : null,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        itemsPaid: itemsPaidInThisInstallment
    });

    try {
        await mesasRef.child(currentMesaIdForCheckout).update({
            pagamentosRegistrados: currentMesaPaymentsHistory.length > 0 ? currentMesaPaymentsHistory : null
        });
        console.log(`Admin: Pagamento de R$ ${valueToPay.toFixed(2)} adicionado para Mesa ${currentMesaIdForCheckout}.`);
    } catch (error) {
        console.error('Admin: Erro ao salvar pagamento no Firebase:', error);
        alert('Erro ao salvar pagamento no servidor. Tente novamente.');
        return;
    }

    DOM_TABLE_MGMT.valorAPagarInput.value = currentMesaRemainingToPay.toFixed(2);
    DOM_TABLE_MGMT.trocoRecebidoInput.value = '';
    DOM_TABLE_MGMT.pagamentoMetodoAtual.value = '';
    currentMesaItemsToPay.forEach(item => item.selectedToPayQuantity = 0);

    renderMesaItemsForCheckout();
    renderPagamentoHistory();
    updateCheckoutStatus();

    if (currentPaymentMethod === 'Dinheiro' && trocoADevolver > 0) {
        alert(`Pagamento adicionado com sucesso!\nTROCO A DEVOLVER: R$ ${trocoADevolver.toFixed(2)}`);
    } else {
        alert('Pagamento adicionado com sucesso!');
    }
}

function splitMesaBill() {
    console.log("Admin: Dividindo conta...");
    const numPessoas = parseInt(DOM_TABLE_MGMT.dividirPorInput.value, 10);
    if (isNaN(numPessoas) || numPessoas <= 0) {
        alert('Por favor, digite um número válido de pessoas para dividir.');
        return;
    }
    if (currentMesaRemainingToPay <= 0.01) {
        alert('Não há valor restante para dividir.');
        return;
    }

    const valorPorPessoa = currentMesaRemainingToPay / numPessoas;
    DOM_TABLE_MGMT.valorAPagarInput.value = valorPorPessoa.toFixed(2);

    DOM_TABLE_MGMT.dividirPorInput.value = '';
    updateCheckoutStatus();

    alert(`O valor por pessoa (R$ ${valorPorPessoa.toFixed(2)}) foi preenchido no campo "Valor desta Parcela". Agora, selecione o método de pagamento e clique em "Adicionar Pagamento".`);
}

async function cancelMesaOrderAdmin() {
    if (!currentMesaIdForCheckout) return;

    if (currentMesaPaymentsHistory.length > 0) {
        alert('Não é possível cancelar um pedido de mesa que já possui pagamentos registrados. Se precisar, remova os pagamentos um por um antes de cancelar.');
        return;
    }

    if (confirm(`Tem certeza que deseja CANCELAR COMPLETAMENTE o pedido da Mesa ${currentMesaIdForCheckout}? A mesa será liberada e o pedido NÃO será registrado como venda finalizada.`)) {
        try {
            console.log(`Admin: Cancelando pedido da Mesa ${currentMesaIdForCheckout}...`);
            await mesasRef.child(currentMesaIdForCheckout).update({
                status: 'Livre',
                cliente: '',
                garcom: '',
                observacoes: '',
                pedido: null,
                total: 0,
                pagamentosRegistrados: null,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP
            });
            alert(`Pedido da Mesa ${currentMesaIdForCheckout} cancelado e mesa liberada.`);
            closeMesaDetalhesModal();
            console.log(`Admin: Pedido da Mesa ${currentMesaIdForCheckout} cancelado com sucesso.`);
        } catch (error) {
            console.error("Admin: Erro ao cancelar pedido da mesa (Admin):", error);
            alert("Erro ao cancelar pedido da mesa.");
        }
    }
}

async function finalizeMesaAccount() {
    if (!currentMesaIdForCheckout) return;

    if (currentMesaRemainingToPay > 0.01) {
        alert(`Ainda há um valor restante a pagar: R$ ${currentMesaRemainingToPay.toFixed(2)}. Adicione todos os pagamentos antes de finalizar.`);
        return;
    }

    if (confirm(`Confirmar FINALIZAÇÃO da conta da Mesa ${currentMesaIdForCheckout}?`)) {
        try {
            console.log(`Admin: Finalizando conta da Mesa ${currentMesaIdForCheckout}...`);
            const mesaSnapshot = await mesasRef.child(currentMesaIdForCheckout).once('value');
            const mesaAtual = mesaSnapshot.val();

            if (!mesaAtual) {
                alert('Erro: Dados da mesa não encontrados para finalizar a conta.');
                console.error(`Admin: Mesa ${currentMesaIdForCheckout} não encontrada para finalização.`);
                return;
            }

            if (mesaAtual.pedido && Array.isArray(mesaAtual.pedido)) {
                for (const itemPedido of mesaAtual.pedido) {
                    await deductIngredientsFromStock(itemPedido);
                }
            }

            const novoPedidoId = database.ref('pedidos').push().key;
            const pedidoFinalizado = {
                tipoAtendimento: 'Presencial',
                mesaNumero: mesaAtual.numero,
                nomeCliente: mesaAtual.cliente,
                garcom: mesaAtual.garcom,
                observacao: mesaAtual.observacoes,
                cart: mesaAtual.pedido,
                totalOriginal: mesaAtual.total,
                totalPago: currentMesaTotal,
                pagamentosRegistrados: currentMesaPaymentsHistory,
                status: 'Finalizado',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            await pedidosRef.child(novoPedidoId).set(pedidoFinalizado);
            console.log(`Admin: Pedido de Mesa ${mesaAtual.numero} registrado em 'pedidos' com ID ${novoPedidoId}.`);

            await mesasRef.child(currentMesaIdForCheckout).update({
                status: 'Livre',
                cliente: '',
                garcom: '',
                observacoes: '',
                pedido: null,
                total: 0,
                pagamentosRegistrados: null,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP
            });

            alert(`Conta da Mesa ${mesaAtual.numero} finalizada e mesa liberada!`);
            closeMesaDetalhesModal();
            console.log(`Admin: Mesa ${mesaAtual.numero} finalizada e liberada com sucesso.`);
        } catch (error) {
            console.error("Admin: Erro ao finalizar conta da mesa (Admin):", error);
            alert("Erro ao finalizar conta da mesa. Verifique o console para mais detalhes.");
        }
    }
}

async function deductIngredientsFromStock(itemPedido) {
    let productData = null;
    let productId = null;
    let productCategory = null;

    if (itemPedido.productCategory && itemPedido.originalProductId) {
        productCategory = itemPedido.productCategory;
        productId = itemPedido.originalProductId;
        productData = allProducts[productCategory]?.[productId];
    } else {
        const categories = ['pizzas', 'bebidas', 'esfirras', 'calzone', 'promocoes', 'novidades'];
        for (const cat of categories) {
            if (allProducts[cat]) {
                for (const pId in allProducts[cat]) {
                    const product = allProducts[cat][pId];
                    if (product.nome === itemPedido.name || product.titulo === itemPedido.name) {
                        if (cat === 'pizzas' && itemPedido.pizzaSize && product.precos?.[itemPedido.pizzaSize.toLowerCase()] !== undefined) {
                            productData = product;
                            productCategory = cat;
                            productId = pId;
                            break;
                        } else if (cat !== 'pizzas' && !itemPedido.pizzaSize) {
                            productData = product;
                            productCategory = cat;
                            productId = pId;
                            break;
                        }
                    }
                }
            }
            if (productData) break;
        }
    }

    if (!productData) {
        console.warn(`Admin: Produto "${itemPedido.name}" (ID: ${itemPedido.originalProductId}) não encontrado ou sem categoria/receita no Firebase para dedução de estoque. Verifique os dados.`);
        return;
    }

    let recipeToConsume = {};
    if (productCategory === 'pizzas' && itemPedido.pizzaSize) {
        const sizeKey = itemPedido.pizzaSize.toLowerCase();
        recipeToConsume = productData.receita?.[sizeKey] || {};
    } else {
        recipeToConsume = productData.receita || {};
    }

    if (Object.keys(recipeToConsume).length === 0) {
        console.warn(`Admin: Receita para o produto "${itemPedido.name}" (Tamanho: ${itemPedido.pizzaSize || 'N/A'}) não configurada. O consumo de ingredientes não será registrado para este item.`);
        return;
    }

    const updates = {};
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    for (const ingredientId in recipeToConsume) {
        const quantityPerUnitOfProduct = recipeToConsume[ingredientId];
        const totalQuantityConsumed = quantityPerUnitOfProduct * itemPedido.quantity;

        const currentIngred = allIngredients[ingredientId];
        if (!currentIngred) {
            console.warn(`Admin: Ingrediente com ID ${ingredientId} não encontrado em 'allIngredients'. Não é possível deduzir estoque para ele.`);
            continue;
        }

        const costPerUnit = currentIngred.custoUnitarioMedio || 0;
        const totalCostConsumed = totalQuantityConsumed * costPerUnit;

        const newQuantidadeAtual = (currentIngred.quantidadeAtual || 0) - totalQuantityConsumed;
        updates[`ingredientes/${ingredientId}/quantidadeAtual`] = parseFloat(newQuantidadeAtual.toFixed(3));

        const lastUpdateTimestamp = currentIngred.ultimaAtualizacaoConsumo;
        let lastUpdateDate = null;
        if (lastUpdateTimestamp) {
            lastUpdateDate = new Date(lastUpdateTimestamp);
        }

        let newQuantidadeUsadaDiaria = currentIngred.quantidadeUsadaDiaria || 0;
        let newCustoUsadaDiaria = currentIngred.custoUsadaDiaria || 0;

        if (!lastUpdateDate || lastUpdateDate.getDate() !== currentDay || lastUpdateDate.getMonth() !== currentMonth || lastUpdateDate.getFullYear() !== currentYear) {
            newQuantidadeUsadaDiaria = totalQuantityConsumed;
            newCustoUsadaDiaria = totalCostConsumed;
        } else {
            newQuantidadeUsadaDiaria += totalQuantityConsumed;
            newCustoUsadaDiaria += totalCostConsumed;
        }
        updates[`ingredientes/${ingredientId}/quantidadeUsadaDiaria`] = parseFloat(newQuantidadeUsadaDiaria.toFixed(3));
        updates[`ingredientes/${ingredientId}/custoUsadaDiaria`] = parseFloat(newCustoUsadaDiaria.toFixed(2));
        updates[`ingredientes/${ingredientId}/ultimaAtualizacaoConsumo`] = firebase.database.ServerValue.TIMESTAMP;


        let newQuantidadeUsadaMensal = currentIngred.quantidadeUsadaMensal || 0;
        let newCustoUsadoMensal = currentIngred.custoUsadoMensal || 0;
        
        newQuantidadeUsadaMensal += totalQuantityConsumed;
        newCustoUsadoMensal += totalCostConsumed;
        
        updates[`ingredientes/${ingredientId}/quantidadeUsadaMensal`] = parseFloat(newQuantidadeUsadaMensal.toFixed(3));
        updates[`ingredientes/${ingredientId}/custoUsadoMensal`] = parseFloat(newCustoUsadoMensal.toFixed(2));
    }

    if (Object.keys(updates).length > 0) {
        await database.ref().update(updates);
        console.log(`Admin: Estoque e uso dos ingredientes para ${itemPedido.name} atualizados com sucesso.`);
    }
}