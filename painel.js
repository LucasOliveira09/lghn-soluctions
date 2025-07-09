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
// Nova referência para as mesas
const mesasRef = database.ref('mesas');

const pedidosAtivosContainer = document.getElementById('pedidos-ativos-container');
const pedidosFinalizadosContainer = document.getElementById('pedidos-finalizados-container');

const inputDataInicio = document.getElementById('data-inicio');
const inputDataFim = document.getElementById('data-fim');
const btnFiltrar = document.getElementById('btn-filtrar');

const totalPedidosEl = document.getElementById('total-pedidos');
const totalVendidoEl = document.getElementById('total-vendido');

// Botões do menu principal
const btnAtivos = document.getElementById('btn-ativos');
const btnFinalizados = document.getElementById('btn-finalizados');
const btnEditarCardapio = document.getElementById('btn-editar-cardapio');
const btnEditarHorario = document.getElementById('btn-editar-horario');
const btnGerenciarMesas = document.getElementById('btn-gerenciar-mesas'); // Renomeado
const btnConfiguracoesGerais = document.getElementById('btn-configuracoes-gerais');
const btnRelatorios = document.getElementById('btn-relatorios');

// Abas (seções)
const abaAtivos = document.getElementById('aba-ativos');
const abaFinalizados = document.getElementById('aba-finalizados');
const EditarCardapio = document.getElementById('editar-cardapio');
const editarHorario = document.getElementById('editar-horario');
const abaGerenciarMesas = document.getElementById('aba-gerenciar-mesas'); // Renomeado
const abaConfiguracoesGerais = document.getElementById('aba-configuracoes-gerais');
const abaRelatorios = document.getElementById('aba-relatorios');

const produtosRef = database.ref('produtos');
const searchInput = document.getElementById('search-input');
const categoriaSelect = document.getElementById('categoria-select');

// Elementos do menu hamburguer
const menuButton = document.getElementById('menu-button');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeSidebarButton = document.getElementById('close-sidebar-button');

// Elementos para relatórios (mantidos como estão)
const relatorioDataInicio = document.getElementById('relatorio-data-inicio');
const relatorioDataFim = document.getElementById('relatorio-data-fim');
const btnGerarRelatorios = document.getElementById('btn-gerar-relatorios');
const topProdutosSummary = document.getElementById('top-produtos-summary');
const topProdutosChartCanvas = document.getElementById('top-produtos-chart');
const vendasPorDiaSummary = document.getElementById('vendas-por-dia-summary');
const vendasPorDiaChartCanvas = document.getElementById('vendas-por-dia-chart');
const horariosPicoSummary = document.getElementById('horarios-pico-summary');
const horariosPicoChartCanvas = document.getElementById('horarios-pico-chart');
const metodosPagamentoSummary = document.getElementById('metodos-pagamento-summary');
const metodosPagamentoChartCanvas = document.getElementById('metodos-pagamento-chart');
const btnUltimos7Dias = document.getElementById('btn-ultimos-7-dias');
const btnUltimoMes = document.getElementById('btn-ultimo-mes');
const btnUltimos3Meses = document.getElementById('btn-ultimos-3-meses');
const btnHoje = document.getElementById('btn-hoje');
let topProdutosChartInstance = null;
let vendasPorDiaChartInstance = null;
let horariosPicoChartInstance = null;
let metodosPagamentoChartInstance = null;


// NOVOS ELEMENTOS para Gerenciamento de Mesas
const numMesasInput = document.getElementById('num-mesas');
const btnConfigurarMesas = document.getElementById('btn-configurar-mesas');
const mesasContainer = document.getElementById('mesas-container');
const modalMesaDetalhes = document.getElementById('modal-mesa-detalhes');
const modalMesaNumero = document.getElementById('modal-mesa-numero');
const mesaDetalhesInfo = document.getElementById('mesa-detalhes-info');
const mesaDetalhesStatus = document.getElementById('mesa-detalhes-status');
const mesaDetalhesCliente = document.getElementById('mesa-detalhes-cliente');
const mesaDetalhesGarcom = document.getElementById('mesa-detalhes-garcom');
const mesaDetalhesObs = document.getElementById('mesa-detalhes-obs');
const mesaDetalhesTotal = document.getElementById('mesa-detalhes-total');
const mesaDetalhesItens = document.getElementById('mesa-detalhes-itens');
const pagamentoCheckout = document.getElementById('pagamento-checkout');
const trocoCheckoutGroup = document.getElementById('troco-checkout-group');
const trocoCheckoutInput = document.getElementById('troco-checkout');
const btnCancelarMesa = document.getElementById('btn-cancelar-mesa');
const btnFecharMesa = document.getElementById('btn-fechar-mesa');

let currentEditingTableId = null; // Armazena a ID da mesa atualmente sendo editada/vista


let pedidosOnline = {}; // Renomeado para evitar conflito com 'pedidos' de mesas
let totalPedidosAnteriores = 0;

pedidosRef.on('value', (snapshot) => {
    pedidosOnline = {}; // Atribui a pedidosOnline
    snapshot.forEach((child) => {
        pedidosOnline[child.key] = child.val();
    });

    renderizarPedidos();
    aplicarFiltroDatas();

    const totalPedidosAtual = Object.keys(pedidosOnline).length;
    if (totalPedidosAtual > totalPedidosAnteriores) {
        tocarNotificacao();
    }
    totalPedidosAnteriores = totalPedidosAtual;
});

