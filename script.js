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

let observacao = observationInput.value

checkoutBtn.addEventListener("click", function(){
    if(cart.length === 0){
        return;
    } else {
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
      endereco.rua = document.getElementById("rua").value;
      endereco.bairro = document.getElementById("bairro").value;
      endereco.numero = document.getElementById("numero").value;
    }

    let pagamento = "";
    if (document.getElementById("pagPix").checked) pagamento = "Pix";
    if (document.getElementById("pagCartao").checked) pagamento = "Cartão";
    if (document.getElementById("pagDinheiro").checked) pagamento = "Dinheiro";

    let dinheiroTotal = null;
    if (pagamento === "Dinheiro") {
      dinheiroTotal = document.getElementById("troco").value;
    }


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
    }
     if(bairro.value === ""){
        bairroWarn.classList.remove("hidden")
        bairro.classList.add("border-red-500")
    }

     if(numero.value === ""){
        numeroWarn.classList.remove("hidden")
        numero.classList.add("border-red-500")
   }
   let pedido = {rua, bairro, numero, cart, observacao} ;

   console.log(pedido)
})

backBtn.addEventListener("click", function(){
    document.getElementById('confirm-modal').classList.add("hidden")
})

  



