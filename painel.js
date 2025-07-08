// Configuração do Firebase (mantido como está)
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
const pedidosRef = database.ref('pedidos');
const promocoesRef = firebase.database().ref('promocoes');

const pedidosAtivosContainer = document.getElementById('pedidos-ativos-container');
const pedidosFinalizadosContainer = document.getElementById('pedidos-finalizados-container');

const inputDataInicio = document.getElementById('data-inicio');
const inputDataFim = document.getElementById('data-fim');
const btnFiltrar = document.getElementById('btn-filtrar');

const totalPedidosEl = document.getElementById('total-pedidos');
const totalVendidoEl = document.getElementById('total-vendido');

// Botões do menu
const btnAtivos = document.getElementById('btn-ativos');
const btnFinalizados = document.getElementById('btn-finalizados');
const btnEditarCardapio = document.getElementById('btn-editar-cardapio');
const btnEditarHorario = document.getElementById('btn-editar-horario');
const btnGerenciarUsuarios = document.getElementById('btn-gerenciar-usuarios'); // Novo
const btnConfiguracoesGerais = document.getElementById('btn-configuracoes-gerais'); // Novo
const btnRelatorios = document.getElementById('btn-relatorios'); // Novo

// Abas (seções)
const abaAtivos = document.getElementById('aba-ativos');
const abaFinalizados = document.getElementById('aba-finalizados');
const EditarCardapio = document.getElementById('editar-cardapio');
const editarHorario = document.getElementById('editar-horario');
const abaGerenciarUsuarios = document.getElementById('aba-gerenciar-usuarios'); // Novo
const abaConfiguracoesGerais = document.getElementById('aba-configuracoes-gerais'); // Novo
const abaRelatorios = document.getElementById('aba-relatorios'); // Novo

const produtosRef = database.ref('produtos');
const searchInput = document.getElementById('search-input');
const categoriaSelect = document.getElementById('categoria-select');

// Elementos do menu hamburguer
const menuButton = document.getElementById('menu-button');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeSidebarButton = document.getElementById('close-sidebar-button');


let pedidos = {};
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
    let dataFimTimestamp = inputDataFim.value ? new Date(inputDataFim.value).getTime() + (24 * 60 * 60 * 1000) - 1 : null;

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

    if (totalPedidos === 0) {
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

            console.log('Pedido completo recuperado:', pedido);

            if (!pedido.telefone) {
                alert('Não foi possível encontrar o telefone do cliente.');
                console.error('Erro: Telefone do cliente não encontrado no pedido.');
                return;
            }

            database.ref('pedidos/' + pedidoId).update({ status: 'Aceito' });

            const itensPedido = pedido.cart
                .map(item => `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}`)
                .join('\n');

            const enderecoTexto = pedido.tipoEntrega === 'Entrega' ?
                `${pedido.endereco.rua}, ${pedido.endereco.numero} - ${pedido.endereco.bairro}` :
                'Retirada no local';

            const trocoPara = pedido.dinheiroTotal ? parseFloat(pedido.dinheiroTotal) : 0;
            const trocoTexto = trocoPara > 0 ?
                `Troco para: R$ ${trocoPara.toFixed(2)}` :
                'Sem troco';

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
            console.log('Telefone limpo para WhatsApp:', telefoneLimpo);

            const url = `https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`;
            console.log('URL gerada para WhatsApp:', url);

            window.open(url, '_blank');
            console.log('Tentativa de abrir WhatsApp.');

        })
        .catch(err => {
            console.error('Erro ao aceitar pedido:', err);
            alert('Erro ao aceitar pedido. Verifique o console para mais detalhes.');
        });
}