// Listener para as mesas no Firebase (para manter o estado atualizado)
mesasRef.on('value', (snapshot) => {
    const mesasData = snapshot.val() || {};
    renderMesas(mesasData);
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

    // Filtra apenas pedidos online
    Object.entries(pedidosOnline).forEach(([pedidoId, pedido]) => {
        // Assume que pedidos de mesa terão um campo 'tipoAtendimento: "Mesa"'
        if (pedido.status !== 'Finalizado' && pedido.status !== 'Recusado' && pedido.tipoAtendimento !== 'Mesa') {
            const pedidoDiv = document.createElement('div');
            pedidoDiv.className = 'bg-white p-4 rounded shadow mb-4';
            pedidoDiv.innerHTML = gerarHtmlPedido(pedido, pedidoId);
            pedidosAtivosContainer.appendChild(pedidoDiv);
        }
    });
}

function aplicarFiltroDatas() {
    pedidosFinalizadosContainer.innerHTML = '';

    let dataInicioTimestamp = inputDataInicio.value ? new Date(inputDataInicio.value).setHours(0, 0, 0, 0) : null;
    let dataFimTimestamp = inputDataFim.value ? new Date(inputDataFim.value).setHours(23, 59, 59, 999) : null;

    let pedidosFiltrados = Object.entries(pedidosOnline).filter(([id, pedido]) => {
        if (pedido.status !== 'Finalizado' || !pedido.timestamp || pedido.tipoAtendimento === 'Mesa') return false; // Exclui pedidos de mesa

        const ts = pedido.timestamp;

        if (dataInicioTimestamp && ts < dataInicioTimestamp) return false;
        if (dataFimTimestamp && ts > dataFimTimestamp) return false;

        return true;
    });

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

// Funções de Pedido (aceitar, saiu para entrega, finalizar, recusar) - Mantidas as originais pois são para delivery/online
// Você precisará de funções separadas para as mesas se o fluxo for diferente (ex: "abrir mesa", "adicionar item à mesa", "fechar conta da mesa")
function aceitarPedido(pedidoId) {
    database.ref('pedidos/' + pedidoId).once('value')
        .then(snapshot => {
            const pedido = snapshot.val();
            if (!pedido.telefone) {
                alert('Não foi possível encontrar o telefone do cliente.');
                console.error('Erro: Telefone do cliente não encontrado no pedido.');
                return;
            }
            database.ref('pedidos/' + pedidoId).update({ status: 'Aceito' });
            const itensPedido = pedido.cart.map(item => `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}`).join('\n');
            const enderecoTexto = pedido.tipoEntrega === 'Entrega' ? `${pedido.endereco.rua}, ${pedido.endereco.numero} - ${pedido.endereco.bairro}` : 'Retirada no local';
            const trocoPara = pedido.dinheiroTotal ? parseFloat(pedido.dinheiroTotal) : 0;
            const trocoTexto = trocoPara > 0 ? `Troco para: R$ ${trocoPara.toFixed(2)}` : 'Sem troco';
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
            window.open(`https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`, '_blank');
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
        window.open(`https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`, '_blank');
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
        window.open(`https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`, '_blank');
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

function ativaAba(ativa, ...inativas) {
    ativa.classList.remove('hidden');
    inativas.forEach(aba => aba.classList.add('hidden'));
}

function estilizaBotaoAtivo(botaoAtivo, ...inativos) {
    botaoAtivo.classList.add('bg-blue-600', 'text-white');
    botaoAtivo.classList.remove('bg-blue-700');

    inativos.forEach(botao => {
        botao.classList.remove('bg-blue-600', 'text-white');
        botao.classList.add('bg-blue-700');
    });
}

// Event Listeners para os botões do menu hamburguer
btnAtivos.addEventListener('click', () => {
    ativaAba(abaAtivos, abaFinalizados, EditarCardapio, editarHorario, abaGerenciarMesas, abaConfiguracoesGerais, abaRelatorios);
    estilizaBotaoAtivo(btnAtivos, btnFinalizados, btnEditarCardapio, btnEditarHorario, btnGerenciarMesas, btnConfiguracoesGerais, btnRelatorios);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

btnFinalizados.addEventListener('click', () => {
    ativaAba(abaFinalizados, abaAtivos, EditarCardapio, editarHorario, abaGerenciarMesas, abaConfiguracoesGerais, abaRelatorios);
    estilizaBotaoAtivo(btnFinalizados, btnAtivos, btnEditarCardapio, btnEditarHorario, btnGerenciarMesas, btnConfiguracoesGerais, btnRelatorios);

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
    ativaAba(EditarCardapio, abaFinalizados, abaAtivos, editarHorario, abaGerenciarMesas, abaConfiguracoesGerais, abaRelatorios);
    estilizaBotaoAtivo(btnEditarCardapio, btnAtivos, btnFinalizados, btnEditarHorario, btnGerenciarMesas, btnConfiguracoesGerais, btnRelatorios);
    carregarItensCardapio(categoriaSelect.value, searchInput.value);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

btnEditarHorario.addEventListener('click', () => {
    ativaAba(editarHorario, abaFinalizados, abaAtivos, EditarCardapio, abaGerenciarMesas, abaConfiguracoesGerais, abaRelatorios);
    estilizaBotaoAtivo(btnEditarHorario, btnAtivos, btnFinalizados, btnEditarCardapio, btnGerenciarMesas, btnConfiguracoesGerais, btnRelatorios);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

// Novo Event Listener para o botão Gerenciar Mesas
btnGerenciarMesas.addEventListener('click', () => {
    ativaAba(abaGerenciarMesas, abaAtivos, abaFinalizados, EditarCardapio, editarHorario, abaConfiguracoesGerais, abaRelatorios);
    estilizaBotaoAtivo(btnGerenciarMesas, btnAtivos, btnFinalizados, btnEditarCardapio, btnEditarHorario, btnConfiguracoesGerais, btnRelatorios);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
    carregarMesasDoFirebase(); // Carrega as mesas quando a aba é ativada
});


btnConfiguracoesGerais.addEventListener('click', () => {
    ativaAba(abaConfiguracoesGerais, abaAtivos, abaFinalizados, EditarCardapio, editarHorario, abaGerenciarMesas, abaRelatorios);
    estilizaBotaoAtivo(btnConfiguracoesGerais, btnAtivos, btnFinalizados, btnEditarCardapio, btnEditarHorario, btnGerenciarMesas, btnRelatorios);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
});

// --- FUNÇÕES DE RELATÓRIOS ---

function setRelatorioDateRange(daysAgoStart = 0, daysAgoEnd = 0, monthsAgo = 0) {
    const today = new Date();
    let startDate = new Date(today);
    let endDate = new Date(today);

    if (monthsAgo > 0) {
        if (monthsAgo === 1) {
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        } else if (monthsAgo === 3) {
            startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        }
    } else {
        startDate.setDate(today.getDate() - daysAgoStart);
        endDate.setDate(today.getDate() - daysAgoEnd);
    }

    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    };

    relatorioDataInicio.value = formatDate(startDate);
    relatorioDataFim.value = formatDate(endDate);

    gerarRelatorios();
}

btnHoje.addEventListener('click', () => {
    setRelatorioDateRange(0, 0);
});

btnUltimos7Dias.addEventListener('click', () => {
    setRelatorioDateRange(6, 0);
});

btnUltimoMes.addEventListener('click', () => {
    setRelatorioDateRange(0, 0, 1);
});

btnUltimos3Meses.addEventListener('click', () => {
    setRelatorioDateRange(0, 0, 3);
});


btnRelatorios.addEventListener('click', () => {
    ativaAba(abaRelatorios, abaAtivos, abaFinalizados, EditarCardapio, editarHorario, abaGerenciarMesas, abaConfiguracoesGerais);
    estilizaBotaoAtivo(btnRelatorios, btnAtivos, btnFinalizados, btnEditarCardapio, btnEditarHorario, btnGerenciarMesas, btnConfiguracoesGerais);
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');

    setRelatorioDateRange(6, 0);
});


function gerarRelatorios() {
    const inicio = relatorioDataInicio.value;
    const fim = relatorioDataFim.value;

    if (!inicio || !fim) {
        alert("Por favor, selecione as datas de início e fim para gerar os relatórios.");
        return;
    }

    const dataInicioTimestamp = new Date(inicio).setHours(0, 0, 0, 0);
    const dataFimTimestamp = new Date(fim).setHours(23, 59, 59, 999);

    if (dataInicioTimestamp > dataFimTimestamp) {
        alert("A data de início não pode ser posterior à data de fim.");
        return;
    }

    if (topProdutosChartInstance) topProdutosChartInstance.destroy();
    if (vendasPorDiaChartInstance) vendasPorDiaChartInstance.destroy();
    if (horariosPicoChartInstance) horariosPicoChartInstance.destroy();
    if (metodosPagamentoChartInstance) metodosPagamentoChartInstance.destroy();

    topProdutosSummary.innerHTML = '<p class="text-gray-600">Carregando...</p>';
    vendasPorDiaSummary.innerHTML = '<p class="text-gray-600">Carregando...</p>';
    horariosPicoSummary.innerHTML = '<p class="text-gray-600">Carregando...</p>';
    metodosPagamentoSummary.innerHTML = '<p class="text-gray-600">Carregando...</p>';

    topProdutosChartCanvas.style.display = 'none';
    vendasPorDiaChartCanvas.style.display = 'none';
    horariosPicoChartCanvas.style.display = 'none';
    metodosPagamentoChartCanvas.style.display = 'none';


    database.ref('pedidos').orderByChild('timestamp').once('value', (snapshot) => {
        const pedidosNoPeriodo = [];
        snapshot.forEach(childSnapshot => {
            const pedido = childSnapshot.val();
            if (pedido.status === 'Finalizado' && pedido.timestamp >= dataInicioTimestamp && pedido.timestamp <= dataFimTimestamp) {
                pedidosNoPeriodo.push(pedido);
            }
        });

        if (pedidosNoPeriodo.length === 0) {
            topProdutosSummary.innerHTML = '<p class="text-gray-600">Nenhum pedido finalizado no período selecionado.</p>';
            vendasPorDiaSummary.innerHTML = '<p class="text-gray-600">Nenhum pedido finalizado no período selecionado.</p>';
            horariosPicoSummary.innerHTML = '<p class="text-gray-600">Nenhum pedido finalizado no período selecionado.</p>';
            metodosPagamentoSummary.innerHTML = '<p class="text-gray-600">Nenhum pedido finalizado no período selecionado.</p>';

            topProdutosChartCanvas.style.display = 'none';
            vendasPorDiaChartCanvas.style.display = 'none';
            horariosPicoChartCanvas.style.display = 'none';
            metodosPagamentoChartCanvas.style.display = 'none';
            return;
        }

        analisarProdutosMaisVendidos(pedidosNoPeriodo);
        analisarVendasPorDiaDaSemana(pedidosNoPeriodo);
        analisarHorariosDePico(pedidosNoPeriodo);
        analisarMetodosDePagamento(pedidosNoPeriodo);
    }, (error) => {
        console.error("Erro ao carregar pedidos para relatórios:", error);
        topProdutosSummary.innerHTML = '<p class="text-red-600">Erro ao carregar dados.</p>';
        vendasPorDiaSummary.innerHTML = '<p class="text-red-600">Erro ao carregar dados.</p>';
        horariosPicoSummary.innerHTML = '<p class="text-red-600">Erro ao carregar dados.</p>';
        metodosPagamentoSummary.innerHTML = '<p class="text-red-600">Erro ao carregar dados.</p>';

        topProdutosChartCanvas.style.display = 'none';
        vendasPorDiaChartCanvas.style.display = 'none';
        horariosPicoChartCanvas.style.display = 'none';
        metodosPagamentoChartCanvas.style.display = 'none';
    });
}

function analisarProdutosMaisVendidos(pedidos) {
    const contagemProdutos = {};

    pedidos.forEach(pedido => {
        if (pedido.cart && Array.isArray(pedido.cart)) {
            pedido.cart.forEach(item => {
                const nomeProduto = item.name;
                const quantidade = item.quantity;
                contagemProdutos[nomeProduto] = (contagemProdutos[nomeProduto] || 0) + quantidade;
            });
        }
    });

    const produtosOrdenados = Object.entries(contagemProdutos)
        .sort(([, qtdA], [, qtdB]) => qtdB - qtdA)
        .slice(0, 5); // Pegar os 5 mais vendidos

    topProdutosSummary.innerHTML = '';
    if (produtosOrdenados.length > 0) {
        topProdutosChartCanvas.style.display = 'block';
        const labels = produtosOrdenados.map(item => item[0]);
        const data = produtosOrdenados.map(item => item[1]);

        topProdutosChartInstance = new Chart(topProdutosChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Unidades Vendidas',
                    data: data,
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 99, 132, 0.8)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.raw + ' unidades';
                            }
                        }
                    }
                }
            }
        });

        topProdutosSummary.innerHTML = `<p>Os 5 produtos mais vendidos totalizaram **${data.reduce((a, b) => a + b, 0)} unidades**.</p>`;
    } else {
        topProdutosSummary.innerHTML = '<p class="text-gray-600">Nenhum produto vendido no período.</p>';
        topProdutosChartCanvas.style.display = 'none';
    }
}

function analisarVendasPorDiaDaSemana(pedidos) {
    const vendasPorDia = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0
    };
    const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    pedidos.forEach(pedido => {
        const data = new Date(pedido.timestamp);
        const diaSemana = data.getDay();
        vendasPorDia[diaSemana] = (vendasPorDia[diaSemana] || 0) + 1;
    });

    const diasParaGrafico = nomesDias.map((name, index) => ({
        day: name,
        count: vendasPorDia[index] || 0
    }));

    const diasOrdenadosParaResumo = Object.entries(vendasPorDia)
        .filter(([, count]) => count > 0)
        .sort(([, countA], [, countB]) => countB - countA);

    vendasPorDiaSummary.innerHTML = '';
    if (diasParaGrafico.some(d => d.count > 0)) {
        vendasPorDiaChartCanvas.style.display = 'block';
        const labels = diasParaGrafico.map(item => item.day);
        const data = diasParaGrafico.map(item => item.count);

        vendasPorDiaChartInstance = new Chart(vendasPorDiaChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pedidos',
                    data: data,
                    backgroundColor: 'rgba(153, 102, 255, 0.8)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.raw + ' pedidos';
                            }
                        }
                    }
                }
            }
        });

        if (diasOrdenadosParaResumo.length > 0) {
            const topDay = nomesDias[parseInt(diasOrdenadosParaResumo[0][0])];
            const topCount = diasOrdenadosParaResumo[0][1];
            vendasPorDiaSummary.innerHTML = `<p>O dia com mais vendas foi **${topDay}** com **${topCount} pedidos**.</p>`;
        } else {
            vendasPorDiaSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de vendas por dia.</p>';
        }

    } else {
        vendasPorDiaSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de vendas por dia.</p>';
        vendasPorDiaChartCanvas.style.display = 'none';
    }
}

