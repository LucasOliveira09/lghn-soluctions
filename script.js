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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obter referência ao Realtime Database
const database = firebase.database();

// --- Referências do Firebase ---
const ingredientesRef = database.ref('central/ingredientes');
const produtosRef = database.ref('central/produtos');
const pedidosRef = database.ref('central/pedidos');
const configRef = database.ref('central/config/ultimoPedidoId');
const cuponsRef = database.ref('central/cupons');
const cuponsUsadosRef = database.ref('central/cupons_usados');

// --- Elementos do DOM ---
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const closeModalBtn = document.getElementById('cart-modal-btn');
const cartCounter = document.getElementById('cart-count');
const observationInput = document.getElementById('observation');
const rua = document.getElementById('rua');
const bairro = document.getElementById('bairro');
const numero = document.getElementById('numero');
const telefoneInput = document.getElementById('telefone');
const nomeInput = document.getElementById('nome-cliente');
const ruaWarn = document.getElementById('rua-aste');
const bairroWarn = document.getElementById('bairro-aste');
const numeroWarn = document.getElementById('numero-aste');
const telefoneWarn = document.getElementById('telefone-aste');
const nomeWarn = document.getElementById('nome-aste');
const submitBtn = document.getElementById('submit-order');
const backBtn = document.getElementById('back-cart');
const confirmModal = document.getElementById('confirm-modal');
const confirmCartItems = document.getElementById('confirm-cart-items');
const confirmTotal = document.getElementById('confirm-total');
const menuButton = document.getElementById('menu-button');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const cupomInput = document.getElementById('cupom');
const applycupom = document.getElementById('apply-cupom');
const cepBtn = document.getElementById('cep-btn');
const cepModal = document.getElementById('cep-modal');
const closeCepModalBtn = document.getElementById('close-cep-modal-btn');
const buscarCepBtn = document.getElementById('buscar-cep-btn');
const cepInput = document.getElementById('cep-input');
const halfPizzaSearchInput = document.getElementById('half-pizza-search');
const halfPizzaOptionsContainer = document.getElementById('half-pizza-options-container');
const additionalIngredientsContainer = document.getElementById('additional-ingredients-container');
const crustFlavorSection = document.getElementById('crust-flavor-section');
const pizzaPricePreview = document.getElementById('pizza-price-preview');
const pizzaModalTitle = document.getElementById('modal-title');

// --- Variáveis de Estado ---
const FRETE_VALOR = 4.00;
let cart = [];
let cupomAplicado = null;
let selectedPizza = null; // Objeto com {name, price, id, category}
let selectedSize = "Grande";
let selectedHalf = "";
let selectedHalfPrice = 0;
let wantsCrust = "Não";
let crustFlavor = "";
let selectedAddons = []; // [{ id, nome, precoAdicional }]

let allIngredients = {}; // Cache local de ingredientes
let availableAddons = []; // Ingredientes ativos para adicionais
let allPizzasSnapshot = null; // Snapshot de todas as pizzas para o modal de meia-meia
const cepCache = {}; // Cache de memória para CEPs

// --- Listeners do Firebase para dados em tempo real ---
ingredientesRef.on('value', (snapshot) => {
    allIngredients = snapshot.val() || {};
    availableAddons = Object.entries(allIngredients)
        .filter(([, data]) => data.ativoAdicional && typeof data.precoAdicional === 'number' && data.precoAdicional > 0)
        .map(([id, data]) => ({ id, ...data }));
    console.log("allIngredients carregado/atualizado:", Object.keys(allIngredients).length, "ingredientes.");
    console.log("Adicionais disponíveis:", availableAddons.length);
    if (document.getElementById('pizza-modal').style.display === 'flex') {
        renderAddonOptions(); // Atualiza os adicionais se o modal de pizza estiver aberto
    }
});

// --- Funções de Carregamento e Renderização de Produtos ---

/**
 * Cria o HTML para um item do cardápio.
 * @param {object} item - Os dados do item (nome, preco, descricao, imagem).
 * @param {string} type - O tipo do item ('pizza', 'bebida', etc.).
 * @param {string} idDoItemFirebase - O ID do item no Firebase.
 * @returns {string} O HTML do item.
 */
function criarItemCardapio(item, type, idDoItemFirebase) {
    const buttonClass = type === 'pizza' ? 'open-modal-btn' : 'add-to-cart-btn';
    const name = item.nome || item.titulo;
    const description = item.descricao || '';
    const price = item.preco.toFixed(2).replace('.', ',');
    const image = item.imagem || 'assets/default.png';

    return `
    <div class="flex gap-4 p-3 border border-[#3a3a3a] rounded-xl shadow bg-[#111] hover:shadow-md transition-shadow text-[#f5f0e6] font-[Cinzel]">
      <img src="${image}" alt="${name}" loading="lazy" class="w-20 h-20 rounded-lg object-cover hover:scale-105 hover:rotate-1 transition-transform duration-300" />
      <div class="flex-1">
        <p class="font-bold text-lg">${name}</p>
        <p class="text-sm text-gray-400">${description}</p>
        <div class="flex items-center justify-between mt-3">
          <p class="text-lg font-bold text-[#f5f0e6]">R$ ${price}</p>
          <button
            class="bg-green-700 hover:bg-green-600 transition-colors px-4 py-1 rounded-md ${buttonClass}"
            data-name="${name}"
            data-price="${item.preco}"
            data-id="${idDoItemFirebase}"
            data-category="${type === 'pizza' ? 'pizzas' : type === 'bebida' ? 'bebidas' : type === 'esfirra' ? 'esfirras' : type === 'lanche' ? 'calzone' : type === 'promocao' ? 'promocoes' : 'novidades'}">
            <i class="fa fa-cart-plus text-white text-lg"></i>
          </button>
        </div>
      </div>
    </div>`;
}

/**
 * Carrega e renderiza produtos de uma categoria específica do Firebase.
 * @param {string} dbRefPath - O caminho do nó no Firebase Realtime Database.
 * @param {string} containerId - O ID do elemento HTML onde os itens serão renderizados.
 * @param {string} itemType - O tipo de item (ex: 'pizza', 'bebida').
 * @param {string} [sectionId] - Opcional. O ID da seção HTML a ser mostrada/escondida.
 * @param {string} [btnId] - Opcional. O ID do botão de categoria a ser mostrado/escondido.
 * @param {string} [subType] - Opcional. Usado para filtrar por subtipo (ex: 'Salgado', 'Doce').
 */
