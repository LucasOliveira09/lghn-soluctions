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

let pedidos = {};

pedidosRef.on('value', (snapshot) => {
  pedidos = {};
  snapshot.forEach(child => {
    pedidos[child.key] = child.val();
  });
  renderizarPedidos();
});

function renderizarPedidos() {
  pedidosContainer.innerHTML = '';

  const listaOrdenada = Object.entries(pedidos)
    .filter(([id, pedido]) => pedido.status !== 'Finalizado')  // agora filtra os finalizados
    .sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));

  listaOrdenada.forEach(([pedidoId, pedido]) => {
    const pedidoDiv = document.createElement('div');
    pedidoDiv.className = 'bg-white p-4 rounded shadow mb-4';
    pedidoDiv.innerHTML = gerarHtmlPedido(pedido, pedidoId);
    pedidosContainer.appendChild(pedidoDiv);
  });
}

function aceitarPedido(pedidoId) {
  database.ref('pedidos/' + pedidoId).update({ status: 'Aceito' });
}

function recusarPedido(pedidoId) {
  if (confirm('Deseja realmente recusar o pedido?')) {
    database.ref('pedidos/' + pedidoId).update({ status: 'Recusado' });
  }
}

function gerarHtmlPedido(pedido, pedidoId) {
  let enderecoTexto = pedido.tipoEntrega === 'Entrega' 
    ? `<p class="text-sm mb-1"><strong>Endereço:</strong> ${pedido.endereco.rua}, ${pedido.endereco.numero} - ${pedido.endereco.bairro}</p>`
    : `<p class="text-sm font-semibold text-blue-600 mb-1">Retirada no local</p>`;

  let produtos = pedido.cart.map(item => `
    <li class="flex justify-between text-sm">
      <span>${item.quantity}x ${item.name}</span>
      <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
    </li>`).join('');

  let horario = pedido.timestamp 
    ? new Date(pedido.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'Sem horário';

  return `
  <div class="flex flex-col justify-between h-full">
    <div>
      <h2 class="text-lg font-bold mb-2">Pedido (${horario})</h2>
      ${enderecoTexto}
      <p class="text-sm"><strong>Pagamento:</strong> ${pedido.pagamento} ${pedido.dinheiroTotal ? '(Troco p/ R$ ' + pedido.dinheiroTotal + ')' : ''}</p>
      <p class="text-sm"><strong>Obs:</strong> ${pedido.observacao || '-'}</p>
      <p class="text-sm"><strong>Entrega:</strong> ${pedido.tipoEntrega}</p>
      <ul class="my-2 space-y-1">${produtos}</ul>
      <p class="font-bold text-green-600 text-lg">Total: R$ ${pedido.totalPedido.toFixed(2)}</p>
    </div>
    <div>
      <p class="mt-2 font-medium">Status: 
        <span class="${getStatusColor(pedido.status)}">${pedido.status}</span>
      </p>

      ${pedido.status === 'Aguardando' ? `
        <div class="flex gap-2 mt-4">
          <button onclick="aceitarPedido('${pedidoId}')" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
            Aceitar
          </button>
          <button onclick="recusarPedido('${pedidoId}')" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
            Recusar
          </button>
        </div>
      ` : `
        <div class="flex gap-2 mt-4">
          <button onclick="finalizarPedido('${pedidoId}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
            Finalizar Pedido
          </button>
        </div>
      `}
    </div>
  </div>
`;
}

function getStatusColor(status) {
  switch (status) {
    case 'Aguardando': return 'text-yellow-500';
    case 'Aceito': return 'text-green-500';
    case 'Recusado': return 'text-red-500';
    case 'Finalizado': return 'text-blue-500';
    default: return 'text-gray-500';
  }
}

function calcularTempoDecorrido(data) {
  const agora = new Date();
  const diffMs = agora - data;
  const minutos = Math.floor(diffMs / 60000);
  if (minutos < 1) return "menos de 1 minuto";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `${horas}h ${minutos % 60}min`;
}

function finalizarPedido(pedidoId) {
  if (confirm('Deseja finalizar este pedido?')) {
    database.ref('pedidos/' + pedidoId).update({ status: 'Finalizado' });
  }
}