function analisarHorariosDePico(pedidos) {
    const pedidosPorHora = {};
    for (let i = 0; i < 24; i++) {
        pedidosPorHora[i] = 0;
    }

    pedidos.forEach(pedido => {
        const data = new Date(pedido.timestamp);
        const hora = data.getHours();
        pedidosPorHora[hora] = (pedidosPorHora[hora] || 0) + 1;
    });

    const horariosOrdenados = Object.entries(pedidosPorHora)
        .sort(([horaA, ], [horaB, ]) => parseInt(horaA) - parseInt(horaB));

    horariosPicoSummary.innerHTML = '';
    if (horariosOrdenados.some(h => h[1] > 0)) {
        horariosPicoChartCanvas.style.display = 'block';
        const labels = horariosOrdenados.map(item => `${item[0]}h`);
        const data = horariosOrdenados.map(item => item[1]);

        horariosPicoChartInstance = new Chart(horariosPicoChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pedidos',
                    data: data,
                    backgroundColor: 'rgba(255, 159, 64, 0.8)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(255, 159, 64, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: false
                        },
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.raw + ' pedidos';
                            }
                        }
                    }
                }
            }
        });

        const topHorario = horariosOrdenados.reduce((prev, current) => (prev[1] > current[1] ? prev : current), ["0", 0]);
        if (topHorario[1] > 0) {
            horariosPicoSummary.innerHTML = `<p>O horário de pico foi entre **${topHorario[0]}h e ${parseInt(topHorario[0]) + 1}h** com **${topHorario[1]} pedidos**.</p>`;
        } else {
            horariosPicoSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de horário de pico.</p>';
        }

    } else {
        horariosPicoSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de horário de pico.</p>';
        horariosPicoChartCanvas.style.display = 'none';
    }
}

