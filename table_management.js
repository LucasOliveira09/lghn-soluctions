// Configuração do Firebase (SUBSTITUA PELAS SUAS CREDENCIAIS REAIS)
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

// Removendo 'auth' se não for usar, mas manteremos o logout se o botão existir
const database = firebase.database();
const mesasRef = database.ref('mesas');
const pedidosRef = database.ref('pedidos');
const ingredientesRef = database.ref('ingredientes');
const produtosRef = database.ref('produtos');

let currentMesaIdForCheckout = null;
let currentMesaFullOrder = [];
let currentMesaPaymentsHistory = [];
let currentMesaOriginalTotal = 0;
let currentMesaRemainingToPay = 0;
let allIngredients = {};
let allProducts = {};
let allBordas = {
    'creamcheese': { nome: 'Cream Cheese', precos: { broto: 10.00, grande: 12.00 } },
    'mussarela': { nome: 'Mussarela', precos: { broto: 10.00, grande: 12.00 } },
    'chocolate': { nome: 'Chocolate', precos: { broto: 10.00, grande: 12.00 } },
    'cheddar': { nome: 'Cheddar', precos: { broto: 10.00, grande: 12.00 } },
    'catupiry': { nome: 'Catupiry', precos: { broto: 10.00, grande: 12.00 } }
};

const DOM_TABLE_MGMT = {};

// --- FUNÇÕES GLOBAIS (Declaradas antes de DOMContentLoaded) ---

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
        if (DOM_TABLE_MGMT.numMesasInput) {
            DOM_TABLE_MGMT.numMesasInput.value = 10;
        }
        console.log("Admin: Nenhuma mesa encontrada. Exibindo mensagem para configurar.");
        return;
    } else {
        if (DOM_TABLE_MGMT.numMesasInput) {
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

        currentMesaFullOrder = mesa.pedido ? JSON.parse(JSON.stringify(mesa.pedido)) : [];
        currentMesaPaymentsHistory = mesa.pagamentosRegistrados ? JSON.parse(JSON.stringify(mesa.pagamentosRegistrados)) : [];
        currentMesaOriginalTotal = mesa.total || 0;

        DOM_TABLE_MGMT.checkoutMesaNumero.textContent = mesa.numero;
        DOM_TABLE_MGMT.checkoutMesaStatus.textContent = mesa.status;
        DOM_TABLE_MGMT.checkoutMesaStatus.className = `font-semibold ${mesa.status === 'Livre' ? 'text-green-600' : (mesa.status === 'Ocupada' ? 'text-red-600' : 'text-yellow-600')}`;
        DOM_TABLE_MGMT.checkoutMesaCliente.textContent = mesa.cliente || 'N/A';
        DOM_TABLE_MGMT.checkoutMesaGarcom.textContent = mesa.garcom || 'N/A';
        DOM_TABLE_MGMT.checkoutMesaObs.textContent = mesa.observacoes || 'N/A';

        // Preenche e renderiza os itens na lista de "Itens na Conta"
        renderCheckoutItemsList();
        renderPagamentoHistory();

        // Reseta e atualiza campos de adição de item e pagamento
        DOM_TABLE_MGMT.checkoutPagamentoMetodoAtual.value = '';
        DOM_TABLE_MGMT.checkoutTrocoRecebidoInput.value = '';
        DOM_TABLE_MGMT.checkoutTrocoInputGroup.classList.add('hidden');
        DOM_TABLE_MGMT.checkoutDividirPorInput.value = '1';
        DOM_TABLE_MGMT.checkoutSearchProdutoInput.value = '';
        DOM_TABLE_MGMT.checkoutSelectCategoria.value = '';
        if (DOM_TABLE_MGMT.checkoutContainerMontagemPizza) DOM_TABLE_MGMT.checkoutContainerMontagemPizza.classList.add('hidden');
        if (DOM_TABLE_MGMT.checkoutContainerOutrosItens) DOM_TABLE_MGMT.checkoutContainerOutrosItens.classList.add('hidden');
        DOM_TABLE_MGMT.checkoutQtdProdutoInput.value = '1';
        if (DOM_TABLE_MGMT.checkoutPizzaSabor1Select) DOM_TABLE_MGMT.checkoutPizzaSabor1Select.innerHTML = '<option value="">-- Produto --</option>';
        if (DOM_TABLE_MGMT.checkoutPizzaSabor2Select) DOM_TABLE_MGMT.checkoutPizzaSabor2Select.innerHTML = '<option value="">-- Produto --</option>';
        if (DOM_TABLE_MGMT.checkoutSelectProduto) DOM_TABLE_MGMT.checkoutSelectProduto.innerHTML = '<option value="">-- Produto --</option>';


        updateCheckoutCalculations();
        
        DOM_TABLE_MGMT.modalCheckout.classList.remove('hidden');
        DOM_TABLE_MGMT.modalCheckout.classList.add('flex');
        console.log(`Admin: Modal de Checkout para Mesa ${mesaNumero} aberto.`);
    } catch (error) {
        console.error("Admin: Erro ao abrir modal de detalhes da mesa:", error);
        alert("Erro ao carregar detalhes da mesa. Verifique o console para mais informações.");
    }
}

