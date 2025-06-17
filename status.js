import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtz28du4JtLnPi-MlOgsiXRlb8k02Jwgc",
  authDomain: "cardapioweb-99e7b.firebaseapp.com",
  databaseURL: "https://cardapioweb-99e7b-default-rtdb.firebaseio.com",
  projectId: "cardapioweb-99e7b",
  storageBucket: "cardapioweb-99e7b.appspot.com",
  messagingSenderId: "110849299422",
  appId: "1:110849299422:web:44083feefdd967f4f9434f",
  measurementId: "G-Y4KFGTHFP1"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const pedidoId = new URLSearchParams(window.location.search).get("pedidoId");
const statusElement = document.getElementById("status");
const horarioElement = document.getElementById("horario-pedido");

function atualizarUI(status) {
  status = status.toLowerCase();
  const steps = ["pendente", "aceito", "saiu para entrega", "finalizado"];
  const icons = {
    "pendente": "icon-pendente",
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
    "pendente": "Pedido recebido! Estamos confirmando.",
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

      if (pedido.timestamp) {
  const pedidoDate = new Date(pedido.timestamp);

  // Formatar os horários
  const horarioPedido = pedidoDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const previsaoDate = new Date(pedidoDate.getTime() + 40 * 60000);
  const horarioPrevisao = previsaoDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Atualizar apenas os textos dos spans
  document.getElementById('hora-pedido-texto').textContent = horarioPedido;
  document.getElementById('hora-previsao-texto').textContent = horarioPrevisao;
} else {
  horarioElement.textContent = 'Horário do pedido não disponível';
  document.getElementById('previsao-entrega').textContent = '';
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