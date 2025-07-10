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
// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obter referência ao Realtime Database
const database = firebase.database();

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

const FRETE_VALOR = 5.00; 

let cart = [];

carregarProdutos()


function carregarProdutos() {
    // Carregar pizzas
    database.ref('produtos/pizzas').on('value', (snapshot) => {
    const listaSalgadas = document.getElementById('lista-pizzas-salgadas');
    const listaDoces = document.getElementById('lista-pizzas-doces');
    listaSalgadas.innerHTML = '';
    listaDoces.innerHTML = '';

    snapshot.forEach((pizzaSnap) => {
        const pizza = pizzaSnap.val();
        if (pizza.ativo) {
            const card = criarItemCardapio(pizza, 'pizza');
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

    // Carregar bebidas
    database.ref('produtos/bebidas').on('value', (snapshot) => {
        const listaBebidas = document.getElementById('lista-bebidas');
        listaBebidas.innerHTML = '';
        
        
        snapshot.forEach((bebidaSnap) => {
            const bebida = bebidaSnap.val();
            if (bebida.ativo) {
                listaBebidas.innerHTML += criarItemCardapio(bebida, 'bebida');
            }
        });
        adicionarEventosBotoes();
    });

    // Carregar esfirras
    database.ref('produtos/esfirras').on('value', (snapshot) => {
        const listaSalgadas = document.getElementById('lista-esfirras-salgadas');
        const listaDoces = document.getElementById('lista-esfirras-doces');
        listaSalgadas.innerHTML = '';
        listaDoces.innerHTML = '';

        


        snapshot.forEach((esfirraSnap) => {
            const esfirra = esfirraSnap.val();
            if (esfirra.ativo) {
                const card = criarItemCardapio(esfirra, 'esfirra');
                if (esfirra.tipo === 'doce') {
                listaDoces.innerHTML += card;
                } else {
                listaSalgadas.innerHTML += card;
            }
            }
        });
        adicionarEventosBotoes();
    });

    // Carregar lanches
    database.ref('produtos/calzone').on('value', (snapshot) => {
        const listaLanches = document.getElementById('lista-lanches');
        listaLanches.innerHTML = '';
        
        snapshot.forEach((lancheSnap) => {
            const lanche = lancheSnap.val();
            if (lanche.ativo) {
                listaLanches.innerHTML += criarItemCardapio(lanche, 'lanche');
            }
        });
        adicionarEventosBotoes();
    });

    // Carregar promoções
    database.ref('produtos/promocoes').on('value', (snapshot) => {
        const listaPromocoes = document.getElementById('lista-promocoes');
        listaPromocoes.innerHTML = '';
        
        let temPromocaoAtiva = false;
        
        snapshot.forEach((promoSnap) => {
            const promo = promoSnap.val();
            if (promo.ativo) {
                temPromocaoAtiva = true;
                listaPromocoes.innerHTML += criarItemCardapio(promo, 'promocao');
            }
        });

        // Mostrar/ocultar seção e botão de promoções
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
            if (novi.ativo) {
                temNovidadeAtiva = true;
                listaNovidades.innerHTML += criarItemCardapio(novi, 'novidade');
            }
        });

        // Mostrar/ocultar seção e botão de promoções
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

function criarItemCardapio(item, tipo) {
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
          data-price="${item.preco}">
          <i class="fa fa-cart-plus text-white text-lg"></i>
        </button>
      </div>
    </div>
  </div>`;
}


function adicionarEventosBotoes() {
    // Botões de pizza (abrem modal de personalização)
    document.querySelectorAll('.open-modal-btn').forEach(button => {
        button.removeEventListener('click', handleOpenPizzaModal); // Remove event listener antigo
        button.addEventListener('click', handleOpenPizzaModal);
    });
}

// Adicione esta função para atualizar as opções de meia-meia
function atualizarOpcoesMeiaMeia(snapshot) {
    const containerMeiaMeia = document.querySelector('#pizza-modal .half-btn[data-half=""]').parentNode;
    
    // Limpar opções exceto a primeira ("Não")
    while (containerMeiaMeia.children.length > 1) {
        containerMeiaMeia.removeChild(containerMeiaMeia.lastChild);
    }
    
    // Adicionar opções de pizzas disponíveis
    snapshot.forEach((pizzaSnap) => {
        const pizza = pizzaSnap.val();
        if (pizza.ativo) {
            const botaoMeiaMeia = document.createElement('button');
            botaoMeiaMeia.className = 'half-btn bg-gray-200 text-gray-700 px-4 py-3 rounded-md text-left';
            botaoMeiaMeia.setAttribute('data-half', pizza.nome);
            botaoMeiaMeia.setAttribute('data-price', pizza.preco);
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
    addToCart(name, price);
}

function handleOpenPizzaModal() {
    const name = this.getAttribute('data-name');
    const price = parseFloat(this.getAttribute('data-price'));
    
    selectedPizza = { name, price };
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

// Adicione este código no final do seu arquivo, após o DOM estar carregado
document.addEventListener('DOMContentLoaded', function() {
    // Adiciona eventos após um pequeno delay para garantir que o DOM esteja pronto
    setTimeout(() => {
        adicionarEventosBotoes();
    }, 1000);
});


cartBtn.addEventListener("click", function() {
    updateCartModal()
    cartModal.style.display = "flex"
})

cartModal.addEventListener("click", function(event){
    if(event.target === cartModal){
        cartModal.style.display = "none"
    }
})

closeModalBtn.addEventListener("click", function(){
    cartModal.style.display = "none"
})


document.addEventListener("click", function(event){
  let parentButton = event.target.closest(".add-to-cart-btn")

  if(parentButton){
      const name = parentButton.getAttribute('data-name')
      const price = parseFloat(parentButton.getAttribute('data-price'))
      
      addToCart(name, price)
  }
})


function addToCart(name, price){
    const existingItem = cart.find(item => item.name === name)

    if(existingItem){
        existingItem.quantity += 1;
    } else {
        cart.push({
        name,
        price,
        quantity: 1,                    
    })
    }

    updateCartModal()
}


function updateCartModal() {
    cartItemsContainer.innerHTML = "";
    let total = 0

    cart.forEach(item => {
        const cartItemElement = document.createElement("div");
        cartItemElement.classList.add("flex", "justify-between", "mb-4", "flex-col")

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
    cartItemsContainer.appendChild(cartItemElement)
    })

    cartTotal.textContent = total.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    cartCounter.innerHTML = cart.length;
}

cartItemsContainer.addEventListener("click", function(event){
    if(event.target.classList.contains("remove-btn")){
        const name = event.target.getAttribute('data-name')

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

    
})

function removeItemCart(name) {
    const index = cart.findIndex(item => item.name === name);

    if(index !== -1){
        const item = cart[index];

        if(item.quantity > 1){
            item.quantity -= 1;
            updateCartModal()
            return;
        }

        cart.splice(index, 1);
        updateCartModal()
    }
}

checkoutBtn.addEventListener("click", function () {
 
    // Continua se estiver aberto
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
    const dia = agora.getDay(); // 0 = domingo, ..., 6 = sábado
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

  // ✅ Atualiza visual do span com cores e texto
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
        console.error("Erro ao buscar horários:", error);
        spanItem.textContent = "Erro ao carregar status.";
      });
  }

  // ✅ Executa ao carregar e a cada minuto
  document.addEventListener("DOMContentLoaded", () => {
    atualizarStatusVisual();
    setInterval(atualizarStatusVisual, 60000); // atualiza a cada minuto
  });

 function atualizarEntrega() {
  const retirada = document.getElementById("retirada");
  const entrega = document.getElementById("entrega");
  const enderecoSection = document.getElementById("address-section");
  const retiradaSection = document.getElementById("retirada-section");

  // Permitir apenas um selecionado
  if (retirada.checked) {
    entrega.checked = false;
    retiradaSection.classList.remove("hidden");
    enderecoSection.classList.add("hidden");
  } else if (entrega.checked) {
    retirada.checked = false;
    enderecoSection.classList.remove("hidden");
    retiradaSection.classList.add("hidden");
  } else {
    // Nenhum selecionado
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

  // Agrupa os pagamentos
  const pagamentos = [pagPix, pagCartao, pagDinheiro];
  const ativo = pagamentos.find(p => p.checked);

  // Desmarca os outros
  pagamentos.forEach(p => {
    if (p !== ativo) p.checked = false;
  });

  // Exibe troco se dinheiro for selecionado
  if (pagDinheiro.checked) {
    trocoSection?.classList.remove("hidden");
  } else {
    trocoSection?.classList.add("hidden");
  }

  atualizarConfirmacao?.();
}

  

  function enviarPedido() {
    let tipoEntrega = "";
    if (document.getElementById("retirada").checked) tipoEntrega = "Retirada";
    if (document.getElementById("entrega").checked) tipoEntrega = "Entrega";

    let endereco = {};

    if (tipoEntrega === "Entrega") {
      endereco.ruas = document.getElementById("rua").value;
      endereco.bairros = document.getElementById("bairro").value;
      endereco.numeros = document.getElementById("numero").value;
    }

    let pagamento = "";
    if (document.getElementById("pagPix").checked) pagamento = "Pix";
    if (document.getElementById("pagCartao").checked) pagamento = "Cartão";
    if (document.getElementById("pagDinheiro").checked) pagamento = "Dinheiro";

    let dinheiroTotal = null;
    if (pagamento === "Dinheiro") {
      dinheiroTotal = document.getElementById("troco").value;
    }

    let observacao = document.getElementById('observation').value;

    let totalPedido = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    let pedido = { endereco, cart, observacao, tipoEntrega, pagamento, dinheiroTotal, totalPedido };

    console.log(pedido)
  }



  // Envia, codigo final:::-----------------------------------



rua.addEventListener("input",  function(event){
  let inputValue = event.target.value;

  if(inputValue !== ""){
    rua.classList.remove("border-red-500")
    ruaWarn.classList.add("hidden")
  }
})

bairro.addEventListener("input",  function(event){
  let inputValue = event.target.value;

  if(inputValue !== ""){
    bairro.classList.remove("border-red-500")
    bairroWarn.classList.add("hidden")
  }
})

numero.addEventListener("input",  function(event){
  let inputValue = event.target.value;

  if(inputValue !== ""){
    numero.classList.remove("border-red-500")
    numeroWarn.classList.add("hidden")
  }
})

nomeInput.addEventListener("input",  function(event){
  let inputValue = event.target.value;

  if(inputValue !== ""){
    nomeInput.classList.remove("border-red-500")
    nomeWarn.classList.add("hidden")
  }
})

telefoneInput.addEventListener("input",  function(event){
  let inputValue = event.target.value;

  if(inputValue !== ""){
    telefoneInput.classList.remove("border-red-500")
    telefoneWarn.classList.add("hidden")
  }
})

document.getElementById('troco').addEventListener("input",  function(event){
  let inputValue = event.target.value;

  if(inputValue !== ""){
    document.getElementById('troco').classList.remove("border-red-500")
    document.getElementById('troco-warn').classList.add("hidden")
  }
})



submitBtn.addEventListener("click", function(){
  //verificação de pedido:

  let verEnder = ""
  let tipoEntrega = "";
    if (document.getElementById("retirada").checked) tipoEntrega = "Retirada";
    if (document.getElementById("entrega").checked) tipoEntrega = "Entrega";

  let pagamento = "";
    if (document.getElementById("pagPix").checked) pagamento = "Pix";
    if (document.getElementById("pagCartao").checked) pagamento = "Cartão";
    if (document.getElementById("pagDinheiro").checked) pagamento = "Dinheiro";

    let checkTel = telefoneInput.value;
    let checkNome = nomeInput.value;

    let trocoInput = document.getElementById('troco').value
  
  // Nome

  if(checkNome === "") {
    nomeWarn.classList.remove("hidden");
    nomeInput.classList.add("border-red-500");
    return;
  }


    // Telefone

  if(checkTel === ""){
    telefoneWarn.classList.remove("hidden");
    telefoneInput.classList.add("border-red-500");
    return;
  }

    //entrega ========
  if(tipoEntrega === ""){
  Toastify({
  text: "Preencha da tipo da entrega!",
  duration: 3000,
  close: true,
  gravity: "top", // `top` or `bottom`
  position: "left", // `left`, `center` or `right`
  stopOnFocus: true, // Prevents dismissing of toast on hover
  style: {
    background: "#ef4444",
  },
}).showToast();
    return;
  } 
 

  if (tipoEntrega === "Entrega") {
      let endereco = {};
      endereco.ruas = document.getElementById("rua").value;
      endereco.bairros = document.getElementById("bairro").value;
      endereco.numeros = document.getElementById("numero").value;
      
      

      if(endereco.ruas === "") {
        ruaWarn.classList.remove("hidden");
        rua.classList.add("border-red-500")
        verEnder = "visto"
      }

      if(endereco.bairros === "") {
        bairroWarn.classList.remove("hidden");
        bairro.classList.add("border-red-500")
        verEnder = "visto"
      }

      if(endereco.numeros === "") {
        numeroWarn.classList.remove("hidden");
        numero.classList.add("border-red-500")
        verEnder = "visto"
      }

      if(verEnder === "visto") {
        return;
      }
    }
  
  

  // pagamento
  if(pagamento === ""){
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

  if(pagamento === "Dinheiro"){
    if(trocoInput === ""){
      document.getElementById('troco').classList.add("border-red-500")
      document.getElementById('troco-aste').classList.remove("hidden")
      return;
    }
  }


  const clienteId = localStorage.getItem('clienteId') || gerarIdAleatorio();
cart.forEach(item => {
  let: totalPedido = item.price* item.quantity;
});
localStorage.setItem('clienteId', clienteId); // salvar se for primeira vez

const pedido = {
  clienteId: clienteId,
  data: new Date().toISOString(),
  itens: cart,
  total: totalPedido,
  status: 'Aguardando'
};

   enviarPedido()
   const pedidoFormatado = montarPedido();
   enviarPedidoParaPainel(pedidoFormatado);
   zerarCarrinho()
})

backBtn.addEventListener("click", function(){
    document.getElementById('confirm-modal').classList.add("hidden")
})

 
//-------------------------------------------------

function zerarCarrinho(){
  cart = []
  document.getElementById('confirm-modal').classList.add("hidden")
  cartModal.style.display = "none"
  updateCartModal()
}



let selectedPizza = null;
let selectedSize = "Grande";
let selectedHalf = "";
let selectedHalfPrice = 0;
let wantsCrust = "Não";
let crustFlavor = "";

function resetSelections() {
  document.querySelectorAll('.size-btn, .half-btn, .crust-btn, .crust-flavor-btn')
    .forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
  document.getElementById('crust-flavor-section').classList.add('hidden');
}

function updatePizzaPricePreview() {
  if (!selectedPizza) return;

  let basePrice = selectedPizza.price;

  if (selectedHalf && selectedHalf !== selectedPizza.name) {
    basePrice = Math.max(selectedPizza.price, selectedHalfPrice); // valor da mais cara
  }

  let priceMultiplier = selectedSize === "Broto" ? 0.6 : 1;
  let finalPrice = basePrice * priceMultiplier;

  if (wantsCrust === "Sim" && crustFlavor) {
    finalPrice += selectedSize === "Broto" ? 10 : 12;
  }

  const preview = document.getElementById('pizza-price-preview');
  preview.textContent = `Valor: R$ ${finalPrice.toFixed(2).replace('.', ',')}`;
}

// Abrir modal
document.querySelectorAll('.open-modal-btn').forEach(button => {
  button.addEventListener('click', () => {
    selectedPizza = {
      name: button.dataset.name,
      price: parseFloat(button.dataset.price)
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

// Cancelar
document.getElementById('cancel-pizza').addEventListener('click', () => {
  document.getElementById('pizza-modal').style.display = 'none';
});

// Tamanho
document.querySelectorAll('.size-btn').forEach(button => {
  button.addEventListener('click', () => {
    selectedSize = button.dataset.size;
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    button.classList.add('bg-green-500', 'text-white');
    updatePizzaPricePreview();
  });
});

// Meia-Meia
document.querySelectorAll('.half-btn').forEach(button => {
  button.addEventListener('click', () => {
    selectedHalf = button.dataset.half;
    selectedHalfPrice = parseFloat(button.dataset.price) || 0;

    document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    button.classList.add('bg-green-500', 'text-white');

    updatePizzaPricePreview();
  });
});

// Borda
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

// Confirmar
document.getElementById('confirm-pizza').addEventListener('click', () => {
  let nameFinal = selectedPizza.name;
  let basePrice = selectedPizza.price;

  if (selectedHalf && selectedHalf !== selectedPizza.name) {
    nameFinal = `${selectedPizza.name} / ${selectedHalf}`;
    basePrice = (selectedPizza.price + selectedHalfPrice) / 2;
  }

  nameFinal += ` (${selectedSize})`;

  if(selectedSize === "Broto") {
    if(selectedHalf === "Costela" || selectedHalf === "Costela turbinada" || selectedPizza.name === "Costela" || selectedPizza.name === "Costela turbinada" ){
      basePrice = 35
    } else {
      basePrice = 30
    }
  }
  let finalPrice = basePrice


  if (wantsCrust === "Sim" && crustFlavor) {
    nameFinal += ` + Borda de ${crustFlavor}`;
    finalPrice += selectedSize === "Broto" ? 10 : 12;
  }

  const item = {
    name: nameFinal,
    price: finalPrice,
    quantity: 1
  };

  cart.push(item);
  document.getElementById('pizza-modal').style.display = 'none';
  updateCartModal();
});

function updatePizzaPricePreview() {
  if (!selectedPizza) return;

  let basePrice = selectedPizza.price;

  if (selectedHalf && selectedHalf !== selectedPizza.name) {
    basePrice = (selectedPizza.price + selectedHalfPrice) / 2; // MÉDIA dos preços
  }

  if(selectedSize === "Broto") {
    if(selectedHalf === "Costela" || selectedHalf === "Costela turbinada" || selectedPizza.name === "Costela" || selectedPizza.name === "Costela turbinada" ){
      basePrice = 35
    } else {
      basePrice = 30
    }
  }
  let finalPrice = basePrice

  if (wantsCrust === "Sim" && crustFlavor) {
    finalPrice += selectedSize === "Broto" ? 10 : 12;
  }

  const preview = document.getElementById('pizza-price-preview');
  preview.textContent = `Valor: R$ ${finalPrice.toFixed(2).replace('.', ',')}`;
}

function resetSelections() {
  document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
  document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));

  document.querySelector('.size-btn[data-size="Grande"]').classList.add('bg-green-500', 'text-white');
  document.querySelector('.half-btn[data-half=""]').classList.add('bg-green-500', 'text-white');
}




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

  confirmTotal.textContent = `Total: R$ ${totalComFrete.toFixed(2)}${entregaSelecionada ? ` (Inclui frete de R$ ${FRETE_VALOR.toFixed(2)})` : ''}`;
}

let telefone = ""

function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function enviarPedidoParaPainel(pedido) {
  const pedidosRef = database.ref('pedidos');
  const configRef = database.ref('config/ultimoPedidoId');

  configRef.transaction((current) => {
      return (current || 1000) + 1; // starts at 1001 if empty
    })
    .then((result) => {
      const novoId = result.snapshot.val(); // this will be the numeric ID
      pedido.status = 'Aguardando';
      pedido.timestamp = Date.now();

      return pedidosRef.child(novoId).set(pedido)
        .then(() => novoId); // returns the new ID
    })
    .then((pedidoId) => {
      console.log('Pedido enviado com sucesso!', pedidoId);

      // Save client ID (phone number) to localStorage
      const phoneNumber = telefoneInput.value; // Assuming telefoneInput is accessible here
      localStorage.setItem('clienteId', phoneNumber);

      // Set cookie with client ID (phone number)
      setCookie('clienteId', phoneNumber, 60); // Save for 60 days

      mostrarPedidoSucessoComLogo();
      window.location.href = `status.html?pedidoId=${pedidoId}`;
    })
    .catch((error) => {
      console.error('Erro ao enviar pedido: ', error);
    });
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

    telefone = document.getElementById('telefone').value
    let nomeCliente = document.getElementById('nome-cliente').value
    let referencia = document.getElementById('referencia').value

    let pagamento = "";
    if (document.getElementById("pagPix").checked) pagamento = "Pix";
    if (document.getElementById("pagCartao").checked) pagamento = "Cartão";
    if (document.getElementById("pagDinheiro").checked) pagamento = "Dinheiro";

    let dinheiroTotal = pagamento === "Dinheiro" ? document.getElementById("troco").value : null;

    let observacao = observationInput.value;

    let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let totalPedido = subtotal + (tipoEntrega === "Entrega" ? FRETE_VALOR : 0);

    return {
        endereco,
        cart,
        observacao,
        tipoEntrega,
        pagamento,
        dinheiroTotal,
        totalPedido,
        telefone,
        nomeCliente,
        referencia
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
    backgroundColor: "rgba(0,0,0,0.8)",  // fundo translúcido
    stopOnFocus: true,
    escapeMarkup: false,  // permite o HTML dentro do text
    style: {
      borderRadius: "15px",
      padding: "30px 20px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
      backdropFilter: "blur(5px)",
      width: "320px",
    }
  }).showToast();
}

const scrollContainer = document.getElementById('scroll-container');
const scrollIndicator = document.getElementById('scroll-indicator');

// Ao clicar no indicador, rola para a direita
scrollIndicator.addEventListener('click', () => {
  scrollContainer.scrollBy({
    left: 300, 
    behavior: 'smooth'
  });
});

// Verifica se chegou ao fim do scroll horizontal
function checkScrollEnd() {
  const scrollLeft = scrollContainer.scrollLeft;
  const scrollWidth = scrollContainer.scrollWidth;
  const clientWidth = scrollContainer.clientWidth;

  const chegouNoFim = scrollLeft + clientWidth >= scrollWidth - 10;

  scrollIndicator.style.opacity = chegouNoFim ? '0' : '1';
  scrollIndicator.style.pointerEvents = chegouNoFim ? 'none' : 'auto';
}

// Atualiza o indicador ao fazer scroll e redimensionar a tela
scrollContainer.addEventListener('scroll', checkScrollEnd);
window.addEventListener('resize', checkScrollEnd);
window.addEventListener('load', checkScrollEnd);

// Se estiver usando frameworks que montam DOM depois (ex: Vue/React), também pode usar:
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

    // Limpa as classes antes
    campo.classList.remove("input-ok", "input-error");

    if (valor === "") {
      campo.classList.add("input-error");
    } else {
      campo.classList.add("input-ok");

      // Pula para o próximo campo automaticamente
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

const scrollbar = document.getElementById('scrollbar')

// sidebar

menuButton.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
    scrollbar.classList.add('opacity-25')
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    scrollbar.classList.remove('opacity-25')
  });

  document.getElementById('close-sidebar-button').addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    scrollbar.classList.remove('opacity-25')
});


// cupom

const cupomteste = "TEST"; // cupom de teste para o exemplo

  // cupom maiúsculo
const cupomInput = document.getElementById('cupom');
  if (cupomInput) {
    cupomInput.addEventListener('input', function() {
      this.value = this.value.toUpperCase();
    });
  }

const applycupom = document.getElementById('apply-cupom');
applycupom.addEventListener('click', () => {
    const codigoDigitado = cupomInput.value.trim();
    const clienteId = telefoneInput.value.trim(); // Usa o telefone como ID do cliente

    if (codigoDigitado === '') {
        Toastify({
            text: "Insira um cupom!",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "#ffc107",
            },
        }).showToast();
        return;
    }

    if (clienteId === '') {
        Toastify({
            text: "Por favor, informe seu número de telefone antes de aplicar um cupom.",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "#ffc107",
            },
        }).showToast();
        telefoneWarn.classList.remove("hidden");
        telefoneInput.classList.add("border-red-500");
        return;
    }

    // Verifica no Firebase se este cliente já usou este cupom
    database.ref(`cupons_usados/${clienteId}/${codigoDigitado}`).once('value', (snapshot) => {
        if (snapshot.exists()) {
            Toastify({ text: "Este cupom já foi utilizado!", duration: 3000, gravity: "top", position: "right", style: { background: "#ef4444" } }).showToast();
        } else {
            // Cupom não usado, verificar se é válido
            if (codigoDigitado === cupomteste) {
                Toastify({
                  text: "Cupom aplicado!",
                  duration: 3000,
                  gravity: "top",
                  position: "right",
                  style: { 
                    background: "#22c55e"
                  },
                }).showToast();
                
                // Marca o cupom como usado para este cliente no Firebase
                // Depois trocar isso pra o cliente não perder o cupom se não quiser concluir o pedido, fazer funcionar com o botão de concluir
                database.ref(`cupons_usados/${clienteId}/${codigoDigitado}`).set(true);
                // add lógica para aplicar o desconto no carrinho

            } else {
                Toastify({ text: "Cupom inválido!", duration: 3000, gravity: "top", position: "right", style: { background: "#ef4444" } }).showToast();
            }
        }
    });
});