async function loadAndRenderProducts(dbRefPath, containerId, itemType, sectionId = null, btnId = null, subType = null) {
    try {
        const snapshot = await database.ref(dbRefPath).once('value');
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Contêiner com ID ${containerId} não encontrado.`);
            return;
        }

        const fragment = document.createDocumentFragment();
        let hasActiveItems = false;

        snapshot.forEach((itemSnap) => {
            const item = itemSnap.val();
            const itemId = itemSnap.key;
            if (item.ativo) {
                // Filtra por subtipo se for especificado
                if (!subType || (item.tipo && item.tipo.toLowerCase() === subType.toLowerCase())) {
                    fragment.appendChild(
                        document.createRange().createContextualFragment(
                            criarItemCardapio(item, itemType, itemId)
                        )
                    );
                    hasActiveItems = true;
                }
            }
        });

        container.innerHTML = ''; // Limpa o container uma única vez
        container.appendChild(fragment); // Adiciona todos os elementos de uma vez

        // Controla a visibilidade da seção e do botão de categoria
        if (sectionId && btnId) {
            const sectionDiv = document.getElementById(sectionId);
            const sectionBtn = document.getElementById(btnId);
            if (sectionDiv && sectionBtn) {
                if (hasActiveItems) {
                    sectionDiv.classList.remove("hidden");
                    sectionBtn.classList.remove("hidden");
                } else {
                    sectionDiv.classList.add("hidden");
                    sectionBtn.classList.add("hidden");
                }
            }
        }

        // Armazena o snapshot de pizzas para o modal de meia-meia
        if (itemType === 'pizza') {
            allPizzasSnapshot = snapshot;
            atualizarOpcoesMeiaMeia();
        }
    } catch (error) {
        console.error(`Erro ao carregar produtos de ${dbRefPath}:`, error);
        Toastify({ text: "Erro ao carregar o menu. Tente novamente mais tarde.", duration: 3000, style: { background: "#ef4444" } }).showToast();
    }
}

/**
 * Carrega todas as categorias de produtos.
 */
async function carregarTodasCategorias() {
    await loadAndRenderProducts('central/produtos/pizzas', 'lista-pizzas-salgadas', 'pizza', null, null, 'Salgado');
    await loadAndRenderProducts('central/produtos/pizzas', 'lista-pizzas-doces', 'pizza', null, null, 'Doce');
    await loadAndRenderProducts('central/produtos/esfirras', 'lista-esfirras-salgadas', 'esfirra', null, null, 'Salgado');
    await loadAndRenderProducts('central/produtos/esfirras', 'lista-esfirras-doces', 'esfirra', null, null, 'Doce');
    await loadAndRenderProducts('central/produtos/calzone', 'lista-lanches-salgados', 'lanche', null, null, 'Salgado');
    await loadAndRenderProducts('central/produtos/calzone', 'lista-lanches-doces', 'lanche', null, null, 'Doce');
    await loadAndRenderProducts('central/produtos/bebidas', 'lista-bebidas', 'bebida');
    await loadAndRenderProducts('central/produtos/promocoes', 'lista-promocoes', 'promocao', 'show-promocoes', 'btn-promocoes');
    await loadAndRenderProducts('central/produtos/novidades', 'lista-novidades', 'novidade', 'show-novidades', 'btn-novidades');
}

// --- Delegação de Eventos para botões de adicionar ao carrinho e abrir modal ---
document.body.addEventListener('click', function(event) {
    const targetButton = event.target.closest('.add-to-cart-btn, .open-modal-btn');
    if (targetButton) {
        if (targetButton.classList.contains('add-to-cart-btn')) {
            handleAddToCart.call(targetButton);
        } else if (targetButton.classList.contains('open-modal-btn')) {
            handleOpenPizzaModal.call(targetButton);
        }
    }
});

function handleAddToCart() {
    const name = this.getAttribute('data-name');
    const price = parseFloat(this.getAttribute('data-price'));
    const productId = this.getAttribute('data-id');
    const productCategory = this.getAttribute('data-category');
    addToCart(name, price, productId, productCategory);
}

function handleOpenPizzaModal() {
    selectedPizza = {
        name: this.getAttribute('data-name'),
        price: parseFloat(this.getAttribute('data-price')),
        id: this.getAttribute('data-id'),
        category: this.getAttribute('data-category')
    };

    // Reseta todas as seleções e estado do modal para uma nova pizza
    selectedSize = "Grande";
    selectedHalf = "";
    selectedHalfPrice = 0;
    wantsCrust = "Não";
    crustFlavor = "";
    selectedAddons = []; // Limpa adicionais

    resetPizzaModalSelections(); // Reseta os botões visuais e mostra/esconde seções
    pizzaModalTitle.textContent = selectedPizza.name;
    document.getElementById('pizza-modal').style.display = 'flex';
    updatePizzaPricePreview();
    if (halfPizzaSearchInput) halfPizzaSearchInput.value = '';
    atualizarOpcoesMeiaMeia(); // Recarrega opções de meia-meia
    renderAddonOptions(); // Recarrega opções de adicionais
}

// --- Funções do Carrinho ---
cartBtn.addEventListener("click", function() {
    updateCartModal();
    cartModal.style.display = "flex";
});

closeModalBtn.addEventListener("click", function() {
    cartModal.style.display = "none";
});

cartModal.addEventListener("click", function(event) {
    if (event.target === cartModal) {
        cartModal.style.display = "none";
    }
});

/**
 * Adiciona um item ao carrinho ou incrementa sua quantidade.
 * @param {string} name - Nome do item.
 * @param {number} price - Preço do item.
 * @param {string} productId - ID do produto no Firebase.
 * @param {string} productCategory - Categoria do produto no Firebase.
 * @param {object} [options] - Opções adicionais para itens complexos (ex: pizzaSize, halfProductId, selectedAddons).
 */
function addToCart(name, price, productId, productCategory, options = {}) {
    // Para itens simples, verifica se já existe uma entrada idêntica
    const existingItem = cart.find(item =>
        item.name === name &&
        item.originalProductId === productId &&
        item.productCategory === productCategory &&
        !item.pizzaSize // Garante que não misture pizzas personalizadas com itens simples
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name,
            price,
            quantity: 1,
            originalProductId: productId,
            productCategory,
            ...options // Adiciona opções como pizzaSize, halfProductId, selectedAddons
        });
    }
    updateCartModal();

    Toastify({
        text: "Item adicionado ao carrinho!",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: { background: "#22c55e" },
    }).showToast();
}

/**
 * Atualiza o conteúdo e o total do modal do carrinho.
 */
function updateCartModal() {
    cartItemsContainer.innerHTML = "";
    let total = 0;
    const fragment = document.createDocumentFragment(); // Cria um fragmento para otimizar o DOM

    cart.forEach(item => {
        const cartItemElement = document.createElement("div");
        cartItemElement.classList.add("flex", "justify-between", "mb-4", "flex-col");

        // Detalhes adicionais para pizzas, se houver
        let itemDetailsHtml = '';
        if (item.pizzaSize) {
            itemDetailsHtml += `<p class="text-xs text-gray-500">Tamanho: ${item.pizzaSize}</p>`;
        }
        if (item.selectedAddons && item.selectedAddons.length > 0) {
            const addonNames = item.selectedAddons.map(addon => addon.name).join(', ');
            itemDetailsHtml += `<p class="text-xs text-gray-500">Adicionais: ${addonNames}</p>`;
        }


        cartItemElement.innerHTML = `
            <div class="bg-gray-100 p-4 rounded-xl shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex-1">
                    <p class="font-semibold text-base text-gray-900">${item.name}</p>
                    ${itemDetailsHtml}
                    <div class="flex items-center gap-3 mt-2">
                        <button class="quantity-btn bg-red-500 text-white w-9 h-9 rounded-full text-lg hover:bg-red-600" data-name="${item.name}" data-action="decrease">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <span class="text-lg font-bold">${item.quantity}</span>
                        <button class="quantity-btn bg-green-500 text-white w-9 h-9 rounded-full text-lg hover:bg-green-600" data-name="${item.name}" data-action="increase">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    <p class="text-sm text-gray-700 mt-2">Preço: R$ ${item.price.toFixed(2).replace('.', ',')}</p>
                </div>
            </div>
        `;
        total += item.price * item.quantity;
        fragment.appendChild(cartItemElement);
    });

    cartItemsContainer.innerHTML = ''; // Limpa o container
    cartItemsContainer.appendChild(fragment); // Adiciona todos os itens de uma vez

    let finalTotal = total;
    let discountAmount = 0;

    if (cupomAplicado) {
        if (cupomAplicado.tipo === "porcentagem") {
            discountAmount = total * (cupomAplicado.valor / 100);
        } else if (cupomAplicado.tipo === "fixo") {
            discountAmount = cupomAplicado.valor;
        }
        finalTotal = Math.max(0, total - discountAmount);
    }

    cartTotal.textContent = finalTotal.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    if (cupomAplicado && discountAmount > 0) {
        const discountElement = document.createElement("p");
        discountElement.classList.add("text-sm", "text-green-600", "mt-2", "font-bold");
        discountElement.textContent = `Desconto Cupom: - R$ ${discountAmount.toFixed(2).replace('.', ',')}`;
        cartItemsContainer.appendChild(discountElement);
    }

    cartCounter.innerHTML = cart.length;
}

cartItemsContainer.addEventListener("click", function(event) {
    if (event.target.classList.contains("quantity-btn") || event.target.closest(".quantity-btn")) {
        const button = event.target.closest(".quantity-btn");
        const name = button.getAttribute('data-name');
        const action = button.getAttribute('data-action');

        // Note: Se você tiver nomes de itens no carrinho que são dinâmicos (ex: "Pizza de Calabresa (Grande) + Borda"),
        // a busca por `item.name === name` pode se tornar problemática para gerenciar IDs únicos de itens customizados.
        // Uma abordagem mais robusta seria adicionar um `cartItemId` único a cada item quando ele é adicionado ao carrinho.
        const item = cart.find(i => i.name === name);

        if (item) {
            if (action === "increase") {
                item.quantity += 1;
            } else if (action === "decrease") {
                item.quantity -= 1;
                if (item.quantity <= 0) {
                    cart.splice(cart.indexOf(item), 1); // Remove o item se a quantidade chegar a 0
                }
            }
        }
        updateCartModal();
    }
});


// --- Status de Abertura da Loja ---
function timeStringToMinutes(timeInput) {
    if (typeof timeInput === 'string' && timeInput.includes(':')) {
        const [hours, minutes] = timeInput.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    }
    if (typeof timeInput === 'number') {
        return timeInput * 60; // Converte horas para minutos se for um número
    }
    return 0;
}

function getStatusMessage(horarios) {
    const agora = new Date();
    const diaSemana = agora.getDay(); // 0 para Domingo, 6 para Sábado
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();

    const configDia = horarios[diaSemana];

    if (!configDia || !configDia.aberto || !configDia.inicio || !configDia.fim) {
        return { aberto: false, mensagem: "Fechado hoje" };
    }

    const minutosInicio = timeStringToMinutes(configDia.inicio);
    const minutosFim = timeStringToMinutes(configDia.fim);
    let estaAberto = false;

    // Lógica para horário que vira o dia (ex: 22:00 às 02:00)
    if (minutosInicio > minutosFim) {
        if (minutosAtuais >= minutosInicio || minutosAtuais < minutosFim) {
            estaAberto = true;
        }
    } else { // Horário normal (ex: 18:00 às 23:00)
        if (minutosAtuais >= minutosInicio && minutosAtuais < minutosFim) {
            estaAberto = true;
        }
    }

    if (estaAberto) {
        return { aberto: true, mensagem: `Aberto agora (fecha às ${configDia.fim})` };
    } else {
        return { aberto: false, mensagem: `Fechado agora (abre às ${configDia.inicio})` };
    }
}

function atualizarStatusVisual() {
    const spanItem = document.getElementById("date-span");

    database.ref("central/config/horarios").once("value")
        .then(snapshot => {
            if (snapshot.exists()) {
                const horarios = snapshot.val();
                const status = getStatusMessage(horarios);

                if (status.aberto) {
                    spanItem.classList.remove("bg-red-600");
                    spanItem.classList.add("bg-green-600");
                } else {
                    spanItem.classList.remove("bg-green-600");
                    spanItem.classList.add("bg-red-600");
                }
                spanItem.querySelector('span').textContent = status.mensagem; // Atualiza o texto dentro do span
            } else {
                spanItem.querySelector('span').textContent = "Horários não configurados.";
                spanItem.classList.remove("bg-green-600");
                spanItem.classList.add("bg-gray-500"); // Cor neutra se não houver config
            }
        })
        .catch(error => {
            console.error("Erro ao buscar horários:", error);
            spanItem.querySelector('span').textContent = "Erro ao carregar status.";
            spanItem.classList.remove("bg-green-600");
            spanItem.classList.add("bg-gray-500");
        });
}

document.addEventListener("DOMContentLoaded", () => {
    atualizarStatusVisual();
    setInterval(atualizarStatusVisual, 60000); // atualiza a cada minuto
});

// --- Modal de Confirmação de Pedido ---
checkoutBtn.addEventListener("click", function() {
    if (cart.length === 0) {
        Toastify({ text: "Seu carrinho está vazio!", duration: 3000, close: true, gravity: "top", position: "left", style: { background: "#ef4444" } }).showToast();
        return;
    }
    atualizarConfirmacao();
    cartModal.style.display = "none"; // Fecha o modal do carrinho
    confirmModal.classList.remove("hidden"); // Abre o modal de confirmação
});

function atualizarEntrega() {
    const retirada = document.getElementById("retirada");
    const entrega = document.getElementById("entrega");
    const enderecoSection = document.getElementById("address-section");
    const retiradaSection = document.getElementById("retirada-section");

    if (retirada.checked) {
        enderecoSection.classList.add("hidden");
        retiradaSection.classList.remove("hidden");
    } else if (entrega.checked) {
        retiradaSection.classList.add("hidden");
        enderecoSection.classList.remove("hidden");
    } else { // Nenhum selecionado, esconde ambos
        retiradaSection.classList.add("hidden");
        enderecoSection.classList.add("hidden");
    }
    atualizarConfirmacao();
}

function atualizarPagamento() {
    const pagPix = document.getElementById("pagPix");
    const pagCartao = document.getElementById("pagCartao");
    const pagDinheiro = document.getElementById("pagDinheiro");
    const trocoSection = document.getElementById("trocoSection");
    const pixSection = document.getElementById("PixSection");

    trocoSection.classList.add("hidden"); // Esconde por padrão
    pixSection.classList.add("hidden");   // Esconde por padrão

    if (pagDinheiro.checked) {
        trocoSection.classList.remove("hidden");
    } else if (pagPix.checked) {
        pixSection.classList.remove("hidden");
    }
    atualizarConfirmacao();
}

// --- LÓGICA PARA A SEÇÃO PIX ---
document.addEventListener('DOMContentLoaded', () => {
    const copyPixBtn = document.getElementById('copy-pix-btn');
    const pixKeySpan = document.getElementById('pix-key');
    const whatsappBtn = document.getElementById('whatsapp-receipt-btn');

    if (copyPixBtn && pixKeySpan) {
        copyPixBtn.addEventListener('click', function() {
            const pixKey = pixKeySpan.innerText;
            navigator.clipboard.writeText(pixKey).then(() => {
                Toastify({ text: "Chave Pix copiada!", duration: 3000, gravity: "top", position: "right", style: { background: "#22c55e" } }).showToast();
            }).catch(err => {
                console.error('Erro ao copiar a chave Pix: ', err);
                Toastify({ text: "Erro ao copiar a chave Pix.", duration: 3000, style: { background: "#ef4444" } }).showToast();
            });
        });
    }

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function() {
            const phoneNumber = "5514998165756"; // << TROCAR PARA O NÚMERO REAL DO ESTABELECIMENTO
            const message = "Olá! Segue o comprovante de pagamento do meu pedido.";
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        });
    }
});

// Event listeners para tipos de entrega e pagamento
document.getElementById('retirada').addEventListener('change', atualizarEntrega);
document.getElementById('entrega').addEventListener('change', atualizarEntrega);
document.getElementById('pagPix').addEventListener('change', atualizarPagamento);
document.getElementById('pagCartao').addEventListener('change', atualizarPagamento);
document.getElementById('pagDinheiro').addEventListener('change', atualizarPagamento);

// --- Validação e Envio do Pedido ---

/**
 * Valida um campo de input e aplica estilos de feedback visual.
 * @param {HTMLInputElement} campo - O elemento input a ser validado.
 * @param {HTMLElement} warnElement - O elemento onde a mensagem de erro será exibida.
 * @returns {boolean} True se o campo for válido, false caso contrário.
 */
function validarCampoEAvancar(campo, warnElement) {
    const isValid = campo.value.trim() !== "";
    if (isValid) {
        campo.classList.remove("border-red-500", "input-error");
        campo.classList.add("input-ok");
        warnElement.classList.add("hidden");
        return true;
    } else {
        campo.classList.add("border-red-500", "input-error");
        campo.classList.remove("input-ok");
        warnElement.classList.remove("hidden");
        return false;
    }
}

// Event Listeners para validação de input
nomeInput.addEventListener("input", () => validarCampoEAvancar(nomeInput, nomeWarn));
telefoneInput.addEventListener("input", (event) => {
    let value = event.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (value.length > 0) {
        value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
        value = value.replace(/(\d)(\d{4})$/, "$1-$2");
    }
    event.target.value = value;
    validarCampoEAvancar(telefoneInput, telefoneWarn);
});
rua.addEventListener("input", () => validarCampoEAvancar(rua, ruaWarn));
bairro.addEventListener("input", () => validarCampoEAvancar(bairro, bairroWarn));
numero.addEventListener("input", () => validarCampoEAvancar(numero, numeroWarn));
document.getElementById('troco').addEventListener("input", () => validarCampoEAvancar(document.getElementById('troco'), document.getElementById('troco-aste')));

/**
 * Valida todos os campos do formulário de pedido antes do envio.
 * @returns {Promise<boolean>} True se o formulário for válido, false caso contrário.
 */
async function validarFormularioPedido() {
    let isValid = true;

    // Resetar estilos de erro antes de validar
    [nomeInput, telefoneInput, rua, bairro, numero, document.getElementById('troco')].forEach(input => {
        input.classList.remove("border-red-500", "input-ok", "input-error");
    });
    [nomeWarn, telefoneWarn, ruaWarn, bairroWarn, numeroWarn, document.getElementById('troco-aste')].forEach(warn => {
        warn.classList.add("hidden");
    });

    // Validação de Nome e Telefone
    if (!validarCampoEAvancar(nomeInput, nomeWarn)) isValid = false;
    if (!validarCampoEAvancar(telefoneInput, telefoneWarn)) isValid = false;

    // Validação do tipo de entrega
    const retiradaChecked = document.getElementById("retirada").checked;
    const entregaChecked = document.getElementById("entrega").checked;
    if (!retiradaChecked && !entregaChecked) {
        Toastify({ text: "Por favor, selecione o tipo de entrega!", duration: 3000, close: true, gravity: "top", position: "left", style: { background: "#ef4444" } }).showToast();
        isValid = false;
    } else if (entregaChecked) {
        // Validação de endereço se for entrega
        if (!validarCampoEAvancar(rua, ruaWarn)) isValid = false;
        if (!validarCampoEAvancar(bairro, bairroWarn)) isValid = false;
        if (!validarCampoEAvancar(numero, numeroWarn)) isValid = false;
    }

    // Validação de pagamento
    const pagPixChecked = document.getElementById("pagPix").checked;
    const pagCartaoChecked = document.getElementById("pagCartao").checked;
    const pagDinheiroChecked = document.getElementById("pagDinheiro").checked;
    if (!pagPixChecked && !pagCartaoChecked && !pagDinheiroChecked) {
        Toastify({ text: "Por favor, selecione a forma de pagamento!", duration: 3000, close: true, gravity: "top", position: "left", style: { background: "#ef4444" } }).showToast();
        isValid = false;
    } else if (pagDinheiroChecked) {
        // Validação do troco se o pagamento for dinheiro
        if (!validarCampoEAvancar(document.getElementById('troco'), document.getElementById('troco-aste'))) isValid = false;
    }

    return isValid;
}

backBtn.addEventListener("click", function() {
    confirmModal.classList.add("hidden");
    cartModal.style.display = "flex";
});

submitBtn.addEventListener("click", async function() {
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando Pedido...";

    try {
        if (!await validarFormularioPedido()) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Enviar Pedido";
            return;
        }

        const pedidoFormatado = montarPedido();
        await enviarPedidoParaPainel(pedidoFormatado);

        zerarCarrinho(); // Limpa o carrinho e campos do formulário

    } catch (error) {
        console.error("Erro ao enviar pedido:", error);
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar Pedido";
        Toastify({ text: "Erro ao finalizar pedido. Por favor, tente novamente.", duration: 3000, close: true, gravity: "top", position: "center", style: { background: "#ef4444" } }).showToast();
    }
});

function zerarCarrinho() {
    cart = [];
    document.getElementById('confirm-modal').classList.add("hidden");
    cartModal.style.display = "none";
    updateCartModal();
    cupomAplicado = null;
    if (cupomInput) cupomInput.disabled = false;
    if (applycupom) applycupom.disabled = false;
    if (cupomInput) cupomInput.value = "";

    // Limpar campos do formulário de confirmação e resetar estilos
    nomeInput.value = "";
    telefoneInput.value = "";
    rua.value = "";
    bairro.value = "";
    numero.value = "";
    document.getElementById('referencia').value = "";
    document.getElementById('troco').value = "";

    // Desmarcar radios e ocultar seções
    document.getElementById('retirada').checked = false;
    document.getElementById('entrega').checked = false;
    document.getElementById('pagPix').checked = false;
    document.getElementById('pagCartao').checked = false;
    document.getElementById('pagDinheiro').checked = false;

    document.getElementById("address-section").classList.add("hidden");
    document.getElementById("retirada-section").classList.add("hidden");
    document.getElementById("PixSection").classList.add("hidden");
    document.getElementById("trocoSection").classList.add("hidden");

    // Resetar avisos de erro e classes de input
    [nomeInput, telefoneInput, rua, bairro, numero, document.getElementById('troco')].forEach(input => {
        input.classList.remove("border-red-500", "input-ok", "input-error");
    });
    [nomeWarn, telefoneWarn, ruaWarn, bairroWarn, numeroWarn, document.getElementById('troco-aste')].forEach(warn => {
        warn.classList.add("hidden");
    });
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

async function enviarPedidoParaPainel(pedido) {
    try {
        const result = await configRef.transaction((current) => {
            return (current || 1000) + 1; // Começa de 1001 se não existir
        });

        const novoId = result.snapshot.val();
        pedido.status = 'Aguardando';
        pedido.timestamp = Date.now();

        await pedidosRef.child(novoId).set(pedido);
        console.log('Pedido enviado com sucesso!', novoId);

        // --- DEDUÇÃO DE ESTOQUE ---
        for (const item of pedido.cart) {
            await deduzirEstoqueDoItem(item);
        }

        const phoneNumber = telefoneInput.value.replace(/\D/g, '');
        localStorage.setItem('clienteId', phoneNumber);
        setCookie('clienteId', phoneNumber, 60);

        if (cupomAplicado) {
            const cupomCode = cupomAplicado.codigo;
            // 1. Incrementa a contagem de uso global do cupom
            await cuponsRef.child(cupomCode).transaction((currentUsage) => {
                if (currentUsage === null) {
                    return { usos: 1, lastUsed: firebase.database.ServerValue.TIMESTAMP };
                } else {
                    currentUsage.usos = (currentUsage.usos || 0) + 1;
                    currentUsage.lastUsed = firebase.database.ServerValue.TIMESTAMP;
                    return currentUsage;
                }
            });
            console.log(`Contagem de uso do cupom ${cupomCode} atualizada.`);

            // 2. Marca este cupom como usado por este cliente específico
            const clienteIdLimpo = phoneNumber;
            await cuponsUsadosRef.child(clienteIdLimpo).child(cupomCode).set({
                usedAt: firebase.database.ServerValue.TIMESTAMP,
                orderId: novoId
            });
            console.log(`Cupom ${cupomCode} marcado como usado pelo cliente ${clienteIdLimpo}.`);
        }

        mostrarPedidoSucessoComLogo();
        setTimeout(() => {
            window.location.href = `status.html?pedidoId=${novoId}`;
        }, 1000);

    } catch (error) {
        console.error('Erro ao enviar pedido ou processar cupom: ', error);
        throw error; // Re-lança o erro para o catch do submitBtn
    }
}


function montarPedido() {
    const tipoEntrega = document.getElementById("retirada").checked ? "Retirada" : "Entrega";

    let endereco = {};
    if (tipoEntrega === "Entrega") {
        endereco = {
            rua: rua.value,
            bairro: bairro.value,
            numero: numero.value,
            referencia: document.getElementById('referencia').value
        };
    }

    const telefone = telefoneInput.value.replace(/\D/g, ''); // Telefone sem formatação
    const nomeCliente = nomeInput.value;

    let pagamento = "";
    if (document.getElementById("pagPix").checked) pagamento = "Pix";
    else if (document.getElementById("pagCartao").checked) pagamento = "Cartão";
    else if (document.getElementById("pagDinheiro").checked) pagamento = "Dinheiro";

    const dinheiroTroco = pagamento === "Dinheiro" ? parseFloat(document.getElementById("troco").value) || 0 : null;
    const observacao = observationInput.value;

    let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let totalPedido = subtotal;

    if (tipoEntrega === "Entrega") {
        totalPedido += FRETE_VALOR;
    }

    if (cupomAplicado) {
        let discountAmount = 0;
        if (cupomAplicado.tipo === "porcentagem") {
            discountAmount = subtotal * (cupomAplicado.valor / 100);
        } else if (cupomAplicado.tipo === "fixo") {
            discountAmount = cupomAplicado.valor;
        }
        totalPedido = Math.max(0, totalPedido - discountAmount);
    }

    return {
        endereco,
        cart,
        observacao,
        tipoEntrega,
        pagamento,
        dinheiroTroco, // Nome alterado para refletir melhor o uso
        totalPedido: parseFloat(totalPedido.toFixed(2)),
        telefone,
        nomeCliente,
        cupomAplicado: cupomAplicado ? {
            codigo: cupomAplicado.codigo,
            valor: cupomAplicado.valor,
            tipo: cupomAplicado.tipo,
            valorMinimo: cupomAplicado.valorMinimo || 0
        } : null
    };
}


function mostrarPedidoSucessoComLogo() {
    Toastify({
        text: `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <img src="assets/sua-logo.png" alt="Logo" style="width: 200px; height: 200px; margin-bottom: 20px; border-radius: 10px;" />
              <span style="font-size: 20px; font-weight: bold; color: #ffffff;">Pedido realizado com sucesso!</span>
            </div>
          `,
        duration: 3000,
        close: true,
        gravity: "center",
        position: "center",
        backgroundColor: "rgba(0,0,0,0.8)",
        stopOnFocus: true,
        escapeMarkup: false,
        style: {
            borderRadius: "15px",
            padding: "30px 20px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
            backdropFilter: "blur(5px)",
            width: "320px",
        }
    }).showToast();
}

// --- Funções do Modal de Pizza ---

function resetPizzaModalSelections() {
    // Resetar estilos dos botões
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    document.querySelectorAll('.crust-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    document.querySelectorAll('.crust-flavor-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));

    // Selecionar opções padrão
    document.querySelector('.size-btn[data-size="Grande"]').classList.add('bg-green-500', 'text-white');
    document.querySelector('.half-btn[data-half=""]').classList.add('bg-green-500', 'text-white'); // "Não" para meia-meia
    document.querySelector('.crust-btn[data-crust="Não"]').classList.add('bg-green-500', 'text-white'); // "Não" para borda

    crustFlavorSection.classList.add('hidden'); // Esconde a seção de sabor da borda
    // renderAddonOptions() já é chamado em handleOpenPizzaModal e gerencia os addons
}

/**
 * Atualiza o preço exibido no modal de personalização da pizza.
 */
function updatePizzaPricePreview() {
    if (!selectedPizza) return;

    let basePrice = selectedPizza.price;

    // Calcula preço para meia-meia
    if (selectedHalf && selectedHalf !== selectedPizza.name) {
        basePrice = (selectedPizza.price + selectedHalfPrice) / 2; // MÉDIA dos preços
    }

    // Ajusta preço para tamanho Broto
    if (selectedSize === "Broto") {
        const nomePizzaLower = selectedPizza.name.toLowerCase();
        const nomeMetadeLower = selectedHalf ? selectedHalf.toLowerCase() : "";

        const temSaborEspecial =
            nomePizzaLower.includes("costela") ||
            nomePizzaLower.includes("morango com chocolate") ||
            nomeMetadeLower.includes("costela") ||
            nomeMetadeLower.includes("morango com chocolate");

        basePrice = temSaborEspecial ? 35 : 30;
    }

    let finalPrice = basePrice;

    // Adiciona custo da borda
    if (wantsCrust === "Sim" && crustFlavor) {
        finalPrice += selectedSize === "Broto" ? 10 : 12;
    }

    // Adiciona custo dos adicionais selecionados
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.precoAdicional, 0);
    finalPrice += addonsTotal;

    pizzaPricePreview.textContent = `Valor: R$ ${finalPrice.toFixed(2).replace('.', ',')}`;

    // Atualiza o texto dos botões de sabor de borda
    document.querySelectorAll('.crust-flavor-btn').forEach(btn => {
        const flavor = btn.dataset.flavor;
        const priceSuffix = selectedSize === "Broto" ? "(+R$10)" : "(+R$12)";
        btn.textContent = `${flavor} ${priceSuffix}`;
    });
}

// Cancelar modal de pizza
document.getElementById('cancel-pizza').addEventListener('click', () => {
    document.getElementById('pizza-modal').style.display = 'none';
});

/**
 * Renderiza as opções de adicionais no modal da pizza.
 */
function renderAddonOptions() {
    if (!additionalIngredientsContainer) return;

    const fragment = document.createDocumentFragment(); // Otimiza o DOM
    if (availableAddons.length === 0) {
        additionalIngredientsContainer.innerHTML = '<p class="text-gray-500 text-sm">Nenhum adicional disponível no momento.</p>';
        return;
    }

    availableAddons.forEach(addon => {
        const checkboxContainer = document.createElement('label');
        checkboxContainer.className = 'flex items-center space-x-2 p-2 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 transition-colors';
        checkboxContainer.innerHTML = `
            <input type="checkbox" class="addon-checkbox form-checkbox h-5 w-5 text-green-600 rounded"
                           data-id="${addon.id}"
                           data-name="${addon.nome}"
                           data-price="${addon.precoAdicional}">
            <span class="text-gray-800 flex-1">${addon.nome}</span>
            <span class="text-sm font-medium text-gray-700">R$ ${addon.precoAdicional.toFixed(2).replace('.', ',')}</span>
        `;
        fragment.appendChild(checkboxContainer);

        // Marca o checkbox se o adicional já estiver selecionado
        const checkbox = checkboxContainer.querySelector('.addon-checkbox');
        if (selectedAddons.some(sA => sA.id === addon.id)) {
            checkbox.checked = true;
        }

        checkbox.addEventListener('change', function() {
            const addonId = this.dataset.id;
            const addonName = this.dataset.name;
            const addonPrice = parseFloat(this.dataset.price);

            if (this.checked) {
                selectedAddons.push({ id: addonId, nome: addonName, precoAdicional: addonPrice });
            } else {
                selectedAddons = selectedAddons.filter(item => item.id !== addonId);
            }
            updatePizzaPricePreview();
        });
    });
    additionalIngredientsContainer.innerHTML = ''; // Limpa antes de adicionar
    additionalIngredientsContainer.appendChild(fragment);
}

/**
 * Atualiza as opções de pizza para o recurso meia-meia, filtrando por termo de busca.
 * @param {string} [searchTerm=''] - Opcional. Termo para filtrar as pizzas.
 */
function atualizarOpcoesMeiaMeia(searchTerm = '') {
    if (!halfPizzaOptionsContainer) return;

    // Sempre inclui o botão "Não"
    halfPizzaOptionsContainer.innerHTML = `<button class="half-btn bg-gray-200 text-gray-700 px-3 py-2 sm:py-3 rounded-md text-left" data-half="" data-price="0">Não</button>`;
    const noHalfButton = halfPizzaOptionsContainer.querySelector('.half-btn[data-half=""]');
    noHalfButton.addEventListener('click', function() {
        document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
        this.classList.add('bg-green-500', 'text-white');
        selectedHalf = this.getAttribute('data-half');
        selectedHalfPrice = parseFloat(this.getAttribute('data-price'));
        updatePizzaPricePreview();
    });

    if (!allPizzasSnapshot) {
        console.warn("Snapshot de todas as pizzas não disponível para opções de meia-meia.");
        return;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const fragment = document.createDocumentFragment();

    allPizzasSnapshot.forEach((pizzaSnap) => {
        const pizza = pizzaSnap.val();
        const pizzaId = pizzaSnap.key;
        if (pizza.ativo && pizza.nome.toLowerCase().includes(lowerCaseSearchTerm)) {
            const botaoMeiaMeia = document.createElement('button');
            botaoMeiaMeia.className = 'half-btn bg-gray-200 text-gray-700 px-4 py-3 rounded-md text-left';
            botaoMeiaMeia.setAttribute('data-half', pizza.nome);
            botaoMeiaMeia.setAttribute('data-price', pizza.preco);
            botaoMeiaMeia.setAttribute('data-id', pizzaId);
            botaoMeiaMeia.setAttribute('data-category', 'pizzas');
            botaoMeiaMeia.textContent = pizza.nome;

            botaoMeiaMeia.addEventListener('click', function() {
                document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
                this.classList.add('bg-green-500', 'text-white');
                selectedHalf = this.getAttribute('data-half');
                selectedHalfPrice = parseFloat(this.getAttribute('data-price'));
                updatePizzaPricePreview();
            });
            fragment.appendChild(botaoMeiaMeia);
        }
    });
    halfPizzaOptionsContainer.appendChild(fragment);

    // Garante que a opção atualmente selecionada permaneça marcada após a filtragem
    if (selectedHalf) {
        const currentSelectedHalfBtn = halfPizzaOptionsContainer.querySelector(`.half-btn[data-half="${selectedHalf}"]`);
        if (currentSelectedHalfBtn) {
            currentSelectedHalfBtn.classList.add('bg-green-500', 'text-white');
        } else if (selectedHalf === "") {
            noHalfButton.classList.add('bg-green-500', 'text-white');
        }
    } else {
        noHalfButton.classList.add('bg-green-500', 'text-white');
    }
}

if (halfPizzaSearchInput) {
    halfPizzaSearchInput.addEventListener('input', function() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            atualizarOpcoesMeiaMeia(this.value);
        }, 300);
    });
}

// Tamanho da pizza
document.querySelectorAll('.size-btn').forEach(button => {
    button.addEventListener('click', () => {
        selectedSize = button.dataset.size;
        document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
        button.classList.add('bg-green-500', 'text-white');
        updatePizzaPricePreview();
    });
});

// Meia-Meia da pizza (event listeners anexados em atualizarOpcoesMeiaMeia)
// Não é necessário adicionar listeners globais aqui se eles já são adicionados na função de renderização.

// Borda da pizza
document.querySelectorAll('.crust-btn').forEach(button => {
    button.addEventListener('click', () => {
        wantsCrust = button.dataset.crust;
        crustFlavor = ""; // Reseta o sabor da borda ao mudar a opção "quer borda?"
        document.querySelectorAll('.crust-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
        button.classList.add('bg-green-500', 'text-white');

        if (wantsCrust === "Sim") {
            crustFlavorSection.classList.remove('hidden');
        } else {
            crustFlavorSection.classList.add('hidden');
            document.querySelectorAll('.crust-flavor-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white')); // Remove seleção de sabor
        }
        updatePizzaPricePreview();
    });
});

document.querySelectorAll('.crust-flavor-btn').forEach(button => {
    button.addEventListener('click', () => {
        crustFlavor = button.dataset.flavor;
        document.querySelectorAll('.crust-flavor-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
        button.classList.add('bg-green-500', 'text-white');
        updatePizzaPricePreview();
    });
});

// Confirmar adição de pizza personalizada ao carrinho
document.getElementById('confirm-pizza').addEventListener('click', () => {
    let finalName = selectedPizza.name;
    let basePrice = selectedPizza.price;
    let itemOriginalProductId = selectedPizza.id;
    let itemProductCategory = selectedPizza.category;
    let itemHalfProductId = null;
    let itemHalfProductCategory = null;

    if (selectedHalf && selectedHalf !== selectedPizza.name) {
        finalName = `${selectedPizza.name} / ${selectedHalf}`;
        basePrice = (selectedPizza.price + selectedHalfPrice) / 2;

        const halfButton = document.querySelector(`.half-btn[data-half="${selectedHalf}"]`);
        if (halfButton) {
            itemHalfProductId = halfButton.dataset.id;
            itemHalfProductCategory = halfButton.dataset.category;
        } else {
            console.warn(`ID do produto para o segundo sabor "${selectedHalf}" não encontrado nos botões de meia-meia.`);
        }
    }

    finalName += ` (${selectedSize})`;

    if (selectedSize === "Broto") {
        const nomePizzaLower = selectedPizza.name.toLowerCase();
        const nomeMetadeLower = selectedHalf ? selectedHalf.toLowerCase() : "";

        const temSaborEspecial =
            nomePizzaLower.includes("costela") ||
            nomePizzaLower.includes("morango com chocolate") ||
            nomeMetadeLower.includes("costela") ||
            nomeMetadeLower.includes("morango com chocolate");

        basePrice = temSaborEspecial ? 35 : 30;
    }

    let finalPrice = basePrice;

    if (wantsCrust === "Sim" && crustFlavor) {
        finalName += ` + Borda de ${crustFlavor}`;
        finalPrice += selectedSize === "Broto" ? 10 : 12;
    }

    let addonsDescription = [];
    let addonsCost = 0;
    const selectedAddonData = [];

    selectedAddons.forEach(addon => {
        addonsDescription.push(addon.nome);
        addonsCost += addon.precoAdicional;
        selectedAddonData.push({
            id: addon.id,
            name: addon.nome,
            price: addon.precoAdicional,
            category: 'ingredientes'
        });
    });

    if (addonsDescription.length > 0) {
        finalName += ` + Adicionais: ${addonsDescription.join(', ')}`;
        finalPrice += addonsCost;
    }

    const itemOptions = {
        pizzaSize: selectedSize,
        halfProductId: itemHalfProductId,
        halfProductCategory: itemHalfProductCategory,
        selectedAddons: selectedAddonData
    };

    addToCart(finalName, finalPrice, itemOriginalProductId, itemProductCategory, itemOptions);
    document.getElementById('pizza-modal').style.display = 'none';
});

// --- Resumo do Pedido na Confirmação ---
function atualizarConfirmacao() {
    confirmCartItems.innerHTML = "";
    let subtotal = 0;
    const fragment = document.createDocumentFragment();

    cart.forEach(item => {
        const itemContainer = document.createElement('div');
        itemContainer.classList.add('mb-4');

        const topBorder = document.createElement('div');
        topBorder.classList.add('h-[1px]', 'bg-gray-300', 'mb-2');
        itemContainer.appendChild(topBorder);

        const itemContent = document.createElement('div');
        itemContent.classList.add('flex', 'justify-between', 'items-center');
        itemContent.innerHTML = `
                <div>
                    <p class="font-medium">${item.quantity}x ${item.name}</p>
                    <p class="text-sm text-gray-600">Subtotal: R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                </div>
            `;
        itemContainer.appendChild(itemContent);

        const bottomBorder = document.createElement('div');
        bottomBorder.classList.add('h-[1px]', 'bg-gray-300', 'mt-2');
        itemContainer.appendChild(bottomBorder);

        fragment.appendChild(itemContainer);
        subtotal += item.price * item.quantity;
    });

    confirmCartItems.appendChild(fragment);

    let totalComFrete = subtotal;
    const entregaSelecionada = document.getElementById("entrega").checked;
    if (entregaSelecionada) {
        totalComFrete += FRETE_VALOR;
    }

    let discountAmount = 0;
    if (cupomAplicado) {
        if (cupomAplicado.tipo === "porcentagem") {
            discountAmount = subtotal * (cupomAplicado.valor / 100);
        } else if (cupomAplicado.tipo === "fixo") {
            discountAmount = cupomAplicado.valor;
        }
        totalComFrete = Math.max(0, totalComFrete - discountAmount);
    }

    let totalText = `Total: R$ ${totalComFrete.toFixed(2).replace('.', ',')}`;
    if (entregaSelecionada) {
        totalText += ` (Inclui frete de R$ ${FRETE_VALOR.toFixed(2).replace('.', ',')})`;
    }
    if (cupomAplicado && discountAmount > 0) {
        totalText += ` - Cupom: R$ ${discountAmount.toFixed(2).replace('.', ',')}`;
    }

    confirmTotal.textContent = totalText;
}

// --- Scroll Horizontal de Categorias ---
const scrollContainer = document.getElementById('scroll-container');
const scrollIndicator = document.getElementById('scroll-indicator');

scrollIndicator.addEventListener('click', () => {
    scrollContainer.scrollBy({
        left: 300,
        behavior: 'smooth'
    });
});

function checkScrollEnd() {
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollWidth = scrollContainer.scrollWidth;
    const clientWidth = scrollContainer.offsetWidth;

    const chegouNoFim = (scrollLeft + clientWidth) >= (scrollWidth - 10); // Tolerância de 10px

    scrollIndicator.style.opacity = chegouNoFim ? '0' : '1';
    scrollIndicator.style.pointerEvents = chegouNoFim ? 'none' : 'auto';
}

scrollContainer.addEventListener('scroll', checkScrollEnd);
window.addEventListener('resize', checkScrollEnd);
document.addEventListener('DOMContentLoaded', checkScrollEnd);

// --- Sidebar ---
menuButton.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
});

overlay.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

document.getElementById('close-sidebar-button').addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

// --- Cupons ---
if (cupomInput) {
    cupomInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });
}

applycupom.addEventListener('click', () => {
    const codigoDigitado = cupomInput.value.trim();
    const clienteId = telefoneInput.value.trim().replace(/\D/g, '');

    if (codigoDigitado === '') {
        Toastify({ text: "Por favor, insira um código de cupom.", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "#ffc107" } }).showToast();
        return;
    }

    if (clienteId === '') {
        Toastify({ text: "Informe seu telefone antes de aplicar um cupom.", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "#ffc107" } }).showToast();
        telefoneWarn.classList.remove("hidden");
        telefoneInput.classList.add("border-red-500");
        return;
    }

    if (cupomAplicado) {
        Toastify({ text: "Um cupom já foi aplicado.", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "#ffc107" } }).showToast();
        return;
    }

    cuponsRef.child(codigoDigitado).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            Toastify({ text: "CUPOM INVÁLIDO!", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "#ef4444" } }).showToast();
            cupomInput.value = "";
            return;
        }

        const cupom = snapshot.val();
        const hoje = new Date();

        if (cupom.clienteTelefone && cupom.clienteTelefone !== clienteId) {
            Toastify({ text: "Este cupom não foi gerado para este número de telefone.", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "#ef4444" } }).showToast();
            cupomInput.value = "";
            return;
        }

        if (!cupom.ativo) {
            Toastify({ text: "Este cupom não está mais ativo.", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "#ef4444" } }).showToast();
            return;
        }

        if (cupom.validade && hoje.getTime() > cupom.validade) {
            Toastify({ text: "Este cupom expirou!", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "#ef4444" } }).showToast();
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (cupom.valorMinimo && subtotal < cupom.valorMinimo) {
            Toastify({ text: `Este cupom requer um pedido mínimo de R$ ${cupom.valorMinimo.toFixed(2).replace('.', ',')}`, duration: 4000, close: true, gravity: "top", position: "right", style: { background: "#ffc107" } }).showToast();
            return;
        }

        cuponsUsadosRef.child(clienteId).child(codigoDigitado).once('value', (snapshotUso) => {
            if (snapshotUso.exists()) {
                Toastify({ text: "Você já utilizou este cupom!", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "#ef4444" } }).showToast();
            } else {
                Toastify({ text: "Cupom aplicado com sucesso!", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "#22c55e" } }).showToast();
                cupomAplicado = cupom;
                cupomInput.disabled = true;
                applycupom.disabled = true;
                updateCartModal();
                atualizarConfirmacao();
            }
        });
    });
});

// --- Consulta de CEP ---
cepBtn.addEventListener('click', function() {
    cepInput.value = "";
    cepModal.style.display = 'flex';
    cepInput.focus();
});

closeCepModalBtn.addEventListener('click', function() {
    cepModal.style.display = 'none';
});

buscarCepBtn.addEventListener('click', function() {
    const cep = cepInput.value;
    consultarCEP(cep);
});

cepInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        consultarCEP(this.value);
    }
});

cepInput.addEventListener('input', function(event) {
    let value = event.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (value.length > 5) {
        value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    event.target.value = value;
});

async function consultarCEP(cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
        Toastify({ text: "CEP inválido. Digite 8 números.", duration: 3000, style: { background: "#ef4444" } }).showToast();
        return;
    }

    if (cepCache[cepLimpo]) {
        console.log("CACHE HIT (memória):", cepLimpo);
        preencherCamposComCEP(cepCache[cepLimpo]);
        return;
    }

    const cepSalvo = localStorage.getItem(cepLimpo);
    if (cepSalvo) {
        console.log("CACHE HIT (localStorage):", cepLimpo);
        const data = JSON.parse(cepSalvo);
        cepCache[cepLimpo] = data;
        preencherCamposComCEP(data);
        return;
    }

    console.log("CACHE MISS - Buscando na API ViaCEP:", cepLimpo);
    const url = `https://viacep.com.br/ws/${cepLimpo}/json/`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.erro) {
            Toastify({ text: "CEP não encontrado.", duration: 3000, style: { background: "#ef4444" } }).showToast();
            return;
        }

        cepCache[cepLimpo] = data;
        localStorage.setItem(cepLimpo, JSON.stringify(data));
        preencherCamposComCEP(data);

    } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        Toastify({ text: "Não foi possível buscar o CEP. Tente novamente.", duration: 3000, style: { background: "#ef4444" } }).showToast();
    }
}

