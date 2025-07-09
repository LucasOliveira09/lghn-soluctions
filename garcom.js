// Firebase Configuration (Replace with your actual config)
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const database = firebase.database();
const mesasRef = database.ref('mesas');
const produtosRef = database.ref('produtos');

// HTML Elements
const loginScreen = document.getElementById('login-screen');
const garcomNameInput = document.getElementById('garcom-name-input');
const accessPanelBtn = document.getElementById('access-panel-btn');
const mainPanel = document.getElementById('main-panel');
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
let currentSelectedTable = null; // Stores the Firebase key of the selected table
let currentTableData = null;    // Stores the full data of the selected table
let allProducts = {};           // Stores all products fetched from Firebase
let currentOrderCart = [];      // Local cart for the selected table's order
let selectedOrderItemIndex = -1; // Index of the selected item in currentOrderCart for quantity/remove actions

// --- Login Functionality ---
accessPanelBtn.addEventListener('click', () => {
    const name = garcomNameInput.value.trim();
    if (name) {
        currentWaiterName = name;
        waiterNameDisplay.value = name; // Set waiter name in the order section
        loginScreen.classList.add('hidden');
        mainPanel.classList.remove('hidden');
        loadAllProducts(); // Load products once logged in
    } else {
        alert('Por favor, digite seu nome.');
    }
});

// --- Real-time Table Monitoring ---
mesasRef.on('value', (snapshot) => {
    const mesasData = snapshot.val() || {};
    renderMesas(mesasData);

    // If a table is currently selected, refresh its data in the order section
    if (currentSelectedTable) {
        const updatedTableData = mesasData[currentSelectedTable];
        if (updatedTableData) {
            currentTableData = updatedTableData;
            renderOrderSection(currentTableData);
        } else {
            // Selected table no longer exists (e.g., deleted from admin panel)
            resetOrderSection();
        }
    }
});

