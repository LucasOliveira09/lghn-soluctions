// Configuração do Firebase (SUBSTITUA PELAS SUAS CREDENCIAIS REAIS)
const firebaseConfig = {
  apiKey: "AIzaSyCxpZd8Bu1IKzFHMUMzX1AAU1id8AcjCYw",
  authDomain: "bonanzapizzaria-b2513.firebaseapp.com",
  databaseURL: "https://bonanzapizzaria-b2513-default-rtdb.firebaseio.com",
  projectId: "bonanzapizzaria-b2513",
  storageBucket: "bonanzapizzaria-b2513.firebasestorage.app",
  messagingSenderId: "7433511053",
  appId: "1:7433511053:web:44414e66d7e601e23b82c4",
  measurementId: "G-TZ9RC0E7WN"
  };

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

const database = firebase.database();
const mesasRef = database.ref('mesas');
const produtosRef = database.ref('produtos');

// Elementos HTML
const waiterNameDisplay = document.getElementById('waiter-name-display');
const mesasGrid = document.getElementById('mesas-grid');
const selectedTableNumberSpan = document.getElementById('selected-table-number');
const noTableSelectedMessage = document.getElementById('no-table-selected-message');
const orderManagementSection = document.getElementById('order-management-section');
const clientNameInput = document.getElementById('client-name-input');
const productSearchInput = document.getElementById('product-search-input');
const productCategorySelect = document.getElementById('product-category-select');
const productListContainer = document.getElementById('product-list-container');
const currentOrderItemsContainer = document.getElementById('current-order-items');
const emptyOrderMessage = document.getElementById('empty-order-message');
const orderTotalSpan = document.getElementById('order-total');
const decreaseQuantityBtn = document.getElementById('decrease-quantity-btn');
const increaseQuantityBtn = document.getElementById('increase-quantity-btn');
const removeItemBtn = document.getElementById('remove-item-btn');
const orderObservationsInput = document.getElementById('order-observations');
const sendOrderBtn = document.getElementById('send-order-btn');

let currentWaiterName = '';
let currentSelectedTable = null; // Chave Firebase da mesa selecionada (número da mesa)
let currentTableData = null;    // Dados completos da mesa selecionada do Firebase
let allProducts = {};           // Todos os produtos ativos carregados do Firebase
let currentOrderCart = [];      // Carrinho local para o pedido da mesa (array de {nome, preco, quantidade})
let selectedOrderItemIndex = -1; // Índice do item selecionado no currentOrderCart para ações de quantidade/remover

const WAITER_NAME_STORAGE_KEY = 'garcomName'; // Chave para armazenar o nome do garçom no sessionStorage

// --- Verificação de Autenticação ---
document.addEventListener('DOMContentLoaded', () => {
    const savedWaiterName = sessionStorage.getItem(WAITER_NAME_STORAGE_KEY);

    if (savedWaiterName) {
        // Garçom está logado, configura o painel
        document.body.style.display = 'flex'; // Mostra o conteúdo da página
        currentWaiterName = savedWaiterName;
        waiterNameDisplay.value = savedWaiterName;
        loadAllProducts(); // Carrega os produtos
    } else {
        // Garçom não está logado, redireciona para a página de login
        window.location.replace('logingarcom.html');
    }
});

// --- Monitoramento de Mesas em Tempo Real ---
mesasRef.on('value', (snapshot) => {
    const mesasData = snapshot.val() || {};
    renderMesas(mesasData); // Re-renderiza as mesas sempre que os dados mudam

    // Se uma mesa estiver selecionada, atualiza seus dados na seção de pedido
    if (currentSelectedTable) {
        const updatedTableData = mesasData[currentSelectedTable];
        if (updatedTableData) {
            currentTableData = updatedTableData;
            renderOrderSection(currentTableData); // Re-renderiza a seção do pedido
        } else {
            // Mesa selecionada não existe mais (ex: removida ou liberada pelo painel admin)
            resetOrderSection();
            alert('A mesa selecionada foi removida ou liberada por outro usuário.');
        }
    }
});