function preencherCamposComCEP(data) {
    rua.value = data.logradouro;
    bairro.value = data.bairro;
    cepModal.style.display = 'none';

    validarCampoEAvancar(rua, ruaWarn);
    validarCampoEAvancar(bairro, bairroWarn);

    Toastify({
        text: "Endereço preenchido com sucesso!",
        duration: 3000,
        close: true,
        gravity: "top", position: "right",
        style: { background: "#22c55e" }
    }).showToast();

    numero.focus();
}

// --- Dedução de Estoque ---
async function deduzirEstoqueDoItem(item) {
    console.log('----------------------------------------------------');
    console.log('Iniciando dedução de estoque para item:', item);

    if (!item.originalProductId || !item.productCategory) {
        console.warn(`Item "${item.name}" não tem ID ou categoria para dedução de estoque. Pulando.`);
        return;
    }

    let recipeToDeduct = {};

    try {
        if (item.productCategory === 'pizzas' && item.pizzaSize) {
            if (item.halfProductId && item.halfProductId !== item.originalProductId) {
                console.log('Detectada pizza meia a meia. Combinando receitas...');
                recipeToDeduct = await combineHalfAndHalfRecipes(
                    item.originalProductId,
                    item.productCategory,
                    item.pizzaSize,
                    item.halfProductId,
                    item.halfProductCategory
                );
            } else {
                console.log('Detectada pizza de sabor único.');
                const productSnapshot = await produtosRef.child(item.productCategory).child(item.originalProductId).once('value');
                const productData = productSnapshot.val();
                if (productData && productData.receita && productData.receita[item.pizzaSize]) {
                    recipeToDeduct = productData.receita[item.pizzaSize];
                } else {
                    console.warn(`Receita para pizza única "${item.name}" (${item.pizzaSize}) não encontrada.`);
                }
            }
        } else { // Itens não-pizza ou sem tamanho específico (bebidas, lanches, etc.)
            console.log('Detectado item não-pizza.');
            const productSnapshot = await produtosRef.child(item.productCategory).child(item.originalProductId).once('value');
            const productData = productSnapshot.val();
            if (productData && productData.receita) {
                recipeToDeduct = productData.receita;
            } else {
                console.warn(`Receita para produto "${item.name}" não-pizza não encontrada.`);
            }
        }

        // Processa adicionais selecionados para este item, se houver
        if (item.selectedAddons && item.selectedAddons.length > 0) {
            for (const addon of item.selectedAddons) {
                const addonIngredient = allIngredients[addon.id];
                if (addonIngredient && addonIngredient.receitaAdicional) {
                    for (const ingId in addonIngredient.receitaAdicional) {
                        const qty = addonIngredient.receitaAdicional[ingId];
                        recipeToDeduct[ingId] = (recipeToDeduct[ingId] || 0) + qty;
                    }
                    console.log(`Receita do adicional "${addon.name}" combinada.`);
                } else {
                    console.warn(`Adicional "${addon.name}" (ID: ${addon.id}) não possui receita para dedução de estoque.`);
                }
            }
        }

        if (!recipeToDeduct || Object.keys(recipeToDeduct).length === 0) {
            console.warn(`Receita final para o produto "${item.name}" está vazia. Nenhuma dedução será feita.`);
            return;
        }

        const now = firebase.database.ServerValue.TIMESTAMP;

        for (const ingredientId in recipeToDeduct) {
            const recipeQuantityPerUnit = recipeToDeduct[ingredientId];
            const totalDeductionQuantity = recipeQuantityPerUnit * item.quantity;
            const currentIngredientRef = ingredientesRef.child(ingredientId);

            await currentIngredientRef.transaction(currentData => {
                if (currentData) {
                    const oldQuantity = currentData.quantidadeAtual || 0;
                    const oldCostUnitarioMedio = currentData.custoUnitarioMedio || 0;
                    const oldQtdUsadaDiaria = currentData.quantidadeUsadaDiaria || 0;
                    const oldCustoUsadaDiaria = currentData.custoUsadaDiaria || 0;
                    const oldQtdUsadaMensal = currentData.quantidadeUsadaMensal || 0;
                    const oldCustoUsadoMensal = currentData.custoUsadoMensal || 0;

                    const costOfThisUse = totalDeductionQuantity * oldCostUnitarioMedio;

                    currentData.quantidadeAtual = Math.max(0, oldQuantity - totalDeductionQuantity);
                    currentData.quantidadeUsadaDiaria = oldQtdUsadaDiaria + totalDeductionQuantity;
                    currentData.custoUsadaDiaria = oldCustoUsadaDiaria + costOfThisUse;
                    currentData.quantidadeUsadaMensal = oldQtdUsadaMensal + totalDeductionQuantity;
                    currentData.custoUsadoMensal = oldCustoUsadoMensal + costOfThisUse;
                    currentData.ultimaAtualizacaoConsumo = now;

                    return currentData;
                }
                return currentData;
            });
        }
        console.log(`Estoque deduzido para item do pedido: "${item.name}"`);

    } catch (error) {
        console.error(`Erro ao deduzir estoque para o item "${item.name}":`, error);
    }
    console.log('----------------------------------------------------');
}