function saiuParaEntrega(pedidoId) {
    database.ref('pedidos/' + pedidoId).once('value').then(snapshot => {
        const pedido = snapshot.val();
        if (!pedido.telefone) {
            alert('Não foi possível encontrar o telefone do cliente.');
            return;
        }

        database.ref('pedidos/' + pedidoId).update({
            status: pedido.tipoEntrega === 'Retirada' ? 'Pronto para Retirada' : 'Saiu para Entrega'
        });

        const telefoneLimpo = pedido.telefone.replace(/\D/g, '');

        let mensagem = '';

        if (pedido.tipoEntrega === 'Retirada') {
            mensagem =
                `✅ *Seu pedido está pronto para retirada!*

👤 *Cliente:* ${pedido.nomeCliente || '-'}
📦 *Pedido:* ${pedido.cart.map(item => `${item.quantity}x ${item.name}`).join(', ')}
💵 *Total:* R$ ${pedido.totalPedido.toFixed(2)}

Pode vir buscar quando quiser. Agradecemos pela preferência! 🙏`;
        } else {
            mensagem =
                `🚚 *Seu pedido saiu para entrega!* 👤 *Cliente:* ${pedido.nomeCliente || '-'}
📦 *Pedido:* ${pedido.cart.map(item => `${item.quantity}x ${item.name}`).join(', ')}
💵 *Total:* R$ ${pedido.totalPedido.toFixed(2)}

Nosso entregador está a caminho. 🛵 Agradecemos pela preferência! 🙏`;
        }

        const url = `https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`;
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

        database.ref('pedidos/' + pedidoId).update({
            status: 'Finalizado',
            timestamp: Date.now()
        });


        const mensagem =
            `✅ *Pedido finalizado!*

Muito obrigado, ${pedido.nomeCliente || ''}, por confiar em nosso serviço. 😄
Esperamos vê-lo novamente em breve! 🍽️🍕`;

        const telefoneLimpo = pedido.telefone.replace(/\D/g, '');
        const url = `https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`;
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


    let enderecoTexto = pedido.tipoEntrega === 'Entrega' ?
        `<p class="text-sm mb-1"><strong>Endereço:</strong> ${pedido.endereco.rua}, ${pedido.endereco.numero} - ${pedido.endereco.bairro}</p>` :
        `<p class="text-sm font-semibold text-blue-600 mb-1">Retirada no local</p>`;

    let produtos = pedido.cart.map(item => `
        <li class="flex justify-between text-sm">
            <span>${item.quantity}x ${item.name}</span>
            <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
        </li>`).join('');

    let horario = pedido.timestamp ?
        new Date(pedido.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) :
        'Sem horário';

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
            <p class="text-sm"><strong>Pagamento:</strong> ${pedido.pagamento} ${pedido.dinheiroTotal ? '(Troco p/ R$ ' + parseFloat(pedido.dinheiroTotal).toFixed(2) + ')' : ''}</p>
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
                    ${pedido.tipoEntrega === 'Retirada' ? 'Pronto para Retirada' : 'Saiu para Entrega'}
                </button>
                <button onclick="finalizarPedido('${pedidoId}')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
                    Finalizar Pedido
                </button>
                <button onclick="editarPedido('${pedidoId}')" class="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition">
                    ✏️ Editar
                </button>
            </div>
            ` : pedido.status === 'Saiu para Entrega' || pedido.status === 'Pronto para Retirada' ? `
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
        case 'Aguardando':
            return 'text-yellow-500';
        case 'Aceito':
            return 'text-green-500';
        case 'Recusado':
            return 'text-red-500';
        case 'Finalizado':
            return 'text-blue-500';
        case 'Saiu para Entrega':
        case 'Pronto para Retirada':
            return 'text-purple-500';
        default:
            return 'text-gray-500';
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

// Atualizada para incluir as novas abas
function ativaAba(ativa, ...inativas) {
    ativa.classList.remove('hidden');
    inativas.forEach(aba => aba.classList.add('hidden'));
}

// Atualizada para incluir os novos botões
function estilizaBotaoAtivo(botaoAtivo, ...inativos) {
    botaoAtivo.classList.add('bg-blue-600', 'text-white');
    botaoAtivo.classList.remove('bg-blue-700'); // Cor padrão da sidebar

    inativos.forEach(botao => {
        botao.classList.remove('bg-blue-600', 'text-white');
        botao.classList.add('bg-blue-700'); // Cor padrão da sidebar
    });
}

// Event Listeners para os botões do menu hamburguer
btnAtivos.addEventListener('click', () => {
    ativaAba(abaAtivos, abaFinalizados, EditarCardapio, editarHorario, abaGerenciarUsuarios, abaConfiguracoesGerais, abaRelatorios);
    estilizaBotaoAtivo(btnAtivos, btnFinalizados, btnEditarCardapio, btnEditarHorario, btnGerenciarUsuarios, btnConfiguracoesGerais, btnRelatorios);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

btnFinalizados.addEventListener('click', () => {
    ativaAba(abaFinalizados, abaAtivos, EditarCardapio, editarHorario, abaGerenciarUsuarios, abaConfiguracoesGerais, abaRelatorios);
    estilizaBotaoAtivo(btnFinalizados, btnAtivos, btnEditarCardapio, btnEditarHorario, btnGerenciarUsuarios, btnConfiguracoesGerais, btnRelatorios);

    const hoje = new Date();
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(hoje.getDate() - 7);

    inputDataInicio.value = seteDiasAtras.toISOString().split('T')[0];
    inputDataFim.value = hoje.toISOString().split('T')[0];

    aplicarFiltroDatas();
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

btnEditarCardapio.addEventListener('click', () => {
    ativaAba(EditarCardapio, abaFinalizados, abaAtivos, editarHorario, abaGerenciarUsuarios, abaConfiguracoesGerais, abaRelatorios);
    estilizaBotaoAtivo(btnEditarCardapio, btnAtivos, btnFinalizados, btnEditarHorario, btnGerenciarUsuarios, btnConfiguracoesGerais, btnRelatorios);
    carregarItensCardapio(categoriaSelect.value, searchInput.value);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

btnEditarHorario.addEventListener('click', () => {
    ativaAba(editarHorario, abaFinalizados, abaAtivos, EditarCardapio, abaGerenciarUsuarios, abaConfiguracoesGerais, abaRelatorios);
    estilizaBotaoAtivo(btnEditarHorario, btnAtivos, btnFinalizados, btnEditarCardapio, btnGerenciarUsuarios, btnConfiguracoesGerais, btnRelatorios);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

// Novos Event Listeners para os novos botões
btnGerenciarUsuarios.addEventListener('click', () => {
    ativaAba(abaGerenciarUsuarios, abaAtivos, abaFinalizados, EditarCardapio, editarHorario, abaConfiguracoesGerais, abaRelatorios);
    estilizaBotaoAtivo(btnGerenciarUsuarios, btnAtivos, btnFinalizados, btnEditarCardapio, btnEditarHorario, btnConfiguracoesGerais, btnRelatorios);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

btnConfiguracoesGerais.addEventListener('click', () => {
    ativaAba(abaConfiguracoesGerais, abaAtivos, abaFinalizados, EditarCardapio, editarHorario, abaGerenciarUsuarios, abaRelatorios);
    estilizaBotaoAtivo(btnConfiguracoesGerais, btnAtivos, btnFinalizados, btnEditarCardapio, btnEditarHorario, btnGerenciarUsuarios, btnRelatorios);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

btnRelatorios.addEventListener('click', () => {
    ativaAba(abaRelatorios, abaAtivos, abaFinalizados, EditarCardapio, editarHorario, abaGerenciarUsuarios, abaConfiguracoesGerais);
    estilizaBotaoAtivo(btnRelatorios, btnAtivos, btnFinalizados, btnEditarCardapio, btnEditarHorario, btnGerenciarUsuarios, btnConfiguracoesGerais);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});


// Função para inicializar a aba ativa e o estilo do botão
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
        <div class="info"><strong>Pagamento:</strong> ${pedido.pagamento} ${pedido.dinheiroTotal ? `(Troco p/ R$ ${parseFloat(pedido.dinheiroTotal).toFixed(2)})` : ''}</div>
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

function atualizarPromocao() {
    // Esta função parece estar buscando o status de 'pedidosRef' e colocando em 'pedido-status'.
    // Se 'pedido-status' é um elemento no painel, e você quer o status de um pedido específico,
    // precisaria de um pedidoId aqui. Se for um status geral, ok.
    // Mantenho como está, mas é bom revisar o propósito.
    pedidosRef.on('value', function(snapshot) {
        var status = snapshot.val(); // Isso pegaria todos os pedidos, não um status específico.
        // document.getElementById('pedido-status').innerText = status || 'Sem status ainda'; // Provavelmente não é o que você quer aqui.
    });
}

const imagemUrlInput = document.getElementById('imagemUrl');
const imagemPreview = document.getElementById('imagemPreview');

if (imagemUrlInput && imagemPreview) { // Verifica se os elementos existem antes de adicionar listener
    imagemUrlInput.addEventListener('input', () => {
        const url = imagemUrlInput.value.trim();
        if (url.startsWith('http')) {
            imagemPreview.src = url;
            imagemPreview.classList.remove('hidden');
        } else {
            imagemPreview.src = '';
            imagemPreview.classList.add('hidden');
        }
    });
}


document.getElementById('promoForm')?.addEventListener('submit', function(e) { // Adicionado '?' para null check
    e.preventDefault();

    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const imagem = imagemUrlInput.value.trim();
    const preco = parseFloat(document.getElementById('preco').value);

    if (!imagem.startsWith('http')) {
        alert("Coloque uma URL de imagem válida.");
        return;
    }

    const novaPromo = { titulo, descricao, imagem, preco, ativo: true };

    promocoesRef.push(novaPromo)
        .then(() => {
            alert("Promoção adicionada com sucesso!");
            document.getElementById('promoForm').reset();
            imagemPreview.src = '';
            imagemPreview.classList.add('hidden');
        })
        .catch(error => {
            alert("Erro ao adicionar promoção: " + error.message);
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
document.getElementById('btn-adicionar-item')?.addEventListener('click', () => { // Adicionado '?' para null check
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

    // Recalcula o total do pedido com base nos novos itens
    const novoTotalPedido = novosItens.reduce((sum, item) => sum + item.price * item.quantity, 0);

    database.ref('pedidos/' + pedidoEmEdicao).update({ cart: novosItens, totalPedido: novoTotalPedido }) // Atualiza o carrinho e o total
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

// Event listeners para a seção de edição do cardápio
btnEditarCardapio.addEventListener("click", () => {
    // Oculta outras seções
    document.getElementById("aba-ativos").classList.add("hidden");
    document.getElementById("aba-finalizados").classList.add("hidden");
    document.getElementById("promocoes").classList.add("hidden"); // Certifique-se que este ID existe
    document.getElementById("editar-cardapio").classList.remove("hidden");

    // Carrega os itens do cardápio ao ativar a aba de edição
    carregarItensCardapio(categoriaSelect.value, searchInput.value);
});

categoriaSelect.addEventListener("change", (e) => {
    // Recarrega os itens quando a categoria muda, aplicando a pesquisa atual
    carregarItensCardapio(e.target.value, searchInput.value);
});

searchInput.addEventListener("input", () => {
    // Recarrega os itens quando o input de pesquisa muda, aplicando a categoria atual
    carregarItensCardapio(categoriaSelect.value, searchInput.value);
});


// Função principal para carregar itens do cardápio para edição
// Agora aceita um termo de pesquisa
function carregarItensCardapio(categoria, searchQuery = '') {
    const container = document.getElementById("itens-cardapio-container");
    container.innerHTML = "Carregando...";

    // Referência para a categoria selecionada (ex: produtos/pizzas)
    const ref = database.ref(`produtos/${categoria}`);

    ref.once("value", function(snapshot) {
        container.innerHTML = "";
        let itemsToRender = [];

        snapshot.forEach(function(childSnapshot) {
            const item = childSnapshot.val();
            const key = childSnapshot.key;
            itemsToRender.push({ item, key });
        });

        // Filtra os itens com base na pesquisa
        const lowerCaseSearchQuery = searchQuery.toLowerCase();
        const filteredItems = itemsToRender.filter(({ item }) => {
            const name = (item.nome || item.titulo || '').toLowerCase();
            const description = (item.descricao || '').toLowerCase();
            return name.includes(lowerCaseSearchQuery) || description.includes(lowerCaseSearchQuery);
        });

        if (filteredItems.length === 0) {
            container.innerHTML = `<p class="text-gray-600 text-center col-span-full">Nenhum item encontrado para "${searchQuery}" nesta categoria.</p>`;
            return;
        }

        filteredItems.forEach(({ item, key }) => {
            const card = criarCardItem(item, key, categoria); // Passa a categoria atual
            container.appendChild(card);
        });
    });
}

// Função para criar o card de um item do cardápio para edição
function criarCardItem(item, key, categoriaAtual) {
    const card = document.createElement("div");

    const destaquePromocao = categoriaAtual === "promocoes" ?
        "border-yellow-500 border-2 shadow-lg" :
        "border";

    card.className = `bg-white p-4 rounded ${destaquePromocao} flex flex-col gap-2`;

    // Parte fixa do conteúdo
    card.innerHTML = `
        ${categoriaAtual === "promocoes" ? '<span class="text-yellow-600 font-bold text-sm">🔥 Promoção</span>' : ''}
        <input type="text" value="${item.nome || ''}" placeholder="Nome" class="p-2 border rounded nome">
        <textarea placeholder="Descrição" class="p-2 border rounded descricao">${item.descricao || ''}</textarea>
        <input type="number" value="${item.preco || 0}" step="0.01" class="p-2 border rounded preco">
        <input type="text" value="${item.imagem || ''}" placeholder="URL da Imagem" class="p-2 border rounded imagem">
        <img class="preview-img w-full h-32 object-cover rounded border ${item.imagem ? '' : 'hidden'}" src="${item.imagem || ''}">
    `;

    // Label e select do tipo (doce/salgado)
    const tipoLabel = document.createElement("label");
    tipoLabel.className = "text-sm text-gray-700";
    tipoLabel.textContent = "Tipo (Doce ou Salgado)";
    card.appendChild(tipoLabel);

    const selectTipo = document.createElement("select");
    selectTipo.className = "p-2 border rounded tipo";
    selectTipo.innerHTML = `
        <option value="salgado">Salgado</option>
        <option value="doce">Doce</option>
    `;
    selectTipo.value = item.tipo || "salgado";
    card.appendChild(selectTipo);

    // Checkbox ativo e botões
    card.innerHTML += `
        <label class="flex items-center gap-2 text-sm text-gray-700 mt-2">
            <input type="checkbox" class="ativo" ${item.ativo ? 'checked' : ''}> Ativo
        </label>
        <div class="flex justify-between gap-2 mt-2">
            <button class="salvar bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 w-full">Salvar</button>
            <button class="excluir bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 w-full">Excluir</button>
        </div>
    `;

    // --- Nova seção para Mover Item ---
    const moveSection = document.createElement("div");
    moveSection.className = "mt-4 pt-4 border-t border-gray-200 flex flex-col gap-2";
    moveSection.innerHTML = `
        <label class="text-sm text-gray-700">Mover para categoria:</label>
        <select class="p-2 border rounded move-category-select">
            <option value="">-- Selecione --</option>
            <option value="pizzas">Pizzas</option>
            <option value="bebidas">Bebidas</option>
            <option value="esfirras">Esfirras</option>
            <option value="calzone">Calzones</option>
            <option value="promocoes">🔥 Promoções</option>
            <option value="novidades">✨ Novidades</option>
        </select>
        <button class="move-item-btn bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 w-full">Mover Item</button>
    `;
    card.appendChild(moveSection);
    // --- Fim da nova seção ---


    // Preview da imagem
    const inputImagem = card.querySelector(".imagem");
    const previewImg = card.querySelector(".preview-img");

    inputImagem.addEventListener("input", () => {
        if (inputImagem.value.trim() !== "") {
            previewImg.src = inputImagem.value;
            previewImg.classList.remove("hidden");
        } else {
            previewImg.classList.add("hidden");
        }
    });

    // Botão salvar
    card.querySelector(".salvar").addEventListener("click", function() {
        const nome = card.querySelector(".nome").value;
        const descricao = card.querySelector(".descricao").value;
        const preco = parseFloat(card.querySelector(".preco").value);
        const imagem = inputImagem.value;
        const ativo = card.querySelector(".ativo").checked;
        const tipo = card.querySelector(".tipo").value;

        database.ref(`produtos/${categoriaAtual}/${key}`).update({
            nome,
            descricao,
            preco,
            imagem,
            ativo,
            tipo
        }, function(error) {
            alert(error ? "Erro ao salvar!" : "Item atualizado com sucesso!");
        });
    });

    // Botão excluir
    card.querySelector(".excluir").addEventListener("click", function() {
        if (confirm("Tem certeza que deseja excluir este item?")) {
            database.ref(`produtos/${categoriaAtual}/${key}`).remove(() => {
                card.remove();
                alert("Item excluído com sucesso!");
            });
        }
    });

    // Event listener para o botão Mover Item
    card.querySelector(".move-item-btn").addEventListener("click", function() {
        const targetCategorySelect = card.querySelector(".move-category-select");
        const targetCategory = targetCategorySelect.value;

        if (!targetCategory) {
            alert("Por favor, selecione uma categoria de destino para mover o item.");
            return;
        }
        if (targetCategory === categoriaAtual) {
            alert("O item já está nesta categoria.");
            return;
        }

        // Confirmação antes de mover
        if (confirm(`Tem certeza que deseja mover "${item.nome || item.titulo}" de "${categoriaAtual}" para "${targetCategory}"?`)) {
            // Reconstroi o objeto do item com os valores atuais do formulário
            const updatedItemData = {
                nome: card.querySelector(".nome").value,
                descricao: card.querySelector(".descricao").value,
                preco: parseFloat(card.querySelector(".preco").value),
                imagem: card.querySelector(".imagem").value,
                ativo: card.querySelector(".ativo").checked,
                tipo: card.querySelector(".tipo").value
            };
            moverItemParaCategoria(key, categoriaAtual, targetCategory, updatedItemData);
        }
    });

    return card;
}

/**
 * Move um item de uma categoria para outra no Firebase.
 * @param {string} itemKey A chave (ID) do item na categoria de origem.
 * @param {string} categoriaOrigem A categoria atual do item (ex: 'pizzas').
 * @param {string} categoriaDestino A categoria para a qual o item será movido (ex: 'promocoes').
 * @param {object} itemData Os dados completos do item a ser movido.
 */
function moverItemParaCategoria(itemKey, categoriaOrigem, categoriaDestino, itemData) {
    // 1. Adicionar o item à nova categoria
    database.ref(`produtos/${categoriaDestino}`).push(itemData)
        .then(() => {
            // 2. Remover o item da categoria original
            return database.ref(`produtos/${categoriaOrigem}/${itemKey}`).remove();
        })
        .then(() => {
            alert(`Item "${itemData.nome || itemData.titulo}" movido com sucesso de "${categoriaOrigem}" para "${categoriaDestino}"!`);
            // Recarregar a lista de itens na categoria atual para refletir a mudança
            carregarItensCardapio(categoriaOrigem, searchInput.value);
        })
        .catch(error => {
            console.error('Erro ao mover item:', error);
            alert('Erro ao mover item. Verifique o console para detalhes.');
        });
}


// Mostra o modal de novo item
function mostrarNovoitem() {
    document.getElementById("modal-novo-item").classList.remove("hidden");
    document.getElementById("modal-novo-item").classList.add("flex");
}

// Fecha o modal de novo item
document.getElementById("btn-fechar-novo-item").addEventListener("click", () => {
    document.getElementById("modal-novo-item").classList.add("hidden");
});

// Preview da imagem digitada no modal de novo item
document.getElementById("novo-imagem").addEventListener("input", () => {
    const url = document.getElementById("novo-imagem").value.trim();
    const preview = document.getElementById("preview-nova-imagem");

    if (url) {
        preview.src = url;
        preview.classList.remove("hidden");
    } else {
        preview.classList.add("hidden");
    }
});

// Salvar novo item no Firebase
document.getElementById("btn-salvar-novo-item").addEventListener("click", () => {
    const nome = document.getElementById("novo-nome").value.trim();
    const descricao = document.getElementById("novo-descricao").value.trim();
    const preco = parseFloat(document.getElementById("novo-preco").value);
    const imagem = document.getElementById("novo-imagem").value.trim();
    const ativo = document.getElementById("novo-ativo").checked;
    const categoria = document.getElementById("categoria-select").value; // Pega a categoria selecionada
    const tipo = document.getElementById("novo-tipo").value;

    if (!categoria) {
        alert("Selecione uma categoria para salvar o item.");
        return;
    }

    if (!nome || isNaN(preco)) {
        alert("Preencha o nome e o preço corretamente.");
        return;
    }

    const novoItem = { nome, descricao, preco, imagem, ativo, tipo };

    database.ref(`produtos/${categoria}`).push(novoItem, (error) => {
        if (error) {
            alert("Erro ao adicionar item!");
        } else {
            alert("Item adicionado com sucesso!");
            document.getElementById("modal-novo-item").classList.add("hidden");
            carregarItensCardapio(categoria, searchInput.value); // Recarrega com a categoria e pesquisa atual
            limparFormularioNovoItem();
        }
    });
});

// Limpar campos após salvar
function limparFormularioNovoItem() {
    document.getElementById("novo-nome").value = "";
    document.getElementById("novo-descricao").value = "";
    document.getElementById("novo-preco").value = "";
    document.getElementById("novo-imagem").value = "";
    document.getElementById("preview-nova-imagem").classList.add("hidden");
    document.getElementById("novo-ativo").checked = true;
    document.getElementById("novo-tipo").value = "salgado"; // reseta para padrão
}

// Salva os horários no Realtime Database (versão compat)
function salvarHorariosNoFirebase(horarios) {
    const db = firebase.database();
    db.ref('config/horarios')
        .set(horarios)
        .then(() => console.log("Horários salvos com sucesso!"))
        .catch((error) => console.error("Erro ao salvar horários:", error));
}

// Verifica se está aberto agora
function checkRestaurantOpen(horarios) {
    const agora = new Date();
    const diaSemana = agora.getDay(); // 0 = domingo
    const horaAtual = agora.getHours();

    const configDia = horarios[diaSemana];
    if (!configDia || !configDia.aberto) return false;

    return horaAtual >= configDia.inicio && horaAtual < configDia.fim;
}

document.addEventListener("DOMContentLoaded", () => {
    const db = firebase.database();

    // Renderiza os campos de cada dia
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const container = document.getElementById("dias-container");

    // Verifica se o container existe antes de tentar preencher
    if (container) {
        dias.forEach((dia, i) => {
            const linha = document.createElement("div");
            linha.className = "flex items-center gap-4 border-b pb-3";

            linha.innerHTML = `
                <label class="w-28 font-semibold">${dia}</label>
                <label class="flex items-center gap-2">
                    <input type="checkbox" name="aberto-${i}" />
                    Aberto
                </label>
                <input type="number" name="inicio-${i}" min="0" max="23" value="18" class="border p-1 w-16" />
                <span>às</span>
                <input type="number" name="fim-${i}" min="0" max="23" value="23" class="border p-1 w-16" />
            `;

            container.appendChild(linha);
        });
    }

    // Carrega os horários salvos do Firebase e preenche o formulário
    db.ref('config/horarios').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const horariosSalvos = snapshot.val();
                for (let i = 0; i <= 6; i++) {
                    const diaConfig = horariosSalvos[i];
                    if (diaConfig) {
                        document.querySelector(`[name="aberto-${i}"]`).checked = diaConfig.aberto;
                        document.querySelector(`[name="inicio-${i}"]`).value = diaConfig.inicio;
                        document.querySelector(`[name="fim-${i}"]`).value = diaConfig.fim;
                    }
                }
            }
        })
        .catch(error => console.error("Erro ao carregar horários do Firebase:", error));


    // Ao enviar o formulário
    const form = document.getElementById("horario-form");
    if (form) { // Verifica se o formulário existe
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const horarios = {};
            for (let i = 0; i <= 6; i++) {
                const aberto = document.querySelector(`[name="aberto-${i}"]`).checked;
                const inicio = parseInt(document.querySelector(`[name="inicio-${i}"]`).value);
                const fim = parseInt(document.querySelector(`[name="fim-${i}"]`).value);

                // Validação básica de horários
                if (aberto && (isNaN(inicio) || isNaN(fim) || inicio < 0 || inicio > 23 || fim < 0 || fim > 23 || inicio >= fim)) {
                    alert(`Por favor, verifique os horários de ${dias[i]}.`);
                    return; // Impede o salvamento se houver erro
                }
                horarios[i] = { aberto, inicio, fim };
            }

            salvarHorariosNoFirebase(horarios);
        });
    }

    // Verifica se está aberto agora e mostra status
    db.ref('config/horarios').on('value', // Use 'on' para atualização em tempo real
        snapshot => {
            const statusElement = document.getElementById("status");
            if (snapshot.exists()) {
                const horarios = snapshot.val();
                const status = checkRestaurantOpen(horarios);
                if (statusElement) {
                    statusElement.innerText = status ? "✅ Aberto agora" : "❌ Fechado agora";
                }
            } else {
                console.log("Nenhuma configuração de horários encontrada.");
                if (statusElement) {
                    statusElement.innerText = "Horários não configurados.";
                }
            }
        });
});

// Hamburguer menu functionality
menuButton.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
});

closeSidebarButton.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

overlay.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});