function analisarMetodosDePagamento(pedidos) {
    const contagemMetodos = {};

    pedidos.forEach(pedido => {
        const metodo = pedido.pagamento || 'Desconhecido';
        contagemMetodos[metodo] = (contagemMetodos[metodo] || 0) + 1;
    });

    const metodosOrdenados = Object.entries(contagemMetodos)
        .sort(([, qtdA], [, qtdB]) => qtdB - qtdA);

    metodosPagamentoSummary.innerHTML = '';
    if (metodosOrdenados.length > 0) {
        metodosPagamentoChartCanvas.style.display = 'block';
        const labels = metodosOrdenados.map(item => item[0]);
        const data = metodosOrdenados.map(item => item[1]);

        metodosPagamentoChartInstance = new Chart(metodosPagamentoChartCanvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 20,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1) + '%';
                                    label += context.parsed + ' pedidos (' + percentage + ')';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        metodosPagamentoSummary.innerHTML = `<p>O método de pagamento mais usado é **${labels[0]}**.</p>`;
    } else {
        metodosPagamentoSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de método de pagamento.</p>';
        metodosPagamentoChartCanvas.style.display = 'none';
    }
}

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
    pedidosRef.on('value', function(snapshot) {
        var status = snapshot.val();
    });
}

const imagemUrlInput = document.getElementById('imagemUrl');
const imagemPreview = document.getElementById('imagemPreview');