/**
 * Combina as receitas de duas metades de pizza para calcular a dedução de estoque.
 * @param {string} productId1 - ID do primeiro sabor da pizza.
 * @param {string} category1 - Categoria do primeiro sabor.
 * @param {string} size - Tamanho da pizza ('Broto' ou 'Grande').
 * @param {string} productId2 - ID do segundo sabor da pizza.
 * @param {string} category2 - Categoria do segundo sabor.
 * @returns {Promise<object>} Objeto contendo a receita combinada.
 */
async function combineHalfAndHalfRecipes(productId1, category1, size, productId2, category2) {
    let combinedRecipe = {};

    const [product1Snapshot, product2Snapshot] = await Promise.all([
        produtosRef.child(category1).child(productId1).once('value'),
        produtosRef.child(category2).child(productId2).once('value')
    ]);

    const product1Data = product1Snapshot.val();
    const product2Data = product2Snapshot.val();

    let recipe1 = {};
    if (product1Data && product1Data.receita && product1Data.receita[size]) {
        recipe1 = product1Data.receita[size];
    } else {
        console.warn(`Receita para o lado 1 (${productId1}, ${size}) não encontrada.`);
    }

    let recipe2 = {};
    if (product2Data && product2Data.receita && product2Data.receita[size]) {
        recipe2 = product2Data.receita[size];
    } else {
        console.warn(`Receita para o lado 2 (${productId2}, ${size}) não encontrada.`);
    }

    const allIngredientIds = new Set([...Object.keys(recipe1), ...Object.keys(recipe2)]);

    allIngredientIds.forEach(ingredientId => {
        const qty1 = recipe1[ingredientId] || 0;
        const qty2 = recipe2[ingredientId] || 0;
        combinedRecipe[ingredientId] = (qty1 + qty2) / 2; // Média das quantidades
    });

    return combinedRecipe;
}

// Inicializa o carregamento de todas as categorias ao carregar o DOM
document.addEventListener('DOMContentLoaded', carregarTodasCategorias);