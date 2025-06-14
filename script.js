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
const ruaWarn = document.getElementById('rua-aste')
const bairroWarn = document.getElementById('bairro-aste')
const numeroWarn = document.getElementById('numero-aste')
const submitBtn = document.getElementById('submit-order')
const backBtn = document.getElementById('back-cart')
const confirmModal = document.getElementById('confirm-modal')
const confirmCartItems = document.getElementById('confirm-cart-items');
const confirmTotal = document.getElementById('confirm-total');

const FRETE_VALOR = 5.00; 

let cart = [];

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


menu.addEventListener("click", function(event){

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
        <div class="flex items-center justify-between">
            <div>
                <p class="font-medium">${item.name}</p>
                <p>Qtd: ${item.quantity}</p>
                <p class="font-medium mt-2">R$ ${item.price.toFixed(2)}</p>
            </div>
            <div>
                <button class="remove-btn" data-name="${item.name}">
                    Remover
                </button>
            </div>
        </div>
    `

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

checkoutBtn.addEventListener("click", function(){
    if(cart.length === 0){
        return;
    } else {
        atualizarConfirmacao()
        confirmModal.classList.remove("hidden")
    }
    
})

//function checkRestaurantOpen(){
//    const data = new Date();
//    const hora = data.getHours();
//   return hora >= 18 && hora < 23;
//}

//const spanItem = document.getElementById("date-span")
//const isOpen = checkRestaurantOpen();

//if(isOpen){
//    spanItem.classList.remove("bg-red-500")
//    spanItem.classList.add("bg-green-600");
//} else {
//   spanItem.classList.remove("bg-green-500")
//   spanItem.classList.add("bg-red-600");
//}

  function atualizarEntrega() {
    const retirada = document.getElementById("retirada");
    const entrega = document.getElementById("entrega");
    const enderecoSection = document.getElementById("address-section");
    const retiradaSection = document.getElementById('retirada-section')


    if (retirada.checked && entrega.checked) {
      retirada.checked = false;
      entrega.checked = true;
    }

    if (entrega.checked) {
      enderecoSection.classList.remove("hidden");
    } else {
      enderecoSection.classList.add("hidden");
    }

    if (retirada.checked) {
      retiradaSection.classList.remove("hidden");
    } else {
      retiradaSection.classList.add("hidden");
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
    pagamentos.forEach(p => { if (p !== ativo) p.checked = false; });

    if (pagDinheiro.checked) {
      trocoSection.classList.remove("hidden");
    } else {
      trocoSection.classList.add("hidden");
    }
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


    rua.addEventListener("input", function(event){
    let inputValue = event.target.value;

   if(inputValue !== ""){
       rua.classList.remove("border-red-500")
        ruaWarn.classList.add("hidden")
    }
});

    bairro.addEventListener("input", function(event){
    let inputValue2 = event.target.value;

   if(inputValue2 !== ""){
       bairro.classList.remove("border-red-500")
        bairroWarn.classList.add("hidden")
    }
});

    numero.addEventListener("input", function(event){
    let inputValue3 = event.target.value;

   if(inputValue3 !== ""){
       numero.classList.remove("border-red-500")
        numeroWarn.classList.add("hidden")
    }
});


submitBtn.addEventListener("click", function(){
    if(rua.value === ""){
        ruaWarn.classList.remove("hidden")
        rua.classList.add("border-red-500")
        return;
    }
     if(bairro.value === ""){
        bairroWarn.classList.remove("hidden")
        bairro.classList.add("border-red-500")
        return;
    }

     if(numero.value === ""){
        numeroWarn.classList.remove("hidden")
        numero.classList.add("border-red-500")
        return;
   }

   enviarPedido()
   const pedidoFormatado = montarPedido();
   enviarPedidoParaPainel(pedidoFormatado);

   
})

backBtn.addEventListener("click", function(){
    document.getElementById('confirm-modal').classList.add("hidden")
})

  

let selectedPizza = null;
let selectedSize = "Grande";
let selectedHalf = "";

document.querySelectorAll('.open-modal-btn').forEach(button => {
  button.addEventListener('click', () => {
    selectedPizza = {
      name: button.dataset.name,
      price: parseFloat(button.dataset.price)
    };

    selectedSize = "Grande";
    selectedHalf = "";
    resetSelections();

    document.getElementById('modal-title').innerText = selectedPizza.name;
    document.getElementById('pizza-modal').style.display = 'flex';
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
  });
});

document.querySelectorAll('.half-btn').forEach(button => {
  button.addEventListener('click', () => {
    selectedHalf = button.dataset.half;
    document.querySelectorAll('.half-btn').forEach(btn => btn.classList.remove('bg-green-500', 'text-white'));
    button.classList.add('bg-green-500', 'text-white');
  });
});

document.getElementById('confirm-pizza').addEventListener('click', () => {
  let nameFinal = selectedPizza.name;
  if (selectedHalf && selectedHalf !== selectedPizza.name) {
    nameFinal = `${selectedPizza.name} / ${selectedHalf}`;
  }
  nameFinal += ` (${selectedSize})`;

  const priceMultiplier = selectedSize === "Broto" ? 0.6 : 1;

  const item = {
    name: nameFinal,
    price: selectedPizza.price * priceMultiplier,
    quantity: 1
  };

  cart.push(item);
  document.getElementById('pizza-modal').style.display = 'none';
  updateCartModal();

  
});

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

function enviarPedidoParaPainel(pedido) {
    const pedidosRef = database.ref('pedidos');

    const novoPedidoRef = pedidosRef.push();
    novoPedidoRef.set(pedido)
      .then(() => {
        console.log("Pedido enviado com sucesso!");
        alert("Pedido enviado com sucesso!");
        limparCarrinho();
      })
      .catch((error) => {
        console.error("Error", error)
        alert("Erro ao enviar pedido. Tente novamente.");
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
        telefone
    };
}
