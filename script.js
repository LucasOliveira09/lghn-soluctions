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

// --- NOVAS DECLARAÇÕES E LISTENERS PARA INGREDIENTES E PRODUTOS ---
const ingredientesRef = database.ref('ingredientes'); // Referência para os ingredientes no Firebase
const produtosRef = database.ref('produtos'); // Referência para os produtos no Firebase (categorias)

let allIngredients = {}; // Objeto para armazenar todos os ingredientes localmente

// Listener para manter allIngredients sincronizado com o Firebase
ingredientesRef.on('value', (snapshot) => {
    allIngredients = snapshot.val() || {};
    console.log("allIngredients carregado/atualizado:", Object.keys(allIngredients).length, "ingredientes.");
});
// --- FIM DAS NOVAS DECLARAÇÕES E LISTENERS ---


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
const cepCache = {}; //Cache de memória
const halfPizzaSearchInput = document.getElementById('half-pizza-search'); // Campo de busca para as opções de meia-meia
const halfPizzaOptionsContainer = document.getElementById('half-pizza-options-container'); // Contêiner onde as opções de meia-meia serão renderizadas

const FRETE_VALOR = 4.00;

let cart = [];
let cupomAplicado = null;

let selectedPizza = null;
let selectedSize = "Grande";
let selectedHalf = "";
let selectedHalfPrice = 0;
let wantsCrust = "Não";
let crustFlavor = "";
let allPizzasSnapshot = null;


// --- Inicialização e Carregamento de Produtos ---

// Função genérica para carregar e renderizar produtos
async function loadAndRenderProducts(dbRefPath, containerId, itemType, sectionId = null, btnId = null, subTipo = null) {
    try {
        const snapshot = await database.ref(dbRefPath).once('value');
        const container = document.getElementById(containerId);
        let htmlContent = '';
        let hasActiveItems = false; 

        if (!container) {
            console.warn(`Contêiner com ID ${containerId} não encontrado.`);
            return;
        }

        snapshot.forEach((itemSnap) => {
            const item = itemSnap.val();
            const itemId = itemSnap.key;
            if (item.ativo) {
                hasActiveItems = true; 

                // LÓGICA PRINCIPAL DO FILTRO:
                // Se um 'subTipo' (ex: "Salgada") foi passado, ele só adiciona o item se o item tiver o tipo correspondente.
                // Se nenhum 'subTipo' foi passado (como no caso de bebidas), ele adiciona o item.
                if (!subTipo || (item.tipo && item.tipo.toLowerCase() === subTipo.toLowerCase())) {
                    htmlContent += criarItemCardapio(item, itemType, itemId);
                }
            }
        });
        container.innerHTML = htmlContent;

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

        if (itemType === 'pizza') {
            allPizzasSnapshot = snapshot; // Armazena o snapshot completo aqui
            atualizarOpcoesMeiaMeia(); // Chama sem o snapshot, pois agora é global
        }
    } catch (error) {
        console.error(`Erro ao carregar produtos de ${dbRefPath}:`, error);
        Toastify({ text: "Erro ao carregar o menu. Tente novamente mais tarde.", duration: 3000, style: { background: "#ef4444" } }).showToast();
    }
}

// Chamar as funções de carregamento para cada categoria
async function carregarTodasCategorias() {
    // Pizzas agora são filtradas por tipo
    await loadAndRenderProducts('produtos/pizzas', 'lista-pizzas-salgadas', 'pizza', null, null, 'Salgado');
    await loadAndRenderProducts('produtos/pizzas', 'lista-pizzas-doces', 'pizza', null, null, 'Doce');

    // Esfirras agora são filtradas por tipo
    await loadAndRenderProducts('produtos/esfirras', 'lista-esfirras-salgadas', 'esfirra', null, null, 'Salgado');
    await loadAndRenderProducts('produtos/esfirras', 'lista-esfirras-doces', 'esfirra', null, null, 'Doce');

    // Calzones
    await loadAndRenderProducts('produtos/calzone', 'lista-lanches', 'lanche', null, null, 'Salgado');
    await loadAndRenderProducts('produtos/calzone', 'lista-lanches-doces', 'lanche', null, null, 'Doce');
    
    // Categorias sem subtipos continuam como antes
    await loadAndRenderProducts('produtos/bebidas', 'lista-bebidas', 'bebida');
    await loadAndRenderProducts('produtos/promocoes', 'lista-promocoes', 'promocao', 'show-promocoes', 'btn-promocoes');
    await loadAndRenderProducts('produtos/novidades', 'lista-novidades', 'novidade', 'show-novidades', 'btn-novidades');
}

// Chame a função principal de carregamento quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', carregarTodasCategorias);


