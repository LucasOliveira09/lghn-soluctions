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

// --- Firebase References ---
const ingredientesRef = database.ref('ingredientes');
const produtosRef = database.ref('produtos');

let allIngredients = {};

ingredientesRef.on('value', (snapshot) => {
    allIngredients = snapshot.val() || {};
});

// --- DOM Elements ---
const menu = document.getElementById('menu')
const cartBtn = document.getElementById('cart-btn')
const cartModal = document.getElementById('cart-modal')
const cartItemsContainer = document.getElementById('cart-items')
const cartTotal = document.getElementById('cart-total')
const checkoutBtn = document.getElementById('checkout-btn')
const closeModalBtn = document.getElementById('cart-modal-btn')
const cartCounter = document.getElementById('cart-count')
const observationInput = document.getElementById('observation')
const rua = document.getElementById('rua')
const bairro = document.getElementById('bairro')
const numero = document.getElementById('numero')
const telefoneInput = document.getElementById('telefone')
const nomeInput = document.getElementById('nome-cliente')
const ruaWarn = document.getElementById('rua-aste')
const bairroWarn = document.getElementById('bairro-aste')
const numeroWarn = document.getElementById('numero-aste')
const telefoneWarn = document.getElementById('telefone-aste')
const nomeWarn = document.getElementById('nome-aste')
const submitBtn = document.getElementById('submit-order')
const backBtn = document.getElementById('back-cart')
const confirmModal = document.getElementById('confirm-modal')
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
const cepCache = {};

// --- Constants and Global Variables ---
const FRETE_VALOR = 5.00;
let cart = [];
let cupomAplicado = null;
let selectedPizza = null;
let selectedSize = "Grande";
let selectedHalf = "";
let selectedHalfPrice = 0;
let wantsCrust = "Não";
let crustFlavor = "";
let telefone = "";

// --- Product Loading ---
carregarProdutos();

function carregarProdutos() {
    database.ref('produtos/pizzas').on('value', (snapshot) => {
        const listaSalgadas = document.getElementById('lista-pizzas-salgadas');
        const listaDoces = document.getElementById('lista-pizzas-doces');
        listaSalgadas.innerHTML = '';
        listaDoces.innerHTML = '';

        snapshot.forEach((pizzaSnap) => {
            const pizza = pizzaSnap.val();
            const pizzaId = pizzaSnap.key;
            if (pizza.ativo) {
                const card = criarItemCardapio(pizza, 'pizza', pizzaId);
                if (pizza.tipo === 'doce') {
                    listaDoces.innerHTML += card;
                } else {
                    listaSalgadas.innerHTML += card;
                }
            }
        });
        atualizarOpcoesMeiaMeia(snapshot);
        adicionarEventosBotoes();
    });

    database.ref('produtos/bebidas').on('value', (snapshot) => {
        const listaBebidas = document.getElementById('lista-bebidas');
        listaBebidas.innerHTML = '';

        snapshot.forEach((bebidaSnap) => {
            const bebida = bebidaSnap.val();
            const bebidaId = bebidaSnap.key;
            if (bebida.ativo) {
                listaBebidas.innerHTML += criarItemCardapio(bebida, 'bebida', bebidaId);
            }
        });
        adicionarEventosBotoes();
    });

    database.ref('produtos/esfirras').on('value', (snapshot) => {
        const listaSalgadas = document.getElementById('lista-esfirras-salgadas');
        const listaDoces = document.getElementById('lista-esfirras-doces');
        listaSalgadas.innerHTML = '';
        listaDoces.innerHTML = '';

        snapshot.forEach((esfirraSnap) => {
            const esfirra = esfirraSnap.val();
            const esfirraId = esfirraSnap.key;
            if (esfirra.ativo) {
                const card = criarItemCardapio(esfirra, 'esfirra', esfirraId);
                if (esfirra.tipo === 'doce') {
                    listaDoces.innerHTML += card;
                } else {
                    listaSalgadas.innerHTML += card;
                }
            }
        });
        adicionarEventosBotoes();
    });

    database.ref('produtos/calzone').on('value', (snapshot) => {
        const listaLanches = document.getElementById('lista-lanches');
        listaLanches.innerHTML = '';

        snapshot.forEach((lancheSnap) => {
            const lanche = lancheSnap.val();
            const lancheId = lancheSnap.key;
            if (lanche.ativo) {
                listaLanches.innerHTML += criarItemCardapio(lanche, 'lanche', lancheId);
            }
        });
        adicionarEventosBotoes();
    });

    database.ref('produtos/promocoes').on('value', (snapshot) => {
        const listaPromocoes = document.getElementById('lista-promocoes');
        listaPromocoes.innerHTML = '';

        let temPromocaoAtiva = false;

        snapshot.forEach((promoSnap) => {
            const promo = promoSnap.val();
            const promoId = promoSnap.key;
            if (promo.ativo) {
                temPromocaoAtiva = true;
                listaPromocoes.innerHTML += criarItemCardapio(promo, 'promocao', promoId);
            }
        });

        const secaoPromocoes = document.getElementById('show-promocoes');
        const btnPromocoes = document.getElementById('btn-promocoes');

        if (temPromocaoAtiva) {
            secaoPromocoes.classList.remove("hidden");
            btnPromocoes.classList.remove("hidden");
        } else {
            secaoPromocoes.classList.add("hidden");
            btnPromocoes.classList.add("hidden");
        }
    });

    database.ref('produtos/novidades').on('value', (snapshot) => {
        const listaNovidades = document.getElementById('lista-novidades');
        listaNovidades.innerHTML = '';

        let temNovidadeAtiva = false;

        snapshot.forEach((noviSnap) => {
            const novi = noviSnap.val();
            const noviId = noviSnap.key;
            if (novi.ativo) {
                temNovidadeAtiva = true;
                listaNovidades.innerHTML += criarItemCardapio(novi, 'novidade', noviId);
            }
        });

        const secaoNovidades = document.getElementById('show-novidades');
        const btnNovidades = document.getElementById('btn-novidades');

        if (temNovidadeAtiva) {
            secaoNovidades.classList.remove("hidden");
            btnNovidades.classList.remove("hidden");
        } else {
            secaoNovidades.classList.add("hidden");
            btnNovidades.classList.add("hidden");
        }
    });
}

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
          <p class="text-lg font-bold text-[#f5f0e6]">R$ ${preco}</p>
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

