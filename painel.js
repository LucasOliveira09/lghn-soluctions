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
const promocoesRef = firebase.database().ref('promocoes');

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
const btnPromocoes = document.getElementById('btn-promocoes');
const abaPromocoes = document.getElementById('promocoes');

let pedidos = {};

//let senhaTentada = prompt("Qual a senha do painel?");

//let senha = "1234"

//if(senhaTentada !== senha ){
//  document.getElementById('tudoSome').classList.add("hidden")
//}

let totalPedidosAnteriores = 0;

pedidosRef.on('value', (snapshot) => {
  pedidos = {};
  snapshot.forEach((child) => {
    pedidos[child.key] = child.val();
  });

  renderizarPedidos();
  aplicarFiltroDatas();

  const totalPedidosAtual = Object.keys(pedidos).length;
  if (totalPedidosAtual > totalPedidosAnteriores) {
    tocarNotificacao();
  }
  totalPedidosAnteriores = totalPedidosAtual;
});

function tocarNotificacao() {
  const som = document.getElementById('notificacao-som');
  if (som) {
    som.currentTime = 0; // reinicia
    som.play().catch((err) => {
      console.warn('Não foi possível reproduzir o som:', err);
    });
  }
}

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
  database.ref('pedidos/' + pedidoId).once('value')
    .then(snapshot => {
      const pedido = snapshot.val();

      // Log para depuração
      console.log('Pedido:', pedido); 

      if (!pedido.telefone) {
        alert('Não foi possível encontrar o telefone do cliente.');
        return;
      }

      // Atualiza o status antes de abrir o WhatsApp
      database.ref('pedidos/' + pedidoId).update({ status: 'Aceito' });

      const itensPedido = pedido.cart
        .map(item => `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}`)
        .join('\n');

      const enderecoTexto = pedido.tipoEntrega === 'Entrega'
        ? `${pedido.endereco.rua}, ${pedido.endereco.numero} - ${pedido.endereco.bairro}`
        : 'Retirada no local';

      const trocoTexto = pedido.dinheiroTotal
        ? `Troco para: R$ ${pedido.dinheiroTotal.toFixed(2)}`
        : 'Sem troco';

      const obsTexto = pedido.observacao || 'Nenhuma';

      const mensagem = `✅ *Seu pedido foi aceito!*

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

      // Abre a janela antes da promessa acabar, igual ao saiuParaEntrega
      window.open(url, '_blank');
      console.log('WhatsApp aberto com sucesso.');

    })
    .catch(err => {
      console.error('Erro ao aceitar pedido:', err);
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

    // ✅ Aqui está o fix: salvando também o timestamp
    database.ref('pedidos/' + pedidoId).update({ 
      status: 'Finalizado',
      timestamp: Date.now()
    });

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
  
  if (!pedido || !pedido.cart || !Array.isArray(pedido.cart)) {
  return `<div class="text-red-600 font-semibold">Erro: pedido inválido ou sem produtos.</div>`;
}


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
    <button onclick="editarPedido('${pedidoId}')" class="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition">
    ✏️ Editar
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

function ativaAba(ativa, inativa, inativa2) {
  ativa.classList.remove('hidden');
  inativa.classList.add('hidden');
  inativa2.classList.add('hidden');
}

function estilizaBotaoAtivo(botaoAtivo, botaoInativo, botaoInativo2) {
  botaoAtivo.classList.add('bg-blue-600', 'text-white');
  botaoAtivo.classList.remove('bg-white', 'text-blue-600');

  botaoInativo.classList.remove('bg-blue-600', 'text-white');
  botaoInativo.classList.add('bg-white', 'text-blue-600');

  botaoInativo2.classList.remove('bg-blue-600', 'text-white');
  botaoInativo2.classList.add('bg-white', 'text-blue-600');
}

btnAtivos.addEventListener('click', () => {
  ativaAba(abaAtivos, abaFinalizados, abaPromocoes);
  estilizaBotaoAtivo(btnAtivos, btnFinalizados, btnPromocoes);
});

btnFinalizados.addEventListener('click', () => {
  ativaAba(abaFinalizados, abaAtivos, abaPromocoes);
  estilizaBotaoAtivo(btnFinalizados, btnAtivos, btnPromocoes);
});

btnPromocoes.addEventListener('click', () => {
  ativaAba(abaPromocoes, abaFinalizados, abaAtivos);
  estilizaBotaoAtivo(btnPromocoes, btnAtivos, btnFinalizados);
});

btnAtivos.click();

  function gerarNota(pedido) {
  let html = `
  <html>
  <head>
    <title>Nota do Pedido</title>
    <style>
      @page {
        size: A4;
        margin: 10mm;
      }
      html, body {
        width: 100%;
        height: 100%;
        padding: 0;
        margin: 0;
        font-family: Arial, sans-serif;
      }
      body {
        box-sizing: border-box;
        padding: 10mm;
        font-size: 14pt;
      }
      h1 {
        text-align: center;
        font-size: 24pt;
        margin-bottom: 10mm;
      }
      hr {
        border: none;
        border-top: 2pt solid #000;
        margin: 5mm 0;
      }
      .info {
        font-size: 14pt;
        margin: 2mm 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10mm;
        font-size: 14pt;
      }
      th, td {
        padding: 2mm 4mm;
        border: 1pt solid #000;
      }
      th {
        background: #eee;
      }
      .total {
        font-size: 18pt;
        font-weight: bold;
        text-align: right;
        margin-top: 10mm;
      }
      .obs {
        font-size: 12pt;
        margin-top: 5mm;
      }
      .footer {
        text-align: center;
        margin-top: auto;
        padding-top: 10mm;
        font-size: 12pt;
      }
    </style>
  </head>
  <body>
    <h1>Nota do Pedido</h1>
    <hr/>
    <div class="info"><strong>Cliente:</strong> ${pedido.nomeCliente || '-'}</div>
    <div class="info"><strong>Telefone:</strong> ${pedido.telefone || '-'}</div>
    <div class="info"><strong>Entrega:</strong> ${pedido.tipoEntrega}</div>
    ${
      pedido.tipoEntrega === 'Entrega' ? `
      <div class="info"><strong>Endereço:</strong> ${pedido.endereco?.rua}, ${pedido.endereco?.numero} - ${pedido.endereco?.bairro}</div>
      <div class="info"><strong>Referência:</strong> ${pedido.referencia || '-'}</div>
    ` : '<div class="info"><strong>Retirada no local</strong></div>'
    }
    <hr/>
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
    <div class="info"><strong>Pagamento:</strong> ${pedido.pagamento} ${pedido.dinheiroTotal ? `(Troco p/ R$ ${pedido.dinheiroTotal})` : ''}</div>
    <div class="obs"><strong>Observação:</strong> ${pedido.observacao || '-'}</div>
    <div class="total">Total do pedido: R$ ${pedido.totalPedido.toFixed(2)}</div>
    <div class="footer">Obrigado por comprar conosco! 🍽️</div>
  </body>
  </html>`;

  const printWindow = window.open('', '', 'width=1024,height=768');
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

function atualizarPromocao(){
  pedidosRef.on('value', function(snapshot) {
      var status = snapshot.val();
      document.getElementById('pedido-status').innerText = status || 'Sem status ainda';
}); 
}

// ler promoçoes
  const painelPromocoes = document.getElementById('painel-promocoes');

  // Adiciona nova promoção
  document.getElementById('promoForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const novaPromo = {
      titulo: document.getElementById('titulo').value,
      descricao: document.getElementById('descricao').value,
      imagem: document.getElementById('imagem').value,
      preco: document.getElementById('preco').value,
      ativo: true
    };

    promocoesRef.push(novaPromo)
      .then(() => {
        alert('Promoção adicionada!');
        document.getElementById('promoForm').reset();
      })
      .catch(error => alert('Erro ao adicionar: ' + error.message));
  });

  // Visualiza promoções
  promocoesRef.on('value', snapshot => {
    painelPromocoes.innerHTML = '';
    snapshot.forEach(promoSnap => {
      const promo = promoSnap.val();
      const key = promoSnap.key;

      if (promo.ativo) {
        const html = `
        <div class="p-3 border rounded shadow bg-white flex justify-between items-start">
          <div>
            <h3 class="font-bold text-lg">${promo.titulo}</h3>
            <p class="text-sm text-gray-600">${promo.descricao}</p>
            <p class="text-green-700 font-bold mt-1">R$ ${promo.preco}</p>
          </div>
          <div class="flex flex-col gap-2 items-end">
            <button onclick="editarPromocao('${key}', ${JSON.stringify(promo).replace(/"/g, '&quot;')})" class="bg-yellow-500 text-white px-3 py-1 rounded">✏️ Editar</button>
            <button onclick="desativarPromocao('${key}')" class="bg-red-600 text-white px-3 py-1 rounded">❌ Desativar</button>
          </div>
        </div>
        `;
        painelPromocoes.innerHTML += html;
      }
    });
  });

  // Desativa
  function desativarPromocao(key) {
    if (confirm("Deseja desativar essa promoção?")) {
      promocoesRef.child(key).update({ ativo: false });
    }
  }

  // Modal de edição
  let keyEdicao = null;

  function editarPromocao(key, promo) {
    keyEdicao = key;
    document.getElementById('edit-titulo').value = promo.titulo;
    document.getElementById('edit-descricao').value = promo.descricao;
    document.getElementById('edit-imagem').value = promo.imagem;
    document.getElementById('edit-preco').value = promo.preco;
    document.getElementById('modal-editar').classList.remove('hidden');
  }

  function fecharModal() {
    document.getElementById('modal-editar').classList.add('hidden');
    keyEdicao = null;
  }

  document.getElementById('form-editar').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!keyEdicao) return;

    const titulo = document.getElementById('edit-titulo').value;
    const descricao = document.getElementById('edit-descricao').value;
    const imagem = document.getElementById('edit-imagem').value;
    const preco = document.getElementById('edit-preco').value;

    promocoesRef.child(keyEdicao).update({
      titulo, descricao, imagem, preco
    }).then(() => {
      fecharModal();
    }).catch(error => {
      alert("Erro ao salvar: " + error.message);
    });
  });

let pedidoEmEdicao = null;
let pedidoOriginal = null;

function editarPedido(pedidoId) {
  pedidoEmEdicao = pedidoId;

  database.ref('pedidos/' + pedidoId).once('value').then(snapshot => {
    pedidoOriginal = snapshot.val() || {};
    renderizarItensModal(pedidoOriginal.cart || []);
    document.getElementById('modal-pedido-id').textContent = pedidoId;
    document.getElementById('modal-editar-pedido').classList.remove('hidden');
    document.getElementById('modal-editar-pedido').classList.add('flex');
  });
}

function renderizarItensModal(itens) {
  const container = document.getElementById('modal-itens');
  container.innerHTML = '';

  itens.forEach((item, index) => {
    container.innerHTML += `
      <div class="flex justify-between items-center gap-2 border p-2 rounded">
        <input type="number" min="0" value="${item.quantity}"
          class="w-16 border p-1 rounded text-center"
          data-index="${index}"
          data-name="${item.name}"
          data-price="${item.price}"
        />
        <span class="flex-1 ml-2">${item.name}</span>
        <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `;
  });
  

  // Atualizar listener
  document.getElementById('btn-salvar-pedido').onclick = salvarPedidoEditado;
}

// Adicionar novo item
document.getElementById('btn-adicionar-item').addEventListener('click', () => {
  const nome = document.getElementById('novo-item-nome').value.trim();
  const preco = parseFloat(document.getElementById('novo-item-preco').value);
  const qtd = parseInt(document.getElementById('novo-item-quantidade').value, 10);

  if (!nome || isNaN(preco) || isNaN(qtd)) {
    return alert('Preencha todos os campos corretamente.');
  }

  pedidoOriginal.cart = pedidoOriginal.cart || [];
  pedidoOriginal.cart.push({ name: nome, price: preco, quantity: qtd });

  // Limpa campos
  document.getElementById('novo-item-nome').value = '';
  document.getElementById('novo-item-preco').value = '';
  document.getElementById('novo-item-quantidade').value = '1';

  renderizarItensModal(pedidoOriginal.cart);
});

function salvarPedidoEditado() {
  const inputs = document.querySelectorAll('#modal-itens input[type="number"]');

  const novosItens = [];
  inputs.forEach(input => {
    const nome = input.dataset.name;
    const preco = parseFloat(input.dataset.price);
    const qtd = parseInt(input.value, 10);

    if (qtd > 0) {
      novosItens.push({ name: nome, price: preco, quantity: qtd });
    }
  });

  database.ref('pedidos/' + pedidoEmEdicao).update({ cart: novosItens })
    .then(() => {
      alert('Pedido atualizado com sucesso!');
      fecharModalEditarPedido();
    })
    .catch(error => {
      console.error('Erro ao salvar pedido:', error);
      alert('Erro ao salvar o pedido.');
    });
}

function fecharModalEditarPedido() {
  document.getElementById('modal-editar-pedido').classList.add('hidden');
  pedidoEmEdicao = null;
  pedidoOriginal = null;
}