function criarItemCardapio(item, tipo, idDoItemFirebase) {
    const botaoClass = tipo === 'pizza' ? 'open-modal-btn' : 'add-to-cart-btn';
    const nome = item.nome || item.titulo;
    const descricao = item.descricao || '';
    const preco = item.preco.toFixed(2);
    const imagem = item.imagem || 'assets/default.png';

    return `
    <div class="flex gap-4 p-3 border border-[#3a3a3a] rounded-xl shadow bg-[#111] hover:shadow-md transition-shadow text-[#f5f0e6] font-[Cinzel]">
      <img src="${imagem}" alt="${nome}" class="w-20 h-20 rounded-lg object-cover hover:scale-105 hover:rotate-1 transition-transform duration-300" />
      <div class="flex-1">
        <p class="font-bold text-lg">${nome}</p>
        <p class="text-sm text-gray-400">${descricao}</p>
        <div class="flex items-center justify-between mt-3">
          <p class="text-lg font-bold text-[#f5f0e6]">R$ ${preco.replace('.', ',')}</p>
          <button
            class="bg-green-700 hover:bg-green-600 transition-colors px-4 py-1 rounded-md ${botaoClass}"
            data-name="${nome}"
            data-price="${item.preco}"
            data-id="${idDoItemFirebase}"
            data-category="${tipo === 'pizza' ? 'pizzas' : tipo === 'bebida' ? 'bebidas' : tipo === 'esfirra' ? 'esfirras' : tipo === 'lanche' ? 'calzone' : tipo === 'promocao' ? 'promocoes' : 'novidades'}">
            <i class="fa fa-cart-plus text-white text-lg"></i>
          </button>
        </div>
      </div>
    </div>`;
}

// --- Delegação de Eventos para botões de adicionar ao carrinho e abrir modal ---
// Centraliza a escuta de cliques no corpo do documento para elementos dinâmicos
document.body.addEventListener('click', function(event) {
    const targetButton = event.target.closest('.add-to-cart-btn, .open-modal-btn');

    if (targetButton) {
        if (targetButton.classList.contains('add-to-cart-btn')) {
            // Usa .call para que 'this' dentro de handleAddToCart se refira ao botão clicado
            handleAddToCart.call(targetButton);
        } else if (targetButton.classList.contains('open-modal-btn')) {
            handleOpenPizzaModal.call(targetButton);
        }
    }
});


function atualizarOpcoesMeiaMeia(searchTerm = '') { // Adicionado searchTerm com valor padrão vazio
    const containerMeiaMeia = halfPizzaOptionsContainer; // Usa o novo ID do contêiner

    // Limpa todas as opções existentes, exceto o botão "Não" inicial
    const initialButtonHtml = `<button class="half-btn bg-gray-200 text-gray-700 px-3 py-2 sm:py-3 rounded-md text-left" data-half="" data-price="0">Não</button>`;
    containerMeiaMeia.innerHTML = initialButtonHtml; // Reseta com apenas o botão "Não"

    // Reanexa o event listener para o botão "Não" se ele foi removido
    const noHalfButton = containerMeiaMeia.querySelector('.half-btn[data-half=""]');
    if (noHalfButton) {
        noHalfButton.addEventListener('click', function() {
            document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
            this.classList.add('bg-green-500', 'text-white');
            selectedHalf = this.getAttribute('data-half');
            selectedHalfPrice = parseFloat(this.getAttribute('data-price'));
            updatePizzaPricePreview();
        });
    }

    if (!allPizzasSnapshot) { // Verifica se as pizzas foram carregadas
        console.warn("Snapshot de todas as pizzas não disponível para opções de meia-meia.");
        return;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase(); // Converte o termo de busca para minúsculas

    allPizzasSnapshot.forEach((pizzaSnap) => {
        const pizza = pizzaSnap.val();
        const pizzaId = pizzaSnap.key;
        // Filtra com base no status 'ativo' E no termo de busca
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
            containerMeiaMeia.appendChild(botaoMeiaMeia);
        }
    });

    // Garante que a opção atualmente selecionada permaneça marcada após a filtragem
    if (selectedHalf) {
        const currentSelectedHalfBtn = containerMeiaMeia.querySelector(`.half-btn[data-half="${selectedHalf}"]`);
        if (currentSelectedHalfHalfBtn) {
            currentSelectedHalfBtn.classList.add('bg-green-500', 'text-white');
        } else if (selectedHalf === "") { // Lida com o caso do "Não" estar selecionado
            noHalfButton.classList.add('bg-green-500', 'text-white');
        }
    } else { // Se nada estiver selecionado, garante que "Não" esteja selecionado por padrão
        noHalfButton.classList.add('bg-green-500', 'text-white');
    }
}