function adicionarEventosBotoes() {
    document.querySelectorAll('.open-modal-btn').forEach(button => {
        button.removeEventListener('click', handleOpenPizzaModal);
        button.addEventListener('click', handleOpenPizzaModal);
    });
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.removeEventListener('click', handleAddToCart);
        button.addEventListener('click', handleAddToCart);
    });
}

function atualizarOpcoesMeiaMeia(snapshot) {
    const containerMeiaMeia = document.querySelector('#pizza-modal .half-btn[data-half=""]').parentNode;

    while (containerMeiaMeia.children.length > 1) {
        containerMeiaMeia.removeChild(containerMeiaMeia.lastChild);
    }

    snapshot.forEach((pizzaSnap) => {
        const pizza = pizzaSnap.val();
        const pizzaId = pizzaSnap.key;
        if (pizza.ativo) {
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
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        adicionarEventosBotoes();
    }, 1000);
});

// --- Cart Functionality ---
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
        item.pizzaSize === undefined
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

        cartItemElement.innerHTML = `
                <div class="bg-gray-100 p-4 rounded-xl shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex-1">
                        <p class="font-semibold text-base text-gray-900">${item.name}</p>
                        <div class="flex items-center gap-3 mt-2">
                            <button class="quantity-btn bg-red-500 text-white w-9 h-9 rounded-full text-lg hover:bg-red-600" data-name="${item.name}" data-action="decrease">
                                <i class="fa-solid fa-minus"></i>
                            </button>
                            <span class="text-lg font-bold">${item.quantity}</span>
                            <button class="quantity-btn bg-green-500 text-white w-9 h-9 rounded-full text-lg hover:bg-green-600" data-name="${item.name}" data-action="increase">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                        <p class="text-sm text-gray-700 mt-2">Preço: R$ ${item.price.toFixed(2)}</p>
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
        finalTotal = Math.max(0, total - discountAmount);
    }

    cartTotal.textContent = finalTotal.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    if (cupomAplicado && discountAmount > 0) {
        const discountElement = document.createElement("p");
        discountElement.classList.add("text-sm", "text-green-600", "mt-2", "font-bold");
        discountElement.textContent = `Desconto Cupom: - R$ ${discountAmount.toFixed(2)}`;
        cartItemsContainer.appendChild(discountElement);
    }

    cartCounter.innerHTML = cart.length;
}

cartItemsContainer.addEventListener("click", function(event) {
    if (event.target.classList.contains("remove-btn")) {
        const name = event.target.getAttribute('data-name');
        removeItemCart(name);
    }

    if (event.target.classList.contains("quantity-btn") || event.target.closest(".quantity-btn")) {
        const button = event.target.closest(".quantity-btn");
        const name = button.getAttribute('data-name');
        const action = button.getAttribute('data-action');

        const item = cart.find(i => i.name === name);

        if (item) {
            if (action === "increase") {
                item.quantity += 1;
            } else if (action === "decrease" && item.quantity > 1) {
                item.quantity -= 1;
            } else if (action === "decrease" && item.quantity === 1) {
                cart.splice(cart.indexOf(item), 1);
            }
        }
        updateCartModal();
    }
});

function removeItemCart(name) {
    const index = cart.findIndex(item => item.name === name);

    if (index !== -1) {
        const item = cart[index];
        if (item.quantity > 1) {
            item.quantity -= 1;
            updateCartModal();
            return;
        }
        cart.splice(index, 1);
        updateCartModal();
    }
}

// --- Checkout and Order Submission ---
checkoutBtn.addEventListener("click", function() {
    if (cart.length === 0) {
        Toastify({
            text: "Carrinho está vazio!",
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
    } else {
        atualizarConfirmacao();
        confirmModal.classList.remove("hidden");
    }
});

function getStatusMessage(horarios) {
    const agora = new Date();
    const dia = agora.getDay();
    const hora = agora.getHours();
    const diaConfig = horarios[dia];

    if (!diaConfig || !diaConfig.aberto) {
        return {
            aberto: false,
            mensagem: "Fechado hoje"
        };
    }

    if (hora >= diaConfig.inicio && hora < diaConfig.fim) {
        return {
            aberto: true,
            mensagem: `Aberto agora (fecha às ${diaConfig.fim}h)`
        };
    } else {
        return {
            aberto: false,
            mensagem: `Fechado agora (abre às ${diaConfig.inicio}h)`
        };
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
                    spanItem.classList.remove("bg-red-500", "bg-red-600");
                    spanItem.classList.add("bg-green-600");
                } else {
                    spanItem.classList.remove("bg-green-500", "bg-green-600");
                    spanItem.classList.add("bg-red-600");
                }
                spanItem.textContent = status.mensagem;
            } else {
                spanItem.textContent = "Horários não configurados.";
            }
        })
        .catch(error => {
            spanItem.textContent = "Erro ao carregar status.";
        });
}

document.addEventListener("DOMContentLoaded", () => {
    atualizarStatusVisual();
    setInterval(atualizarStatusVisual, 60000);
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
    atualizarConfirmacao?.();
}

document.getElementById('retirada').addEventListener('change', atualizarEntrega);
document.getElementById('entrega').addEventListener('change', atualizarEntrega);
document.getElementById('pagPix').addEventListener('change', atualizarPagamento);
document.getElementById('pagCartao').addEventListener('change', atualizarPagamento);
document.getElementById('pagDinheiro').addEventListener('change', atualizarPagamento);

rua.addEventListener("input", function(event) {
    let inputValue = event.target.value;
    if (inputValue !== "") {
        rua.classList.remove("border-red-500");
        ruaWarn.classList.add("hidden");
    }
});

bairro.addEventListener("input", function(event) {
    let inputValue = event.target.value;
    if (inputValue !== "") {
        bairro.classList.remove("border-red-500");
        bairroWarn.classList.add("hidden");
    }
});

numero.addEventListener("input", function(event) {
    let inputValue = event.target.value;
    if (inputValue !== "") {
        numero.classList.remove("border-red-500");
        numeroWarn.classList.add("hidden");
    }
});

nomeInput.addEventListener("input", function(event) {
    let inputValue = event.target.value;
    if (inputValue !== "") {
        nomeInput.classList.remove("border-red-500");
        nomeWarn.classList.add("hidden");
    }
});

telefoneInput.addEventListener("input", function(event) {
    let inputValue = event.target.value;
    if (inputValue !== "") {
        telefoneInput.classList.remove("border-red-500");
        telefoneWarn.classList.add("hidden");
    }
});

document.getElementById('troco').addEventListener("input", function(event) {
    let inputValue = event.target.value;
    if (inputValue !== "") {
        document.getElementById('troco').classList.remove("border-red-500");
        document.getElementById('troco-aste').classList.add("hidden");
    }
});

submitBtn.addEventListener("click", async function() {
    let verEnder = false;
    let tipoEntrega = "";
    if (document.getElementById("retirada").checked) tipoEntrega = "Retirada";
    if (document.getElementById("entrega").checked) tipoEntrega = "Entrega";

    let pagamento = "";
    if (document.getElementById("pagPix").checked) pagamento = "Pix";
    if (document.getElementById("pagCartao").checked) pagamento = "Cartão";
    if (document.getElementById("pagDinheiro").checked) pagamento = "Dinheiro";

    let checkTel = telefoneInput.value;
    let checkNome = nomeInput.value;
    let trocoInput = document.getElementById('troco').value;

    if (checkNome === "") {
        nomeWarn.classList.remove("hidden");
        nomeInput.classList.add("border-red-500");
        return;
    }

    if (checkTel === "") {
        telefoneWarn.classList.remove("hidden");
        telefoneInput.classList.add("border-red-500");
        return;
    }

    if (tipoEntrega === "") {
        Toastify({
            text: "Preencha o tipo da entrega!",
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

    if (tipoEntrega === "Entrega") {
        let enderecoRua = document.getElementById("rua").value;
        let enderecoBairro = document.getElementById("bairro").value;
        let enderecoNumero = document.getElementById("numero").value;

        if (enderecoRua === "") {
            ruaWarn.classList.remove("hidden");
            rua.classList.add("border-red-500");
            verEnder = true;
        }

        if (enderecoBairro === "") {
            bairroWarn.classList.remove("hidden");
            bairro.classList.add("border-red-500");
            verEnder = true;
        }

        if (enderecoNumero === "") {
            numeroWarn.classList.remove("hidden");
            numero.classList.add("border-red-500");
            verEnder = true;
        }

        if (verEnder) {
            return;
        }
    }

    if (pagamento === "") {
        Toastify({
            text: "Preencha a forma de pagamento!",
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

    if (pagamento === "Dinheiro") {
        if (trocoInput === "") {
            document.getElementById('troco').classList.add("border-red-500");
            document.getElementById('troco-aste').classList.remove("hidden");
            return;
        }
    }

    const pedidoFormatado = montarPedido();
    await enviarPedidoParaPainel(pedidoFormatado);
    zerarCarrinho();
});

backBtn.addEventListener("click", function() {
    document.getElementById('confirm-modal').classList.add("hidden");
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
}

// --- Pizza Customization Modal ---
function resetSelections() {
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    document.querySelectorAll('.crust-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    document.querySelectorAll('.crust-flavor-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));

    document.querySelector('.size-btn[data-size="Grande"]').classList.add('bg-green-500', 'text-white');
    document.querySelector('.half-btn[data-half=""]').classList.add('bg-green-500', 'text-white');
    document.querySelector('.crust-btn[data-crust="Não"]').classList.add('bg-green-500', 'text-white');

    document.getElementById('crust-flavor-section').classList.add('hidden');
}

function updatePizzaPricePreview() {
    if (!selectedPizza) return;

    let basePrice = selectedPizza.price;

    if (selectedHalf && selectedHalf !== selectedPizza.name) {
        basePrice = (selectedPizza.price + selectedHalfPrice) / 2;
    }

    if (selectedSize === "Broto") {
        if (selectedHalf === "Costela" || selectedHalf === "Costela turbinada" || selectedPizza.name === "Costela" || selectedPizza.name === "Costela turbinada") {
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

document.querySelectorAll('.open-modal-btn').forEach(button => {
    button.addEventListener('click', () => {
        selectedPizza = {
            name: button.dataset.name,
            price: parseFloat(button.dataset.price),
            id: button.dataset.id,
            category: button.dataset.category
        };
        selectedSize = "Grande";
        selectedHalf = "";
        selectedHalfPrice = 0;
        wantsCrust = "Não";
        crustFlavor = "";

        resetSelections();
        document.getElementById('modal-title').innerText = selectedPizza.name;
        document.getElementById('pizza-modal').style.display = 'flex';
        updatePizzaPricePreview();
    });
});

document.getElementById('cancel-pizza').addEventListener('click', () => {
    document.getElementById('pizza-modal').style.display = 'none';
});

document.querySelectorAll('.size-btn').forEach(button => {
    button.addEventListener('click', () => {
        selectedSize = button.dataset.size;
        document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
        button.classList.add('bg-green-500', 'text-white');
        updatePizzaPricePreview();
    });
});

document.querySelectorAll('.half-btn').forEach(button => {
    button.addEventListener('click', () => {
        selectedHalf = button.dataset.half;
        selectedHalfPrice = parseFloat(button.dataset.price) || 0;

        document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
        button.classList.add('bg-green-500', 'text-white');
        updatePizzaPricePreview();
    });
});

document.querySelectorAll('.crust-btn').forEach(button => {
    button.addEventListener('click', () => {
        wantsCrust = button.dataset.crust;
        crustFlavor = "";
        document.querySelectorAll('.crust-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
        button.classList.add('bg-green-500', 'text-white');

        const section = document.getElementById('crust-flavor-section');
        if (wantsCrust === "Sim") {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
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
        }
    }

    nameFinal += ` (${selectedSize})`;

    if (selectedSize === "Broto") {
        if (selectedHalf === "Costela" || selectedHalf === "Costela turbinada" || selectedPizza.name === "Costela" || selectedPizza.name === "Costela turbinada") {
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
    document.getElementById('pizza-modal').style.display = 'none';
});

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
                    <p class="text-sm text-gray-600">Subtotal: R$ ${(item.price * item.quantity).toFixed(2)}</p>
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

    let totalText = `Total: R$ ${totalComFrete.toFixed(2)}`;
    if (entregaSelecionada) {
        totalText += ` (Inclui frete de R$ ${FRETE_VALOR.toFixed(2)})`;
    }
    if (cupomAplicado && discountAmount > 0) {
        totalText += ` - Cupom: R$ ${discountAmount.toFixed(2)}`;
    }
    confirmTotal.textContent = totalText;
}

// --- Order Processing ---
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
            return (current || 1000) + 1;
        });

        const novoId = result.snapshot.val();
        pedido.status = 'Aguardando';
        pedido.timestamp = Date.now();

        await pedidosRef.child(novoId).set(pedido);

        for (const item of pedido.cart) {
            await deduzirEstoqueDoItem(item);
        }

        const phoneNumber = telefoneInput.value;
        localStorage.setItem('clienteId', phoneNumber);
        setCookie('clienteId', phoneNumber, 60);

        if (cupomAplicado) {
            const cupomCode = cupomAplicado.codigo;
            const cupomAdminUsageRef = database.ref(`cupons/${cupomCode}`);
            await cupomAdminUsageRef.transaction((currentUsage) => {
                if (currentUsage === null) {
                    return { usos: 1, lastUsed: Date.now() };
                } else {
                    currentUsage.usos = (currentUsage.usos || 0) + 1;
                    currentUsage.lastUsed = Date.now();
                    return currentUsage;
                }
            });
        }

        mostrarPedidoSucessoComLogo();
        window.location.href = `status.html?pedidoId=${novoId}`;

    } catch (error) {
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
            numero: numero.value
        };
    }

    telefone = document.getElementById('telefone').value;
    let nomeCliente = document.getElementById('nome-cliente').value;
    let referencia = document.getElementById('referencia').value;

    let pagamento = "";
    if (document.getElementById("pagPix").checked) pagamento = "Pix";
    if (document.getElementById("pagCartao").checked) pagamento = "Cartão";
    if (document.getElementById("pagDinheiro").checked) pagamento = "Dinheiro";

    let dinheiroTotal = pagamento === "Dinheiro" ? document.getElementById("troco").value : null;

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
        dinheiroTotal,
        totalPedido,
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
              <img src="assets/logo.png" alt="Logo" style="width: 200px; height: 200px; margin-bottom: 20px; border-radius: 10px;" />
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

// --- UI Enhancements ---
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
    const clientWidth = scrollContainer.clientWidth;

    const chegouNoFim = scrollLeft + clientWidth >= scrollWidth - 10;

    scrollIndicator.style.opacity = chegouNoFim ? '0' : '1';
    scrollIndicator.style.pointerEvents = chegouNoFim ? 'none' : 'auto';
}

scrollContainer.addEventListener('scroll', checkScrollEnd);
window.addEventListener('resize', checkScrollEnd);
window.addEventListener('load', checkScrollEnd);
document.addEventListener('DOMContentLoaded', checkScrollEnd);

document.addEventListener("DOMContentLoaded", () => {
    const camposOrdem = [
        "nome-cliente",
        "telefone",
        "rua",
        "bairro",
        "numero",
        "referencia",
        "troco"
    ];

    camposOrdem.forEach((campoId, index) => {
        const campo = document.getElementById(campoId);
        if (campo) {
            campo.addEventListener("blur", () => {
                validarCampo(campo, index, camposOrdem);
            });
        }
    });

    function validarCampo(campo, index, lista) {
        const valor = campo.value.trim();
        campo.classList.remove("input-ok", "input-error");

        if (valor === "") {
            campo.classList.add("input-error");
        } else {
            campo.classList.add("input-ok");
            const proximoId = lista[index + 1];
            const proximoCampo = document.getElementById(proximoId);
            if (proximoCampo) {
                proximoCampo.focus();
            }
        }
    }
});

function gerarIdAleatorio() {
    return 'cliente-' + Math.random().toString(36).substring(2, 12);
}

const scrollbar = document.getElementById('scrollbar');

// --- Sidebar Navigation ---
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

// --- Coupon Logic ---
if (cupomInput) {
    cupomInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });
}

applycupom.addEventListener('click', () => {
    const codigoDigitado = cupomInput.value.trim();
    const clienteId = telefoneInput.value.trim();

    if (codigoDigitado === '') {
        Toastify({
            text: "Por favor, insira um código de cupom.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            style: {
                background: "#ffc107"
            }
        }).showToast();
        return;
    }

    if (clienteId === '') {
        Toastify({
            text: "Informe seu telefone antes de aplicar um cupom.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            style: {
                background: "#ffc107"
            }
        }).showToast();
        telefoneWarn.classList.remove("hidden");
        telefoneInput.classList.add("border-red-500");
        return;
    }

    if (cupomAplicado) {
        Toastify({
            text: "Um cupom já foi aplicado.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            style: {
                background: "#ffc107"
            }
        }).showToast();
        return;
    }

    database.ref(`cupons/${codigoDigitado}`).once('value', (snapshot) => {
        if (!snapshot.exists()) {
            Toastify({
                text: "CUPOM INVÁLIDO!",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                style: {
                    background: "#ef4444"
                }
            }).showToast();
            cupomInput.value = "";
            return;
        }

        const cupom = snapshot.val();
        const hoje = new Date();

        if (cupom.clienteTelefone && cupom.clienteTelefone !== clienteId) {
            Toastify({
                text: "Este cupom não foi gerado para este número de telefone.",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                style: {
                    background: "#ef4444"
                }
            }).showToast();
            cupomInput.value = "";
            return;
        }

        if (!cupom.ativo) {
            Toastify({
                text: "Este cupom não está mais ativo.",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                style: {
                    background: "#ef4444"
                }
            }).showToast();
            return;
        }

        if (hoje.getTime() > cupom.validade) {
            Toastify({
                text: "Este cupom expirou!",
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                style: {
                    background: "#ef4444"
                }
            }).showToast();
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (cupom.valorMinimo && subtotal < cupom.valorMinimo) {
            Toastify({
                text: `Este cupom requer um pedido mínimo de R$ ${cupom.valorMinimo.toFixed(2)}`,
                duration: 4000,
                close: true,
                gravity: "top",
                position: "right",
                style: {
                    background: "#ffc107"
                }
            }).showToast();
            return;
        }

        database.ref(`cupons_usados/${clienteId}/${codigoDigitado}`).once('value', (snapshotUso) => {
            if (snapshotUso.exists()) {
                Toastify({
                    text: "Você já utilizou este cupom!",
                    duration: 3000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    style: {
                        background: "#ef4444"
                    }
                }).showToast();
            } else {
                Toastify({
                    text: "Cupom aplicado com sucesso!",
                    duration: 3000,
                    close: true,
                    gravity: "top",
                    position: "right",
                    style: {
                        background: "#22c55e"
                    }
                }).showToast();

                cupomAplicado = cupom;
                cupomInput.disabled = true;
                applycupom.disabled = true;

                updateCartModal();
                atualizarConfirmacao();
            }
        });
    });
});

// --- CEP Lookup Functionality ---
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

async function consultarCEP(cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
        Toastify({ text: "CEP inválido. Digite 8 números.", duration: 3000, style: { background: "#ef4444" } }).showToast();
        return;
    }

    if (cepCache[cepLimpo]) {
        preencherCamposComCEP(cepCache[cepLimpo]);
        return;
    }

    const cepSalvo = localStorage.getItem(cepLimpo);
    if (cepSalvo) {
        const data = JSON.parse(cepSalvo);
        cepCache[cepLimpo] = data;
        preencherCamposComCEP(data);
        return;
    }

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
        Toastify({ text: "Não foi possível buscar o CEP. Tente novamente.", duration: 3000, style: { background: "#ef4444" } }).showToast();
    }
}

function preencherCamposComCEP(data) {
    rua.value = data.logradouro;
    bairro.value = data.bairro;

    cepModal.style.display = 'none';

    ruaWarn.classList.add("hidden");
    bairroWarn.classList.add("hidden");
    rua.classList.remove("border-red-500");
    bairro.classList.remove("border-red-500");

    Toastify({
        text: "Endereço preenchido com sucesso!",
        duration: 3000,
        close: true,
        gravity: "top", position: "right",
        style: { background: "#22c55e" }
    }).showToast();

    numero.focus();
}

// --- Stock Deduction ---
async function deduzirEstoqueDoItem(item) {
    if (!item.originalProductId || !item.productCategory) {
        return;
    }

    let receitaParaDeduzir = {};

    try {
        if (item.productCategory === 'pizzas' && item.pizzaSize) {
            if (item.halfProductId && item.halfProductId !== item.originalProductId) {
                receitaParaDeduzir = await combinarReceitasMeiaMeia(
                    item.originalProductId,
                    item.productCategory,
                    item.pizzaSize,
                    item.halfProductId,
                    item.halfProductCategory
                );
            } else {
                const produtoSnapshot = await produtosRef.child(item.productCategory).child(item.originalProductId).once('value');
                const produtoData = produtoSnapshot.val();
                if (produtoData && produtoData.receita && produtoData.receita[item.pizzaSize]) {
                    receitaParaDeduzir = produtoData.receita[item.pizzaSize];
                }
            }
        } else {
            const produtoSnapshot = await produtosRef.child(item.productCategory).child(item.originalProductId).once('value');
            const produtoData = produtoSnapshot.val();
            if (produtoData && produtoData.receita) {
                receitaParaDeduzir = produtoData.receita;
            }
        }

        if (!receitaParaDeduzir || Object.keys(receitaParaDeduzir).length === 0) {
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
    } catch (error) {
    }
}

async function combinarReceitasMeiaMeia(productId1, category1, size, productId2, category2) {
    let receitaCombinada = {};

    const produto1Snapshot = await produtosRef.child(category1).child(productId1).once('value');
    const produto1Data = produto1Snapshot.val();
    let receita1 = {};
    if (produto1Data && produto1Data.receita && produto1Data.receita[size]) {
        receita1 = produto1Data.receita[size];
    }

    const produto2Snapshot = await produtosRef.child(category2).child(productId2).once('value');
    const produto2Data = produto2Snapshot.val();
    let receita2 = {};
    if (produto2Data && produto2Data.receita && produto2Data.receita[size]) {
        receita2 = produto2Data.receita[size];
    }

    const allIngredientIds = new Set([...Object.keys(receita1), ...Object.keys(receita2)]);

    allIngredientIds.forEach(ingredienteId => {
        const qtd1 = receita1[ingredienteId] || 0;
        const qtd2 = receita2[ingredienteId] || 0;
        receitaCombinada[ingredienteId] = (qtd1 + qtd2) / 2;
    });

    return receitaCombinada;
}