// --- Product Loading and Search ---
function loadAllProducts() {
    produtosRef.on('value', (snapshot) => {
        allProducts = {}; // Reset products
        const categories = new Set();
        categories.add('all'); // Add default 'Todas as Categorias'

        snapshot.forEach(categorySnap => {
            const categoryName = categorySnap.key; // e.g., 'pizzas', 'bebidas'
            categories.add(categoryName);
            categorySnap.forEach(productSnap => {
                const product = productSnap.val();
                if (product.ativo) { // Only load active products
                    allProducts[productSnap.key] = { ...product, category: categoryName, id: productSnap.key };
                }
            });
        });
        
        renderProductCategories(Array.from(categories));
        filterAndRenderProducts(); // Initial render of products
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
        productCard.className = 'bg-blue-100 p-2 rounded-lg shadow-sm text-center cursor-pointer hover:bg-blue-200 transition';
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

// --- Table Grid Rendering ---
function renderMesas(mesasData) {
    mesasGrid.innerHTML = '';
    const sortedMesas = Object.values(mesasData).sort((a, b) => a.numero - b.numero);

    sortedMesas.forEach(mesa => {
        const statusClass = mesa.status === 'Livre' ? 'table-status-free' : 'table-status-occupied';
        const card = document.createElement('div');
        card.className = `table-card bg-white p-4 rounded-lg shadow-md border-2 text-center flex flex-col items-center justify-center ${statusClass}`;
        card.dataset.mesaKey = mesa.numero; // Use mesa.numero as key for selection

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

// --- Table Selection and Order Section Display ---
function selectTable(mesaNumero, mesaData) {
    // Visually mark selected table
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
    // Populate client and waiter fields
    clientNameInput.value = mesaData.cliente || '';
    waiterNameDisplay.value = mesaData.garcom || currentWaiterName; // Default to logged in waiter name

    // Populate order items
    currentOrderCart = mesaData.pedido ? [...mesaData.pedido] : []; // Create a copy
    renderCurrentOrderItems();

    // Populate observations
    orderObservationsInput.value = mesaData.observacoes || '';

    // Update total
    updateOrderTotal();

    // If it's a new order (table is free), set client and waiter inputs editable
    if (mesaData.status === 'Livre') {
        clientNameInput.readOnly = false;
        // waiterNameDisplay is always set, but can be manually changed by waiter if needed for new order
    } else {
        // If table is occupied, client and waiter names are generally fixed
        clientNameInput.readOnly = true;
    }
}

function renderCurrentOrderItems() {
    currentOrderItemsContainer.innerHTML = '';
    // selectedOrderItemIndex = -1; // Don't reset here, selection might come from a click

    if (currentOrderCart.length === 0) {
        emptyOrderMessage.classList.remove('hidden');
        decreaseQuantityBtn.disabled = true;
        increaseQuantityBtn.disabled = true;
        removeItemBtn.disabled = true;
        return;
    } else {
        emptyOrderMessage.classList.add('hidden');
    }

    currentOrderCart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        // Add highlight class if it's the selected item
        itemDiv.className = `flex justify-between items-center p-2 rounded border border-gray-200 cursor-pointer hover:bg-gray-100 ${index === selectedOrderItemIndex ? 'order-item-selected' : ''}`;
        itemDiv.innerHTML = `
            <span>${item.quantity}x ${item.name}</span>
            <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
        `;
        // Add an event listener to select the item on click
        itemDiv.addEventListener('click', () => selectOrderItem(index));
        currentOrderItemsContainer.appendChild(itemDiv);
    });

    // Re-enable/disable quantity/remove buttons based on selection
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
    renderCurrentOrderItems(); // Re-render to apply selection styling
}

function addProductToOrder(product) {
    const existingItemIndex = currentOrderCart.findIndex(item => item.name === (product.nome || product.titulo));

    if (existingItemIndex !== -1) {
        currentOrderCart[existingItemIndex].quantity += 1;
        selectedOrderItemIndex = existingItemIndex; // Select the existing item
    } else {
        currentOrderCart.push({
            name: product.nome || product.titulo,
            price: product.preco,
            quantity: 1
        });
        selectedOrderItemIndex = currentOrderCart.length - 1; // Select the newly added item
    }
    renderCurrentOrderItems();
}

decreaseQuantityBtn.addEventListener('click', () => {
    if (selectedOrderItemIndex !== -1) {
        if (currentOrderCart[selectedOrderItemIndex].quantity > 1) {
            currentOrderCart[selectedOrderItemIndex].quantity -= 1;
        } else {
            // If quantity is 1 and decreases, remove the item
            currentOrderCart.splice(selectedOrderItemIndex, 1);
            selectedOrderItemIndex = -1; // Deselect after removing
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
        selectedOrderItemIndex = -1; // Deselect after removing
        renderCurrentOrderItems();
    }
});

function updateOrderTotal() {
    const total = currentOrderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    orderTotalSpan.textContent = `R$ ${total.toFixed(2)}`;
}

// --- Sending Order to Firebase ---
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
        pedido: currentOrderCart,
        total: orderTotal,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    };

    // If the table is currently free, change its status to 'Ocupada'
    if (currentTableData.status === 'Livre') {
        updateData.status = 'Ocupada';
        // You might want to automatically generate a basic internal order ID here
        // or just rely on the mesa number for tracking.
    }

    mesasRef.child(currentSelectedTable).update(updateData)
        .then(() => {
            alert(`Pedido da Mesa ${currentSelectedTable} enviado/atualizado com sucesso!`);
            // The Firebase 'value' listener will automatically re-render the tables
            // and refresh the order section due to currentTableData update.
        })
        .catch(error => {
            console.error('Erro ao enviar pedido da mesa:', error);
            alert('Erro ao enviar pedido da mesa. Verifique o console.');
        });
});

// --- Reset Order Section ---
function resetOrderSection() {
    currentSelectedTable = null;
    currentTableData = null;
    currentOrderCart = [];
    selectedOrderItemIndex = -1; // Reset selection index

    selectedTableNumberSpan.textContent = 'N/A';
    noTableSelectedMessage.classList.remove('hidden');
    orderManagementSection.classList.add('hidden');

    clientNameInput.value = '';
    clientNameInput.readOnly = false; // Make it editable for next table
    orderObservationsInput.value = '';
    orderTotalSpan.textContent = 'R$ 0.00';

    renderCurrentOrderItems(); // Clear items display
    // Clear product search/filter
    productSearchInput.value = '';
    productCategorySelect.value = 'all';
    filterAndRenderProducts();
}


// --- Helper Functions ---
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Ensure the page starts with the login screen
document.addEventListener('DOMContentLoaded', () => {
    loginScreen.classList.remove('hidden');
    mainPanel.classList.add('hidden');
});