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

const pedidosAtivosContainer = document.getElementById('pedidos-ativos-container');
const pedidosFinalizadosContainer = document.getElementById('pedidos-finalizados-container');

const inputDataInicio = document.getElementById('data-inicio');
const inputDataFim = document.getElementById('data-fim');
const btnFiltrar = document.getElementById('btn-filtrar');

const totalPedidosEl = document.getElementById('total-pedidos');
const totalVendidoEl = document.getElementById('total-vendido');

const btnAtivos = document.getElementById('btn-ativos');
const btnFinalizados = document.getElementById('btn-finalizados');
const abaAtivos = document.getElementById('aba-ativos');
const abaFinalizados = document.getElementById('aba-finalizados');

const produtosRef = database.ref('produtos');
const btnProdutos = document.getElementById('btn-produtos');
const abaProdutos = document.getElementById('aba-produtos');

let pedidos = {};

pedidosRef.on('value', (snapshot) => {
  pedidos = {};
  snapshot.forEach(child => {
    pedidos[child.key] = child.val();
  });
  renderizarPedidos();
  // Renderiza a lista finalizados padrão do dia atual (ou vazio se nenhuma data escolhida)
  aplicarFiltroDatas();
});

btnFiltrar.addEventListener('click', () => {
  aplicarFiltroDatas();
});

function renderizarPedidos() {
  pedidosAtivosContainer.innerHTML = '';

  Object.entries(pedidos).forEach(([pedidoId, pedido]) => {
    if (pedido.status !== 'Finalizado' && pedido.status !== 'Recusado') {
      const pedidoDiv = document.createElement('div');
      pedidoDiv.className = 'bg-white p-4 rounded shadow mb-4';
      pedidoDiv.innerHTML = gerarHtmlPedido(pedido, pedidoId);
      pedidosAtivosContainer.appendChild(pedidoDiv);
    }
  });
}

function aplicarFiltroDatas() {
  pedidosFinalizadosContainer.innerHTML = '';

  let dataInicioTimestamp = inputDataInicio.value ? new Date(inputDataInicio.value).getTime() : null;
  let dataFimTimestamp = inputDataFim.value ? new Date(inputDataFim.value).getTime() + (24*60*60*1000) - 1 : null;

  let pedidosFiltrados = Object.entries(pedidos).filter(([id, pedido]) => {
    if (pedido.status !== 'Finalizado' || !pedido.timestamp) return false;

    const ts = pedido.timestamp;

    if (dataInicioTimestamp && ts < dataInicioTimestamp) return false;
    if (dataFimTimestamp && ts > dataFimTimestamp) return false;

    return true;
  });

  // Atualiza total de pedidos e vendas
  const totalPedidos = pedidosFiltrados.length;
  const totalVendido = pedidosFiltrados.reduce((acc, [_, p]) => acc + (p.totalPedido || 0), 0);

  totalPedidosEl.textContent = totalPedidos;
  totalVendidoEl.textContent = totalVendido.toFixed(2);

  if(totalPedidos === 0){
    pedidosFinalizadosContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum pedido finalizado no período selecionado.</p>`;
    return;
  }

  pedidosFiltrados.forEach(([pedidoId, pedido]) => {
    const pedidoDiv = document.createElement('div');
    pedidoDiv.className = 'bg-white p-4 rounded shadow mb-4';
    pedidoDiv.innerHTML = gerarHtmlPedido(pedido, pedidoId);
    pedidosFinalizadosContainer.appendChild(pedidoDiv);
  });
}


function aceitarPedido(pedidoId) {
  database.ref('pedidos/' + pedidoId).once('value').then(snapshot => {
    const pedido = snapshot.val();
    if (!pedido.telefone) {
      alert('Não foi possível encontrar o telefone do cliente.');
      return;
    }

    // Atualiza o status
    database.ref('pedidos/' + pedidoId).update({ status: 'Aceito' });

    // Monta a mensagem para o cliente
    const itensPedido = pedido.cart.map(item => 
      `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const enderecoTexto = pedido.tipoEntrega === 'Entrega'
      ? `${pedido.endereco.rua}, ${pedido.endereco.numero} - ${pedido.endereco.bairro}`
      : 'Retirada no local';

    const trocoTexto = pedido.dinheiroTotal 
      ? `Troco para: R$ ${pedido.dinheiroTotal.toFixed(2)}`
      : 'Sem troco';

    const obsTexto = pedido.observacao || 'Nenhuma';

    const mensagem = 
`✅ *Seu pedido foi aceito!*

🛒 *Itens:*
${itensPedido}

💳 *Pagamento:* ${pedido.pagamento}
💰 *${trocoTexto}*
📄 *Observação:* ${obsTexto}
🚚 *Tipo de Entrega:* ${pedido.tipoEntrega}
📍 *Endereço:* ${enderecoTexto}
💵 *Total:* R$ ${pedido.totalPedido.toFixed(2)}

Aguarde que logo estará a caminho! 🍽️`;

    const telefoneLimpo = pedido.telefone.replace(/\D/g, '');
    const url = `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  });
}

function saiuParaEntrega(pedidoId) {
  database.ref('pedidos/' + pedidoId).once('value').then(snapshot => {
    const pedido = snapshot.val();
    if (!pedido.telefone) {
      alert('Não foi possível encontrar o telefone do cliente.');
      return;
    }

    database.ref('pedidos/' + pedidoId).update({ status: 'Saiu para Entrega' });

    const mensagem = 
`🚚 *Seu pedido saiu para entrega!* 

👤 *Cliente:* ${pedido.nomeCliente || '-'}
📦 *Pedido:* ${pedido.cart.map(item => `${item.quantity}x ${item.name}`).join(', ')}
💵 *Total:* R$ ${pedido.totalPedido.toFixed(2)}

Nosso entregador está a caminho. 🛵 Agradecemos pela preferência! 🙏`;

    const telefoneLimpo = pedido.telefone.replace(/\D/g, '');
    const url = `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  });
}