if (imagemUrlInput && imagemPreview) {
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

document.getElementById('promoForm')?.addEventListener('submit', function(e) {
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

    document.getElementById('btn-salvar-pedido').onclick = salvarPedidoEditado;
}

document.getElementById('btn-adicionar-item')?.addEventListener('click', () => {
    const nome = document.getElementById('novo-item-nome').value.trim();
    const preco = parseFloat(document.getElementById('novo-item-preco').value);
    const qtd = parseInt(document.getElementById('novo-item-quantidade').value, 10);

    if (!nome || isNaN(preco) || isNaN(qtd)) {
        return alert('Preencha todos os campos corretamente.');
    }

    pedidoOriginal.cart = pedidoOriginal.cart || [];
    pedidoOriginal.cart.push({ name: nome, price: preco, quantity: qtd });

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

    const novoTotalPedido = novosItens.reduce((sum, item) => sum + item.price * item.quantity, 0);

    database.ref('pedidos/' + pedidoEmEdicao).update({ cart: novosItens, totalPedido: novoTotalPedido })
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

btnEditarCardapio.addEventListener("click", () => {
    document.getElementById("aba-ativos").classList.add("hidden");
    document.getElementById("aba-finalizados").classList.add("hidden");
    document.getElementById("promocoes").classList.add("hidden");
    document.getElementById("editar-cardapio").classList.remove("hidden");

    carregarItensCardapio(categoriaSelect.value, searchInput.value);
});

categoriaSelect.addEventListener("change", (e) => {
    carregarItensCardapio(e.target.value, searchInput.value);
});

searchInput.addEventListener("input", () => {
    carregarItensCardapio(categoriaSelect.value, searchInput.value);
});

function carregarItensCardapio(categoria, searchQuery = '') {
    const container = document.getElementById("itens-cardapio-container");
    container.innerHTML = "Carregando...";

    const ref = database.ref(`produtos/${categoria}`);

    ref.once("value", function(snapshot) {
        container.innerHTML = "";
        let itemsToRender = [];

        snapshot.forEach(function(childSnapshot) {
            const item = childSnapshot.val();
            const key = childSnapshot.key;
            itemsToRender.push({ item, key });
        });

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
            const card = criarCardItem(item, key, categoria);
            container.appendChild(card);
        });
    });
}

function criarCardItem(item, key, categoriaAtual) {
    const card = document.createElement("div");

    const destaquePromocao = categoriaAtual === "promocoes" ?
        "border-yellow-500 border-2 shadow-lg" :
        "border";

    card.className = `bg-white p-4 rounded ${destaquePromocao} flex flex-col gap-2`;

    card.innerHTML = `
        ${categoriaAtual === "promocoes" ? '<span class="text-yellow-600 font-bold text-sm">🔥 Promoção</span>' : ''}
        <input type="text" value="${item.nome || ''}" placeholder="Nome" class="p-2 border rounded nome">
        <textarea placeholder="Descrição" class="p-2 border rounded descricao">${item.descricao || ''}</textarea>
        <input type="number" value="${item.preco || 0}" step="0.01" class="p-2 border rounded preco">
        <input type="text" value="${item.imagem || ''}" placeholder="URL da Imagem" class="p-2 border rounded imagem">
        <img class="preview-img w-full h-32 object-cover rounded border ${item.imagem ? '' : 'hidden'}" src="${item.imagem || ''}">
    `;

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

    card.innerHTML += `
        <label class="flex items-center gap-2 text-sm text-gray-700 mt-2">
            <input type="checkbox" class="ativo" ${item.ativo ? 'checked' : ''}> Ativo
        </label>
        <div class="flex justify-between gap-2 mt-2">
            <button class="salvar bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 w-full">Salvar</button>
            <button class="excluir bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 w-full">Excluir</button>
        </div>
    `;

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

    card.querySelector(".excluir").addEventListener("click", function() {
        if (confirm("Tem certeza que deseja excluir este item?")) {
            database.ref(`produtos/${categoriaAtual}/${key}`).remove(() => {
                card.remove();
                alert("Item excluído com sucesso!");
            });
        }
    });

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

        if (confirm(`Tem certeza que deseja mover "${item.nome || item.titulo}" de "${categoriaAtual}" para "${targetCategory}"?`)) {
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

function moverItemParaCategoria(itemKey, categoriaOrigem, categoriaDestino, itemData) {
    database.ref(`produtos/${categoriaDestino}`).push(itemData)
        .then(() => {
            return database.ref(`produtos/${categoriaOrigem}/${itemKey}`).remove();
        })
        .then(() => {
            alert(`Item "${itemData.nome || itemData.titulo}" movido com sucesso de "${categoriaOrigem}" para "${categoriaDestino}"!`);
            carregarItensCardapio(categoriaOrigem, searchInput.value);
        })
        .catch(error => {
            console.error('Erro ao mover item:', error);
            alert('Erro ao mover item. Verifique o console para detalhes.');
        });
}

function mostrarNovoitem() {
    document.getElementById("modal-novo-item").classList.remove("hidden");
    document.getElementById("modal-novo-item").classList.add("flex");
}

document.getElementById("btn-fechar-novo-item").addEventListener("click", () => {
    document.getElementById("modal-novo-item").classList.add("hidden");
});

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

document.getElementById("btn-salvar-novo-item").addEventListener("click", () => {
    const nome = document.getElementById("novo-nome").value.trim();
    const descricao = document.getElementById("novo-descricao").value.trim();
    const preco = parseFloat(document.getElementById("novo-preco").value);
    const imagem = document.getElementById("novo-imagem").value.trim();
    const ativo = document.getElementById("novo-ativo").checked;
    const categoria = document.getElementById("categoria-select").value;
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
            carregarItensCardapio(categoria, searchInput.value);
            limparFormularioNovoItem();
        }
    });
});

function limparFormularioNovoItem() {
    document.getElementById("novo-nome").value = "";
    document.getElementById("novo-descricao").value = "";
    document.getElementById("novo-preco").value = "";
    document.getElementById("novo-imagem").value = "";
    document.getElementById("preview-nova-imagem").classList.add("hidden");
    document.getElementById("novo-ativo").checked = true;
    document.getElementById("novo-tipo").value = "salgado";
}

function salvarHorariosNoFirebase(horarios) {
    const db = firebase.database();
    db.ref('config/horarios')
        .set(horarios)
        .then(() => console.log("Horários salvos com sucesso!"))
        .catch((error) => console.error("Erro ao salvar horários:", error));
}

function checkRestaurantOpen(horarios) {
    const agora = new Date();
    const diaSemana = agora.getDay();
    const horaAtual = agora.getHours();

    const configDia = horarios[diaSemana];
    if (!configDia || !configDia.aberto) return false;

    return horaAtual >= configDia.inicio && horaAtual < configDia.fim;
}

document.addEventListener("DOMContentLoaded", () => {
    const db = firebase.database();

    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const container = document.getElementById("dias-container");

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


    const form = document.getElementById("horario-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();

            const horarios = {};
            for (let i = 0; i <= 6; i++) {
                const aberto = document.querySelector(`[name="aberto-${i}"]`).checked;
                const inicio = parseInt(document.querySelector(`[name="inicio-${i}"]`).value);
                const fim = parseInt(document.querySelector(`[name="fim-${i}"]`).value);

                if (aberto && (isNaN(inicio) || isNaN(fim) || inicio < 0 || inicio > 23 || fim < 0 || fim > 23 || inicio >= fim)) {
                    alert(`Por favor, verifique os horários de ${dias[i]}.`);
                    return;
                }
                horarios[i] = { aberto, inicio, fim };
            }

            salvarHorariosNoFirebase(horarios);
        });
    }

    db.ref('config/horarios').on('value',
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


// --- FUNÇÕES DE GERENCIAMENTO DE MESAS ---

// Inicializa as mesas no Firebase se não existirem
btnConfigurarMesas.addEventListener('click', () => {
    const numMesas = parseInt(numMesasInput.value, 10);
    if (isNaN(numMesas) || numMesas < 1 || numMesas > 20) {
        alert("Por favor, insira um número de mesas válido entre 1 e 20.");
        return;
    }

    if (confirm(`Deseja configurar ${numMesas} mesas? Isso redefinirá o estado de todas as mesas existentes.`)) {
        // Remove todas as mesas existentes
        mesasRef.remove()
            .then(() => {
                const updates = {};
                for (let i = 1; i <= numMesas; i++) {
                    updates[i] = {
                        numero: i,
                        status: 'Livre', // Livre, Ocupada, Aguardando Pagamento
                        cliente: '',
                        garcom: '',
                        observacoes: '',
                        pedido: null, // Armazena os itens do pedido
                        total: 0,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    };
                }
                return mesasRef.update(updates);
            })
            .then(() => {
                alert(`${numMesas} mesas configuradas com sucesso!`);
            })
            .catch(error => {
                console.error("Erro ao configurar mesas:", error);
                alert("Erro ao configurar mesas. Verifique o console.");
            });
    }
});

// Renderiza as mesas no container
function renderMesas(mesasData) {
    mesasContainer.innerHTML = '';
    const sortedMesas = Object.values(mesasData).sort((a, b) => a.numero - b.numero); // Garante a ordem numérica

    sortedMesas.forEach(mesa => {
        const statusClass = mesa.status === 'Livre' ? 'table-status-free' : 'table-status-occupied';
        const card = document.createElement('div');
        card.className = `table-card bg-white p-4 rounded-lg shadow-md border-2 text-center flex flex-col items-center justify-center ${statusClass}`;
        card.dataset.mesaNumero = mesa.numero;

        let ocupiedInfo = '';
        if (mesa.status !== 'Livre' && mesa.cliente) {
            ocupiedInfo = `
                <p class="text-sm font-medium text-gray-700">Cliente: ${mesa.cliente}</p>
                <p class="text-sm text-gray-600">Garçom: ${mesa.garcom || 'N/A'}</p>
                <p class="text-md font-semibold text-blue-600 mt-1">Total: R$ ${mesa.total.toFixed(2)}</p>
            `;
        }

        card.innerHTML = `
            <i class="fas fa-utensils text-4xl mb-2 ${mesa.status === 'Livre' ? 'text-green-700' : 'text-red-700'}"></i>
            <h3 class="text-2xl font-bold mb-1">Mesa ${mesa.numero}</h3>
            <span class="text-sm font-semibold ${mesa.status === 'Livre' ? 'text-green-700' : 'text-red-700'}">${mesa.status}</span>
            ${ocupiedInfo}
        `;
        mesasContainer.appendChild(card);
    });

    // Adiciona event listeners para abrir o modal de detalhes da mesa
    document.querySelectorAll('.table-card').forEach(card => {
        card.addEventListener('click', () => abrirModalMesaDetalhes(card.dataset.mesaNumero));
    });
}

// Função para carregar as mesas do Firebase e renderizar
function carregarMesasDoFirebase() {
    mesasRef.once('value', (snapshot) => {
        const mesasData = snapshot.val() || {};
        // Se não houver mesas, configura um número padrão (ex: 10)
        if (Object.keys(mesasData).length === 0) {
            numMesasInput.value = 10; // Define o valor padrão para o input
            btnConfigurarMesas.click(); // Simula o clique para inicializar
        } else {
            // Se já existirem mesas, ajusta o input para o número de mesas existentes
            numMesasInput.value = Object.keys(mesasData).length;
            renderMesas(mesasData);
        }
    }, (error) => {
        console.error("Erro ao carregar mesas iniciais:", error);
        mesasContainer.innerHTML = '<p class="text-red-600">Erro ao carregar mesas.</p>';
    });
}


// Abre o modal de detalhes da mesa
function abrirModalMesaDetalhes(mesaNumero) {
    currentEditingTableId = mesaNumero; // Guarda a mesa que está sendo editada

    mesasRef.child(mesaNumero).once('value', (snapshot) => {
        const mesa = snapshot.val();
        if (!mesa) {
            alert('Mesa não encontrada.');
            return;
        }

        modalMesaNumero.textContent = mesa.numero;
        mesaDetalhesStatus.textContent = mesa.status;
        mesaDetalhesStatus.className = `font-semibold ${mesa.status === 'Livre' ? 'text-green-600' : 'text-red-600'}`;
        mesaDetalhesCliente.textContent = mesa.cliente || 'N/A';
        mesaDetalhesGarcom.textContent = mesa.garcom || 'N/A';
        mesaDetalhesObs.textContent = mesa.observacoes || 'N/A';
        mesaDetalhesTotal.textContent = `R$ ${mesa.total.toFixed(2)}`;

        mesaDetalhesItens.innerHTML = '';
        if (mesa.pedido && mesa.pedido.length > 0) {
            mesa.pedido.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'flex justify-between items-center bg-gray-50 p-2 rounded';
                itemDiv.innerHTML = `
                    <span>${item.quantity}x ${item.name}</span>
                    <span>R$ ${item.price.toFixed(2)}</span>
                `;
                mesaDetalhesItens.appendChild(itemDiv);
            });
        } else {
            mesaDetalhesItens.innerHTML = '<p class="text-gray-500">Nenhum item adicionado a esta mesa.</p>';
        }

        // Reseta o formulário de pagamento
        pagamentoCheckout.value = '';
        trocoCheckoutInput.value = '';
        trocoCheckoutGroup.classList.add('hidden');

        // Mostra/esconde botões com base no status da mesa
        if (mesa.status === 'Livre') {
            btnCancelarMesa.classList.add('hidden');
            btnFecharMesa.classList.add('hidden');
            // Futuramente: Botão para "Abrir Mesa / Iniciar Pedido"
        } else {
            btnCancelarMesa.classList.remove('hidden'); // Permitir cancelar pedido de mesa ocupada
            btnFecharMesa.classList.remove('hidden');
        }

        modalMesaDetalhes.classList.remove('hidden');
        modalMesaDetalhes.classList.add('flex');
    });
}