// --- Carregamento e Pesquisa de Produtos ---
function loadAllProducts() {
    produtosRef.on('value', (snapshot) => {
        allProducts = {}; // Reseta os produtos
        const categories = new Set();
        categories.add('all'); // Adiciona a categoria padrão 'Todas as Categorias'

        snapshot.forEach(categorySnap => {
            const categoryName = categorySnap.key; // Ex: 'pizzas', 'bebidas'
            categories.add(categoryName);
            categorySnap.forEach(productSnap => {
                const product = productSnap.val();
                if (product.ativo) { // Carrega apenas produtos ativos
                    allProducts[productSnap.key] = { ...product, category: categoryName, id: productSnap.key };
                }
            });
        });
        
        renderProductCategories(Array.from(categories)); // Renderiza as categorias no dropdown
        filterAndRenderProducts(); // Renderiza inicialmente os produtos filtrados
    });
}

function renderProductCategories(categories) {
    productCategorySelect.innerHTML = '';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category === 'all' ? 'Todas as Categorias' : capitalizeFirstLetter(category);
        productCategorySelect.appendChild(option);
    });
}

function filterAndRenderProducts() {
    const searchTerm = productSearchInput.value.toLowerCase();
    const selectedCategory = productCategorySelect.value;
    productListContainer.innerHTML = '';

    let productsToDisplay = Object.values(allProducts);

    if (selectedCategory !== 'all') {
        productsToDisplay = productsToDisplay.filter(product => product.category === selectedCategory);
    }

    productsToDisplay = productsToDisplay.filter(product => {
        const name = (product.nome || product.titulo || '').toLowerCase();
        const description = (product.descricao || '').toLowerCase();
        return name.includes(searchTerm) || description.includes(searchTerm);
    });

    if (productsToDisplay.length === 0) {
        productListContainer.innerHTML = `<p class="text-gray-500 text-center py-4">Nenhum produto encontrado.</p>`;
        return;
    }

    productsToDisplay.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-item bg-blue-100 hover:bg-blue-200'; // Aplica o estilo de item de produto
        productCard.innerHTML = `
            <p class="font-semibold text-blue-800">${product.nome || product.titulo}</p>
            <p class="text-sm text-blue-600">R$ ${product.preco.toFixed(2)}</p>
        `;
        productCard.addEventListener('click', () => addProductToOrder(product));
        productListContainer.appendChild(productCard);
    });
}

productSearchInput.addEventListener('input', filterAndRenderProducts);
productCategorySelect.addEventListener('change', filterAndRenderProducts);

// --- Renderização do Grid de Mesas ---
function renderMesas(mesasData) {
    mesasGrid.innerHTML = '';
    const sortedMesas = Object.values(mesasData).sort((a, b) => a.numero - b.numero);

    sortedMesas.forEach(mesa => {
        const statusClass = mesa.status === 'Livre' ? 'table-status-free' : 'table-status-occupied';
        const card = document.createElement('div');
        card.className = `table-card bg-white p-4 rounded-lg shadow-md border-2 text-center flex flex-col items-center justify-center ${statusClass}`;
        card.dataset.mesaKey = mesa.numero; // Usa o número da mesa como chave para seleção

        let occupiedInfo = '';
        if (mesa.status !== 'Livre') {
            occupiedInfo = `
                <p class="text-xs font-medium text-gray-700 mt-1">Cli: ${mesa.cliente || 'N/A'}</p>
                <p class="text-xs text-gray-600">Garçom: ${mesa.garcom || 'N/A'}</p>
                <p class="text-md font-semibold text-blue-600">R$ ${mesa.total.toFixed(2)}</p>
            `;
        }

        card.innerHTML = `
            <i class="fas fa-utensils text-4xl mb-2 ${mesa.status === 'Livre' ? 'text-green-700' : 'text-red-700'}"></i>
            <h3 class="text-2xl font-bold">Mesa ${mesa.numero}</h3>
            <span class="text-sm font-semibold ${mesa.status === 'Livre' ? 'text-green-700' : 'text-red-700'}">${mesa.status}</span>
            ${occupiedInfo}
        `;
        card.addEventListener('click', () => selectTable(mesa.numero, mesa));
        mesasGrid.appendChild(card);
    });
}

