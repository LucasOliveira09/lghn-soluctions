import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const pedidoId = new URLSearchParams(window.location.search).get("pedidoId");
const statusElement = document.getElementById("status");
const horarioElement = document.getElementById("horario-pedido");

function atualizarUI(status) {
  status = status.toLowerCase();
  const steps = ["aguardando", "aceito", "saiu para entrega", "finalizado"];
  const icons = {
    "aguardando": "icon-pendente",
    "aceito": "icon-aceito",
    "saiu para entrega": "icon-em-entrega",
    "finalizado": "icon-finalizado"
  };

  steps.forEach((step, index) => {
    const icon = document.getElementById(icons[step]);
    const bar = document.getElementById(`bar${index}`);

    if (steps.indexOf(status) >= index) {
      icon.classList.replace("text-gray-400", "text-green-500");
      if (steps.indexOf(status) === index) {
        icon.classList.add("pulse"); // animação só no status atual
      } else {
        icon.classList.remove("pulse");
      }
      if (bar) bar.classList.replace("bg-gray-300", "bg-green-500");
    } else {
      icon.classList.replace("text-green-500", "text-gray-400");
      icon.classList.remove("pulse");
      if (bar) bar.classList.replace("bg-green-500", "bg-gray-300");
    }
  });

  const mensagens = {
    "aguardando": "Pedido recebido! Estamos confirmando.",
    "aceito": "Pedido aceito! Estamos preparando.",
    "saiu para entrega": "Saiu para entrega! Aguarde...",
    "finalizado": "Pedido entregue! Bom apetite.",
    "recusado": "Pedido cancelado."
  };

  statusElement.textContent = mensagens[status] || "Aguardando atualização do pedido...";
}

if (pedidoId) {
  const pedidoRef = ref(database, `pedidos/${pedidoId}`);
  onValue(pedidoRef, (snapshot) => {
    if (snapshot.exists()) {
  const pedido = snapshot.val();
  const status = pedido.status || "pendente";
  atualizarUI(status);

  // Atualizar horário
  if (pedido.timestamp) {
    const pedidoDate = new Date(pedido.timestamp);
    const horarioPedido = pedidoDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const previsaoDate = new Date(pedidoDate.getTime() + 40 * 60000);
    const horarioPrevisao = previsaoDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    document.getElementById('hora-pedido-texto').textContent = horarioPedido;
    document.getElementById('hora-previsao-texto').textContent = horarioPrevisao;
  } else {
    document.getElementById('hora-pedido-texto').textContent = '--:--';
    document.getElementById('hora-previsao-texto').textContent = '--:--';
  }

  // ✅ Preencher itens do pedido
  const itensContainer = document.getElementById('itens-pedido');
  itensContainer.innerHTML = '';

  if (pedido.cart && Array.isArray(pedido.cart)) {
    pedido.cart.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.quantity || 1}x ${item.name || 'Item'}`;
      itensContainer.appendChild(li);
    });
  }

  // ✅ Preencher forma de pagamento
  document.getElementById('forma-pagamento').textContent = pedido.pagamento || '---';

  // ✅ Preencher total
  document.getElementById('total-pedido').textContent = `R$ ${pedido.totalPedido || '--,--'}`;

  // ✅ Preencher tipo de entrega
  document.getElementById('tipo-entrega').textContent = pedido.tipoEntrega || '---';

  // ✅ Preencher endereço
  if (pedido.tipoEntrega === "Retirada") {
    document.getElementById('endereco-entrega').textContent = 'Retirada no balcão';
  } else if (pedido.endereco) {
    const { rua, numero, bairro, complemento } = pedido.endereco;
    const enderecoCompleto = `${rua || ''}, ${numero || ''} - ${bairro || ''} ${complemento ? `(${complemento})` : ''}`;
    document.getElementById('endereco-entrega').textContent = enderecoCompleto;
  } else {
    document.getElementById('endereco-entrega').textContent = 'Endereço não informado';
  }
    } else {
      statusElement.textContent = "Pedido não encontrado.";
      horarioElement.textContent = '';
    }

  });
} else {
  statusElement.textContent = "ID do pedido não encontrado.";
  horarioElement.textContent = '';
}

const clienteId = localStorage.getItem('clienteId');
const historicoEl = document.getElementById('historico-pedidos');

if (clienteId) {
  firebase.database().ref('pedidos').orderByChild('clienteId').equalTo(clienteId).on('value', snapshot => {
    historicoEl.innerHTML = '';

    if (!snapshot.exists()) {
      historicoEl.innerHTML = '<p class="text-gray-500">Você ainda não fez nenhum pedido.</p>';
      return;
    }

    snapshot.forEach(pedidoSnap => {
      const pedido = pedidoSnap.val();

      const itensHTML = pedido.itens.map(item =>
        `<li>${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}</li>`
      ).join('');

      historicoEl.innerHTML += `
        <div class="border rounded p-4 bg-white shadow">
          <p class="text-sm text-gray-500">Data: ${new Date(pedido.data).toLocaleString()}</p>
          <ul class="list-disc ml-5 text-sm my-2">${itensHTML}</ul>
          <p class="font-bold text-green-700">Total: R$ ${pedido.total.toFixed(2)}</p>
          <p class="text-sm text-blue-600">Status: ${pedido.status}</p>
        </div>
      `;
    });
  });
}