function closeMesaDetalhesModal() {
    console.log("Admin: Fechando modal de detalhes da mesa.");
    if (DOM_TABLE_MGMT.modalCheckout) {
        DOM_TABLE_MGMT.modalCheckout.classList.add('hidden');
        DOM_TABLE_MGMT.modalCheckout.classList.remove('flex');
    }
    currentMesaIdForCheckout = null;
    currentMesaFullOrder = [];
    currentMesaPaymentsHistory = [];
    currentMesaOriginalTotal = 0;
    currentMesaRemainingToPay = 0;
}

function renderCheckoutItemsList() {
    if (!DOM_TABLE_MGMT.checkoutItensLista) return;
    DOM_TABLE_MGMT.checkoutItensLista.innerHTML = '';

    if (currentMesaFullOrder.length === 0) {
        DOM_TABLE_MGMT.checkoutItensLista.innerHTML = '<p class="text-gray-500 text-center">Nenhum item na conta.</p>';
        return;
    }

    currentMesaFullOrder.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md mb-1';
        let sizeInfo = item.pizzaSize || item.size ? ` (${item.pizzaSize || item.size})` : '';
        let obsItem = item.observacaoItem ? ` <span class="text-xs italic text-gray-600">(${item.observacaoItem})</span>` : '';

        itemDiv.innerHTML = `
            <span>${item.quantity}x ${item.name}${sizeInfo}${obsItem}</span>
            <span class="font-semibold">R$ ${(item.totalPrice).toFixed(2)}</span>
            <button class="text-red-500 hover:text-red-700 remove-checkout-item-btn" data-index="${index}" title="Remover Item da Conta">&times;</button>
        `;
        DOM_TABLE_MGMT.checkoutItensLista.appendChild(itemDiv);
    });

    DOM_TABLE_MGMT.checkoutItensLista.querySelectorAll('.remove-checkout-item-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const indexToRemove = parseInt(event.target.dataset.index);
            removeCheckoutItem(indexToRemove);
        });
    });
}

function removeCheckoutItem(index) {
    if (!confirm("Tem certeza que deseja remover este item da conta?")) {
        return;
    }
    currentMesaFullOrder.splice(index, 1);
    currentMesaOriginalTotal = currentMesaFullOrder.reduce((sum, item) => sum + item.totalPrice, 0);
    mesasRef.child(currentMesaIdForCheckout).update({
        pedido: currentMesaFullOrder.length > 0 ? currentMesaFullOrder : null,
        total: currentMesaOriginalTotal
    }).then(() => {
        alert("Item removido da conta com sucesso!");
        updateCheckoutCalculations();
        renderCheckoutItemsList();
    }).catch(error => {
        console.error("Erro ao remover item da conta no Firebase:", error);
        alert("Erro ao remover item da conta.");
    });
}

function populateCheckoutCategorySelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- Categoria --</option>';
    if (allProducts) {
        const sortedCategories = Object.keys(allProducts).sort();
        sortedCategories.forEach(catKey => {
            const option = document.createElement('option');
            option.value = catKey;
            option.textContent = catKey.charAt(0).toUpperCase() + catKey.slice(1);
            select.appendChild(option);
        });
    }
}

function populateCheckoutProductSelect(selectId, category, searchTerm = '') {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- Produto --</option>';
    
    searchTerm = searchTerm.toLowerCase();

    if (allProducts && allProducts[category]) {
        const filteredProducts = Object.entries(allProducts[category]).filter(([id, product]) => {
            const productName = (product.nome || product.titulo || '').toLowerCase();
            return product.ativo !== false && productName.includes(searchTerm);
        });

        filteredProducts.sort(([, a], [, b]) => (a.nome || a.titulo).localeCompare(b.nome || b.titulo)).forEach(([id, product]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = product.nome || product.titulo;
            select.appendChild(option);
        });
    }
}

function filterCheckoutProductsBySearch() {
    const searchTerm = DOM_TABLE_MGMT.checkoutSearchProdutoInput ? DOM_TABLE_MGMT.checkoutSearchProdutoInput.value.trim() : '';
    const selectedCategory = DOM_TABLE_MGMT.checkoutSelectCategoria ? DOM_TABLE_MGMT.checkoutSelectCategoria.value : '';

    if (selectedCategory === 'pizzas') {
        populateCheckoutProductSelect('checkout-pizza-sabor1', 'pizzas', searchTerm);
        populateCheckoutProductSelect('checkout-pizza-sabor2', 'pizzas', searchTerm);
    } else if (selectedCategory) {
        populateCheckoutProductSelect('checkout-select-produto', selectedCategory, searchTerm);
    }
}

function buildCheckoutPizzaItem() {
    const tamanho = DOM_TABLE_MGMT.checkoutPizzaTamanhoSelect ? DOM_TABLE_MGMT.checkoutPizzaTamanhoSelect.value : '';
    const bordaKey = DOM_TABLE_MGMT.checkoutPizzaBordaSelect ? DOM_TABLE_MGMT.checkoutPizzaBordaSelect.value : '';
    const sabor1Key = DOM_TABLE_MGMT.checkoutPizzaSabor1Select ? DOM_TABLE_MGMT.checkoutPizzaSabor1Select.value : '';
    const isMeioAMeio = DOM_TABLE_MGMT.checkoutPizzaMeioAMeioCheck ? DOM_TABLE_MGMT.checkoutPizzaMeioAMeioCheck.checked : false;
    const sabor2Key = DOM_TABLE_MGMT.checkoutPizzaSabor2Select ? DOM_TABLE_MGMT.checkoutPizzaSabor2Select.value : '';

    if (!sabor1Key) {
        alert("Selecione o Sabor 1 da pizza.");
        return null;
    }
    if (isMeioAMeio && !sabor2Key) {
        alert("Selecione o Sabor 2 para pizzas meio a meio.");
        return null;
    }

    const sabor1 = allProducts.pizzas[sabor1Key];
    let precoBase1 = 0;
    const tamanhoKey = tamanho.toLowerCase();

    if (sabor1 && sabor1.precos && sabor1.precos[tamanhoKey] !== undefined) {
        precoBase1 = sabor1.precos[tamanhoKey];
    } else if (sabor1 && sabor1.preco !== undefined) {
        precoBase1 = sabor1.preco;
    } else {
        alert(`Erro: Preço do 1º sabor (${sabor1?.nome || 'desconhecido'}) para o tamanho ${tamanho} não encontrado.`);
        return null;
    }

    let nomeProdutoPizza = `${sabor1.nome}`;
    let precoFinalPizza = precoBase1;
    let sabor2 = null;

    if (isMeioAMeio && sabor2Key) {
        sabor2 = allProducts.pizzas[sabor2Key];
        let precoBase2 = 0;

        if (sabor2 && sabor2.precos && sabor2.precos[tamanhoKey] !== undefined) {
            precoBase2 = sabor2.precos[tamanhoKey];
        } else if (sabor2 && sabor2.preco !== undefined) {
            precoBase2 = sabor2.preco;
        } else {
            alert(`Erro: Preço do 2º sabor (${sabor2?.nome || 'desconhecido'}) para o tamanho ${tamanho} não encontrado.`);
            return null;
        }

        precoFinalPizza = Math.max(precoBase1, precoBase2);
        nomeProdutoPizza = `${sabor1.nome} / ${sabor2.nome}`;
    }

    if (tamanho === 'Broto') {
        const sabor1Nome = sabor1.nome || '';
        const sabor2Nome = sabor2 ? sabor2.nome || '' : '';

        const temSaborEspecial =
            sabor1Nome.toLowerCase().includes('costela') ||
            sabor2Nome.toLowerCase().includes('costela') ||
            sabor1Nome.toLowerCase().includes('morango com chocolate') ||
            sabor2Nome.toLowerCase().includes('morango com chocolate');

        if (temSaborEspecial) {
            precoFinalPizza = 35.00;
        } else {
            if (sabor1.precos && sabor1.precos[tamanhoKey]) {
                precoFinalPizza = sabor1.precos[tamanhoKey];
            } else {
                precoFinalPizza = 30.00;
            }
        }
    }

    let precoBorda = 0;
    if (bordaKey && allBordas[bordaKey]) {
        if (allBordas[bordaKey].precos && allBordas[bordaKey].precos[tamanhoKey] !== undefined) {
            precoBorda = allBordas[bordaKey].precos[tamanhoKey];
            nomeProdutoPizza += ` + Borda de ${allBordas[bordaKey].nome}`;
        }
    }
    
    nomeProdutoPizza += ` (${tamanho})`;

    const precoCalculadoDoItem = precoFinalPizza + precoBorda;

    return {
        id: isMeioAMeio ? `${sabor1Key}|${sabor2Key}|${tamanho}` : `${sabor1Key}|${tamanho}`,
        name: nomeProdutoPizza,
        price: precoCalculadoDoItem,
        pizzaSize: tamanho,
        originalProductId: sabor1Key,
        halfProductId: isMeioAMeio ? sabor2Key : undefined,
        productCategory: 'pizzas'
    };
}

