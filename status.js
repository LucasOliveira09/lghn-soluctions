// Configuração do Firebase
// Certifique-se de que esta configuração está correta para o seu projeto Firebase
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

// Inicializa o Firebase com a configuração fornecida
firebase.initializeApp(firebaseConfig);
// Obtém uma referência para o Realtime Database
const database = firebase.database();

// --- FUNÇÕES PARA GERENCIAR COOKIES ---
/**
 * Define um cookie no navegador do usuário.
 * @param {string} name O nome do cookie.
 * @param {string} value O valor a ser armazenado no cookie.
 * @param {number} days O número de dias para o cookie expirar.
 */
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
    console.log(`[Cookies] Cookie '${name}' definido com valor: '${value}' e expira em ${days} dias.`);
}

/**
 * Obtém o valor de um cookie pelo seu nome.
 * @param {string} name O nome do cookie a ser recuperado.
 * @returns {string|null} O valor do cookie ou null se não for encontrado.
 */
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';'); // Divide todos os cookies
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length); // Remove espaços em branco
        if (c.indexOf(nameEQ) === 0) {
            const value = c.substring(nameEQ.length, c.length);
            console.log(`[Cookies] Cookie '${name}' encontrado com valor: '${value}'.`);
            return value;
        }
    }
    console.log(`[Cookies] Cookie '${name}' não encontrado.`);
    return null;
}

/**
 * Apaga um cookie pelo seu nome.
 * @param {string} name O nome do cookie a ser apagado.
 */
// function eraseCookie(name) { // Comentei para evitar conflito se já estiver em main.js
//     document.cookie = name + '=; Max-Age=-99999999; path=/'; // Define uma data de expiração no passado
//     console.log(`[Cookies] Cookie '${name}' apagado.`);
// }

// --- ELEMENTOS DO DOM ---
const orderIdSpan = document.getElementById('order-id');
const statusTracker = document.getElementById('status-tracker');
const orderDetailsContainer = document.getElementById('order-details');
const historyContainer = document.getElementById('order-history');
const historyLoading = document.getElementById('history-loading');
const phoneModal = document.getElementById('phone-modal');
const phoneInput = document.getElementById('phone-input');
const submitPhoneBtn = document.getElementById('submit-phone');
const phoneError = document.getElementById('phone-error');
const entregaStatusText = document.getElementById('entrega-status-text'); // Novo elemento para texto dinâmico

// Elementos da Sidebar
const menuButton = document.getElementById('menu-button');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeSidebarButton = document.getElementById('close-sidebar-button');


// --- LÓGICA DA SIDEBAR ---
menuButton.addEventListener('click', () => {
    sidebar.classList.add('active'); // Adiciona a classe 'active' para mover a sidebar
    overlay.classList.add('active'); // Adiciona a classe 'active' para mostrar o overlay
    document.body.style.overflow = 'hidden'; // Impede a rolagem do corpo quando a sidebar está aberta
});

closeSidebarButton.addEventListener('click', () => {
    sidebar.classList.remove('active'); // Remove a classe 'active' para esconder a sidebar
    overlay.classList.remove('active'); // Remove a classe 'active' para esconder o overlay
    document.body.style.overflow = ''; // Restaura a rolagem do corpo
});

overlay.addEventListener('click', () => {
    sidebar.classList.remove('active'); // Esconde a sidebar ao clicar no overlay
    overlay.classList.remove('active'); // Esconde o overlay
    document.body.style.overflow = ''; // Restaura a rolagem do corpo
});