// Fecha o modal de detalhes da mesa
function fecharModalMesaDetalhes() {
    modalMesaDetalhes.classList.add('hidden');
    currentEditingTableId = null;
}

// Listener para o select de método de pagamento no modal
pagamentoCheckout.addEventListener('change', (event) => {
    if (event.target.value === 'Dinheiro') {
        trocoCheckoutGroup.classList.remove('hidden');
    } else {
        trocoCheckoutGroup.classList.add('hidden');
        trocoCheckoutInput.value = ''; // Limpa o troco se mudar de método
    }
});

// Botão "Cancelar Pedido" (libera a mesa e exclui o pedido associado)
btnCancelarMesa.addEventListener('click', () => {
    if (!currentEditingTableId) return;

    if (confirm(`Tem certeza que deseja cancelar o pedido da Mesa ${currentEditingTableId}? A mesa será liberada.`)) {
        mesasRef.child(currentEditingTableId).update({
            status: 'Livre',
            cliente: '',
            garcom: '',
            observacoes: '',
            pedido: null,
            total: 0
        })
        .then(() => {
            alert(`Pedido da Mesa ${currentEditingTableId} cancelado e mesa liberada.`);
            fecharModalMesaDetalhes();
        })
        .catch(error => {
            console.error("Erro ao cancelar pedido da mesa:", error);
            alert("Erro ao cancelar pedido da mesa.");
        });
    }
});