// --- Seleção de Mesa e Exibição da Seção de Pedido ---
function selectTable(mesaNumero, mesaData) {
    // Marca visualmente a mesa selecionada
    document.querySelectorAll('.table-card').forEach(card => {
        card.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500');
    });
    const selectedCard = document.querySelector(`.table-card[data-mesa-key="${mesaNumero}"]`);
    if (selectedCard) {
        selectedCard.classList.add('border-blue-500', 'ring-2', 'ring-blue-500');
    }

    currentSelectedTable = mesaNumero;
    currentTableData = mesaData;
    selectedTableNumberSpan.textContent = mesaNumero;
    noTableSelectedMessage.classList.add('hidden');
    orderManagementSection.classList.remove('hidden');

    renderOrderSection(mesaData);
}

function renderOrderSection(mesaData) {
    // Preenche os campos de cliente e garçom
    clientNameInput.value = mesaData.cliente || '';
    waiterNameDisplay.value = mesaData.garcom || currentWaiterName; // Padrão para o nome do garçom logado

    // Preenche os itens do pedido
    currentOrderCart = mesaData.pedido ? [...mesaData.pedido] : []; // Cria uma cópia do array
    renderCurrentOrderItems(); // Renderiza os itens no carrinho atual

    // Preenche as observações
    orderObservationsInput.value = mesaData.observacoes || '';

    // Atualiza o total
    updateOrderTotal();

    // Se for um novo pedido (mesa livre), permite editar o nome do cliente
    if (mesaData.status === 'Livre') {
        clientNameInput.readOnly = false;
    } else {
        // Se a mesa estiver ocupada, o nome do cliente geralmente é fixo
        clientNameInput.readOnly = true;
    }
}

function renderCurrentOrderItems() {
    currentOrderItemsContainer.innerHTML = '';

    if (currentOrderCart.length === 0) {
        emptyOrderMessage.classList.remove('hidden');
        decreaseQuantityBtn.disabled = true;
        increaseQuantityBtn.disabled = true;
        removeItemBtn.disabled = true;
        selectedOrderItemIndex = -1; // Desseleciona se o carrinho ficar vazio
        return;
    } else {
        emptyOrderMessage.classList.add('hidden');
    }

    currentOrderCart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        // Adiciona classe de destaque se for o item selecionado
        itemDiv.className = `flex justify-between items-center p-3 rounded-md border border-gray-200 cursor-pointer hover:bg-gray-100 text-base ${index === selectedOrderItemIndex ? 'order-item-selected' : ''}`; // p-3 para área de toque maior, text-base para tamanho do texto
        itemDiv.innerHTML = `
            <span class="flex-1">${item.quantity}x ${item.name}</span>
            <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
        `;
        // Adiciona um event listener para selecionar o item ao clicar
        itemDiv.addEventListener('click', () => selectOrderItem(index));
        currentOrderItemsContainer.appendChild(itemDiv);
    });

    // Reabilita/desabilita botões de quantidade/remover com base na seleção
    if (selectedOrderItemIndex !== -1) {
        decreaseQuantityBtn.disabled = false;
        increaseQuantityBtn.disabled = false;
        removeItemBtn.disabled = false;
    } else {
        decreaseQuantityBtn.disabled = true;
        increaseQuantityBtn.disabled = true;
        removeItemBtn.disabled = true;
    }

    updateOrderTotal();
}

function selectOrderItem(index) {
    selectedOrderItemIndex = index;
    renderCurrentOrderItems(); // Re-renderiza para aplicar o estilo de seleção
}

// Adiciona produto ou aumenta a quantidade, e então o seleciona
function addProductToOrder(product) {
    if (!currentSelectedTable) {
        alert('Por favor, selecione uma mesa antes de adicionar produtos.');
        return;
    }
    
    const existingItemIndex = currentOrderCart.findIndex(item => item.name === (product.nome || product.titulo));

    if (existingItemIndex !== -1) {
        currentOrderCart[existingItemIndex].quantity += 1;
        selectedOrderItemIndex = existingItemIndex; // Seleciona o item existente
    } else {
        currentOrderCart.push({
            name: product.nome || product.titulo,
            price: product.preco,
            quantity: 1
        });
        selectedOrderItemIndex = currentOrderCart.length - 1; // Seleciona o item recém-adicionado
    }
    renderCurrentOrderItems();
    // Opcional: Rola para o item recém-adicionado/atualizado se a lista for longa
    currentOrderItemsContainer.scrollTop = currentOrderItemsContainer.scrollHeight;
}