// --- LÓGICA PRINCIPAL AO CARREGAR A PÁGINA ---
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const currentPedidoId = urlParams.get('pedidoId'); // Obtém o ID do pedido da URL

    // Tenta obter o clienteId do cookie
    let clienteId = getCookie('clienteId');

    // Se não encontrar no cookie, tenta no localStorage (fallback)
    if (!clienteId) {
        clienteId = localStorage.getItem('clienteId');
        if (clienteId) {
            console.log("[Init] clienteId encontrado no localStorage. Migrando para cookie.");
            setCookie('clienteId', clienteId, 30); // Migra para cookie
        }
    }

    // Se o clienteId ainda não existe, mostra o modal para pedir o número
    if (!clienteId) {
        console.log("[Init] clienteId não encontrado. Exibindo modal de telefone.");
        phoneModal.style.display = 'flex'; // Exibe o modal
    } else {
        console.log(`[Init] clienteId encontrado: ${clienteId}. Escondendo modal de telefone.`);
        phoneModal.style.display = 'none'; // Garante que o modal esteja escondido
        
        // Carrega o pedido atual se houver um ID na URL
        if (currentPedidoId) {
            orderIdSpan.textContent = currentPedidoId;
            carregarStatusPedido(currentPedidoId);
        } else {
            // Se não houver pedidoId na URL, esconde a seção do pedido atual
            document.getElementById('order-details-container').innerHTML = '<p class="text-red-400">Nenhum pedido selecionado para acompanhamento.</p>';
            statusTracker.style.display = 'none';
        }
        // Carrega o histórico de pedidos com o clienteId encontrado
        carregarHistorico(clienteId, currentPedidoId);
    }

    // Event listener para o botão de enviar o número de telefone
    submitPhoneBtn.addEventListener('click', () => {
        const phoneNumber = phoneInput.value.trim();
        // Validação: apenas números e um comprimento mínimo (ex: 10 ou 11 dígitos para DDD + número)
        // Você pode ajustar a regex para ser mais específica (ex: (XX) XXXXX-XXXX)
        if (phoneNumber && /^\d{10,11}$/.test(phoneNumber)) {
            console.log(`[Modal] Número de telefone válido: ${phoneNumber}.`);
            phoneError.classList.add('hidden'); // Esconde mensagem de erro
            setCookie('clienteId', phoneNumber, 30); // Salva no cookie por 30 dias
            localStorage.setItem('clienteId', phoneNumber); // Salva no localStorage também (para redundância)
            phoneModal.style.display = 'none'; // Esconde o modal

            // Recarrega a página ou chama as funções de carregamento
            // para que a página se comporte como se o clienteId já existisse
            if (currentPedidoId) {
                orderIdSpan.textContent = currentPedidoId;
                carregarStatusPedido(currentPedidoId);
            } else {
                document.getElementById('order-details-container').innerHTML = '<p class="text-red-400">Nenhum pedido selecionado para acompanhamento.</p>';
                statusTracker.style.display = 'none';
            }
            carregarHistorico(phoneNumber, currentPedidoId);

        } else {
            console.log(`[Modal] Número de telefone inválido: ${phoneNumber}.`);
            phoneError.classList.remove('hidden'); // Mostra mensagem de erro
        }
    });
});

// Carrega e monitora o status do pedido atual em tempo real
function carregarStatusPedido(pedidoId) {
    const pedidoRef = database.ref(`pedidos/${pedidoId}`);
    console.log(`[Status Pedido] Carregando status para o pedido ID: ${pedidoId}`);

    pedidoRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const pedido = snapshot.val();
            console.log("[Status Pedido] Dados do pedido atual:", pedido);
            console.log(`[Status Pedido] Status recebido do Firebase: "${pedido.status}"`); // Log do status recebido
            exibirDetalhesPedido(pedido);
            atualizarVisualStatus(pedido); // MUDANÇA AQUI: Passa o objeto pedido completo
        } else {
            console.warn(`[Status Pedido] Pedido #${pedidoId} não encontrado no Firebase.`);
            orderDetailsContainer.innerHTML = `<p class="text-red-400 font-semibold">Pedido #${pedidoId} não encontrado.</p>`;
            statusTracker.style.display = 'none'; // Esconde o tracker se o pedido não existir
        }
    }, (error) => {
        console.error("[Status Pedido] Erro ao carregar status do pedido:", error);
        orderDetailsContainer.innerHTML = `<p class="text-red-400 font-semibold">Erro ao carregar o status do pedido.</p>`;
    });
}