// Botão "Fechar Conta" (finaliza o pedido da mesa)
btnFecharMesa.addEventListener('click', () => {
    if (!currentEditingTableId) return;

    const metodoPagamento = pagamentoCheckout.value;
    const trocoPara = parseFloat(trocoCheckoutInput.value) || 0;

    if (!metodoPagamento) {
        alert("Selecione um método de pagamento.");
        return;
    }

    mesasRef.child(currentEditingTableId).once('value', (snapshot) => {
        const mesa = snapshot.val();
        if (!mesa || !mesa.pedido || mesa.pedido.length === 0) {
            alert('Não há pedido ativo para fechar nesta mesa.');
            return;
        }

        const totalPagar = mesa.total;
        if (metodoPagamento === 'Dinheiro' && trocoPara < totalPagar) {
            alert(`O valor do troco deve ser maior ou igual ao total do pedido (R$ ${totalPagar.toFixed(2)}).`);
            return;
        }

        if (confirm(`Confirmar fechamento da conta da Mesa ${mesa.numero} no valor de R$ ${totalPagar.toFixed(2)} (${metodoPagamento})?`)) {
            // Registra o pedido da mesa como um "pedido finalizado" no nó 'pedidos'
            const novoPedidoId = database.ref('pedidos').push().key; // Gera uma nova chave para o pedido finalizado
            const pedidoFinalizado = {
                tipoAtendimento: 'Mesa',
                mesaNumero: mesa.numero,
                cliente: mesa.cliente,
                garcom: mesa.garcom,
                observacoes: mesa.observacoes,
                cart: mesa.pedido, // Usa os itens do pedido da mesa
                totalPedido: mesa.total,
                pagamento: metodoPagamento,
                dinheiroTotal: metodoPagamento === 'Dinheiro' ? trocoPara : null,
                status: 'Finalizado',
                timestamp: firebase.database.ServerValue.TIMESTAMP // Usa timestamp do servidor
            };

            database.ref('pedidos/' + novoPedidoId).set(pedidoFinalizado)
                .then(() => {
                    // Após registrar, libera a mesa
                    return mesasRef.child(currentEditingTableId).update({
                        status: 'Livre',
                        cliente: '',
                        garcom: '',
                        observacoes: '',
                        pedido: null,
                        total: 0
                    });
                })
                .then(() => {
                    alert(`Conta da Mesa ${mesa.numero} fechada e mesa liberada!`);
                    fecharModalMesaDetalhes();
                })
                .catch(error => {
                    console.error("Erro ao fechar conta da mesa:", error);
                    alert("Erro ao fechar conta da mesa.");
                });
        }
    });
});


// Inicializa a primeira aba ao carregar a página
btnAtivos.click();