if (halfPizzaSearchInput) {
    halfPizzaSearchInput.addEventListener('input', function() {
        // Debounce para evitar muitas atualizações ao digitar rapidamente
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            atualizarOpcoesMeiaMeia(this.value);
        }, 300); // Espera 300ms após a última digitação para filtrar
    });
}

function handleAddToCart() {
    const name = this.getAttribute('data-name');
    const price = parseFloat(this.getAttribute('data-price'));
    const productId = this.getAttribute('data-id');
    const productCategory = this.getAttribute('data-category');
    addToCart(name, price, productId, productCategory);
}


function handleOpenPizzaModal() {
    const name = this.getAttribute('data-name');
    const price = parseFloat(this.getAttribute('data-price'));
    const productId = this.getAttribute('data-id');
    const productCategory = this.getAttribute('data-category');
    selectedPizza = {
        name,
        price,
        id: productId,
        category: productCategory
    };
    selectedSize = "Grande";
    selectedHalf = "";
    selectedHalfPrice = 0;
    wantsCrust = "Não";
    crustFlavor = "";

    resetSelections();
    document.getElementById('modal-title').textContent = selectedPizza.name;
    document.getElementById('pizza-modal').style.display = 'flex';
    updatePizzaPricePreview();
    resetSelections();
    if (halfPizzaSearchInput) halfPizzaSearchInput.value = ''; // Limpa o campo de busca ao abrir o modal
    atualizarOpcoesMeiaMeia(); // Reseta e mostra todas as opções ao abrir o modal
    document.getElementById('modal-title').textContent = selectedPizza.name;
    document.getElementById('pizza-modal').style.display = 'flex';
    updatePizzaPricePreview();
}


//fim
// --- Funções do Carrinho ---

cartBtn.addEventListener("click", function() {
    updateCartModal();
    cartModal.style.display = "flex";
});

cartModal.addEventListener("click", function(event) {
    if (event.target === cartModal) {
        cartModal.style.display = "none";
    }
});

closeModalBtn.addEventListener("click", function() {
    cartModal.style.display = "none";
});

function addToCart(name, price, productId, productCategory) {
    const existingItem = cart.find(item =>
        item.name === name &&
        item.originalProductId === productId &&
        item.productCategory === productCategory &&
        item.pizzaSize === undefined // Garante que não misture pizzas personalizadas com itens simples
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name,
            price,
            quantity: 1,
            originalProductId: productId,
            productCategory: productCategory
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
        style: {
            background: "#22c55e",
        },
    }).showToast();
}