// Carrega todos os pedidos do banco de dados e filtra localmente
function carregarHistorico(clienteId, currentPedidoId) {
    console.log(`[Histórico] Carregando TODOS os pedidos do banco para filtrar histórico para cliente ID: ${clienteId}`);
    // Busca TODOS os pedidos do nó 'pedidos'
    const pedidosRef = database.ref('pedidos');

    pedidosRef.once('value', (snapshot) => {
        historyLoading.style.display = 'none'; // Esconde a mensagem de carregamento

        if (!snapshot.exists()) {
            console.log("[Histórico] Nenhum pedido encontrado no banco de dados.");
            historyContainer.innerHTML = '<p class="text-gray-400">Você ainda não tem pedidos anteriores.</p>';
            return;
        }
        
        const todosPedidos = [];
        snapshot.forEach(childSnapshot => {
            const pedido = childSnapshot.val();
            // Verifica se o pedido tem um 'telefone' e se ele corresponde ao clienteId atual
            // A propriedade 'telefone' no seu objeto de pedido é usada como 'clienteId'
            if (pedido.telefone === clienteId) { 
                // Não adiciona o pedido atual à lista de histórico para evitar duplicidade
                if(childSnapshot.key !== currentPedidoId) {
                    todosPedidos.push({ id: childSnapshot.key, ...pedido });
                }
            }
        });
        console.log("[Histórico] Pedidos históricos filtrados localmente:", todosPedidos);

        // Ordena para mostrar os mais recentes primeiro (do maior timestamp para o menor)
        todosPedidos.sort((a, b) => b.timestamp - a.timestamp);

        if (todosPedidos.length === 0) {
            historyContainer.innerHTML = '<p class="text-gray-400">Nenhum outro pedido encontrado no histórico.</p>';
            return;
        }
        
        renderizarHistorico(todosPedidos); // Renderiza os pedidos no histórico
    }, (error) => {
        console.error("[Histórico] Erro ao carregar todos os pedidos para histórico:", error);
        historyLoading.textContent = 'Erro ao carregar seu histórico de pedidos.';
    });
}

/**
 * Renderiza a lista de pedidos no container de histórico.
 * @param {Array<Object>} pedidos Um array de objetos de pedido.
 */