function finalizarPedido(pedidoId) {
  database.ref('pedidos/' + pedidoId).once('value').then(snapshot => {
    const pedido = snapshot.val();
    if (!pedido.telefone) {
      alert('Não foi possível encontrar o telefone do cliente.');
      return;
    }

    database.ref('pedidos/' + pedidoId).update({ status: 'Finalizado' });

    const mensagem = 
`✅ *Pedido finalizado!*

Muito obrigado, ${pedido.nomeCliente || ''}, por confiar em nosso serviço. 😄  
Esperamos vê-lo novamente em breve! 🍽️🍕`;
    const telefoneLimpo = pedido.telefone.replace(/\D/g, '');
    const url = `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  });
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

  let clienteInfo = `
    <p class="text-sm mb-1"><strong>Cliente:</strong> ${pedido.nomeCliente || '-'}</p>
    <p class="text-sm mb-1"><strong>Telefone:</strong> ${pedido.telefone || '-'}</p>
  `;

  return `
  <div class="flex flex-col justify-between h-full">
    <div>
      <h2 class="text-lg font-bold mb-2">Pedido (${horario})</h2>
      ${clienteInfo}
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
` : pedido.status === 'Aceito' ? `
  <div class="flex gap-2 mt-4">
    <button onclick="imprimirPedido('${pedidoId}')" class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition">
      Imprimir Comanda
    </button>
    <button onclick="saiuParaEntrega('${pedidoId}')" class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition">
      Saiu para Entrega
    </button>
    <button onclick="finalizarPedido('${pedidoId}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
      Finalizar Pedido
    </button>
  </div>
` : pedido.status === 'Saiu para Entrega' ? `
  <div class="flex gap-2 mt-4">
    <button onclick="finalizarPedido('${pedidoId}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
      Finalizar Pedido
    </button>
  </div>
` : ``}
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
    case 'Saiu para entrega': return 'text-purple-500';
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

function ativaAba(ativa, inativa) {
  ativa.classList.remove('hidden');
  inativa.classList.add('hidden');
}

function estilizaBotaoAtivo(botaoAtivo, botaoInativo) {
  botaoAtivo.classList.add('bg-blue-600', 'text-white');
  botaoAtivo.classList.remove('bg-white', 'text-blue-600');

  botaoInativo.classList.remove('bg-blue-600', 'text-white');
  botaoInativo.classList.add('bg-white', 'text-blue-600');
}

btnAtivos.addEventListener('click', () => {
  ativaAba(abaAtivos, abaFinalizados);
  estilizaBotaoAtivo(btnAtivos, btnFinalizados);
});

btnFinalizados.addEventListener('click', () => {
  ativaAba(abaFinalizados, abaAtivos);
  estilizaBotaoAtivo(btnFinalizados, btnAtivos);
});

btnAtivos.click();

  function gerarNota(pedido) {
  let html = `
  <html>
  <head>
    <title>Nota do Pedido</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { text-align: center; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
      .section { margin-top: 20px; }
    </style>
  </head>
  <body>
    <h1>Comanda de Produção</h1>

    <div class="section">
      <strong>Cliente:</strong> ${pedido.nomeCliente || '-'}<br/>
      <strong>Telefone:</strong> ${pedido.telefone || '-'}<br/>
      <strong>Tipo de Entrega:</strong> ${pedido.tipoEntrega}<br/>
      ${pedido.tipoEntrega === 'Entrega' ? `
        <strong>Endereço:</strong> ${pedido.endereco?.rua || ''}, ${pedido.endereco?.numero || ''} - ${pedido.endereco?.bairro || ''}<br/>
      ` : '<strong>Retirada no Local</strong>'}
    </div>

    <div class="section">
      <table>
        <thead>
          <tr>
            <th>Qtd</th>
            <th>Produto</th>
            <th>Unitário</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>`;

  pedido.cart.forEach(item => {
    html += `
      <tr>
        <td>${item.quantity}</td>
        <td>${item.name}</td>
        <td>R$ ${item.price.toFixed(2)}</td>
        <td>R$ ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>

    <div class="section">
      <p><strong>Pagamento:</strong> ${pedido.pagamento} ${pedido.dinheiroTotal ? '(Troco para R$ ' + pedido.dinheiroTotal + ')' : ''}</p>
      <p><strong>Observação:</strong> ${pedido.observacao || '-'}</p>
      <p class="total">Total do Pedido: R$ ${pedido.totalPedido.toFixed(2)}</p>
    </div>

  </body>
  </html>`;

  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function imprimirPedido(pedidoId) {
  database.ref('pedidos/' + pedidoId).once('value').then(snapshot => {
    const pedido = snapshot.val();
    gerarNota(pedido);
  });
}