function buildCheckoutGenericItem(categoria) {
    const produtoId = DOM_TABLE_MGMT.checkoutSelectProduto ? DOM_TABLE_MGMT.checkoutSelectProduto.value : '';
    if (!produtoId) {
        alert("Selecione um produto.");
        return null;
    }
    const produto = allProducts[categoria][produtoId];
    return {
        id: produtoId,
        name: produto.nome || produto.titulo,
        price: produto.preco || 0,
        size: '',
        originalProductId: produtoId,
        productCategory: categoria
    };
}

function addCheckoutItemToOrder() {
    const categoria = DOM_TABLE_MGMT.checkoutSelectCategoria ? DOM_TABLE_MGMT.checkoutSelectCategoria.value : '';
    const quantidade = DOM_TABLE_MGMT.checkoutQtdProdutoInput ? parseInt(DOM_TABLE_MGMT.checkoutQtdProdutoInput.value) : 0;
    const observacaoItem = DOM_TABLE_MGMT.checkoutObservacaoItemInput ? DOM_TABLE_MGMT.checkoutObservacaoItemInput.value.trim() : '';

    if (!categoria || isNaN(quantidade) || quantidade <= 0) {
        alert("Selecione uma categoria e uma quantidade válida para o item extra.");
        return;
    }

    let itemToAdd;
    if (categoria === 'pizzas') {
        itemToAdd = buildCheckoutPizzaItem();
    } else {
        itemToAdd = buildCheckoutGenericItem(categoria);
    }

    if (itemToAdd) {
        itemToAdd.quantity = quantidade;
        itemToAdd.totalPrice = itemToAdd.price * itemToAdd.quantity;
        itemToAdd.observacaoItem = observacaoItem;

        // Adiciona ao pedido completo da mesa
        currentMesaFullOrder.push(itemToAdd);
        // Recalcula o total original da mesa
        currentMesaOriginalTotal = currentMesaFullOrder.reduce((sum, item) => sum + item.totalPrice, 0);

        // Atualiza o Firebase para persistir a adição do item
        mesasRef.child(currentMesaIdForCheckout).update({
            pedido: currentMesaFullOrder,
            total: currentMesaOriginalTotal
        }).then(() => {
            alert("Item adicionado à conta com sucesso!");
            renderCheckoutItemsList();
            updateCheckoutCalculations();
            // Limpa os campos de adição de item extra
            if (DOM_TABLE_MGMT.checkoutSearchProdutoInput) DOM_TABLE_MGMT.checkoutSearchProdutoInput.value = '';
            if (DOM_TABLE_MGMT.checkoutSelectCategoria) DOM_TABLE_MGMT.checkoutSelectCategoria.value = '';
            if (DOM_TABLE_MGMT.checkoutQtdProdutoInput) DOM_TABLE_MGMT.checkoutQtdProdutoInput.value = '1';
            if (DOM_TABLE_MGMT.checkoutObservacaoItemInput) DOM_TABLE_MGMT.checkoutObservacaoItemInput.value = '';
            if (DOM_TABLE_MGMT.checkoutContainerMontagemPizza) DOM_TABLE_MGMT.checkoutContainerMontagemPizza.classList.add('hidden');
            if (DOM_TABLE_MGMT.checkoutContainerOutrosItens) DOM_TABLE_MGMT.checkoutContainerOutrosItens.classList.add('hidden');
            // Recarrega os selects de produtos para estarem vazios ou filtrados por categoria vazia
            if (DOM_TABLE_MGMT.checkoutPizzaSabor1Select) DOM_TABLE_MGMT.checkoutPizzaSabor1Select.innerHTML = '<option value="">-- Produto --</option>';
            if (DOM_TABLE_MGMT.checkoutPizzaSabor2Select) DOM_TABLE_MGMT.checkoutPizzaSabor2Select.innerHTML = '<option value="">-- Produto --</option>';
            if (DOM_TABLE_MGMT.checkoutSelectProduto) DOM_TABLE_MGMT.checkoutSelectProduto.innerHTML = '<option value="">-- Produto --</option>';
        }).catch(error => {
            console.error("Erro ao adicionar item extra à conta no Firebase:", error);
            alert("Erro ao adicionar item extra à conta.");
        });
    }
}