function updateCartModal() {
    cartItemsContainer.innerHTML = "";
    let total = 0;

    cart.forEach(item => {
        const cartItemElement = document.createElement("div");
        cartItemElement.classList.add("flex", "justify-between", "mb-4", "flex-col");

        // Detalhes adicionais para pizzas, se houver
        let itemDetails = '';
        if (item.pizzaSize) {
            itemDetails += `<p class="text-xs text-gray-500">Tamanho: ${item.pizzaSize}</p>`;
        }
        if (item.name.includes('+ Borda de')) {
            // Já está no nome, não precisa adicionar aqui
        }

        cartItemElement.innerHTML = `
                <div class="bg-gray-100 p-4 rounded-xl shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex-1">
                        <p class="font-semibold text-base text-gray-900">${item.name}</p>
                        ${itemDetails}
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
        cartItemsContainer.appendChild(cartItemElement);
    });

    let finalTotal = total;
    let discountAmount = 0;

    if (cupomAplicado) {
        if (cupomAplicado.tipo === "porcentagem") {
            discountAmount = total * (cupomAplicado.valor / 100);
        } else if (cupomAplicado.tipo === "fixo") {
            discountAmount = cupomAplicado.valor;
        }
        finalTotal = Math.max(0, total - discountAmount); // Garante que o total não seja negativo
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

        const item = cart.find(i => i.name === name); // Encontra o item pelo nome

        if (item) {
            if (action === "increase") {
                item.quantity += 1;
            } else if (action === "decrease" && item.quantity > 1) {
                item.quantity -= 1;
            } else if (action === "decrease" && item.quantity === 1) {
                cart.splice(cart.indexOf(item), 1); // Remove o item se a quantidade chegar a 0
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
        return timeInput * 60;
    }
    return 0;
}

function getStatusMessage(horarios) {
    const agora = new Date();
    const diaSemana = agora.getDay();
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();

    const configDia = horarios[diaSemana];

    if (!configDia || !configDia.aberto || !configDia.inicio || !configDia.fim) {
        return { aberto: false, mensagem: "Fechado hoje" };
    }

    const minutosInicio = timeStringToMinutes(configDia.inicio);
    const minutosFim = timeStringToMinutes(configDia.fim);
    let estaAberto = false;

    if (minutosInicio > minutosFim) {
        if (minutosAtuais >= minutosInicio || minutosAtuais < minutosFim) {
            estaAberto = true;
        }
    } else {
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

    firebase.database().ref("config/horarios").once("value")
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
                spanItem.textContent = status.mensagem;
            } else {
                spanItem.textContent = "Horários não configurados.";
            }
        })
        .catch(error => {
            console.error("Erro ao buscar horários:", error);
            spanItem.textContent = "Erro ao carregar status.";
        });
}

document.addEventListener("DOMContentLoaded", () => {
    atualizarStatusVisual();
    setInterval(atualizarStatusVisual, 60000); // atualiza a cada minuto
});

// --- Modal de Confirmação de Pedido ---

checkoutBtn.addEventListener("click", function() {
    if (cart.length === 0) {
        Toastify({
            text: "Seu carrinho está vazio!",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "left",
            stopOnFocus: true,
            style: {
                background: "#ef4444",
            },
        }).showToast();
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
        entrega.checked = false;
        retiradaSection.classList.remove("hidden");
        enderecoSection.classList.add("hidden");
    } else if (entrega.checked) {
        retirada.checked = false;
        enderecoSection.classList.remove("hidden");
        retiradaSection.classList.add("hidden");
    } else {
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

    const pagamentos = [pagPix, pagCartao, pagDinheiro];
    const ativo = pagamentos.find(p => p.checked);

    pagamentos.forEach(p => {
        if (p !== ativo) p.checked = false;
    });

    if (pagDinheiro.checked) {
        trocoSection?.classList.remove("hidden");
    } else {
        trocoSection?.classList.add("hidden");
    }

    if (pagPix.checked) {
        pixSection?.classList.remove("hidden");
    } else {
        pixSection?.classList.add("hidden");
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
                Toastify({
                    text: "Chave Pix copiada!",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: { background: "#22c55e" }
                }).showToast();
            }).catch(err => {
                console.error('Erro ao copiar a chave Pix: ', err);
                Toastify({ text: "Erro ao copiar a chave Pix.", duration: 3000, style: { background: "#ef4444" } }).showToast();
            });
        });
    }

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function() {
            const phoneNumber = "5514998165756"; // << Trocar para o número real
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

// Função de validação de campo com feedback visual e foco
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
    // Máscara de telefone
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


async function validarFormularioPedido() {
    let isValid = true;

    // Resetar estilos de erro antes de validar
    nomeInput.classList.remove("border-red-500", "input-ok", "input-error");
    telefoneInput.classList.remove("border-red-500", "input-ok", "input-error");
    rua.classList.remove("border-red-500", "input-ok", "input-error");
    bairro.classList.remove("border-red-500", "input-ok", "input-error");
    numero.classList.remove("border-red-500", "input-ok", "input-error");
    document.getElementById('troco').classList.remove("border-red-500", "input-ok", "input-error");

    nomeWarn.classList.add("hidden");
    telefoneWarn.classList.add("hidden");
    ruaWarn.classList.add("hidden");
    bairroWarn.classList.add("hidden");
    numeroWarn.classList.add("hidden");
    document.getElementById('troco-aste').classList.add("hidden");

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
    // 1. Desabilita o botão imediatamente para evitar cliques múltiplos
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando Pedido..."; // Feedback visual para o usuário

    try {
        // 2. Valida o formulário
        if (!await validarFormularioPedido()) {
            // Se a validação falhar, reabilita o botão e interrompe a execução
            submitBtn.disabled = false;
            submitBtn.textContent = "Finalizar Pedido"; // Volta o texto original
            return;
        }

        // 3. Monta e envia o pedido
        const pedidoFormatado = montarPedido();
        await enviarPedidoParaPainel(pedidoFormatado);

        // 4. Limpa o carrinho e fecha o modal (isso já acontece na sua função)
        zerarCarrinho();

        // Nenhuma reabilitação explícita do botão é necessária aqui,
        // pois a página será redirecionada após o sucesso.

    } catch (error) {
        console.error("Erro ao enviar pedido:", error);
        // 5. Em caso de erro, reabilita o botão para que o usuário possa tentar novamente
        submitBtn.disabled = false;
        submitBtn.textContent = "Finalizar Pedido"; // Volta o texto original
        Toastify({
            text: "Erro ao finalizar pedido. Por favor, tente novamente.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "center",
            style: {
                background: "#ef4444",
            },
        }).showToast();
    }
});


function zerarCarrinho() {
    cart = [];
    document.getElementById('confirm-modal').classList.add("hidden");
    cartModal.style.display = "none";
    updateCartModal();
    cupomAplicado = null; // Resetar o cupom aplicado
    if (cupomInput) cupomInput.disabled = false; // Reabilitar input
    if (applycupom) applycupom.disabled = false; // Reabilitar botão
    if (cupomInput) cupomInput.value = ""; // Limpar campo do cupom
    // Limpar campos do formulário de confirmação
    nomeInput.value = "";
    telefoneInput.value = "";
    rua.value = "";
    bairro.value = "";
    numero.value = "";
    document.getElementById('referencia').value = "";
    document.getElementById('troco').value = "";
    // Desmarcar radios
    document.getElementById('retirada').checked = false;
    document.getElementById('entrega').checked = false;
    document.getElementById('pagPix').checked = false;
    document.getElementById('pagCartao').checked = false;
    document.getElementById('pagDinheiro').checked = false;
    // Ocultar seções condicionais
    document.getElementById("address-section").classList.add("hidden");
    document.getElementById("retirada-section").classList.add("hidden");
    document.getElementById("PixSection").classList.add("hidden");
    document.getElementById("trocoSection").classList.add("hidden");

    // Resetar avisos de erro e classes de input
    nomeInput.classList.remove("border-red-500", "input-ok", "input-error");
    telefoneInput.classList.remove("border-red-500", "input-ok", "input-error");
    rua.classList.remove("border-red-500", "input-ok", "input-error");
    bairro.classList.remove("border-red-500", "input-ok", "input-error");
    numero.classList.remove("border-red-500", "input-ok", "input-error");
    document.getElementById('troco').classList.remove("border-red-500", "input-ok", "input-error");

    nomeWarn.classList.add("hidden");
    telefoneWarn.classList.add("hidden");
    ruaWarn.classList.add("hidden");
    bairroWarn.classList.add("hidden");
    numeroWarn.classList.add("hidden");
    document.getElementById('troco-aste').classList.add("hidden");
}

let telefone = "" // Mantém a variável global, embora seja atualizada localmente na função montarPedido

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
    const pedidosRef = database.ref('pedidos');
    const configRef = database.ref('config/ultimoPedidoId');

    try {
        const result = await configRef.transaction((current) => {
            // Incrementa o último ID do pedido ou começa de 1001 se não existir
            return (current || 1000) + 1;
        });

        const novoId = result.snapshot.val(); // Pega o novo ID do pedido
        pedido.status = 'Aguardando'; // Define o status inicial
        pedido.timestamp = Date.now(); // Grava o timestamp

        // Define os dados do pedido sob o novo ID
        await pedidosRef.child(novoId).set(pedido);
        console.log('Pedido enviado com sucesso!', novoId);

        // --- DEDUÇÃO DE ESTOQUE ---
        for (const item of pedido.cart) {
            await deduzirEstoqueDoItem(item);
        }
        // --- FIM DA DEDUÇÃO DE ESTOQUE ---

        const phoneNumber = telefoneInput.value.replace(/\D/g, ''); // Limpa o número de telefone para o localStorage/cookies
        localStorage.setItem('clienteId', phoneNumber);
        setCookie('clienteId', phoneNumber, 60);

        if (cupomAplicado) {
            const cupomCode = cupomAplicado.codigo;
            const cupomAdminUsageRef = database.ref(`cupons/${cupomCode}`);

            // 1. Incrementa a contagem de uso global do cupom (para a visão do admin)
            await cupomAdminUsageRef.transaction((currentUsage) => {
                if (currentUsage === null) {
                    return { usos: 1, lastUsed: Date.now() };
                } else {
                    currentUsage.usos = (currentUsage.usos || 0) + 1;
                    currentUsage.lastUsed = Date.now();
                    return currentUsage;
                }
            });
            console.log(`Contagem de uso do cupom ${cupomCode} atualizada para o admin.`);

            // 2. Marca este cupom como usado por este cliente específico
            const clienteIdLimpo = phoneNumber; // Já está limpo
            const cupomClienteUsageRef = database.ref(`cupons_usados/${clienteIdLimpo}/${cupomCode}`);
            await cupomClienteUsageRef.set({
                usedAt: firebase.database.ServerValue.TIMESTAMP,
                orderId: novoId
            });
            console.log(`Cupom ${cupomCode} marcado como usado pelo cliente ${clienteIdLimpo}.`);
        }

        mostrarPedidoSucessoComLogo();
        // Redireciona para a página de status com o ID do pedido
        setTimeout(() => { // Pequeno delay para o toast aparecer
            window.location.href = `status.html?pedidoId=${novoId}`;
        }, 1000);


    } catch (error) {
        console.error('Erro ao enviar pedido ou processar cupom: ', error);
        Toastify({
            text: "Erro ao finalizar pedido. Por favor, tente novamente.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "center",
            style: {
                background: "#ef4444",
            },
        }).showToast();
    }
}


function montarPedido() {
    let tipoEntrega = document.getElementById("retirada").checked ? "Retirada" : "Entrega";

    let endereco = {};
    if (tipoEntrega === "Entrega") {
        endereco = {
            rua: rua.value,
            bairro: bairro.value,
            numero: numero.value,
            referencia: document.getElementById('referencia').value // Adiciona referência ao objeto endereço
        };
    }

    telefone = telefoneInput.value; // Pega o telefone formatado
    let nomeCliente = nomeInput.value;


    let pagamento = "";
    if (document.getElementById("pagPix").checked) pagamento = "Pix";
    if (document.getElementById("pagCartao").checked) pagamento = "Cartão";
    if (document.getElementById("pagDinheiro").checked) pagamento = "Dinheiro";

    let dinheiroTroco = pagamento === "Dinheiro" ? parseFloat(document.getElementById("troco").value) || 0 : null; // Converte para número

    let observacao = observationInput.value;

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
        dinheiroTotal: dinheiroTroco,
        totalPedido: parseFloat(totalPedido.toFixed(2)), // Garante que o total final esteja formatado como número com 2 casas decimais
        telefone: telefone.replace(/\D/g, ''), // Salva o telefone sem formatação para o DB
        nomeCliente,
        // referencia: referencia, // Já está em endereco.referencia se for entrega
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
              <img src="assets/bonanza.png" alt="Logo" style="width: 200px; height: 200px; margin-bottom: 20px; border-radius: 10px;" />
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

function resetSelections() {
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    document.querySelectorAll('.crust-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    document.querySelectorAll('.crust-flavor-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));

    // Define o estado selecionado padrão
    document.querySelector('.size-btn[data-size="Grande"]').classList.add('bg-green-500', 'text-white');
    document.querySelector('.half-btn[data-half=""]').classList.add('bg-green-500', 'text-white'); // "Não" para meia-meia
    document.querySelector('.crust-btn[data-crust="Não"]').classList.add('bg-green-500', 'text-white'); // "Não" para borda

    document.getElementById('crust-flavor-section').classList.add('hidden');
}

function updatePizzaPricePreview() {
    if (!selectedPizza) return;

    let basePrice = selectedPizza.price;

    if (selectedHalf && selectedHalf !== selectedPizza.name) {
        basePrice = (selectedPizza.price + selectedHalfPrice) / 2; // MÉDIA dos preços
    }

    if (selectedSize === "Broto") {
        // Converte os nomes para minúsculo para uma comparação segura
        const nomePizzaLower = selectedPizza.name.toLowerCase();
        const nomeMetadeLower = selectedHalf ? selectedHalf.toLowerCase() : "";

        // Verifica se algum dos nomes contém os sabores especiais
        const temSaborEspecial = 
            nomePizzaLower.includes("costela") || 
            nomePizzaLower.includes("morango com chocolate") ||
            nomeMetadeLower.includes("costela") ||
            nomeMetadeLower.includes("morango com chocolate");

        if (temSaborEspecial) {
            basePrice = 35;
        } else {
            basePrice = 30;
        }
    }
    let finalPrice = basePrice;

    if (wantsCrust === "Sim" && crustFlavor) {
        finalPrice += selectedSize === "Broto" ? 10 : 12;
    }

    const preview = document.getElementById('pizza-price-preview');
    preview.textContent = `Valor: R$ ${finalPrice.toFixed(2).replace('.', ',')}`;
}

// Cancelar modal de pizza
document.getElementById('cancel-pizza').addEventListener('click', () => {
    document.getElementById('pizza-modal').style.display = 'none';
});

// Tamanho da pizza
document.querySelectorAll('.size-btn').forEach(button => {
    button.addEventListener('click', () => {
        selectedSize = button.dataset.size;
        document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
        button.classList.add('bg-green-500', 'text-white');
        updatePizzaPricePreview();
    });
});

// Meia-Meia da pizza
document.querySelectorAll('.half-btn').forEach(button => {
    button.addEventListener('click', () => {
        selectedHalf = button.dataset.half;
        selectedHalfPrice = parseFloat(button.dataset.price) || 0;

        document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
        button.classList.add('bg-green-500', 'text-white');

        updatePizzaPricePreview();
    });
});

// Borda da pizza
document.querySelectorAll('.crust-btn').forEach(button => {
    button.addEventListener('click', () => {
        wantsCrust = button.dataset.crust;
        crustFlavor = ""; // Reseta o sabor da borda ao mudar a opção "quer borda?"
        document.querySelectorAll('.crust-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
        button.classList.add('bg-green-500', 'text-white');

        const section = document.getElementById('crust-flavor-section');
        if (wantsCrust === "Sim") {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
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
    let nameFinal = selectedPizza.name;
    let basePrice = selectedPizza.price;

    let itemOriginalProductId = selectedPizza.id;
    let itemProductCategory = selectedPizza.category;
    let itemHalfProductId = null;
    let itemHalfProductCategory = null;

    if (selectedHalf && selectedHalf !== selectedPizza.name) {
        nameFinal = `${selectedPizza.name} / ${selectedHalf}`;
        basePrice = (selectedPizza.price + selectedHalfPrice) / 2;

        const halfButton = document.querySelector(`.half-btn[data-half="${selectedHalf}"]`);
        if (halfButton) {
            itemHalfProductId = halfButton.dataset.id;
            itemHalfProductCategory = halfButton.dataset.category;
        } else {
            console.warn(`ID do produto para o segundo sabor "${selectedHalf}" não encontrado nos botões de meia-meia.`);
        }
    }

    nameFinal += ` (${selectedSize})`;

    if (selectedSize === "Broto") {
        if (selectedHalf && (selectedHalf.includes("Costela") || selectedHalf.includes("Costela turbinada")) || (selectedPizza.name.includes("Costela") || selectedPizza.name.includes("Costela turbinada"))) {
            basePrice = 35;
        } else {
            basePrice = 30;
        }
    }
    let finalPrice = basePrice;


    if (wantsCrust === "Sim" && crustFlavor) {
        nameFinal += ` + Borda de ${crustFlavor}`;
        finalPrice += selectedSize === "Broto" ? 10 : 12;
    }

    const item = {
        name: nameFinal,
        price: finalPrice,
        quantity: 1,
        originalProductId: itemOriginalProductId,
        productCategory: itemProductCategory,
        pizzaSize: selectedSize,
        halfProductId: itemHalfProductId,
        halfProductCategory: itemHalfProductCategory
    };

    cart.push(item);
    updateCartModal();

    Toastify({
        text: "Item adicionado ao carrinho!",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: "#22c55e",
        },
    }).showToast();

    document.getElementById('pizza-modal').style.display = 'none';
});

// --- Resumo do Pedido na Confirmação ---

function atualizarConfirmacao() {
    confirmCartItems.innerHTML = "";
    let subtotal = 0;

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

        confirmCartItems.appendChild(itemContainer);

        subtotal += item.price * item.quantity;
    });

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
    // Usar offsetWidth para evitar problemas com arredondamento em clientWidth/scrollWidth
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollWidth = scrollContainer.scrollWidth;
    const clientWidth = scrollContainer.offsetWidth; // Use offsetWidth para o elemento visível

    // A tolerância de 10px é boa para cobrir pequenas diferenças de arredondamento
    const chegouNoFim = (scrollLeft + clientWidth) >= (scrollWidth - 10);

    scrollIndicator.style.opacity = chegouNoFim ? '0' : '1';
    scrollIndicator.style.pointerEvents = chegouNoFim ? 'none' : 'auto';
}

scrollContainer.addEventListener('scroll', checkScrollEnd);
window.addEventListener('resize', checkScrollEnd);
document.addEventListener('DOMContentLoaded', checkScrollEnd); // Executa ao carregar

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
    const clienteId = telefoneInput.value.trim().replace(/\D/g, ''); // Limpa o telefone para usar como ID

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

    database.ref(`cupons/${codigoDigitado}`).once('value', (snapshot) => {
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

        if (cupom.validade && hoje.getTime() > cupom.validade) { // Adicionado verificação se validade existe
            Toastify({ text: "Este cupom expirou!", duration: 3000, close: true, gravity: "top", position: "right", style: { background: "#ef4444" } }).showToast();
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (cupom.valorMinimo && subtotal < cupom.valorMinimo) {
            Toastify({ text: `Este cupom requer um pedido mínimo de R$ ${cupom.valorMinimo.toFixed(2).replace('.', ',')}`, duration: 4000, close: true, gravity: "top", position: "right", style: { background: "#ffc107" } }).showToast();
            return;
        }

        database.ref(`cupons_usados/${clienteId}/${codigoDigitado}`).once('value', (snapshotUso) => {
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

    validarCampoEAvancar(rua, ruaWarn); // Valida e atualiza visualmente
    validarCampoEAvancar(bairro, bairroWarn); // Valida e atualiza visualmente

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

    let receitaParaDeduzir = {};

    try {
        if (item.productCategory === 'pizzas' && item.pizzaSize) {
            if (item.halfProductId && item.halfProductId !== item.originalProductId) {
                console.log('Detectada pizza meia a meia. Combinando receitas...');
                receitaParaDeduzir = await combinarReceitasMeiaMeia(
                    item.originalProductId,
                    item.productCategory,
                    item.pizzaSize,
                    item.halfProductId,
                    item.halfProductCategory
                );
            } else {
                console.log('Detectada pizza de sabor único.');
                const produtoSnapshot = await produtosRef.child(item.productCategory).child(item.originalProductId).once('value');
                const produtoData = produtoSnapshot.val();
                if (produtoData && produtoData.receita && produtoData.receita[item.pizzaSize]) {
                    receitaParaDeduzir = produtoData.receita[item.pizzaSize];
                } else {
                    console.warn(`Receita para pizza única "${item.name}" (${item.pizzaSize}) não encontrada.`);
                }
            }
        } else {
            console.log('Detectado item não-pizza.');
            const produtoSnapshot = await produtosRef.child(item.productCategory).child(item.originalProductId).once('value');
            const produtoData = produtoSnapshot.val();
            if (produtoData && produtoData.receita) {
                receitaParaDeduzir = produtoData.receita;
            } else {
                console.warn(`Receita para produto "${item.name}" não-pizza não encontrada.`);
            }
        }

        if (!receitaParaDeduzir || Object.keys(receitaParaDeduzir).length === 0) {
            console.warn(`Receita final para o produto "${item.name}" está vazia. Nenhuma dedução será feita.`);
            return;
        }

        const now = firebase.database.ServerValue.TIMESTAMP;

        for (const ingredienteId in receitaParaDeduzir) {
            const quantidadeReceitaPorUnidade = receitaParaDeduzir[ingredienteId];
            const quantidadeTotalDedução = quantidadeReceitaPorUnidade * item.quantity;
            const ingredienteAtualRef = ingredientesRef.child(ingredienteId);

            await ingredienteAtualRef.transaction(currentData => {
                if (currentData) {
                    const oldQuantity = currentData.quantidadeAtual || 0;
                    const oldCostUnitarioMedio = currentData.custoUnitarioMedio || 0;
                    const oldQtdUsadaDiaria = currentData.quantidadeUsadaDiaria || 0;
                    const oldCustoUsadaDiaria = currentData.custoUsadaDiaria || 0;
                    const oldQtdUsadaMensal = currentData.quantidadeUsadaMensal || 0;
                    const oldCustoUsadoMensal = currentData.custoUsadoMensal || 0;

                    const custoDesteUso = quantidadeTotalDedução * oldCostUnitarioMedio;

                    currentData.quantidadeAtual = Math.max(0, oldQuantity - quantidadeTotalDedução);
                    currentData.quantidadeUsadaDiaria = oldQtdUsadaDiaria + quantidadeTotalDedução;
                    currentData.custoUsadaDiaria = oldCustoUsadaDiaria + custoDesteUso;
                    currentData.quantidadeUsadaMensal = oldQtdUsadaMensal + quantidadeTotalDedução;
                    currentData.custoUsadoMensal = oldCustoUsadoMensal + custoDesteUso;
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

async function combinarReceitasMeiaMeia(productId1, category1, size, productId2, category2) {
    let receitaCombinada = {};

    const produto1Snapshot = await produtosRef.child(category1).child(productId1).once('value');
    const produto1Data = produto1Snapshot.val();
    let receita1 = {};
    if (produto1Data && produto1Data.receita && produto1Data.receita[size]) {
        receita1 = produto1Data.receita[size];
    } else {
        console.warn(`Receita para o lado 1 (${productId1}, ${size}) não encontrada.`);
    }

    const produto2Snapshot = await produtosRef.child(category2).child(productId2).once('value');
    const produto2Data = produto2Snapshot.val();
    let receita2 = {};
    if (produto2Data && produto2Data.receita && produto2Data.receita[size]) {
        receita2 = produto2Data.receita[size];
    } else {
        console.warn(`Receita para o lado 2 (${productId2}, ${size}) não encontrada.`);
    }

    const allIngredientIds = new Set([...Object.keys(receita1), ...Object.keys(receita2)]);

    allIngredientIds.forEach(ingredienteId => {
        const qtd1 = receita1[ingredienteId] || 0;
        const qtd2 = receita2[ingredienteId] || 0;
        receitaCombinada[ingredienteId] = (qtd1 + qtd2) / 2;
    });

    return receitaCombinada;
}