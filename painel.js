// Firebase Config (mesmo do anterior)
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
const database = firebase.database();
const pedidosRef = database.ref('pedidos');
const pedidosContainer = document.getElementById('pedidos-container');

const audioNotificacao = new Audio('assets/notificacao.mp3');

// Escutar novos pedidos em tempo real
pedidosRef.on('value', (snapshot) => {
  pedidosContainer.innerHTML = ''; // limpa antes de renderizar de novo

  snapshot.forEach((childSnapshot) => {
    const pedido = childSnapshot.val();
    const pedidoId = childSnapshot.key;

    const pedidoDiv = document.createElement('div');
    pedidoDiv.className = 'bg-white p-4 rounded shadow';

    let enderecoTexto = pedido.tipoEntrega === 'Entrega' 
      ? `<p>Endereço: ${pedido.endereco.rua}, ${pedido.endereco.numero} - ${pedido.endereco.bairro}</p>`
      : `<p><strong>Retirada no local</strong></p>`;

    let produtos = pedido.cart.map(item => `<li>${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}</li>`).join('');

    pedidoDiv.innerHTML = `
      <h2 class="font-bold text-xl mb-2">Novo Pedido</h2>
      ${enderecoTexto}
      <p>Pagamento: ${pedido.pagamento} ${pedido.dinheiroTotal ? '(Troco para R$ ' + pedido.dinheiroTotal + ')' : ''}</p>
      <p>Observação: ${pedido.observacao}</p>
      <p>Entrega: ${pedido.tipoEntrega}</p>
      <ul class="my-2">${produtos}</ul>
      <p class="font-bold">Total: R$ ${pedido.totalPedido.toFixed(2)}</p>

      <div class="flex gap-2 mt-4">
        <button onclick="aceitarPedido('${pedidoId}')" class="bg-green-500 text-white px-4 py-2 rounded">Aceitar</button>
        <button onclick="recusarPedido('${pedidoId}')" class="bg-red-500 text-white px-4 py-2 rounded">Recusar</button>
      </div>
    `;

    pedidosContainer.appendChild(pedidoDiv);
  });
});

function aceitarPedido(pedidoId) {
  alert('Pedido aceito!');

  // Aqui você pode abrir o WhatsApp ou adicionar outra lógica
  // Exemplo: window.open(`https://wa.me/55NUMERO?text=Pedido aceito!`, '_blank');

  pedidosRef.child(pedidoId).remove();
}

function recusarPedido(pedidoId) {
  if (confirm('Deseja realmente recusar o pedido?')) {
    pedidosRef.child(pedidoId).remove();
  }
}