function renderPagamentoHistory() {
    if (!DOM_TABLE_MGMT.checkoutHistoricoPagamentos) return;
    DOM_TABLE_MGMT.checkoutHistoricoPagamentos.innerHTML = '';
    if (DOM_TABLE_MGMT.checkoutEmptyPaymentsMessage) DOM_TABLE_MGMT.checkoutEmptyPaymentsMessage.classList.add('hidden');

    if (currentMesaPaymentsHistory.length === 0) {
        if (DOM_TABLE_MGMT.checkoutEmptyPaymentsMessage) DOM_TABLE_MGMT.checkoutEmptyPaymentsMessage.classList.remove('hidden');
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
        DOM_TABLE_MGMT.checkoutHistoricoPagamentos.appendChild(paymentDiv);
    });

    DOM_TABLE_MGMT.checkoutHistoricoPagamentos.querySelectorAll('.remove-payment-btn').forEach(button => {
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

    updateCheckoutCalculations();
    renderPagamentoHistory();
}

function updateCheckoutCalculations() {
    const totalPaidSoFar = currentMesaPaymentsHistory.reduce((sum, p) => sum + p.valorPago, 0);

    currentMesaRemainingToPay = currentMesaOriginalTotal - totalPaidSoFar;
    if (Math.abs(currentMesaRemainingToPay) < 0.01) {
        currentMesaRemainingToPay = 0;
    }

    if (DOM_TABLE_MGMT.checkoutTotalOriginal) DOM_TABLE_MGMT.checkoutTotalOriginal.textContent = `R$ ${currentMesaOriginalTotal.toFixed(2)}`;
    if (DOM_TABLE_MGMT.checkoutTotalPago) DOM_TABLE_MGMT.checkoutTotalPago.textContent = `R$ ${totalPaidSoFar.toFixed(2)}`;
    if (DOM_TABLE_MGMT.checkoutRestantePagar) DOM_TABLE_MGMT.checkoutRestantePagar.textContent = `R$ ${currentMesaRemainingToPay.toFixed(2)}`;

    if (DOM_TABLE_MGMT.checkoutValorAPagarInput && parseFloat(DOM_TABLE_MGMT.checkoutValorAPagarInput.value) === 0 && currentMesaRemainingToPay > 0) {
        DOM_TABLE_MGMT.checkoutValorAPagarInput.value = currentMesaRemainingToPay.toFixed(2);
    } else if (DOM_TABLE_MGMT.checkoutValorAPagarInput && currentMesaRemainingToPay === 0) {
        DOM_TABLE_MGMT.checkoutValorAPagarInput.value = '0.00';
    }


    const hasRemaining = currentMesaRemainingToPay > 0.01;

    if (DOM_TABLE_MGMT.checkoutValorAPagarInput) DOM_TABLE_MGMT.checkoutValorAPagarInput.disabled = !hasRemaining;
    if (DOM_TABLE_MGMT.checkoutPagamentoMetodoAtual) DOM_TABLE_MGMT.checkoutPagamentoMetodoAtual.disabled = !hasRemaining;
    if (DOM_TABLE_MGMT.checkoutTrocoRecebidoInput) DOM_TABLE_MGMT.checkoutTrocoRecebidoInput.disabled = true;

    if (DOM_TABLE_MGMT.checkoutBtnAdicionarPagamento) DOM_TABLE_MGMT.checkoutBtnAdicionarPagamento.disabled = true;
    if (DOM_TABLE_MGMT.checkoutBtnDividirRestante) DOM_TABLE_MGMT.checkoutBtnDividirRestante.disabled = !hasRemaining;
    if (DOM_TABLE_MGMT.checkoutBtnFinalizarContaMesa) DOM_TABLE_MGMT.checkoutBtnFinalizarContaMesa.disabled = hasRemaining;

    const valorInput = parseFloat(DOM_TABLE_MGMT.checkoutValorAPagarInput.value) || 0;
    const metodo = DOM_TABLE_MGMT.checkoutPagamentoMetodoAtual.value;

    if (hasRemaining && valorInput > 0 && metodo) {
        if (metodo === 'Dinheiro') {
            if (DOM_TABLE_MGMT.checkoutTrocoInputGroup) DOM_TABLE_MGMT.checkoutTrocoInputGroup.classList.remove('hidden');
            if (DOM_TABLE_MGMT.checkoutTrocoRecebidoInput) DOM_TABLE_MGMT.checkoutTrocoRecebidoInput.disabled = false;
            const valorRecebido = parseFloat(DOM_TABLE_MGMT.checkoutTrocoRecebidoInput.value) || 0;
            if (valorRecebido >= valorInput) {
                if (DOM_TABLE_MGMT.checkoutBtnAdicionarPagamento) DOM_TABLE_MGMT.checkoutBtnAdicionarPagamento.disabled = false;
            } else {
                if (DOM_TABLE_MGMT.checkoutBtnAdicionarPagamento) DOM_TABLE_MGMT.checkoutBtnAdicionarPagamento.disabled = true;
            }
        } else {
            if (DOM_TABLE_MGMT.checkoutTrocoInputGroup) DOM_TABLE_MGMT.checkoutTrocoInputGroup.classList.add('hidden');
            if (DOM_TABLE_MGMT.checkoutBtnAdicionarPagamento) DOM_TABLE_MGMT.checkoutBtnAdicionarPagamento.disabled = false;
        }
    } else {
        if (DOM_TABLE_MGMT.checkoutTrocoInputGroup) DOM_TABLE_MGMT.checkoutTrocoInputGroup.classList.add('hidden');
        if (DOM_TABLE_MGMT.checkoutBtnAdicionarPagamento) DOM_TABLE_MGMT.checkoutBtnAdicionarPagamento.disabled = true;
    }
}

async function addMesaPayment() {
    console.log("Admin: Adicionando pagamento...");
    let valueToPay = parseFloat(DOM_TABLE_MGMT.checkoutValorAPagarInput.value);
    const currentPaymentMethod = DOM_TABLE_MGMT.checkoutPagamentoMetodoAtual.value;
    const trocoReceived = parseFloat(DOM_TABLE_MGMT.checkoutTrocoRecebidoInput.value) || 0;

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

    if (currentPaymentMethod === 'Dinheiro' && trocoReceived < valueToPay) {
        alert(`O valor recebido (R$ ${trocoReceived.toFixed(2)}) é menor que a parcela a pagar (R$ ${valueToPay.toFixed(2)}).`);
        return;
    }

    const trocoADevolver = currentPaymentMethod === 'Dinheiro' ? trocoReceived - valueToPay : 0;

    currentMesaPaymentsHistory.push({
        metodo: currentPaymentMethod,
        valorPago: valueToPay,
        valorRecebido: currentPaymentMethod === 'Dinheiro' ? trocoReceived : null,
        troco: currentPaymentMethod === 'Dinheiro' ? trocoADevolver : null,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    try {
        await mesasRef.child(currentMesaIdForCheckout).update({
            pagamentosRegistrados: currentMesaPaymentsHistory.length > 0 ? currentMesaPaymentsHistory : null
        });
        alert('Pagamento registrado com sucesso!');
        console.log(`Admin: Pagamento de R$ ${valueToPay.toFixed(2)} adicionado para Mesa ${currentMesaIdForCheckout}.`);
    } catch (error) {
        console.error('Admin: Erro ao registrar pagamento no Firebase:', error);
        alert('Erro ao registrar pagamento no servidor. Tente novamente.');
        return;
    }

    updateCheckoutCalculations();
    renderPagamentoHistory();

    if (currentPaymentMethod === 'Dinheiro' && trocoADevolver > 0) {
        alert(`Pagamento adicionado com sucesso!\nTROCO A DEVOLVER: R$ ${trocoADevolver.toFixed(2)}`);
    }
}

function splitMesaBill() {
    console.log("Admin: Dividindo conta...");
    const numPessoas = parseInt(DOM_TABLE_MGMT.checkoutDividirPorInput.value, 10);
    if (isNaN(numPessoas) || numPessoas <= 0) {
        alert('Por favor, digite um número válido de pessoas para dividir.');
        return;
    }
    if (currentMesaRemainingToPay <= 0.01) {
        alert('Não há valor restante para dividir.');
        return;
    }

    const valorPorPessoa = currentMesaRemainingToPay / numPessoas;
    if (DOM_TABLE_MGMT.checkoutValorAPagarInput) DOM_TABLE_MGMT.checkoutValorAPagarInput.value = valorPorPessoa.toFixed(2);

    if (DOM_TABLE_MGMT.checkoutDividirPorInput) DOM_TABLE_MGMT.checkoutDividirPorInput.value = '1';
    updateCheckoutCalculations();

    alert(`O valor por pessoa (R$ ${valorPorPessoa.toFixed(2)}) foi preenchido no campo "Valor desta Parcela". Agora, selecione o método de pagamento e clique em "Registrar Pagamento".`);
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

            if (currentMesaFullOrder && Array.isArray(currentMesaFullOrder)) {
                for (const itemPedido of currentMesaFullOrder) {
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
                cart: currentMesaFullOrder,
                totalOriginal: currentMesaOriginalTotal,
                totalPago: currentMesaOriginalTotal,
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

function printNotaFiscal(pedidoData) {
    if (!pedidoData || !pedidoData.cart || pedidoData.cart.length === 0) {
        alert("Não há itens no pedido para gerar a nota.");
        return;
    }

    const dataHora = new Date(pedidoData.timestamp).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    let itensHtml = '';
    pedidoData.cart.forEach(item => {
        let sizeInfo = item.pizzaSize || item.size ? ` (${item.pizzaSize || item.size})` : '';
        let obsItem = item.observacaoItem ? ` - Obs: ${item.observacaoItem}` : '';
        itensHtml += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2mm;">
                <span style="flex: 0 0 20mm; text-align: left;">${item.quantity}x</span>
                <span style="flex-grow: 1; text-align: left; padding-right: 5mm;">${item.name}${sizeInfo}${obsItem}</span>
                <span style="flex: 0 0 25mm; text-align: right; font-weight: bold;">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
            </div>
        `;
    });

    let pagamentosHtml = '';
    if (pedidoData.pagamentosRegistrados && pedidoData.pagamentosRegistrados.length > 0) {
        pedidoData.pagamentosRegistrados.forEach((pag, index) => {
            let trocoInfo = '';
            if (pag.troco !== undefined && pag.troco !== null && pag.troco > 0) {
                trocoInfo = ` (Troco: R$ ${pag.troco.toFixed(2).replace('.', ',')})`;
            } else if (pag.troco !== undefined && pag.troco !== null && pag.troco === 0) {
                trocoInfo = ` (Sem troco)`;
            }
            pagamentosHtml += `<p style="margin: 1mm 0;">${index + 1}. ${pag.metodo}: R$ ${pag.valorPago.toFixed(2).replace('.', ',')}${trocoInfo}</p>`;
        });
    } else {
        pagamentosHtml = `<p style="margin: 1mm 0;">Nenhum pagamento registrado na nota.</p>`;
    }

    let htmlContent = `
    <html>
    <head>
        <title>Nota Fiscal Mesa ${pedidoData.mesaNumero}</title>
        <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Consolas', 'Courier New', monospace; font-size: 10pt; margin: 0; padding: 10mm 5mm; box-sizing: border-box; line-height: 1.4; color: #000; }
            .header, .footer { text-align: center; margin-bottom: 10mm; }
            .header h1 { font-size: 14pt; margin: 0; text-transform: uppercase; font-weight: bold; }
            .header p { font-size: 9pt; margin: 2mm 0; }
            .section { border-top: 1px dashed #000; padding-top: 5mm; margin-top: 5mm; }
            .section h2 { font-size: 11pt; margin: 0 0 3mm 0; font-weight: bold; }
            .section p { margin: 1mm 0; }
            .items-list { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5mm 0; margin: 5mm 0; }
            .summary { text-align: right; font-size: 11pt; margin-top: 5mm; }
            .summary .total-line { display: flex; justify-content: space-between; font-weight: bold; margin-top: 3mm; font-size: 12pt; }
            .dashed-line { border-top: 1px dashed #000; margin: 5mm 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Bonanza Pizzaria</h1>
            <p>Seu Melhor Sabor!</p>
            <p>Rua Benjamin Constant, nº 621</p>
            <p>Telefone: (14) 99816-5756</p>
        </div>

        <div class="section">
            <h2>Nota Fiscal - Mesa ${pedidoData.mesaNumero}</h2>
            <p><strong>Data/Hora:</strong> ${dataHora}</p>
            <p><strong>Cliente:</strong> ${pedidoData.nomeCliente || 'N/A'}</p>
            <p><strong>Garçom:</strong> ${pedidoData.garcom || 'N/A'}</p>
        </div>

        <div class="items-list">
            <h2>Itens Consumidos</h2>
            ${itensHtml}
        </div>

        <div class="section summary">
            <p>Subtotal: R$ ${pedidoData.totalOriginal.toFixed(2).replace('.', ',')}</p>
            <div class="total-line">
                <span>TOTAL PAGO:</span>
                <span>R$ ${pedidoData.totalPago.toFixed(2).replace('.', ',')}</span>
            </div>
        </div>

        <div class="section">
            <h2>Detalhes do Pagamento</h2>
            ${pagamentosHtml}
        </div>

        ${pedidoData.observacao !== 'N/A' && pedidoData.observacao !== '' ? `
        <div class="section">
            <p><strong>Observações do Pedido:</strong> ${pedidoData.observacao}</p>
        </div>
        ` : ''}

        <div class="footer section">
            <p>Agradecemos a sua preferência!</p>
            <p>Volte Sempre!</p>
            <p>Desenvolvido por LGHN System</p>
        </div>
    </body>
    </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    } else {
        alert("Não foi possível abrir a janela de impressão. Por favor, verifique se pop-ups estão bloqueados.");
    }
}