decreaseQuantityBtn.addEventListener('click', () => {
    if (selectedOrderItemIndex !== -1) {
        if (currentOrderCart[selectedOrderItemIndex].quantity > 1) {
            currentOrderCart[selectedOrderItemIndex].quantity -= 1;
        } else {
            // Se a quantidade for 1 e diminuir, remove o item
            currentOrderCart.splice(selectedOrderItemIndex, 1);
            selectedOrderItemIndex = -1; // Desseleciona após remover
        }
        renderCurrentOrderItems();
    }
});

increaseQuantityBtn.addEventListener('click', () => {
    if (selectedOrderItemIndex !== -1) {
        currentOrderCart[selectedOrderItemIndex].quantity += 1;
        renderCurrentOrderItems();
    }
});

removeItemBtn.addEventListener('click', () => {
    if (selectedOrderItemIndex !== -1 && confirm('Tem certeza que deseja remover este item do pedido?')) {
        currentOrderCart.splice(selectedOrderItemIndex, 1);
        selectedOrderItemIndex = -1; // Desseleciona após remover
        renderCurrentOrderItems();
    }
});

function updateOrderTotal() {
    const total = currentOrderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    orderTotalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

// --- Envio do Pedido para o Firebase ---
sendOrderBtn.addEventListener('click', () => {
    if (!currentSelectedTable) {
        alert('Por favor, selecione uma mesa primeiro.');
        return;
    }
    if (currentOrderCart.length === 0) {
        alert('O pedido não pode estar vazio.');
        return;
    }

    const clientName = clientNameInput.value.trim();
    const waiterName = waiterNameDisplay.value.trim();
    const observations = orderObservationsInput.value.trim();
    const orderTotal = currentOrderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (!clientName) {
        alert('Por favor, insira o nome do cliente.');
        return;
    }
    if (!waiterName) {
        alert('Por favor, insira o nome do garçom.');
        return;
    }

    const updateData = {
        cliente: clientName,
        garcom: waiterName,
        observacoes: observations,
        pedido: currentOrderCart, // Este é o array de itens
        total: orderTotal,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    };

    // Se a mesa estiver livre, muda seu status para 'Ocupada'
    if (currentTableData.status === 'Livre') {
        updateData.status = 'Ocupada';
        // Opcional: Você pode gerar um ID de pedido interno aqui ou usar apenas o número da mesa para rastreamento.
    }

    mesasRef.child(currentSelectedTable).update(updateData)
        .then(() => {
            alert(`Pedido da Mesa ${currentSelectedTable} enviado/atualizado com sucesso!`);
            // O listener 'value' do Firebase re-renderizará automaticamente as mesas
            // e atualizará a seção do pedido devido à mudança em currentTableData.
        })
        .catch(error => {
            console.error('Erro ao enviar pedido da mesa:', error);
            alert('Erro ao enviar pedido da mesa. Verifique o console.');
        });
});

// --- Resetar Seção de Pedido ---
function resetOrderSection() {
    currentSelectedTable = null;
    currentTableData = null;
    currentOrderCart = [];
    selectedOrderItemIndex = -1; // Reseta o índice de seleção

    selectedTableNumberSpan.textContent = 'N/A';
    noTableSelectedMessage.classList.remove('hidden');
    orderManagementSection.classList.add('hidden');

    clientNameInput.value = '';
    clientNameInput.readOnly = false; // Torna editável para a próxima mesa
    orderObservationsInput.value = '';
    orderTotalSpan.textContent = 'R$ 0.00';

    renderCurrentOrderItems(); // Limpa a exibição dos itens
    // Limpa pesquisa/filtro de produtos
    productSearchInput.value = '';
    productCategorySelect.value = 'all';
    filterAndRenderProducts();
}


// --- Funções Auxiliares ---
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}