function renderizarHistorico(pedidos) {
    historyContainer.innerHTML = ''; // Limpa o container antes de adicionar novos elementos
    pedidos.forEach(pedido => {
        // Formata a data e hora do pedido
        const dataPedido = new Date(pedido.timestamp).toLocaleDateString('pt-BR');
        const horaPedido = new Date(pedido.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Cria um elemento 'a' (link) para cada pedido no histórico
        const pedidoElement = document.createElement('a');
        pedidoElement.href = `status.html?pedidoId=${pedido.id}`; // Link para o status do pedido específico
        pedidoElement.className = 'block bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer';

        // Conteúdo HTML do elemento do pedido
        pedidoElement.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-bold">Pedido #${pedido.id}</p>
                    <p class="text-sm text-gray-400">${dataPedido} às ${horaPedido}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold">R$ ${pedido.totalPedido.toFixed(2).replace('.', ',')}</p>
                    <span class="text-xs px-2 py-1 rounded-full ${getStatusColor(pedido.status)}">${pedido.status}</span>
                </div>
            </div>
        `;
        historyContainer.appendChild(pedidoElement); // Adiciona o elemento ao container
    });
}

// --- FUNÇÕES AUXILIARES DE VISUALIZAÇÃO ---

/**
 * Exibe os detalhes de um pedido específico no container de detalhes.
 * @param {Object} pedido O objeto do pedido com seus detalhes.
 */
function exibirDetalhesPedido(pedido) {
    // Mapeia os itens do carrinho para HTML
    let itemsHtml = pedido.cart.map(item => `
        <div class="flex justify-between mb-2">
            <span>${item.quantity}x ${item.name}</span>
            <span>R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
        </div>
    `).join('');
    
    let freteHtml = '';
    // Adiciona detalhes de frete se o tipo de entrega for 'Entrega'
    if (pedido.tipoEntrega === 'Entrega') {
        const FRETE_VALOR = 5.00; // Valor fixo do frete (ajuste conforme necessário)
        const subtotal = pedido.totalPedido - FRETE_VALOR; 
        freteHtml = `
            <div class="flex justify-between text-gray-400 mt-4 pt-2 border-t border-gray-700">
                <span>Subtotal</span>
                <span>R$ ${subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="flex justify-between text-gray-400">
                <span>Taxa de Entrega</span>
                <span>R$ ${FRETE_VALOR.toFixed(2).replace('.', ',')}</span>
            </div>
        `;
    }

    // Atualiza o conteúdo do container de detalhes do pedido
    orderDetailsContainer.innerHTML = `
        ${itemsHtml}
        ${freteHtml}
        <div class="flex justify-between font-bold text-lg mt-4 pt-2 border-t border-gray-600">
            <span>Total</span>
            <span>R$ ${pedido.totalPedido.toFixed(2).replace('.', ',')}</span>
        </div>
    `;
}

/**
 * Atualiza visualmente a barra de status do pedido com base no status atual e tipo de entrega.
 * @param {Object} pedido O objeto do pedido com seus detalhes (status, tipoEntrega).
 */
function atualizarVisualStatus(pedido) {
    const status = pedido.status;
    const tipoEntrega = pedido.tipoEntrega;

    // Normaliza o status para comparação
    const normalizedStatus = status.trim(); 

    console.log(`[Atualizar Visual Status] Status recebido para atualização (limpo): "${normalizedStatus}"`); 
    console.log(`[Atualizar Visual Status] Tipo de Entrega: "${tipoEntrega}"`);

    const steps = {
        'Aguardando': document.getElementById('status-aguardando'),
        'Aceito': document.getElementById('status-preparo'), 
        'EntregaOuRetirada': document.getElementById('status-entrega'), // Representa o passo visual de entrega/retirada
        'Finalizado': document.getElementById('status-finalizado'),
    };

    // Reseta todos os estilos para o estado padrão
    Object.values(steps).forEach(step => {
        step.classList.remove('active'); 
        step.classList.remove('bg-green-500', 'border-green-400');
        step.classList.add('bg-gray-700', 'border-gray-600');
        
        const nextLine = step.parentElement.nextElementSibling;
        if (nextLine && nextLine.classList.contains('status-line')) {
            nextLine.classList.remove('active'); 
            nextLine.classList.remove('bg-green-500');
            nextLine.classList.add('bg-gray-600');
        }
    });

    // Define a ordem dos status visuais
    const visualStatusOrder = ['Aguardando', 'Aceito', 'EntregaOuRetirada', 'Finalizado'];
    let currentIndex = -1;

    // Mapeia o status do Firebase para o índice visual
    if (normalizedStatus === 'Aguardando') {
        currentIndex = 0;
    } else if (normalizedStatus === 'Aceito') {
        currentIndex = 1;
    } else if (normalizedStatus === 'Saiu para Entrega' || normalizedStatus === 'Pronto para Retirada') {
        currentIndex = 2; // Ambos os status de "entrega/retirada" ativam o mesmo passo visual
    } else if (normalizedStatus === 'Finalizado') {
        currentIndex = 3;
    }

    console.log(`[Atualizar Visual Status] Mapped currentIndex: ${currentIndex}`);

    // Atualiza o texto do passo de "Entrega/Retirada" dinamicamente
    if (entregaStatusText) { // Verifica se o elemento existe
        if (tipoEntrega === 'Retirada') {
            entregaStatusText.textContent = 'Pronto para Retirada';
        } else { // Assume 'Entrega' ou qualquer outro caso
            entregaStatusText.textContent = 'A Caminho';
        }
    }


    // Ativa todos os passos até o índice atual
    for (let i = 0; i <= currentIndex; i++) {
        const currentVisualStepKey = visualStatusOrder[i]; // Obtém a chave do passo visual (ex: 'Aceito', 'EntregaOuRetirada')
        const stepElement = steps[currentVisualStepKey]; // Obtém o elemento DOM correspondente
        
        console.log(`[Atualizar Visual Status] Processando passo visual: "${currentVisualStepKey}". Elemento existe: ${!!stepElement}`);
        if (stepElement) {
            stepElement.classList.add('active'); 
            stepElement.classList.add('bg-green-500', 'border-green-400');
            stepElement.classList.remove('bg-gray-700', 'border-gray-600');
            
            const nextLine = stepElement.parentElement.nextElementSibling;
            if (nextLine && nextLine.classList.contains('status-line')) {
                nextLine.classList.add('active'); 
                nextLine.classList.add('bg-green-500');
                nextLine.classList.remove('bg-gray-600');
            }
        }
    }
}

/**
 * Retorna uma classe CSS para colorir o status no histórico.
 * @param {string} status O status do pedido.
 * @returns {string} A classe Tailwind CSS correspondente.
 */
function getStatusColor(status) {
    switch (status) {
        case 'Aguardando': return 'bg-yellow-500 text-black';
        case 'Aceito': return 'bg-blue-500 text-white'; // MUDANÇA AQUI: "Aceito"
        case 'Saiu para Entrega': 
        case 'Pronto para Retirada': return 'bg-indigo-500 text-white'; // MUDANÇA AQUI: ambos usam a mesma cor
        case 'Finalizado': return 'bg-green-600 text-white';
        case 'Cancelado': return 'bg-red-600 text-white';
        default: return 'bg-gray-500 text-white';
    }
}
