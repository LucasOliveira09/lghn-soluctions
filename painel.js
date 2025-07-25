// Configuração do Firebase (SUBSTITUA PELAS SUAS CREDENCIAIS REAIS)
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

// --- VERIFICA SE TÁ LOGADO ---
const auth = firebase.auth();

auth.onAuthStateChanged(user => {
    if (user) {
        // Usuário está logado, permite que o painel seja carregado.
        console.log("Usuário autenticado:", user.email);
        document.body.style.display = 'flex'; // Mostra o corpo da página
        console.log(user);
    } else {
        // Usuário não está logado, redireciona para a página de login.
        // Usar .replace() para que o usuário não possa voltar para o painel com o botão "voltar" do navegador.
        console.log("Nenhum usuário autenticado. Redirecionando...");
        window.location.replace('login.html');
    }
});

const database = firebase.database();
const pedidosRef = database.ref('pedidos');
const mesasRef = database.ref('mesas');
const cuponsRef = database.ref('cupons');
const produtosRef = database.ref('produtos');
const ingredientesRef = database.ref('ingredientes');
const comprasRef = database.ref('compras');
const garconsInfoRef = database.ref('garcons_info');

const DOM = {}; // Objeto DOM será preenchido em DOMContentLoaded

let allIngredients = {};
let currentRecipeProduct = null;
let currentPurchaseItems = [];

let topProdutosChartInstance = null;
let vendasPorDiaChartInstance = null;
let horariosPicoChartInstance = null;
let metodosPagamentoChartInstance = null;
let topClientesChartInstance = null;
let tiposEntregaChartInstance;

let currentMesaIdForCheckout = null;
let currentMesaItemsToPay = [];
let currentMesaTotal = 0;
let currentMesaRemainingToPay = 0;
let currentMesaPaymentsHistory = [];

let pedidoEmEdicao = null;
let pedidoOriginal = null;

let menuLink = '';

let allProducts = {};
let manualOrderCart = [];

let currentAddonRecipe = null;
let currentAddonRecipeId = null;
const DOM_ADDON_RECIPE_MODAL = {};

//Tentei mudar não funcinou vai ter q ficar aqui
const allBordas = {
    'creamcheese': { 
        nome: 'Cream Cheese', 
        precos: {
            broto: 10.00,
            grande: 12.00
        } 
    },
    'mussarela': { 
        nome: 'Mussarela', 
        precos: {
            broto: 10.00,
            grande: 12.00
        } 
    },
    'chocolate': { 
        nome: 'Chocolate', 
        precos: {
            broto: 10.00,
            grande: 12.00
        } 
    },
    'cheddar': { 
        nome: 'Cheddar', 
        precos: {
            broto: 10.00,
            grande: 12.00
        } 
    },
    'catupiry': { 
        nome: 'Catupiry', 
        precos: {
            broto: 10.00,
            grande: 12.00
        } 
    }
};


// --- LISTENERS GLOBAIS DO FIREBASE ---


ingredientesRef.on('value', (snapshot) => {
    if (!DOM.listaIngredientesDetalheContainer || !DOM.ingredientesPontoPedidoList ||
        !DOM.listaConsumoDiarioContainer || !DOM.listaConsumoMensalContainer) {
        console.warn("Elementos DOM de estoque ainda não carregados. Ignorando atualização de ingredientes.");
        return;
    }

    DOM.listaIngredientesDetalheContainer.innerHTML = '';
    DOM.ingredientesPontoPedidoList.innerHTML = '';
    DOM.listaConsumoDiarioContainer.innerHTML = '';
    DOM.listaConsumoMensalContainer.innerHTML = '';

    allIngredients = {};

    const ingredientesEmPontoDePedido = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    snapshot.forEach(childSnapshot => {
        const ingredienteId = childSnapshot.key;
        const ingrediente = childSnapshot.val();
        allIngredients[ingredienteId] = ingrediente;

        const ultimaAtualizacaoDiariaTimestamp = ingrediente.ultimaAtualizacaoConsumo || 0;
        const ultimaAtualizacaoDiariaDate = new Date(ultimaAtualizacaoDiariaTimestamp);
        ultimaAtualizacaoDiariaDate.setHours(0, 0, 0, 0);

        if (ultimaAtualizacaoDiariaDate.getTime() < hoje.getTime()) {
            ingredientesRef.child(ingredienteId).update({
                quantidadeUsadaDiaria: 0,
                custoUsadaDiaria: 0,
                ultimaAtualizacaoConsumo: firebase.database.ServerValue.TIMESTAMP
            }).catch(e => console.error("Erro ao zerar consumo diário automático:", e));
        }

        const isBelowMin = (ingrediente.quantidadeAtual || 0) <= (ingrediente.estoqueMinimo || 0) && (ingrediente.estoqueMinimo || 0) > 0;
        const statusClass = isBelowMin ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50';

        const ingredienteCard = document.createElement('div');
        ingredienteCard.className = `p-4 rounded-lg shadow-sm border ${statusClass}`;
        ingredienteCard.innerHTML = `
            <h4 class="font-semibold text-gray-800">${ingrediente.nome}</h4>
            <p class="text-sm text-gray-600">Unidade: ${ingrediente.unidadeMedida}</p>
            <p class="text-sm text-gray-600">Estoque Mínimo: ${ingrediente.estoqueMinimo || 0} ${ingrediente.unidadeMedida}</p>
            <p class="text-sm text-gray-600">Custo Médio: R$ ${(ingrediente.custoUnitarioMedio || 0).toFixed(2)}/${ingrediente.unidadeMedida}</p>
            <div class="flex items-center gap-2 mb-2">
                <label for="qtd-atual-${ingredienteId}" class="text-sm">Estoque Atual:</label>
                <input type="number" id="qtd-atual-${ingredienteId}" value="${(ingrediente.quantidadeAtual || 0).toFixed(2)}" step="0.01" min="0"
                        class="w-24 p-1 border rounded text-center text-blue-700 font-bold">
                <span>${ingrediente.unidadeMedida}</span>
            </div>
            <div class="flex gap-2 mt-3">
                <button class="btn-update-ingrediente bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm" data-id="${ingredienteId}">Atualizar</button>
                <button class="btn-delete-ingrediente bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm" data-id="${ingredienteId}">Excluir</button>
            </div>
        `;
        DOM.listaIngredientesDetalheContainer.appendChild(ingredienteCard);

        if (isBelowMin) {
            ingredientesEmPontoDePedido.push(ingrediente);
        }
    });

    DOM.listaIngredientesDetalheContainer.querySelectorAll('.btn-update-ingrediente').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', handleUpdateIngrediente);
    });
    DOM.listaIngredientesDetalheContainer.querySelectorAll('.btn-delete-ingrediente').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', handleDeleteIngrediente);
    });

    renderIngredientesPontoPedido(ingredientesEmPontoDePedido);
    renderConsumoDiario();
    renderConsumoMensal();

    popularIngredientesParaReceitaSelects();
    popularIngredientesParaCompraSelects();
});

pedidosRef.on('value', (snapshot) => {
    DOM.pedidosOnline = {};
    snapshot.forEach((child) => {
        DOM.pedidosOnline[child.key] = child.val();
    });

    renderizarPedidos();
    if (!DOM.abaFinalizados.classList.contains('hidden')) {
        aplicarFiltroDatas();
    }

    const totalPedidosAtual = Object.keys(DOM.pedidosOnline).length;
    if (DOM.totalPedidosAnteriores === undefined) {
        DOM.totalPedidosAnteriores = 0;
    }
    if (totalPedidosAtual > DOM.totalPedidosAnteriores) {
        tocarNotificacao();
    }
    DOM.totalPedidosAnteriores = totalPedidosAtual;
});

mesasRef.on('value', (snapshot) => {
    const mesasData = snapshot.val() || {};
    renderMesas(mesasData);
});

cuponsRef.on('value', async (snapshot) => {
    carregarCupons(snapshot);
});

garconsInfoRef.on('value', (snapshot) => {
    carregarGarcom(snapshot);
});

produtosRef.on('value', snapshot => {
    allProducts = snapshot.val() || {};
});

// --- FUNÇÕES GERAIS DO PAINEL ---
function tocarNotificacao() {
    const som = document.getElementById('notificacao-som');
    if (som) {
        som.currentTime = 0;
        som.play().catch((err) => {
            console.warn('Não foi possível reproduzir o som:', err);
        });
    }
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

// --- INICIALIZAÇÃO DO DOM E EVENT LISTENERS ---


document.addEventListener('DOMContentLoaded', () => {
    // Preenchendo o objeto DOM com as referências dos elementos HTML
    Object.assign(DOM, {
        
        listaAdicionaisConfiguracao: document.getElementById('lista-adicionais-configuracao'),
        tiposEntregaSummary: document.getElementById('tipos-entrega-summary'),
        tiposEntregaChartCanvas: document.getElementById('tipos-entrega-chart'),

        pedidosAtivosContainer: document.getElementById('pedidos-ativos-container'),
        pedidosFinalizadosContainer: document.getElementById('pedidos-finalizados-container'),
        inputDataInicio: document.getElementById('data-inicio'),
        inputDataFim: document.getElementById('data-fim'),
        btnFiltrar: document.getElementById('btn-filtrar'),
        totalPedidosEl: document.getElementById('total-pedidos'),
        totalVendidoEl: document.getElementById('total-vendido'),
        btnAtivos: document.getElementById('btn-ativos'),
        btnFinalizados: document.getElementById('btn-finalizados'),
        btnEditarCardapio: document.getElementById('btn-editar-cardapio'),
        btnEditarHorario: document.getElementById('btn-editar-horario'),
        btnGerenciarMesas: document.getElementById('btn-gerenciar-mesas'),
        btnConfiguracoesGerais: document.getElementById('btn-configuracoes-gerais'),
        btnRelatorios: document.getElementById('btn-relatorios'),
        btnGerenciarCupom: document.getElementById('btn-gerenciar-cupom'),
        btnGerenciarGarcom: document.getElementById('btn-gerenciar-garcom'),
        btnGerenciarEstoque: document.getElementById('btn-gerenciar-estoque'),
        btnLogout: document.getElementById('btn-logout'),

        dataDiaAnteriorSpan: document.getElementById('data-dia-anterior'),
        totalGastoDiarioSpan: document.getElementById('total-gasto-diario'),
        listaConsumoDiarioContainer: document.getElementById('lista-consumo-diario'),
        nomeMesAtualSpan: document.getElementById('nome-mes-atual'),
        totalGastoMensalSpan: document.getElementById('total-gasto-mensal'),
        listaConsumoMensalContainer: document.getElementById('lista-consumo-mensal'),

        ingredientesPontoPedidoList: document.getElementById('ingredientes-ponto-pedido-list'),
        ingredientesPontoPedidoCount: document.getElementById('ingredientes-ponto-pedido-count'),
        btnResetarConsumoDiario: document.getElementById('btn-resetar-consumo-diario'),
        btnResetarConsumoMensal: document.getElementById('btn-resetar-consumo-mensal'),
        toggleGerenciamentoAvancado: document.getElementById('toggle-gerenciamento-avancado'),
        gerenciamentoDetalhadoContainer: document.getElementById('gerenciamento-detalhado-container'),

        ingredienteNomeDetalheInput: document.getElementById('ingrediente-nome-detalhe'),
        ingredienteUnidadeDetalheInput: document.getElementById('ingrediente-unidade-detalhe'),
        ingredienteEstoqueMinimoDetalheInput: document.getElementById('ingrediente-estoque-minimo-detalhe'),
        btnSalvarIngredienteDetalhe: document.getElementById('btn-salvar-ingrediente-detalhe'),
        listaIngredientesDetalheContainer: document.getElementById('lista-ingredientes-detalhe-container'),

        receitaProdutoSelectCategoriaDetalhe: document.getElementById('receita-produto-select-categoria-detalhe'),
        receitaProdutoSelectDetalhe: document.getElementById('receita-produto-select-detalhe'),
        receitaConfigDetalheContainer: document.getElementById('receita-config-detalhe-container'),
        currentRecipeProductNameDetalhe: document.getElementById('current-recipe-product-name-detalhe'),
        ingredientesParaReceitaDetalheList: document.getElementById('ingredientes-para-receita-detalhe-list'),
        receitaIngredienteSelectDetalhe: document.getElementById('receita-ingrediente-select-detalhe'),
        receitaQuantidadeDetalheInput: document.getElementById('receita-quantidade-detalhe'),
        btnAddIngredienteReceitaDetalhe: document.getElementById('btn-add-ingrediente-receita-detalhe'),
        btnSalvarReceitaDetalhe: document.getElementById('btn-salvar-receita-detalhe'),
        pizzaTamanhoSelectContainerDetalhe: document.getElementById('pizza-size-select-container-detalhe'),
        pizzaTamanhoSelectDetalhe: document.getElementById('pizza-tamanho-select-detalhe'),
        currentPizzaSizeDetalheSpan: document.getElementById('current-pizza-size-detalhe'),

        compraDataDetalheInput: document.getElementById('compra-data-detalhe'),
        compraFornecedorDetalheInput: document.getElementById('compra-fornecedor-detalhe'),
        itensCompraDetalheListContainer: document.getElementById('itens-compra-detalhe-list'),
        compraIngredienteSelectDetalhe: document.getElementById('compra-ingrediente-select-detalhe'),
        compraQuantidadeDetalheInput: document.getElementById('compra-quantidade-detalhe'),
        compraPrecoTotalDetalheInput: document.getElementById('compra-preco-total-detalhe'), // ID alterado
        custoCalculadoDisplay: document.getElementById('custo-calculado-display'), // Novo elemento
        btnAddItemCompraDetalhe: document.getElementById('btn-add-item-compra-detalhe'),
        btnRegistrarCompraDetalhe: document.getElementById('btn-registrar-compra-detalhe'),
        btnGerenciarAdicionais: document.getElementById('btn-gerenciar-adicionais'),

        abaAtivos: document.getElementById('aba-ativos'),
        abaFinalizados: document.getElementById('aba-finalizados'),
        EditarCardapio: document.getElementById('editar-cardapio'),
        editarHorario: document.getElementById('editar-horario'),
        abaGerenciarMesas: document.getElementById('aba-gerenciar-mesas'),
        abaConfiguracoesGerais: document.getElementById('aba-configuracoes-gerais'),
        abaRelatorios: document.getElementById('aba-relatorios'),
        abaGerenciarCupom: document.getElementById('aba-gerenciar-cupom'),
        abaGerenciarGarcom: document.getElementById('aba-gerenciar-garcom'),
        abaGerenciarEstoque: document.getElementById('aba-gerenciar-estoque'),
        abaGerenciarAdicionais: document.getElementById('aba-adicionais-conteudo'),

        searchInput: document.getElementById('search-input'),
        categoriaSelect: document.getElementById('categoria-select'),
        modalNovoItem: document.getElementById('modal-novo-item'),
        btnFecharNovoItem: document.getElementById('btn-fechar-novo-item'),
        novoImagemInput: document.getElementById('novo-imagem'),
        previewNovaImagem: document.getElementById('preview-nova-imagem'),
        btnSalvarNovoItem: document.getElementById('btn-salvar-novo-item'),
        novoNomeInput: document.getElementById('novo-nome'),
        novoDescricaoInput: document.getElementById('novo-descricao'),
        novoPrecoInput: document.getElementById('novo-preco'),
        novoAtivoCheckbox: document.getElementById('novo-ativo'),
        novoTipoSelect: document.getElementById('novo-tipo'),
        itensCardapioContainer: document.getElementById('itens-cardapio-container'),
        novoCategoriaSelect: document.getElementById('novo-categoria-select'),

        menuButton: document.getElementById('menu-button'),
        sidebar: document.getElementById('sidebar'),
        overlay: document.getElementById('overlay'),
        closeSidebarButton: document.getElementById('close-sidebar-button'),

        relatorioDataInicio: document.getElementById('relatorio-data-inicio'),
        relatorioDataFim: document.getElementById('relatorio-data-fim'),
        btnGerarRelatorios: document.getElementById('btn-gerar-relatorios'),
        topProdutosSummary: document.getElementById('top-produtos-summary'),
        topProdutosChartCanvas: document.getElementById('top-produtos-chart'),
        vendasPorDiaSummary: document.getElementById('vendas-por-dia-summary'),
        vendasPorDiaChartCanvas: document.getElementById('vendas-por-dia-chart'),
        horariosPicoSummary: document.getElementById('horarios-pico-summary'),
        horariosPicoChartCanvas: document.getElementById('horarios-pico-chart'),
        metodosPagamentoSummary: document.getElementById('metodos-pagamento-summary'),
        metodosPagamentoChartCanvas: document.getElementById('metodos-pagamento-chart'),
        btnUltimos7Dias: document.getElementById('btn-ultimos-7-dias'),
        btnUltimoMes: document.getElementById('btn-ultimo-mes'),
        btnUltimos3Meses: document.getElementById('btn-ultimos-3-meses'),
        btnHoje: document.getElementById('btn-hoje'),
        // **NOVO**: Adicionando os elementos DOM para o relatório de Top Clientes
        topClientesSummary: document.getElementById('top-clientes-summary'),
        topClientesChartCanvas: document.getElementById('top-clientes-chart'),


        btnSalvarCupom: document.getElementById('btn-salvar-cupom'),
        cupomCodigoInput: document.getElementById('cupom-codigo'),
        cupomValorInput: document.getElementById('cupom-valor'),
        cupomTipoSelect: document.getElementById('cupom-tipo'),
        cupomMinValorInput: document.getElementById('cupom-min-valor'),
        validadeCupomInput: document.getElementById('validade-cupom'),
        listaCuponsContainer: document.getElementById('lista-cupons-container'),

        btnSalvarGarcom: document.getElementById('btn-salvar-garcom'),
        garcomNomeInput: document.getElementById('garcom-nome'),
        garcomSenhaInput: document.getElementById('garcom-senha'),
        listaGarconsContainer: document.getElementById('lista-garcons-container'),

        numMesasInput: document.getElementById('num-mesas'),
        btnConfigurarMesas: document.getElementById('btn-configurar-mesas'),
        mesasContainer: document.getElementById('mesas-container'),
        modalMesaDetalhes: document.getElementById('modal-mesa-detalhes'),
        modalMesaNumero: document.getElementById('modal-mesa-numero'),
        mesaDetalhesInfo: document.getElementById('mesa-detalhes-info'),
        mesaDetalhesStatus: document.getElementById('mesa-detalhes-status'),
        mesaDetalhesCliente: document.getElementById('mesa-detalhes-cliente'),
        mesaDetalhesGarcom: document.getElementById('mesa-detalhes-garcom'),
        mesaDetalhesObs: document.getElementById('mesa-detalhes-obs'),
        mesaItensSelecaoContainer: document.getElementById('mesa-itens-selecao-container'),
        emptyItemsMessage: document.getElementById('empty-items-message'),
        mesaTotalOriginal: document.getElementById('mesa-total-original'),
        mesaTotalPago: document.getElementById('mesa-total-pago'),
        mesaRestantePagar: document.getElementById('mesa-restante-pagar'),
        valorAPagarInput: document.getElementById('valor-a-pagar-input'),
        dividirPorInput: document.getElementById('dividir-por-input'),
        btnDividirRestante: document.getElementById('btn-dividir-restante'),
        pagamentoMetodoAtual: document.getElementById('pagamento-metodo-atual'),
        trocoInputGroup: document.getElementById('troco-input-group'),
        trocoRecebidoInput: document.getElementById('troco-recebido'),
        btnAdicionarPagamento: document.getElementById('btn-adicionar-pagamento'),
        historicoPagamentosContainer: document.getElementById('historico-pagamentos'),
        emptyPaymentsMessage: document.getElementById('empty-payments-message'),
        btnCancelarPedidoMesa: document.getElementById('btn-cancelar-pedido-mesa'),
        btnFinalizarContaMesa: document.getElementById('btn-finalizar-conta-mesa'),

        diasInatividadeInput: document.getElementById('dias-inatividade'),
        btnVerificarInativos: document.getElementById('btn-verificar-inativos'),
        clientesInativosContainer: document.getElementById('clientes-inativos-container'),

        // New DOM elements for Menu Link Modal
        modalMenuLink: document.getElementById('modal-menu-link'),
        btnAbrirModalMenuLink: document.getElementById('btn-abrir-modal-menu-link'),
        menuLinkInput: document.getElementById('menu-link-input'),
        btnSalvarMenuLink: document.getElementById('btn-salvar-menu-link'),

        manualTipoEntregaSelect: document.getElementById('manual-tipo-entrega'),

        listaAdicionaisConfiguracao: document.getElementById('lista-adicionais-configuracao'),

    });

    Object.assign(DOM_ADDON_RECIPE_MODAL, {
        modal: document.getElementById('addon-recipe-modal'),
        nameSpan: document.getElementById('addon-recipe-name'),
        ingredientsList: document.getElementById('addon-recipe-ingredients-list'),
        ingredienteSelect: document.getElementById('addon-recipe-ingrediente-select'),
        quantidadeInput: document.getElementById('addon-recipe-quantidade'),
        addIngredienteBtn: document.getElementById('btn-add-addon-recipe-ingrediente'),
        cancelBtn: document.getElementById('cancel-addon-recipe-modal'),
        saveBtn: document.getElementById('save-addon-recipe-modal')
    });



    // --- Event Listeners para a Sidebar ---
    DOM.menuButton.addEventListener('click', () => {
        DOM.sidebar.classList.remove('-translate-x-full');
        DOM.overlay.classList.remove('hidden');
    });

    DOM.closeSidebarButton.addEventListener('click', () => {
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.overlay.classList.add('hidden');
    });

    DOM.overlay.addEventListener('click', () => {
        DOM.sidebar.classList.add('-translate-x-full');
        DOM.overlay.classList.add('hidden');
    });

    // --- Event Listeners para os botões do menu principal ---
DOM.btnAtivos.addEventListener('click', () => {
    // Adicionado DOM.abaGerenciarAdicionais à lista de abas a esconder
    ativaAba(DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque, DOM.abaGerenciarGarcom, DOM.abaGerenciarAdicionais);
    // Adicionado DOM.btnGerenciarAdicionais à lista de botões a desestilizar
    estilizaBotaoAtivo(DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque, DOM.btnGerenciarGarcom, DOM.btnGerenciarAdicionais);
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
});

DOM.btnFinalizados.addEventListener('click', () => {
    // Adicionado DOM.abaGerenciarAdicionais à lista de abas a esconder
    ativaAba(DOM.abaFinalizados, DOM.abaAtivos, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque, DOM.abaGerenciarGarcom, DOM.abaGerenciarAdicionais);
    // Adicionado DOM.btnGerenciarAdicionais à lista de botões a desestilizar
    estilizaBotaoAtivo(DOM.btnFinalizados, DOM.btnAtivos, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque, DOM.btnGerenciarGarcom, DOM.btnGerenciarAdicionais);

    const hoje = new Date();
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(hoje.getDate() - 7);

    DOM.inputDataInicio.value = seteDiasAtras.toISOString().split('T')[0];
    DOM.inputDataFim.value = hoje.toISOString().split('T')[0];

    aplicarFiltroDatas();
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
});

DOM.btnEditarCardapio.addEventListener('click', () => {
    // Adicionado DOM.abaGerenciarAdicionais à lista de abas a esconder
    ativaAba(DOM.EditarCardapio, DOM.abaFinalizados, DOM.abaAtivos, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque, DOM.abaGerenciarGarcom, DOM.abaGerenciarAdicionais);
    // Adicionado DOM.btnGerenciarAdicionais à lista de botões a desestilizar
    estilizaBotaoAtivo(DOM.btnEditarCardapio, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque, DOM.btnGerenciarGarcom, DOM.btnGerenciarAdicionais);
    if (!DOM.categoriaSelect.value) {
        DOM.categoriaSelect.value = 'pizzas';
    }
    carregarItensCardapio(DOM.categoriaSelect.value, DOM.searchInput.value);
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
});

DOM.btnEditarHorario.addEventListener('click', () => {
    // Adicionado DOM.abaGerenciarAdicionais à lista de abas a esconder
    ativaAba(DOM.editarHorario, DOM.abaFinalizados, DOM.abaAtivos, DOM.EditarCardapio, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque, DOM.abaGerenciarGarcom, DOM.abaGerenciarAdicionais);
    // Adicionado DOM.btnGerenciarAdicionais à lista de botões a desestilizar
    estilizaBotaoAtivo(DOM.btnEditarHorario, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque, DOM.btnGerenciarGarcom, DOM.btnGerenciarAdicionais);
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
    inicializarEditorHorario();
});

DOM.btnGerenciarMesas.addEventListener('click', () => {
    // Adicionado DOM.abaGerenciarAdicionais à lista de abas a esconder
    ativaAba(DOM.abaGerenciarMesas, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque, DOM.abaGerenciarGarcom, DOM.abaGerenciarAdicionais);
    // Adicionado DOM.btnGerenciarAdicionais à lista de botões a desestilizar
    estilizaBotaoAtivo(DOM.btnGerenciarMesas, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque, DOM.btnGerenciarGarcom, DOM.btnGerenciarAdicionais);
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
    carregarMesasDoFirebase();
});

DOM.btnConfiguracoesGerais.addEventListener('click', () => {
    // Adicionado DOM.abaGerenciarAdicionais à lista de abas a esconder
    ativaAba(DOM.abaConfiguracoesGerais, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque, DOM.abaGerenciarGarcom, DOM.abaGerenciarAdicionais);
    // Adicionado DOM.btnGerenciarAdicionais à lista de botões a desestilizar
    estilizaBotaoAtivo(DOM.btnConfiguracoesGerais, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque, DOM.btnGerenciarGarcom, DOM.btnGerenciarAdicionais);
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
});

DOM.btnRelatorios.addEventListener('click', () => {
    // Adicionado DOM.abaGerenciarAdicionais à lista de abas a esconder
    ativaAba(DOM.abaRelatorios, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque, DOM.abaGerenciarGarcom, DOM.abaGerenciarAdicionais);
    // Adicionado DOM.btnGerenciarAdicionais à lista de botões a desestilizar
    estilizaBotaoAtivo(DOM.btnRelatorios, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque, DOM.btnGerenciarGarcom, DOM.btnGerenciarAdicionais);
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
    setRelatorioDateRange(6, 0); // Define o filtro inicial para os últimos 7 dias ao abrir a aba
});

DOM.btnGerenciarCupom.addEventListener('click', () => {
    // Adicionado DOM.abaGerenciarAdicionais à lista de abas a esconder
    ativaAba(DOM.abaGerenciarCupom, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarEstoque, DOM.abaGerenciarGarcom, DOM.abaGerenciarAdicionais);
    // Adicionado DOM.btnGerenciarAdicionais à lista de botões a desestilizar
    estilizaBotaoAtivo(DOM.btnGerenciarCupom, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarEstoque, DOM.btnGerenciarGarcom, DOM.btnGerenciarAdicionais);
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
});

DOM.btnGerenciarEstoque.addEventListener('click', () => {
    // Adicionado DOM.abaGerenciarAdicionais à lista de abas a esconder
    ativaAba(DOM.abaGerenciarEstoque, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarGarcom, DOM.abaGerenciarAdicionais);
    // Adicionado DOM.btnGerenciarAdicionais à lista de botões a desestilizar
    estilizaBotaoAtivo(DOM.btnGerenciarEstoque, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarGarcom, DOM.btnGerenciarAdicionais);
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');

    // Limpar campos e estado ao entrar na aba de estoque
    DOM.ingredienteNomeDetalheInput.value = '';
    DOM.ingredienteUnidadeDetalheInput.value = '';
    DOM.ingredienteEstoqueMinimoDetalheInput.value = '';

    DOM.compraDataDetalheInput.valueAsDate = new Date();
    DOM.compraFornecedorDetalheInput.value = '';
    currentPurchaseItems = [];
    renderItensCompraDetalhe(); // Função que renderiza os itens da compra atual

    DOM.receitaProdutoSelectCategoriaDetalhe.value = '';
    DOM.receitaProdutoSelectDetalhe.innerHTML = '<option value="">Selecione uma categoria primeiro</option>';
    DOM.receitaProdutoSelectDetalhe.disabled = true;
    DOM.receitaConfigDetalheContainer.classList.add('hidden');
    DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none';
});

DOM.btnGerenciarGarcom.addEventListener('click', () => {
    // Adicionado DOM.abaGerenciarAdicionais à lista de abas a esconder
    ativaAba(DOM.abaGerenciarGarcom, DOM.abaGerenciarCupom, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarEstoque, DOM.abaGerenciarAdicionais);
    // Adicionado DOM.btnGerenciarAdicionais à lista de botões a desestilizar
    estilizaBotaoAtivo(DOM.btnGerenciarGarcom, DOM.btnGerenciarCupom, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarEstoque, DOM.btnGerenciarAdicionais);
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');
});

// Listener para o novo botão 'Gerenciar Adicionais'
DOM.btnGerenciarAdicionais.addEventListener('click', () => {
    // Ativa a aba de adicionais
    ativaAba(DOM.abaGerenciarAdicionais, DOM.abaAtivos, DOM.abaFinalizados, DOM.EditarCardapio, DOM.editarHorario, DOM.abaGerenciarMesas, DOM.abaConfiguracoesGerais, DOM.abaRelatorios, DOM.abaGerenciarCupom, DOM.abaGerenciarEstoque, DOM.abaGerenciarGarcom);
    // Estiliza o botão 'Gerenciar Adicionais' como ativo, e os outros como inativos
    estilizaBotaoAtivo(DOM.btnGerenciarAdicionais, DOM.btnAtivos, DOM.btnFinalizados, DOM.btnEditarCardapio, DOM.btnEditarHorario, DOM.btnGerenciarMesas, DOM.btnConfiguracoesGerais, DOM.btnRelatorios, DOM.btnGerenciarCupom, DOM.btnGerenciarEstoque, DOM.btnGerenciarGarcom);
    DOM.sidebar.classList.add('-translate-x-full');
    DOM.overlay.classList.add('hidden');

    // Chama a função para renderizar a lista de adicionais
    renderAdicionaisConfiguracao();
});

    // --- Event Listener para o botão de Sair ---
    DOM.btnLogout.addEventListener('click', () => {
        auth.signOut().then(() => {
            console.log("Usuário deslogado com sucesso.");
            // O onAuthStateChanged irá lidar com o redirecionamento
        }).catch(error => console.error("Erro ao fazer logout:", error));
    });

    // --- Event Listener para o botão de filtrar na aba de finalizados ---
    DOM.btnFiltrar.addEventListener('click', aplicarFiltroDatas);

    const btnOntemFinalizados = document.getElementById('btn-ontem-finalizados');
    const btn7DiasFinalizados = document.getElementById('btn-ultimos-7-dias-finalizados');
    const btnMesFinalizados = document.getElementById('btn-ultimo-mes-finalizados');
    const btn3MesesFinalizados = document.getElementById('btn-ultimos-3-meses-finalizados');

    if (btnOntemFinalizados) {
        btnOntemFinalizados.addEventListener('click', () => setFiltroDatas('ontem'));
    }
    if (btn7DiasFinalizados) {
        btn7DiasFinalizados.addEventListener('click', () => setFiltroDatas('ultimos7dias'));
    }
    if (btnMesFinalizados) {
        btnMesFinalizados.addEventListener('click', () => setFiltroDatas('ultimoMes'));
    }
    if (btn3MesesFinalizados) {
        btn3MesesFinalizados.addEventListener('click', () => setFiltroDatas('ultimos3meses'));
    }

    
    
    // --- Event Listeners para Relatórios de Pedidos ---
    DOM.btnGerarRelatorios.addEventListener('click', gerarRelatorios);
    DOM.btnHoje.addEventListener('click', () => setRelatorioDateRange(1, 1));
    DOM.btnUltimos7Dias.addEventListener('click', () => setRelatorioDateRange(6, 0));
    DOM.btnUltimoMes.addEventListener('click', () => setRelatorioDateRange(0, 0, 1));
    DOM.btnUltimos3Meses.addEventListener('click', () => setRelatorioDateRange(0, 0, 3));

    // --- Event Listeners para a aba de Estoque (Relatórios Rápidos e Ações) ---
    DOM.btnResetarConsumoDiario.addEventListener('click', async () => {
        const confirmacao = confirm('Tem certeza que deseja RESETAR o consumo do dia anterior? Isso vai zerar as quantidades e valores diários para todos os ingredientes. Esta ação é para ser feita no início de cada novo dia.');
        if (!confirmacao) return;

        try {
            const updates = {};
            Object.keys(allIngredients).forEach(ingredienteId => {
                updates[ingredienteId + '/quantidadeUsadaDiaria'] = 0;
                updates[ingredienteId + '/custoUsadaDiaria'] = 0;
                updates[ingredienteId + '/ultimaAtualizacaoConsumo'] = firebase.database.ServerValue.TIMESTAMP;
            });
            await ingredientesRef.update(updates);
            alert('Consumo do dia anterior resetado com sucesso!');
        } catch (error) {
            console.error('Erro ao resetar consumo diário:', error);
            alert('Erro ao resetar consumo do dia anterior.');
        }
    });

    DOM.btnResetarConsumoMensal.addEventListener('click', async () => {
        const today = new Date();
        const yearMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;

        if (confirm(`Tem certeza que deseja RESETAR o consumo mensal de TODOS os ingredientes para o mês de ${yearMonth}? Esta ação salvará o consumo atual em um histórico e zerará os contadores para o novo mês.`)) {
            try {
                const snapshot = await ingredientesRef.once('value');
                const updates = {};
                const consumoHistoricoMensal = {};

                snapshot.forEach(childSnapshot => {
                    const ingredienteId = childSnapshot.key;
                    const ingredienteData = childSnapshot.val();
                    if (ingredienteData.quantidadeUsadaMensal > 0) {
                        consumoHistoricoMensal[ingredienteId] = {
                            nome: ingredienteData.nome,
                            unidadeMedida: ingredienteData.unidadeMedida,
                            quantidadeConsumida: ingredienteData.quantidadeUsadaMensal,
                            custoConsumido: ingredienteData.custoUsadoMensal,
                            timestampReset: firebase.database.ServerValue.TIMESTAMP
                        };
                    }
                    updates[ingredienteId + '/quantidadeUsadaMensal'] = 0;
                    updates[ingredienteId + '/custoUsadoMensal'] = 0;
                });

                if (Object.keys(consumoHistoricoMensal).length > 0) {
                    await database.ref(`historicoConsumo/${yearMonth}`).set(consumoHistoricoMensal);
                    console.log(`Consumo de ${yearMonth} salvo em histórico.`);
                }

                await ingredientesRef.update(updates);
                alert('Consumo mensal de ingredientes resetado com sucesso!');
            } catch (error) {
                console.error('Erro ao resetar consumo:', error);
                alert('Erro ao resetar consumo de ingredientes.');
            }
        }
    });

    if (DOM_ADDON_RECIPE_MODAL.cancelBtn) {
        DOM_ADDON_RECIPE_MODAL.cancelBtn.addEventListener('click', () => {
            DOM_ADDON_RECIPE_MODAL.modal.style.display = 'none';
        });
    }
    if (DOM_ADDON_RECIPE_MODAL.addIngredienteBtn) {
        DOM_ADDON_RECIPE_MODAL.addIngredienteBtn.addEventListener('click', handleAddAddonRecipeIngrediente);
    }
    if (DOM_ADDON_RECIPE_MODAL.saveBtn) {
        DOM_ADDON_RECIPE_MODAL.saveBtn.addEventListener('click', handleSaveAddonRecipe);
    }

    DOM.toggleGerenciamentoAvancado.addEventListener('click', () => {
        DOM.gerenciamentoDetalhadoContainer.classList.toggle('hidden');
    });

    // --- Event Listeners para a seção de Gerenciamento Detalhado ---
    DOM.btnSalvarIngredienteDetalhe.addEventListener('click', handleSalvarIngredienteDetalhe);
    DOM.btnAddItemCompraDetalhe.addEventListener('click', handleAddItemCompraDetalhe);
    DOM.btnRegistrarCompraDetalhe.addEventListener('click', handleRegistrarCompraDetalhe);
    DOM.receitaProdutoSelectCategoriaDetalhe.addEventListener('change', handleReceitaProdutoCategoriaChangeDetalhe);
    DOM.receitaProdutoSelectDetalhe.addEventListener('change', handleReceitaProdutoSelectChangeDetalhe);
    DOM.pizzaTamanhoSelectDetalhe.addEventListener('change', handlePizzaTamanhoSelectChangeDetalhe);
    DOM.btnAddIngredienteReceitaDetalhe.addEventListener('click', handleAddIngredienteReceitaDetalhe);
    DOM.btnSalvarReceitaDetalhe.addEventListener('click', handleSalvarReceitaDetalhe);

    // --- Event Listeners para o Modal de Mesa ---
    const closeMesaModalButton = DOM.modalMesaDetalhes.querySelector('.close-modal');
    if (closeMesaModalButton) {
        closeMesaModalButton.addEventListener('click', fecharModalMesaDetalhes);
    }

    DOM.valorAPagarInput.addEventListener('input', updateCheckoutStatus);
    DOM.pagamentoMetodoAtual.addEventListener('change', updateCheckoutStatus);
    DOM.trocoRecebidoInput.addEventListener('input', updateCheckoutStatus);
    DOM.dividirPorInput.addEventListener('input', updateCheckoutStatus);

    DOM.btnAdicionarPagamento.addEventListener('click', adicionarPagamentoMesa);
    DOM.btnDividirRestante.addEventListener('click', dividirContaMesa);
    DOM.btnCancelarPedidoMesa.addEventListener('click', cancelarPedidoMesa);
    DOM.btnFinalizarContaMesa.addEventListener('click', finalizarContaMesa);

    // Garante que a primeira aba visível é a de 'Ativos' ao carregar a página
    DOM.btnAtivos.click();

    if (DOM.categoriaSelect) {
        DOM.categoriaSelect.addEventListener("change", (e) => {
            carregarItensCardapio(e.target.value, DOM.searchInput.value);
        });
    }
     if (DOM.manualTipoEntregaSelect) {
        DOM.manualTipoEntregaSelect.addEventListener("change", (e) => {
            handleDeliveryTypeChange()
        });
    }
    if (DOM.searchInput) {
        DOM.searchInput.addEventListener("input", () => {
            carregarItensCardapio(DOM.categoriaSelect.value, DOM.searchInput.value);
        });
    }

    if (DOM.btnFecharNovoItem) {
        DOM.btnFecharNovoItem.addEventListener("click", () => {
            DOM.modalNovoItem.classList.add("hidden");
            limparFormularioNovoItem();
        });
    }

    if (DOM.novoImagemInput && DOM.previewNovaImagem) {
        DOM.novoImagemInput.addEventListener("input", () => {
            const url = DOM.novoImagemInput.value.trim();
            if (url && url.startsWith('http')) {
                DOM.previewNovaImagem.src = url;
                DOM.previewNovaImagem.classList.remove("hidden");
            } else {
                DOM.previewNovaImagem.src = '';
                DOM.previewNovaImagem.classList.add("hidden");
            }
        });
    }

    if (DOM.btnSalvarNovoItem) {
        DOM.btnSalvarNovoItem.addEventListener("click", handleSalvarNovoItem);
    }

    DOM.btnVerificarInativos.addEventListener('click', verificarClientesInativos);
    DOM.btnAbrirModalMenuLink.addEventListener('click', abrirModalMenuLink);
    DOM.modalMenuLink.querySelector('.close-modal').addEventListener('click', fecharModalMenuLink);
    DOM.btnSalvarMenuLink.addEventListener('click', salvarMenuLink);


    document.addEventListener('input', (event) => {
        if (event.target.classList.contains('uppercase-input')) {
            const input = event.target;
            const start = input.selectionStart;
            const end = input.selectionEnd;
            input.value = input.value.toUpperCase();
            input.setSelectionRange(start, end);
        }
    });

    const btnAdicionarItemCardapio = document.getElementById('btn-adicionar-item-cardapio');
    if (btnAdicionarItemCardapio) {
        btnAdicionarItemCardapio.addEventListener('click', mostrarNovoitem);
    }

    const btnAdicionarPedidoManual = document.getElementById('btn-adicionar-pedido-manual');
    const modalPedidoManual = document.getElementById('modal-pedido-manual');

    if (btnAdicionarPedidoManual) {
        btnAdicionarPedidoManual.addEventListener('click', openManualOrderModal);
    }
    if (document.getElementById('manual-btn-fechar')) {
        document.getElementById('manual-btn-fechar').addEventListener('click', () => modalPedidoManual.classList.add('hidden'));
    }
    if (document.getElementById('manual-btn-cancelar')) {
        document.getElementById('manual-btn-cancelar').addEventListener('click', () => modalPedidoManual.classList.add('hidden'));
    }
    if (document.getElementById('manual-select-categoria')) {
        document.getElementById('manual-select-categoria').addEventListener('change', (e) => updateItemSelectionUI(e.target.value));
    }
    if (document.getElementById('pizza-meio-a-meio-check')) {
        document.getElementById('pizza-meio-a-meio-check').addEventListener('change', (e) => {
            document.getElementById('container-sabor2').classList.toggle('hidden', !e.target.checked);
        });
    }
    if (document.getElementById('manual-btn-add-item')) {
        document.getElementById('manual-btn-add-item').addEventListener('click', addItemToManualCart);
    }
    if (document.getElementById('manual-btn-salvar')) {
        document.getElementById('manual-btn-salvar').addEventListener('click', saveManualOrder);
    }
});

//Função pra corrigir os horarios LGHN---------------------------------------------------------------------------------------------------------------------------------------
function parseDateAsLocal(dateString) {
    // Evita o problema de timezone lendo a data como UTC.
    // Isso força a data a ser interpretada no fuso horário local.
    const parts = dateString.split('-');
    // O mês no construtor do Date é 0-indexado (0 = Janeiro, 1 = Fevereiro, etc.)
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
}


// --- SEÇÃO: PEDIDOS lghn-----------------------------------------------------------------------------------------------------------------------------------------------------------------------


// Gerenciamento de Pedidos Ativos e Finalizados
function renderizarPedidos() {
    if (!DOM.pedidosAtivosContainer) return;
    DOM.pedidosAtivosContainer.innerHTML = '';
    Object.entries(DOM.pedidosOnline).forEach(([pedidoId, pedido]) => {
        if (pedido.status !== 'Finalizado' && pedido.status !== 'Recusado' && pedido.tipoAtendimento !== 'Mesa' && pedido.tipoAtendimento !== 'Presencial') {
            const pedidoDiv = document.createElement('div');
            pedidoDiv.className = 'bg-white p-4 rounded shadow mb-4';
            pedidoDiv.innerHTML = gerarHtmlPedido(pedido, pedidoId);
            DOM.pedidosAtivosContainer.appendChild(pedidoDiv);
        }
    });
}

function aplicarFiltroDatas() {
    if (!DOM.pedidosFinalizadosContainer) return;
    DOM.pedidosFinalizadosContainer.innerHTML = '';

    let dataInicioTimestamp = DOM.inputDataInicio.value ? parseDateAsLocal(DOM.inputDataInicio.value).setHours(0, 0, 0, 0) : null;
    let dataFimTimestamp = DOM.inputDataFim.value ? parseDateAsLocal(DOM.inputDataFim.value).setHours(23, 59, 59, 999) : null;

    let pedidosFiltrados = Object.entries(DOM.pedidosOnline).filter(([id, pedido]) => {
        if (pedido.status !== 'Finalizado' || !pedido.timestamp) return false;

        const ts = pedido.timestamp;

        if (dataInicioTimestamp && ts < dataInicioTimestamp) return false;
        if (dataFimTimestamp && ts > dataFimTimestamp) return false;

        return true;
    });

    const totalPedidos = pedidosFiltrados.length;
    const totalVendido = pedidosFiltrados.reduce((acc, [_, p]) => acc + (p.totalPedido || p.totalOriginal || 0), 0);

    DOM.totalPedidosEl.textContent = totalPedidos;
    DOM.totalVendidoEl.textContent = totalVendido.toFixed(2);

    if (totalPedidos === 0) {
        DOM.pedidosFinalizadosContainer.innerHTML = `<p class="text-center text-gray-500">Nenhum pedido finalizado no período selecionado.</p>`;
        return;
    }

    pedidosFiltrados.forEach(([pedidoId, pedido]) => {
        const pedidoDiv = document.createElement('div');
        pedidoDiv.className = 'bg-white p-4 rounded shadow mb-4';
        pedidoDiv.innerHTML = gerarHtmlPedido(pedido, pedidoId);
        DOM.pedidosFinalizadosContainer.appendChild(pedidoDiv);
    });
}

//Nova função para os finalizados
function setFiltroDatas(tipo) {
    const hoje = new Date();
    let dataInicio = new Date();
    let dataFim = new Date(hoje);

    // Zera as horas para evitar problemas com fuso horário
    hoje.setHours(0, 0, 0, 0);
    dataInicio.setHours(0, 0, 0, 0);
    dataFim.setHours(0, 0, 0, 0);

    switch (tipo) {
        case 'ontem':
            dataInicio.setDate(hoje.getDate() - 1);
            dataFim.setDate(hoje.getDate() - 1);
            break;
        case 'ultimos7dias':
            dataInicio.setDate(hoje.getDate() - 6);
            break;
        case 'ultimoMes':
            // Pega o primeiro e o último dia do mês anterior
            dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
            dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
            break;
        case 'ultimos3meses':
            // Pega de 3 meses atrás (mesma data) até hoje
            dataInicio.setMonth(hoje.getMonth() - 3);
            break;
    }

    // Formata e atribui os valores aos inputs da aba "Finalizados"
    DOM.inputDataInicio.value = dataInicio.toISOString().split('T')[0];
    DOM.inputDataFim.value = dataFim.toISOString().split('T')[0];

    // Chama a função que aplica o filtro
    aplicarFiltroDatas();
}

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
} //asdasdqdw

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

async function finalizarPedido(pedidoId) {
    try {
        const pedidoSnapshot = await pedidosRef.child(pedidoId).once('value');
        const pedido = pedidoSnapshot.val();

        if (!pedido) {
            console.error(`Pedido com ID ${pedidoId} não encontrado.`);
            alert('Erro: Pedido não encontrado para finalizar.');
            return;
        }

        if (pedido.cart && Array.isArray(pedido.cart)) {
            for (const itemPedido of pedido.cart) {
                await deduzirIngredientesDoEstoque(itemPedido);
            }
        }

        await pedidosRef.child(pedidoId).update({
            status: 'Finalizado',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        const mensagem = `✅ *Pedido finalizado!*

Muito obrigado, ${pedido.nomeCliente || ''}, por confiar em nosso serviço. 😄
Esperamos vê-lo novamente em breve! 🍽️🍕`;

        const telefoneLimpo = pedido.telefone ? pedido.telefone.replace(/\D/g, '') : '';
        if (telefoneLimpo) {
            window.open(`https://api.whatsapp.com/send?phone=${telefoneLimpo}&text=${encodeURIComponent(mensagem)}`, '_blank');
        } else {
            console.warn('Telefone do cliente não disponível para enviar mensagem de finalização.');
        }

    } catch (error) {
        console.error('Erro ao finalizar pedido e registrar consumo:', error);
        alert('Erro ao finalizar pedido. Verifique o console para mais detalhes.');
    }
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

    let produtos = pedido.cart.map(item => {
        let sizeInfo = item.size ? ` (${item.size})` : '';
        return `
        <li class="flex justify-between text-sm">
            <span>${item.quantity}x ${item.name}${sizeInfo}</span>
            <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
        </li>`;
    }).join('');

    let horario = pedido.timestamp ?
        new Date(pedido.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) :
        'Sem horário';

    let clienteInfo = `
        <p class="text-sm mb-1"><strong>Cliente:</strong> ${pedido.nomeCliente || '-'}</p>
        <p class="text-sm mb-1"><strong>Telefone:</strong> ${pedido.telefone || '-'}</p>
    `;

    let tipoAtendimentoInfo = '';
    if (pedido.tipoAtendimento === 'Mesa' || pedido.tipoAtendimento === 'Presencial') {
        tipoAtendimentoInfo = `<p class="text-sm mb-1"><strong>Atendimento:</strong> Presencial (Mesa ${pedido.mesaNumero || 'N/A'})</p>`;
        const totalExibido = (pedido.totalOriginal || pedido.totalPedido).toFixed(2);
        produtos += `<li class="flex justify-between text-sm mt-2 font-bold text-gray-800"><span>TOTAL ORIGINAL:</span><span>R$ ${totalExibido}</span></li>`;
        if (pedido.pagamentosRegistrados && pedido.pagamentosRegistrados.length > 0) {
            produtos += `<li class="flex justify-between text-sm font-bold text-gray-800"><span>PAGAMENTOS:</span></li>`;
            pedido.pagamentosRegistrados.forEach(pag => {
                produtos += `<li class="flex justify-between text-sm text-gray-700 ml-4"><span>- ${pag.metodo}:</span><span>R$ ${pag.valorPago.toFixed(2)}</span>`;
                if (pag.troco !== undefined && pag.troco !== null) {
                    produtos += `<span class="ml-2">(Troco: R$ ${pag.troco.toFixed(2)})</span>`;
                }
                produtos += `</li>`;
            });
        }
    }

    let pagamentoTexto = pedido.pagamento; // Define o valor padrão (ex: "Cartão", "Pix")

    if (pedido.pagamento === 'Dinheiro' && pedido.dinheiroTotal && pedido.dinheiroTotal > 0) {
        const valorPago = parseFloat(pedido.dinheiroTotal);
        const valorPedido = parseFloat(pedido.totalPedido);
        const troco = valorPago - valorPedido;

        if (troco >= 0.01) { // Usa uma pequena margem para evitar erros de ponto flutuante
            pagamentoTexto = `Dinheiro: R$ ${valorPago.toFixed(2)} (Troco: R$ ${troco.toFixed(2)})`;
        } else {
            pagamentoTexto = `Dinheiro: R$ ${valorPago.toFixed(2)} (Sem troco)`;
        }
    }

    return `
    <div class="flex flex-col justify-between h-full">
        <div>
            <h2 class="text-lg font-bold mb-2">Pedido (${horario})</h2>
            ${clienteInfo}
            ${tipoAtendimentoInfo}
            ${enderecoTexto}
            <p class="text-sm"><strong>Pagamento:</strong> ${pagamentoTexto}</p>
            <p class="text-sm"><strong>Obs:</strong> ${pedido.observacao || '-'}</p>
            <p class="text-sm"><strong>Entrega:</strong> ${pedido.tipoEntrega || 'N/A'}</p>
            <ul class="my-2 space-y-1">${produtos}</ul>
            <p class="font-bold text-green-600 text-lg">Total Final: R$ ${(pedido.totalPago || pedido.totalPedido).toFixed(2)}</p>
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

function imprimirPedido(pedidoId) {
    database.ref('pedidos/' + pedidoId).once('value').then(snapshot => {
        const pedido = snapshot.val();
        if (pedido) {
            gerarNota(pedido, pedidoId); // Pass pedidoId to gerarNota for completeness, though not strictly used in current note format
        } else {
            console.error('Pedido não encontrado para impressão:', pedidoId);
            alert('Erro: Pedido não encontrado para impressão.');
        }
    }).catch(error => {
        console.error('Erro ao carregar pedido para impressão:', error);
        alert('Erro ao carregar pedido para impressão.');
    });
}

/**
 * Gera um HTML para impressão de uma nota de pedido mais profissional.
 * @param {object} pedido - O objeto do pedido a ser impresso.
 * @param {string} pedidoId - O ID do pedido.
 */
function gerarNota(pedido, pedidoId) { // Added pedidoId parameter
    if (!pedido || !pedido.cart || !Array.isArray(pedido.cart)) {
        console.error("Dados do pedido inválidos para gerar a nota.");
        alert("Não foi possível gerar a nota: dados do pedido incompletos.");
        return;
    }

    const dataPedido = pedido.timestamp ? new Date(pedido.timestamp).toLocaleDateString('pt-BR') : 'N/A';
    const horaPedido = pedido.timestamp ? new Date(pedido.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';

    let itensHtml = '';
    pedido.cart.forEach(item => {
        let sizeInfo = item.pizzaSize || item.size ? ` (${item.pizzaSize || item.size})` : '';
        itensHtml += `
            <div class="item">
                <span class="item-qty">${item.quantity}x</span>
                <span class="item-name">${item.name}</span>
                <span class="item-total">R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
            </div>
        `;
        if (item.observacaoItem && item.observacaoItem.trim() !== '') {
            itensHtml += `<div class="item-obs">Obs: ${item.observacaoItem.trim()}</div>`;
        }
    });

    let enderecoInfo = '';
    if (pedido.tipoEntrega === 'Entrega' && pedido.endereco) {
        enderecoInfo = `
            <p><strong>Endereço:</strong> ${pedido.endereco.rua}, ${pedido.endereco.numero}</p>
            <p><strong>Bairro:</strong> ${pedido.endereco.bairro}</p>
            ${pedido.endereco.complemento ? `<p><strong>Complemento:</strong> ${pedido.endereco.complemento}</p>` : ''}
            ${pedido.referencia ? `<p><strong>Referência:</strong> ${pedido.referencia}</p>` : ''}
        `;
    } else {
        enderecoInfo = `<p><strong>Tipo de Entrega:</strong> Retirada no local</p>`;
    }

    let pagamentoInfo = `<p><strong>Método de Pagamento:</strong> ${pedido.pagamento || 'N/A'}</p>`;
    if (pedido.pagamento === 'Dinheiro') {
        const valorPago = parseFloat(pedido.dinheiroTotal || 0);
        const totalPedido = parseFloat(pedido.totalPedido || 0);
        const troco = valorPago - totalPedido;
        pagamentoInfo += `<p><strong>Valor Recebido:</strong> R$ ${valorPago.toFixed(2).replace('.', ',')}</p>`;
        if (troco > 0.01) { // Check for a meaningful troco amount
            pagamentoInfo += `<p><strong>Troco:</strong> R$ ${troco.toFixed(2).replace('.', ',')}</p>`;
        } else {
            pagamentoInfo += `<p><strong>Troco:</strong> Sem troco</p>`;
        }
    } else if (pedido.pagamento === 'Pix' && pedido.chavePix) {
         pagamentoInfo += `<p><strong>Chave Pix:</strong> ${pedido.chavePix}</p>`;
    }

    let observacaoGeral = pedido.observacao ? `<p><strong>Observações do Pedido:</strong> ${pedido.observacao}</p>` : '';

    let htmlContent = `
    <html>
    <head>
        <title>Pedido Bonanza #${pedidoId}</title>
        <style>
            @page {
                size: 80mm auto; /* Standard thermal printer width, auto height */
                margin: 0;
            }
            body {
                font-family: 'Consolas', 'Courier New', monospace; /* Monospace for alignment */
                font-size: 10pt;
                margin: 0;
                padding: 10mm 5mm; /* Top/Bottom padding, left/right for margins */
                box-sizing: border-box;
                line-height: 1.4;
                color: #000;
            }
            .header, .footer {
                text-align: center;
                margin-bottom: 10mm;
            }
            .header img {
                max-width: 50mm; /* Adjust logo size */
                height: auto;
                margin-bottom: 5mm;
            }
            .header h1 {
                font-size: 14pt;
                margin: 0;
                text-transform: uppercase;
                font-weight: bold;
            }
            .header p {
                font-size: 9pt;
                margin: 2mm 0;
            }
            .section {
                border-top: 1px dashed #000;
                padding-top: 5mm;
                margin-top: 5mm;
            }
            .section h2 {
                font-size: 11pt;
                margin: 0 0 3mm 0;
                font-weight: bold;
            }
            .section p {
                margin: 1mm 0;
            }
            .items-list {
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
                padding: 5mm 0;
                margin: 5mm 0;
            }
            .item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2mm;
            }
            .item-qty {
                flex: 0 0 20mm; /* Fixed width for quantity */
                text-align: left;
            }
            .item-name {
                flex-grow: 1;
                text-align: left;
                padding-right: 5mm;
            }
            .item-total {
                flex: 0 0 25mm; /* Fixed width for item total */
                text-align: right;
                font-weight: bold;
            }
            .item-obs {
                font-size: 8pt;
                margin-left: 20mm; /* Align with item name */
                margin-top: -1mm;
                margin-bottom: 2mm;
                color: #555;
            }
            .summary {
                text-align: right;
                font-size: 11pt;
                margin-top: 5mm;
            }
            .summary .total-line {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                margin-top: 3mm;
                font-size: 12pt;
            }
            .final-total {
                font-size: 14pt;
                color: green;
            }
            .dashed-line {
                border-top: 1px dashed #000;
                margin: 5mm 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="assets/iconnota.png" alt="Logo Bonanza"> <h1>Bonanza Pizzaria</h1>
            <p>Seu Melhor Sabor!</p>
            <p>Rua Benjamin Constant, nº 621</p>
            <p>Telefone: (14) 99816-5756</p>
        </div>

        <div class="section">
            <h2>Detalhes do Pedido #${pedidoId}</h2>
            <p><strong>Data:</strong> ${dataPedido}</p>
            <p><strong>Hora:</strong> ${horaPedido}</p>
            <p><strong>Cliente:</strong> ${pedido.nomeCliente || 'N/A'}</p>
            <p><strong>Telefone:</strong> ${pedido.telefone || 'N/A'}</p>
            ${pedido.garcom ? `<p><strong>Garçom:</strong> ${pedido.garcom}</p>` : ''}
            ${pedido.mesaNumero ? `<p><strong>Mesa:</strong> ${pedido.mesaNumero}</p>` : ''}
        </div>

        <div class="section">
            <h2>Informações de Entrega/Retirada</h2>
            ${enderecoInfo}
        </div>

        <div class="items-list">
            <h2>Itens do Pedido</h2>
            ${itensHtml}
        </div>

        <div class="section summary">
            <p>Subtotal: R$ ${pedido.totalPedido.toFixed(2).replace('.', ',')}</p>
            ${pedido.desconto && pedido.desconto > 0 ? `<p>Desconto: - R$ ${pedido.desconto.toFixed(2).replace('.', ',')}</p>` : ''}
            <div class="total-line final-total">
                <span>TOTAL A PAGAR:</span>
                <span>R$ ${pedido.totalPedido.toFixed(2).replace('.', ',')}</span>
            </div>
            ${pedido.totalPago && pedido.totalPago > 0 && pedido.totalPago !== pedido.totalPedido ? `<p>Total Pago: R$ ${pedido.totalPago.toFixed(2).replace('.', ',')}</p>` : ''}
            ${pedido.totalPago && pedido.totalPago > pedido.totalPedido ? `<p>Troco: R$ ${(pedido.totalPago - pedido.totalPedido).toFixed(2).replace('.', ',')}</p>` : ''}
        </div>

        <div class="section">
            <h2>Detalhes de Pagamento</h2>
            ${pagamentoInfo}
        </div>

        ${observacaoGeral ? `<div class="section"><p>${observacaoGeral}</p></div>` : ''}

        <div class="footer section">
            <p>Agradecemos a sua preferência!</p>
            <p>Volte Sempre!</p>
            <p>Desenvolvido por LGHN System</p>
        </div>
    </body>
    </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600'); // Reduced default size for thermal print preview
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        // Optionally close after printing, but often left open for user to review
        // printWindow.onafterprint = () => printWindow.close();
    } else {
        alert("Não foi possível abrir a janela de impressão. Por favor, verifique se pop-ups estão bloqueados.");
    }
}


// --- SEÇÃO: EDIÇÃO DE PEDIDOS lghn----------------------------------------------------------------------------------------------------------------------------------

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
        let sizeInfo = item.size ? ` (${item.size})` : '';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center gap-2 border p-2 rounded';
        itemDiv.innerHTML = `
            <input type="number" min="0" value="${item.quantity}"
                class="w-16 border p-1 rounded text-center item-quantity-input"
                data-index="${index}"
                data-name="${item.name}"
                data-price="${item.price}"
                data-size="${item.size || ''}"
            />
            <span class="flex-1 ml-2">${item.name}${sizeInfo}</span>
            <span class="item-total-price">R$ ${(item.price * item.quantity).toFixed(2)}</span> 
        `;
        container.appendChild(itemDiv);
    });

    container.querySelectorAll('.item-quantity-input').forEach(input => { // Usando a nova classe
        input.addEventListener('input', (event) => {
            const idx = parseInt(event.target.dataset.index);
            let newQuantity = parseInt(event.target.value, 10);

            // Validação de entrada: Garante que a quantidade seja um número e não seja negativa
            if (isNaN(newQuantity) || newQuantity < 0) {
                newQuantity = 0; // Define como 0 se for inválido ou negativo
            }

            // Atualiza o objeto pedidoOriginal.cart
            if (pedidoOriginal.cart[idx]) {
                pedidoOriginal.cart[idx].quantity = newQuantity;
                const itemPriceElement = event.target.closest('div').querySelector('.item-total-price'); // Usando a nova classe
                if (itemPriceElement) {
                    itemPriceElement.textContent = `R$ ${(pedidoOriginal.cart[idx].price * newQuantity).toFixed(2)}`;
                }
            }
        });
    });
}

const btnAdicionarItemModal = document.getElementById('btn-adicionar-item');
if (btnAdicionarItemModal) {
    btnAdicionarItemModal.addEventListener('click', () => {
        const nome = document.getElementById('novo-item-nome').value.trim();
        const preco = parseFloat(document.getElementById('novo-item-preco').value);
        const qtd = parseInt(document.getElementById('novo-item-quantidade').value, 10);

        if (!nome || isNaN(preco) || isNaN(qtd) || qtd <= 0 || preco <= 0) {
            alert('Preencha todos os campos corretamente com valores positivos.');
            return;
        }

        pedidoOriginal.cart = pedidoOriginal.cart || [];
        // Encontra um item existente com o mesmo nome e tamanho
        const existingItemIndex = pedidoOriginal.cart.findIndex(item => item.name === nome && item.size === ''); // Considerando que itens adicionados via modal não têm tamanho inicialmente
        
        if (existingItemIndex > -1) {
            pedidoOriginal.cart[existingItemIndex].quantity += qtd;
        } else {
            // Se não for uma pizza ou um item com tamanho específico, o size é vazio
            pedidoOriginal.cart.push({ name: nome, price: preco, quantity: qtd, size: '' }); 
        }

        document.getElementById('novo-item-nome').value = '';
        document.getElementById('novo-item-preco').value = '';
        document.getElementById('novo-item-quantidade').value = '1';

        renderizarItensModal(pedidoOriginal.cart);
    });
}

function salvarPedidoEditado() {
    // **A GRANDE MUDANÇA AQUI:**
    // Não leia os valores dos inputs novamente.
    // Use diretamente o `pedidoOriginal.cart` que já foi atualizado pelo evento 'input'.
    const novosItens = pedidoOriginal.cart.filter(item => item.quantity > 0);

    const novoTotalPedido = novosItens.reduce((sum, item) => sum + item.price * item.quantity, 0);

    database.ref('pedidos/' + pedidoEmEdicao).update({ cart: novosItens, totalPedido: novoTotalPedido })
        .then(() => {
            alert('Pedido atualizado com sucesso!');
            fecharModalEditarPedido();
        })
        .catch(error => {
            console.error('Erro ao salvar pedido:', error);
            alert('Erro ao salvar o pedido. Verifique o console para mais detalhes.');
        });
}

function fecharModalEditarPedido() {
    document.getElementById('modal-editar-pedido').classList.add('hidden');
    pedidoEmEdicao = null;
    pedidoOriginal = null;
    renderizarPedidos();
}


// --- SEÇÃO: GERENCIAMENTO DE CARDÁPIO ---

function mostrarNovoitem() {
    DOM.modalNovoItem.classList.remove("hidden");
    DOM.modalNovoItem.classList.add("flex");
    limparFormularioNovoItem();
}

function handleSalvarNovoItem() {
    const nome = DOM.novoNomeInput.value.trim();
    const descricao = DOM.novoDescricaoInput.value.trim();
    const preco = parseFloat(DOM.novoPrecoInput.value);
    const imagem = DOM.novoImagemInput.value.trim();
    const ativo = DOM.novoAtivoCheckbox.checked;
    // Pega a categoria principal da tela (pizzas, bebidas, etc.)
    const categoriaPrincipal = DOM.novoCategoriaSelect.value;
    // Pega o tipo (Salgado/Doce) do formulário
    const tipoDoItem = DOM.novoTipoSelect.value; 

    if (!categoriaPrincipal) {
        alert("Um erro ocorreu. A categoria principal (Pizzas, Bebidas, etc.) não foi encontrada.");
        return;
    }

    if (!nome || isNaN(preco) || preco <= 0) {
        alert("Preencha o nome e o preço corretamente. O preço deve ser um valor positivo.");
        return;
    }
    if (imagem && !imagem.startsWith('http')) {
        alert("Coloque uma URL de imagem válida (deve começar com http:// ou https://).");
        return;
    }

    // Monta o objeto do item, usando a variável correta para o tipo
    const novoItem = { nome, descricao, preco, imagem, ativo, tipo: tipoDoItem, receita: {} };

    // Salva na CATEGORIA PRINCIPAL correta
    database.ref(`produtos/${categoriaPrincipal}`).push(novoItem, (error) => {
        if (error) {
            alert("Erro ao adicionar item!");
            console.error("Erro ao adicionar item:", error);
        } else {
            alert("Item adicionado com sucesso!");
            DOM.modalNovoItem.classList.add("hidden");
            // Atualiza a visualização da CATEGORIA PRINCIPAL correta
            carregarItensCardapio(categoriaPrincipal, DOM.searchInput.value);
            limparFormularioNovoItem();
        }
    });
}

function limparFormularioNovoItem() {
    DOM.novoNomeInput.value = "";
    DOM.novoDescricaoInput.value = "";
    DOM.novoPrecoInput.value = "";
    DOM.novoImagemInput.value = "";
    if (DOM.previewNovaImagem) DOM.previewNovaImagem.classList.add("hidden");
    DOM.novoAtivoCheckbox.checked = true;
    DOM.novoTipoSelect.value = "salgado";
    if (DOM.novoCategoriaSelect) DOM.novoCategoriaSelect.value = "pizzas";
}

function carregarItensCardapio(categoria, searchQuery = '') {
    const container = DOM.itensCardapioContainer;
    if (!container) {
        console.error("Container de itens do cardápio não encontrado.");
        return;
    }
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
    }, (error) => {
        console.error("Erro ao carregar itens do cardápio:", error);
        container.innerHTML = `<p class="text-red-600 text-center col-span-full">Erro ao carregar itens do cardápio.</p>`;
    });
}

function criarCardItem(item, key, categoriaAtual) {
    const card = document.createElement("div");

    const destaquePromocao = categoriaAtual === "promocoes" ?
        "border-yellow-500 border-2 shadow-lg" :
        "border";

    card.className = `bg-white p-4 rounded ${destaquePromocao} flex flex-col gap-2`;

    const itemName = item.nome || item.titulo || '';
    const itemDescription = item.descricao || '';
    const itemPrice = item.preco || 0;
    const itemImage = item.imagem || '';
    const itemActive = item.ativo ? 'checked' : '';
    const itemType = item.tipo || "salgado";

    card.innerHTML = `
        ${categoriaAtual === "promocoes" ? '<span class="text-yellow-600 font-bold text-sm">🔥 Promoção</span>' : ''}
        <input type="text" value="${itemName}" placeholder="Nome" class="p-2 border rounded nome">
        <textarea placeholder="Descrição" class="p-2 border rounded descricao">${itemDescription}</textarea>
        <input type="number" value="${itemPrice}" step="0.01" class="p-2 border rounded preco">
        <input type="text" value="${itemImage}" placeholder="URL da Imagem" class="p-2 border rounded imagem">
        <img class="preview-img w-full h-32 object-cover rounded border ${itemImage ? '' : 'hidden'}" src="${itemImage}">
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
        <option value="pizza">Pizza</option>
        <option value="bebida">Bebida</option>
    `;
    selectTipo.value = itemType;
    card.appendChild(selectTipo);

    card.innerHTML += `
        <label class="flex items-center gap-2 text-sm text-gray-700 mt-2">
            <input type="checkbox" class="ativo" ${itemActive}> Ativo
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
        if (inputImagem.value.trim() !== "" && inputImagem.value.trim().startsWith('http')) {
            previewImg.src = inputImagem.value;
            previewImg.classList.remove("hidden");
        } else {
            previewImg.src = '';
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

        if (!nome || isNaN(preco) || preco <= 0) {
            alert("Preencha o nome e o preço corretamente. O preço deve ser um valor positivo.");
            return;
        }
        if (imagem && !imagem.startsWith('http')) {
            alert("Coloque uma URL de imagem válida para o item.");
            return;
        }

        const updates = {
            nome: nome,
            descricao: descricao,
            preco: preco,
            imagem: imagem,
            ativo: ativo,
            tipo: tipo
        };
        if (categoriaAtual === "promocoes") {
            updates.titulo = nome;
        }

        database.ref(`produtos/${categoriaAtual}/${key}`).update(updates, function(error) {
            if (error) {
                alert("Erro ao salvar! " + error.message);
                console.error("Erro ao salvar item:", error);
            } else {
                alert("Item atualizado com sucesso!");
            }
        });
    });

    card.querySelector(".excluir").addEventListener("click", function() {
        if (confirm("Tem certeza que deseja excluir este item?")) {
            database.ref(`produtos/${categoriaAtual}/${key}`).remove(() => {
                card.remove();
                alert("Item excluído com sucesso!");
            }).catch(error => {
                console.error("Erro ao excluir item:", error);
                alert("Erro ao excluir item: " + error.message);
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

        if (confirm(`Tem certeza que deseja mover "${itemName}" de "${categoriaAtual}" para "${targetCategory}"?`)) {
            const updatedItemData = {
                nome: card.querySelector(".nome").value,
                descricao: card.querySelector(".descricao").value,
                preco: parseFloat(card.querySelector(".preco").value),
                imagem: inputImagem.value,
                ativo: card.querySelector(".ativo").checked,
                tipo: card.querySelector(".tipo").value,
                receita: item.receita || {}
            };
            if (targetCategory === "promocoes") {
                updatedItemData.titulo = updatedItemData.nome;
            } else if (categoriaAtual === "promocoes" && updatedItemData.titulo) {
                delete updatedItemData.titulo;
            }

            database.ref(`produtos/${targetCategory}`).push(updatedItemData)
                .then(() => {
                    return database.ref(`produtos/${categoriaAtual}/${key}`).remove();
                })
                .then(() => {
                    alert(`Item movido de "${categoriaAtual}" para "${targetCategory}" com sucesso!`);
                    carregarItensCardapio(categoriaAtual, DOM.searchInput.value);
                })
                .catch(error => {
                    console.error("Erro ao mover item:", error);
                    alert("Erro ao mover item: " + error.message);
                });
        }
    });

    return card;
}


// --- SEÇÃO: HORÁRIOS DE FUNCIONAMENTO lghn--------------------------------------------------------------------------------------------------------------------------------------------------


function salvarHorariosNoFirebase(horarios) {
    database.ref('config/horarios')
        .set(horarios)
        .then(() => alert("Horários salvos com sucesso!"))
        .catch((error) => console.error("Erro ao salvar horários:", error));
}

function checkRestaurantOpen(horarios) {
    const agora = new Date();
    const diaSemana = agora.getDay();
    const horaAtual = agora.getHours();

    if (!horarios || !horarios[diaSemana]) return false;

    const configDia = horarios[diaSemana];
    if (!configDia.aberto) return false;

    return horaAtual >= configDia.inicio && horaAtual < configDia.fim;
}

function inicializarEditorHorario() {
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const containerHorario = document.getElementById("dias-container");
    const formHorario = document.getElementById("horario-form");
    const statusElement = document.getElementById("status");

    if (!containerHorario || !formHorario || !statusElement) {
        console.error("Elementos essenciais do editor de horário não encontrados.");
        return;
    }

    containerHorario.innerHTML = '';
    dias.forEach((dia, i) => {
        const linha = document.createElement("div");
        linha.className = "flex items-center gap-4 border-b pb-3 mb-3";
        linha.innerHTML = `
            <label class="w-28 font-semibold text-gray-700">${dia}</label>
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="aberto-${i}" class="form-checkbox h-5 w-5 text-blue-600" />
                <span class="text-gray-700">Aberto</span>
            </label>
            <input type="number" name="inicio-${i}" min="0" max="23" value="18" class="border p-1 w-16 rounded-md" />
            <span class="text-gray-600">às</span>
            <input type="number" name="fim-${i}" min="0" max="23" value="23" class="border p-1 w-16 rounded-md" />
        `;
        containerHorario.appendChild(linha);
    });

    database.ref('config/horarios').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const horariosSalvos = snapshot.val();
                for (let i = 0; i <= 6; i++) {
                    const diaConfig = horariosSalvos[i];
                    if (diaConfig) {
                        const abertoCheckbox = document.querySelector(`[name="aberto-${i}"]`);
                        const inicioInput = document.querySelector(`[name="inicio-${i}"]`);
                        const fimInput = document.querySelector(`[name="fim-${i}"]`);
                        if (abertoCheckbox) abertoCheckbox.checked = diaConfig.aberto;
                        if (inicioInput) inicioInput.value = diaConfig.inicio;
                        if (fimInput) fimInput.value = diaConfig.fim;
                    }
                }
            }
        })
        .catch(error => console.error("Erro ao carregar horários do Firebase:", error));

    formHorario.addEventListener("submit", (e) => {
        e.preventDefault();
        const horarios = {};
        let hasError = false;
        for (let i = 0; i <= 6; i++) {
            const aberto = document.querySelector(`[name="aberto-${i}"]`).checked;
            const inicio = parseInt(document.querySelector(`[name="inicio-${i}"]`).value);
            const fim = parseInt(document.querySelector(`[name="fim-${i}"]`).value);

            if (aberto && (isNaN(inicio) || isNaN(fim) || inicio < 0 || inicio > 23 || fim < 0 || fim > 24 || inicio >= fim)) {
                alert(`Por favor, verifique os horários de ${dias[i]}. Fim deve ser maior que início.`);
                hasError = true;
                return;
            }
            horarios[i] = { aberto, inicio, fim };
        }
        if (!hasError) {
            salvarHorariosNoFirebase(horarios);
        }
    });

    database.ref('config/horarios').on('value', snapshot => {
        if (snapshot.exists()) {
            const horarios = snapshot.val();
            const isOpen = checkRestaurantOpen(horarios);
            statusElement.textContent = isOpen ? "✅ Aberto agora" : "❌ Fechado agora";
            statusElement.className = isOpen ? "mb-4 text-green-700 font-bold" : "mb-4 text-red-700 font-bold";
        } else {
            statusElement.textContent = "Horários não configurados.";
            statusElement.className = "mb-4 text-gray-700 font-bold";
        }
    });
}



// --- SEÇÃO: GERENCIAMENTO DE MESAS lghn-----------------------------------------------------------------------------------------------------------------------------------------------------



DOM.btnConfigurarMesas.addEventListener('click', () => {
    const numMesas = parseInt(DOM.numMesasInput.value, 10);
    if (isNaN(numMesas) || numMesas < 1 || numMesas > 20) {
        alert("Por favor, insira um número de mesas válido entre 1 e 20.");
        return;
    }

    if (confirm(`Deseja configurar ${numMesas} mesas? Isso redefinirá o estado de todas as mesas existentes.`)) {
        mesasRef.remove()
            .then(() => {
                const updates = {};
                for (let i = 1; i <= numMesas; i++) {
                    updates[i] = {
                        numero: i,
                        status: 'Livre',
                        cliente: '',
                        garcom: '',
                        observacoes: '',
                        pedido: null,
                        total: 0,
                        pagamentosRegistrados: null,
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

function renderMesas(mesasData) {
    if (!DOM.mesasContainer) return;
    DOM.mesasContainer.innerHTML = '';
    const sortedMesas = Object.values(mesasData).sort((a, b) => a.numero - b.numero);

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
            <h3 class="text-2xl font-bold">Mesa ${mesa.numero}</h3>
            <span class="text-sm font-semibold ${mesa.status === 'Livre' ? 'text-green-700' : 'text-red-700'}">${mesa.status}</span>
            ${ocupiedInfo}
        `;
        DOM.mesasContainer.appendChild(card);
    });

    DOM.mesasContainer.querySelectorAll('.table-card').forEach(card => {
        card.addEventListener('click', () => abrirModalMesaDetalhes(card.dataset.mesaNumero));
    });
}

function carregarMesasDoFirebase() {
    mesasRef.once('value', (snapshot) => {
        const mesasData = snapshot.val() || {};
        if (Object.keys(mesasData).length === 0) {
            DOM.numMesasInput.value = 10;
            DOM.mesasContainer.innerHTML = '<p class="text-gray-600 text-center col-span-full">Nenhuma mesa configurada. Defina o número de mesas e clique em "Configurar Mesas".</p>';
        } else {
            DOM.numMesasInput.value = Object.keys(mesasData).length;
            renderMesas(mesasData);
        }
    }, (error) => {
        console.error("Erro ao carregar mesas iniciais:", error);
        DOM.mesasContainer.innerHTML = '<p class="text-red-600">Erro ao carregar mesas.</p>';
    });
}

async function abrirModalMesaDetalhes(mesaNumero) {
    currentMesaIdForCheckout = mesaNumero;
    try {
        const snapshot = await mesasRef.child(mesaNumero).once('value');
        const mesa = snapshot.val();

        if (!mesa) {
            alert('Mesa não encontrada ou foi removida.');
            return;
        }

        DOM.modalMesaNumero.textContent = mesa.numero;
        DOM.mesaDetalhesStatus.textContent = mesa.status;
        DOM.mesaDetalhesStatus.className = `font-semibold ${mesa.status === 'Livre' ? 'text-green-600' : 'text-red-600'}`;
        DOM.mesaDetalhesCliente.textContent = mesa.cliente || 'N/A';
        DOM.mesaDetalhesGarcom.textContent = mesa.garcom || 'N/A';
        DOM.mesaDetalhesObs.textContent = mesa.observacoes || 'N/A';

        currentMesaItemsToPay = mesa.pedido ? mesa.pedido.map(item => ({
            ...item,
            originalQuantity: item.quantity,
            remainingQuantity: item.quantity,
            selectedToPayQuantity: 0
        })) : [];

        currentMesaPaymentsHistory = mesa.pagamentosRegistrados || [];
        const totalAlreadyPaid = currentMesaPaymentsHistory.reduce((sum, p) => sum + p.valorPago, 0);

        currentMesaTotal = mesa.total || 0;
        currentMesaRemainingToPay = currentMesaTotal - totalAlreadyPaid;
        if (Math.abs(currentMesaRemainingToPay) < 0.01) {
            currentMesaRemainingToPay = 0;
        }

        DOM.mesaTotalOriginal.textContent = `R$ ${currentMesaTotal.toFixed(2)}`;
        DOM.mesaTotalPago.textContent = `R$ ${totalAlreadyPaid.toFixed(2)}`;
        DOM.mesaRestantePagar.textContent = `R$ ${currentMesaRemainingToPay.toFixed(2)}`;

        renderMesaItemsForCheckout();
        renderPagamentoHistory();

        DOM.valorAPagarInput.value = currentMesaRemainingToPay.toFixed(2);
        DOM.dividirPorInput.value = '';
        DOM.pagamentoMetodoAtual.value = '';
        DOM.trocoRecebidoInput.value = '';
        DOM.trocoInputGroup.classList.add('hidden');

        DOM.btnAdicionarPagamento.disabled = true;
        DOM.btnDividirRestante.disabled = currentMesaRemainingToPay <= 0.01;
        DOM.btnFinalizarContaMesa.disabled = currentMesaRemainingToPay > 0.01;

        if (mesa.status === 'Livre' || !mesa.pedido || mesa.pedido.length === 0) {
            DOM.btnCancelarPedidoMesa.classList.add('hidden');
            DOM.btnFinalizarContaMesa.disabled = true;
            DOM.mesaItensSelecaoContainer.innerHTML = '<p class="text-gray-500 text-center" id="empty-items-message">Nenhum item para exibir ou mesa livre.</p>';
            DOM.emptyItemsMessage.classList.remove('hidden');
        } else {
            DOM.btnCancelarPedidoMesa.classList.remove('hidden');
        }

        updateCheckoutStatus();
        DOM.modalMesaDetalhes.classList.remove('hidden');
        DOM.modalMesaDetalhes.classList.add('flex');


    } catch (error) {
        console.error("Erro ao abrir modal de mesa:", error);
        alert("Erro ao carregar detalhes da mesa.");
    }
}

function fecharModalMesaDetalhes() {
    DOM.modalMesaDetalhes.classList.add('hidden');
    currentMesaIdForCheckout = null;
    currentMesaItemsToPay = [];
    currentMesaTotal = 0;
    currentMesaRemainingToPay = 0;
    currentMesaPaymentsHistory = [];
}

function renderMesaItemsForCheckout() {
    if (!DOM.mesaItensSelecaoContainer) return;
    DOM.mesaItensSelecaoContainer.innerHTML = '';
    DOM.emptyItemsMessage.classList.add('hidden');

    const pendingItems = currentMesaItemsToPay.filter(item => item.remainingQuantity > 0.001);

    if (pendingItems.length === 0 && currentMesaRemainingToPay > 0) {
        DOM.emptyItemsMessage.classList.remove('hidden');
        DOM.emptyItemsMessage.textContent = 'Todos os itens foram marcados para pagamento, mas ainda há um saldo remanescente.';
    } else if (pendingItems.length === 0 && currentMesaRemainingToPay <= 0) {
        DOM.emptyItemsMessage.classList.remove('hidden');
        DOM.emptyItemsMessage.textContent = 'Todos os itens foram pagos.';
    } else if (pendingItems.length > 0) {
        DOM.emptyItemsMessage.classList.add('hidden');
    }

    pendingItems.forEach((item, index) => {
        let sizeInfo = item.size ? ` (${item.size})` : '';
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center gap-2 border-b border-gray-200 py-2 last:border-b-0';
        itemDiv.innerHTML = `
            <div class="flex-1">
                <p class="font-medium text-gray-800">${item.name}${sizeInfo}</p>
                <p class="text-sm text-gray-600">Total: ${item.originalQuantity} un. | Restante: ${item.remainingQuantity.toFixed(2)} un.</p>
            </div>
            <div class="flex items-center gap-2">
                <button class="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-700 decrease-pay-quantity-btn" data-index="${index}" ${item.selectedToPayQuantity === 0 ? 'disabled' : ''}>-</button>
                <input type="number" class="w-16 p-1 border rounded text-center selected-pay-quantity-input"
                        value="${item.selectedToPayQuantity.toFixed(0)}" min="0" max="${item.remainingQuantity.toFixed(0)}" step="1" data-index="${index}">
                <button class="px-2 py-1 bg-blue-200 rounded-md hover:bg-blue-300 text-blue-800 increase-pay-quantity-btn" data-index="${index}" ${item.selectedToPayQuantity >= item.remainingQuantity ? 'disabled' : ''}>+</button>
            </div>
            <span class="text-gray-700 font-semibold w-20 text-right">R$ ${(item.price * item.selectedToPayQuantity).toFixed(2)}</span>
        `;
        DOM.mesaItensSelecaoContainer.appendChild(itemDiv);
    });

    DOM.mesaItensSelecaoContainer.querySelectorAll('.decrease-pay-quantity-btn').forEach(button => {
        button.addEventListener('click', handlePayQuantityButton);
    });
    DOM.mesaItensSelecaoContainer.querySelectorAll('.increase-pay-quantity-btn').forEach(button => {
        button.addEventListener('click', handlePayQuantityButton);
    });
    DOM.mesaItensSelecaoContainer.querySelectorAll('.selected-pay-quantity-input').forEach(input => {
        input.addEventListener('input', handlePayQuantityInput);
    });

    DOM.valorAPagarInput.value = calculateSelectedItemsTotalForCurrentPayment().toFixed(2);
    updateCheckoutStatus();
}

function handlePayQuantityButton(event) {
    const button = event.target.closest('button');
    const indexInFilteredList = parseInt(button.dataset.index);
    const item = currentMesaItemsToPay.filter(i => i.remainingQuantity > 0.001)[indexInFilteredList];

    if (!item) return;

    const step = 1;

    if (button.classList.contains('increase-pay-quantity-btn')) {
        item.selectedToPayQuantity = Math.min(item.remainingQuantity, item.selectedToPayQuantity + step);
    } else if (button.classList.contains('decrease-pay-quantity-btn')) {
        item.selectedToPayQuantity = Math.max(0, item.selectedToPayQuantity - step);
    }
    item.selectedToPayQuantity = Math.round(item.selectedToPayQuantity);

    renderMesaItemsForCheckout();
}

function handlePayQuantityInput(event) {
    const input = event.target;
    const indexInFilteredList = parseInt(input.dataset.index);
    const item = currentMesaItemsToPay.filter(i => i.remainingQuantity > 0.001)[indexInFilteredList];

    if (!item) return;

    let newQuantity = parseInt(input.value, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
        newQuantity = 0;
    }
    newQuantity = Math.min(newQuantity, Math.round(item.remainingQuantity));

    item.selectedToPayQuantity = newQuantity;
    input.value = newQuantity.toFixed(0);

    DOM.valorAPagarInput.value = calculateSelectedItemsTotalForCurrentPayment().toFixed(2);
    updateCheckoutStatus();
}

function calculateSelectedItemsTotalForCurrentPayment() {
    return currentMesaItemsToPay.reduce((sum, item) => sum + (item.price * item.selectedToPayQuantity), 0);
}

function renderPagamentoHistory() {
    if (!DOM.historicoPagamentosContainer) return;
    DOM.historicoPagamentosContainer.innerHTML = '';
    DOM.emptyPaymentsMessage.classList.add('hidden');

    if (currentMesaPaymentsHistory.length === 0) {
        DOM.emptyPaymentsMessage.classList.remove('hidden');
        return;
    }

    currentMesaPaymentsHistory.forEach((payment, index) => {
        const paymentDiv = document.createElement('div');
        paymentDiv.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md mb-1';
        let trocoInfo = '';
        if (payment.troco !== null && payment.troco !== undefined && payment.troco > 0) {
            trocoInfo = `<span class="text-xs text-gray-600 ml-2">(Troco: R$ ${payment.troco.toFixed(2)})</span>`;
        } else if (payment.troco !== null && payment.troco !== undefined && payment.troco === 0) {
            trocoInfo = `<span class="text-xs text-gray-600 ml-2">(Sem troco)</span>`;
        }

        paymentDiv.innerHTML = `
            <span>${index + 1}. ${payment.metodo} - R$ ${payment.valorPago.toFixed(2)} ${trocoInfo}</span>
            <button class="text-red-500 hover:text-red-700 remove-payment-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
        `;
        DOM.historicoPagamentosContainer.appendChild(paymentDiv);
    });

    DOM.historicoPagamentosContainer.querySelectorAll('.remove-payment-btn').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (event) => {
            const indexToRemove = parseInt(event.target.closest('button').dataset.index);
            removePayment(indexToRemove);
        });
    });
}

function removePayment(index) {
    const payment = currentMesaPaymentsHistory[index];
    if (!payment) return;

    if (!confirm(`Tem certeza que deseja remover este pagamento de R$ ${payment.valorPago.toFixed(2)} (${payment.metodo})?`)) {
        return;
    }

    currentMesaPaymentsHistory.splice(index, 1);

    if (payment.itemsPaid) {
        payment.itemsPaid.forEach(paidItem => {
            const originalItem = currentMesaItemsToPay.find(item =>
                item.name === paidItem.name && (item.size || '') === (paidItem.size || '')
            );
            if (originalItem) {
                originalItem.remainingQuantity += paidItem.quantity;
                if (originalItem.remainingQuantity > originalItem.originalQuantity + 0.001) {
                    originalItem.remainingQuantity = originalItem.originalQuantity;
                }
            }
        });
    }

    const totalPaidSoFar = currentMesaPaymentsHistory.reduce((sum, p) => sum + p.valorPago, 0);
    currentMesaRemainingToPay = currentMesaTotal - totalPaidSoFar;
    if (Math.abs(currentMesaRemainingToPay) < 0.01) {
        currentMesaRemainingToPay = 0;
    }

    currentMesaItemsToPay.forEach(item => item.selectedToPayQuantity = 0);

    DOM.valorAPagarInput.value = currentMesaRemainingToPay.toFixed(2);

    renderMesaItemsForCheckout();
    renderPagamentoHistory();
    updateCheckoutStatus();
}

function updateCheckoutStatus() {
    let valueToPayInput = parseFloat(DOM.valorAPagarInput.value) || 0;
    const currentPaymentMethod = DOM.pagamentoMetodoAtual.value;
    const trocoReceived = parseFloat(DOM.trocoRecebidoInput.value) || 0;

    const totalPaidSoFar = currentMesaPaymentsHistory.reduce((sum, p) => sum + p.valorPago, 0);

    currentMesaRemainingToPay = currentMesaTotal - totalPaidSoFar;
    if (Math.abs(currentMesaRemainingToPay) < 0.01) {
        currentMesaRemainingToPay = 0;
    }

    DOM.mesaTotalPago.textContent = `R$ ${totalPaidSoFar.toFixed(2)}`;
    DOM.mesaRestantePagar.textContent = `R$ ${currentMesaRemainingToPay.toFixed(2)}`;

    if (currentMesaRemainingToPay <= 0) {
        DOM.valorAPagarInput.value = '0.00';
        DOM.valorAPagarInput.disabled = true;
        DOM.pagamentoMetodoAtual.disabled = true;
        DOM.trocoRecebidoInput.disabled = true;
        DOM.btnAdicionarPagamento.disabled = true;
        DOM.btnDividirRestante.disabled = true;
        DOM.btnFinalizarContaMesa.disabled = false;
    } else {
        DOM.valorAPagarInput.disabled = false;
        DOM.pagamentoMetodoAtual.disabled = false;
        DOM.trocoRecebidoInput.disabled = false;
        DOM.btnFinalizarContaMesa.disabled = true;
    }

    const hasValueToPay = valueToPayInput > 0;
    const isValueWithinRemaining = valueToPayInput <= currentMesaRemainingToPay + 0.01;

    const anyItemSelected = currentMesaItemsToPay.some(item => item.selectedToPayQuantity > 0);
    const payingFullRemaining = Math.abs(valueToPayInput - currentMesaRemainingToPay) < 0.01;

    if (currentPaymentMethod === 'Dinheiro') {
        DOM.trocoInputGroup.classList.remove('hidden');
        const hasEnoughChange = trocoReceived >= valueToPayInput;
        DOM.btnAdicionarPagamento.disabled = !(hasValueToPay && currentPaymentMethod && isValueWithinRemaining && hasEnoughChange && (anyItemSelected || payingFullRemaining));
    } else {
        DOM.trocoInputGroup.classList.add('hidden');
        DOM.trocoRecebidoInput.value = '';
        DOM.btnAdicionarPagamento.disabled = !(hasValueToPay && currentPaymentMethod && isValueWithinRemaining && (anyItemSelected || payingFullRemaining));
    }

    const numPessoasDividir = parseInt(DOM.dividirPorInput.value, 10);
    DOM.btnDividirRestante.disabled = currentMesaRemainingToPay <= 0.01 || isNaN(numPessoasDividir) || numPessoasDividir <= 0;
}

async function adicionarPagamentoMesa() {
    // ... (validações existentes)

    const valueToPay = parseFloat(DOM.valorAPagarInput.value);
    const currentPaymentMethod = DOM.pagamentoMetodoAtual.value;
    const trocoReceived = parseFloat(DOM.trocoRecebidoInput.value) || 0;
    const trocoADevolver = currentPaymentMethod === 'Dinheiro' ? trocoReceived - valueToPay : 0;

    // Rastrear itens que são considerados pagos nesta parcela
    let itemsPaidInThisInstallment = [];
    let amountToDistribute = valueToPay;

    // Distribuir pagamento entre os itens com base na quantidade restante
    // Esta é uma distribuição simplificada (proporcional ou simplesmente marcando todos os itens restantes se o pagamento os cobrir)
    // Um sistema mais avançado permitiria selecionar itens específicos para pagar.
    const itemsToProcess = currentMesaItemsToPay.filter(item => item.remainingQuantity > 0.001);
    const totalRemainingItemsValue = itemsToProcess.reduce((sum, item) => sum + (item.price * item.remainingQuantity), 0);

    itemsToProcess.forEach(item => {
        if (item.remainingQuantity > 0.001 && amountToDistribute > 0.001) {
            let quantityToPayForThisItem = 0;
            if (totalRemainingItemsValue > 0) {
                 // Pagamento proporcional para cada item
                const proportion = (item.price * item.remainingQuantity) / totalRemainingItemsValue;
                quantityToPayForThisItem = (amountToDistribute * proportion) / item.price;
            } else {
                 // Se totalRemainingItemsValue for 0, esta lógica não será alcançada se amountToDistribute > 0.
                 // Este caso deve idealmente significar que todos os itens estão pagos.
                 // Retornar para pagar a quantidade restante se for o único que resta e o valor cobrir.
                if (amountToDistribute >= item.price * item.remainingQuantity) {
                    quantityToPayForThisItem = item.remainingQuantity;
                } else {
                    quantityToPayForThisItem = amountToDistribute / item.price;
                }
            }


            // Garantir que não "super-pague" a quantidade de um item
            if (quantityToPayForThisItem > item.remainingQuantity) {
                quantityToPayForThisItem = item.remainingQuantity;
            }

            itemsPaidInThisInstallment.push({
                name: item.name,
                price: item.price,
                quantity: parseFloat(quantityToPayForThisItem.toFixed(3)), // Usar 3 casas decimais para precisão
                size: item.size || undefined // Manter o tamanho se existir
            });
            amountToDistribute -= (quantityToPayForThisItem * item.price);
        }
    });

    // Atualizar remainingQuantity para itens localmente
    itemsPaidInThisInstallment.forEach(paidItem => {
        const originalItem = currentMesaItemsToPay.find(item =>
            item.name === paidItem.name && (item.size || '') === (paidItem.size || '') // Corresponder por nome e tamanho
        );
        if (originalItem) {
            originalItem.remainingQuantity -= paidItem.quantity;
            if (originalItem.remainingQuantity < 0.001) originalItem.remainingQuantity = 0; // Prevenir números negativos pequenos
        }
    });

    // Adicionar pagamento ao histórico
    currentMesaPaymentsHistory.push({
        metodo: currentPaymentMethod,
        valorPago: valueToPay,
        valorRecebido: currentPaymentMethod === 'Dinheiro' ? trocoReceived : null,
        troco: currentPaymentMethod === 'Dinheiro' ? trocoADevolver : null,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        itemsPaid: itemsPaidInThisInstallment // Armazenar quais itens este pagamento cobriu
    });

    // Atualizar mesa no Firebase
    await mesasRef.child(currentMesaIdForCheckout).update({
        pagamentosRegistrados: currentMesaPaymentsHistory,
        // Não é necessário atualizar o array 'pedido' aqui, pois os itens são conceitualmente "pagos", mas ainda fazem parte da conta.
        // O campo 'total' também permanece o total original.
    });

    // Atualizar elementos da UI
    DOM.valorAPagarInput.value = (currentMesaRemainingToPay - valueToPay).toFixed(2); // Atualizar input para o próximo pagamento
    DOM.trocoRecebidoInput.value = '';
    DOM.pagamentoMetodoAtual.value = '';
    renderMesaItemsForCheckout(); // Renderizar novamente os itens mostrando as quantidades restantes atualizadas
    renderPagamentoHistory(); // Renderizar novamente o histórico de pagamentos
    updateCheckoutStatus(); // Recalcular e atualizar a exibição dos totais

    if (currentPaymentMethod === 'Dinheiro' && trocoADevolver > 0) {
        alert(`Pagamento adicionado com sucesso!\nTROCO A DEVOLVER: R$ ${trocoADevolver.toFixed(2)}`);
    } else {
        alert('Pagamento adicionado com sucesso!');
    }
}

function dividirContaMesa() {
    const numPessoas = parseInt(DOM.dividirPorInput.value, 10);
    if (isNaN(numPessoas) || numPessoas <= 0) {
        alert('Por favor, digite um número válido de pessoas para dividir.');
        return;
    }
    if (currentMesaRemainingToPay <= 0.01) {
        alert('Não há valor restante para dividir.');
        return;
    }

    const valorPorPessoa = currentMesaRemainingToPay / numPessoas;
    DOM.valorAPagarInput.value = valorPorPessoa.toFixed(2);

    DOM.dividirPorInput.value = '';
    updateCheckoutStatus();

    alert(`O valor por pessoa (R$ ${valorPorPessoa.toFixed(2)}) foi preenchido no campo "Valor desta Parcela". Agora, selecione o método de pagamento e clique em "Adicionar Pagamento".`);
}

function cancelarPedidoMesa() {
    if (!currentMesaIdForCheckout) return;

    if (currentMesaPaymentsHistory.length > 0) {
        alert('Não é possível cancelar um pedido de mesa que já possui pagamentos registrados. Se precisar, remova os pagamentos um por um antes de cancelar.');
        return;
    }

    if (confirm(`Tem certeza que deseja CANCELAR COMPLETAMENTE o pedido da Mesa ${currentMesaIdForCheckout}? A mesa será liberada e o pedido NÃO será registrado como venda finalizada.`)) {
        mesasRef.child(currentMesaIdForCheckout).update({
            status: 'Livre',
            cliente: '',
            garcom: '',
            observacoes: '',
            pedido: null,
            total: 0,
            pagamentosRegistrados: null
        })
            .then(() => {
                alert(`Pedido da Mesa ${currentMesaIdForCheckout} cancelado e mesa liberada.`);
                fecharModalMesaDetalhes();
            })
            .catch(error => {
                console.error("Erro ao cancelar pedido da mesa:", error);
                alert("Erro ao cancelar pedido da mesa.");
            });
    }
}

async function finalizarContaMesa() {
    // ... (validações existentes)

    if (confirm(`Confirmar FINALIZAÇÃO da conta da Mesa ${currentMesaIdForCheckout}?`)) {
        try {
            const mesaSnapshot = await mesasRef.child(currentMesaIdForCheckout).once('value');
            const mesaAtual = mesaSnapshot.val();

            if (!mesaAtual) {
                alert('Erro: Dados da mesa não encontrados para finalizar a conta.');
                return;
            }

            // 1. Deduzir ingredientes do estoque (APENAS UMA VEZ por pedido concluído)
            // Isso é crucial para o gerenciamento do seu estoque.
            if (mesaAtual.pedido && Array.isArray(mesaAtual.pedido)) {
                for (const itemPedido of mesaAtual.pedido) {
                    await deduzirIngredientesDoEstoque(itemPedido);
                }
            }

            // 2. Criar uma nova entrada na coleção 'pedidos' para registro histórico
            const novoPedidoId = firebase.database().ref('pedidos').push().key; // Obter um ID único
            const pedidoFinalizado = {
                tipoAtendimento: 'Presencial', // Novo tipo de pedido
                mesaNumero: mesaAtual.numero,
                nomeCliente: mesaAtual.cliente,
                garcom: mesaAtual.garcom,
                observacao: mesaAtual.observacoes,
                cart: mesaAtual.pedido, // O pedido completo
                totalOriginal: mesaAtual.total, // O total original da mesa
                totalPago: currentMesaTotal, // O total pago (deve ser igual ao totalOriginal)
                pagamentosRegistrados: currentMesaPaymentsHistory, // Todos os pagamentos registrados
                status: 'Finalizado', // Marcar como finalizado
                timestamp: firebase.database.ServerValue.TIMESTAMP // Quando foi finalizado
            };

            await firebase.database().ref('pedidos/' + novoPedidoId).set(pedidoFinalizado);

            // 3. Redefinir a mesa na coleção 'mesas'
            await mesasRef.child(currentMesaIdForCheckout).update({
                status: 'Livre',
                cliente: '',
                garcom: '',
                observacoes: '',
                pedido: null, // Limpar o pedido
                total: 0,
                pagamentosRegistrados: null // Limpar histórico de pagamentos para a mesa
            });

            alert(`Conta da Mesa ${mesaAtual.numero} finalizada e mesa liberada!`);
            fecharModalMesaDetalhes();
        } catch (error) {
            console.error("Erro ao finalizar conta da mesa:", error);
            alert("Erro ao finalizar conta da mesa. Verifique o console para mais detalhes.");
        }
    }
}

async function deduzirIngredientesDoEstoque(itemPedido) {
    let produtoRefPath = null;
    const categories = ['pizzas', 'bebidas', 'esfirras', 'calzone', 'promocoes', 'novidades'];

    for (const cat of categories) {
        let productsSnapshot = await produtosRef.child(cat).orderByChild('nome').equalTo(itemPedido.name).once('value');

        if (!productsSnapshot.exists() && (cat === 'promocoes' || cat === 'novidades')) {
            productsSnapshot = await produtosRef.child(cat).orderByChild('titulo').equalTo(itemPedido.name).once('value');
        }

        if (productsSnapshot.exists()) {
            const productId = Object.keys(productsSnapshot.val())[0];
            produtoRefPath = `${cat}/${productId}`;
            break;
        }
    }

    if (produtoRefPath) {
        const produtoSnapshot = await produtosRef.child(produtoRefPath).once('value');
        const produtoAssociado = produtoSnapshot.val();

        if (produtoAssociado) {
            let receitaParaConsumo = null;
            const isPizza = produtoAssociado.tipo === 'pizza';

            if (isPizza && itemPedido.size) {
                receitaParaConsumo = produtoAssociado.receita?.[itemPedido.size.toLowerCase()];
            } else {
                receitaParaConsumo = produtoAssociado.receita;
            }

            if (receitaParaConsumo) {
                for (const ingredienteId in receitaParaConsumo) {
                    const quantidadePorUnidadeProduto = receitaParaConsumo[ingredienteId];
                    const quantidadeTotalConsumida = quantidadePorUnidadeProduto * itemPedido.quantity;
                    const custoUnitario = allIngredients[ingredienteId]?.custoUnitarioMedio || 0;
                    const custoTotalConsumido = quantidadeTotalConsumida * custoUnitario;

                    const ingredienteRef = ingredientesRef.child(ingredienteId);
                    await ingredienteRef.transaction(currentData => {
                        if (currentData) {
                            currentData.quantidadeUsadaMensal = (currentData.quantidadeUsadaMensal || 0) + quantidadeTotalConsumida;
                            currentData.custoUsadoMensal = (currentData.custoUsadoMensal || 0) + custoTotalConsumido;
                            currentData.quantidadeUsadaDiaria = (currentData.quantidadeUsadaDiaria || 0) + quantidadeTotalConsumida;
                            currentData.custoUsadaDiaria = (currentData.custoUsadaDiaria || 0) + custoTotalConsumido;
                            currentData.ultimaAtualizacaoConsumo = firebase.database.ServerValue.TIMESTAMP;
                            currentData.quantidadeAtual = (currentData.quantidadeAtual || 0) - quantidadeTotalConsumida;
                        }
                        return currentData;
                    });
                    console.log(`Consumo de ${allIngredients[ingredienteId]?.nome || ingredienteId} incrementado: Qtd: ${quantidadeTotalConsumida.toFixed(3)}, Custo: R$ ${custoTotalConsumido.toFixed(2)}. Estoque atualizado.`);
                }
            } else {
                console.warn(`Receita para o produto "${itemPedido.name}" (Tamanho: ${itemPedido.size || 'N/A'}) não encontrada ou não configurada. O consumo de ingredientes não será registrado para este item.`);
            }
        } else {
            console.warn(`Produto "${itemPedido.name}" não encontrado no Firebase para dedução de estoque.`);
        }
    } else {
        console.warn(`Produto "${itemPedido.name}" não encontrado em nenhuma categoria para dedução de estoque.`);
    }
}


// --- SEÇÃO: RELATÓRIOS E ANÁLISES lghn---------------------------------------------------------------------------------------------------------------------------------------------------



function setRelatorioDateRange(daysAgoStart = 0, daysAgoEnd = 0, monthsAgo = 0) {
    const today = new Date();
    let startDate = new Date(today);
    let endDate = new Date(today);

    if (monthsAgo > 0) {
        if (monthsAgo === 1) {
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0); // Último dia do mês anterior
        } else if (monthsAgo === 3) {
            startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            // endDate aqui deveria ser o último dia do mês atual para incluir 3 meses completos até o presente.
            // A sua função original estava: new Date(today.getFullYear(), today.getMonth() + 1, 0);
            // Que resulta no último dia do mês atual. Mantendo para consistência com o que você já tem.
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
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

    DOM.relatorioDataInicio.value = formatDate(startDate);
    DOM.relatorioDataFim.value = formatDate(endDate);

    gerarRelatorios();
}

// --- FUNÇÃO PRINCIPAL PARA GERAR TODOS OS RELATÓRIOS ---
function gerarRelatorios() {
    const inicio = DOM.relatorioDataInicio.value;
    const fim = DOM.relatorioDataFim.value;

    if (!inicio || !fim) {
        alert("Por favor, selecione as datas de início e fim para gerar os relatórios.");
        return;
    }

    const dataInicioTimestamp = parseDateAsLocal(inicio).setHours(0, 0, 0, 0);
    const dataFimTimestamp = parseDateAsLocal(fim).setHours(23, 59, 59, 999);

    if (dataInicioTimestamp > dataFimTimestamp) {
        alert("A data de início não pode ser posterior à data de fim.");
        return;
    }

    // Destruir instâncias de gráficos existentes para evitar sobreposição
    if (topProdutosChartInstance) topProdutosChartInstance.destroy();
    if (vendasPorDiaChartInstance) vendasPorDiaChartInstance.destroy();
    if (horariosPicoChartInstance) horariosPicoChartInstance.destroy();
    if (metodosPagamentoChartInstance) metodosPagamentoChartInstance.destroy();
    if (topClientesChartInstance) topClientesChartInstance.destroy();
    if (tiposEntregaChartInstance) tiposEntregaChartInstance.destroy(); // NOVO: Destruir a instância do gráfico de tipos de entrega

    // Limpar resumos e esconder os canvas antes de carregar novos dados
    const loadingMessage = '<p class="text-gray-600">Carregando...</p>';
    DOM.topProdutosSummary.innerHTML = loadingMessage;
    DOM.vendasPorDiaSummary.innerHTML = loadingMessage;
    DOM.horariosPicoSummary.innerHTML = loadingMessage;
    DOM.metodosPagamentoSummary.innerHTML = loadingMessage;
    DOM.topClientesSummary.innerHTML = loadingMessage;
    DOM.tiposEntregaSummary.innerHTML = loadingMessage; // NOVO: Limpar o sumário de tipos de entrega

    DOM.topProdutosChartCanvas.style.display = 'none';
    DOM.vendasPorDiaChartCanvas.style.display = 'none';
    DOM.horariosPicoChartCanvas.style.display = 'none';
    DOM.metodosPagamentoChartCanvas.style.display = 'none';
    DOM.topClientesChartCanvas.style.display = 'none';
    DOM.tiposEntregaChartCanvas.style.display = 'none'; // NOVO: Esconder o canvas de tipos de entrega


    // Carregar dados de pedidos e filtrar pelo período e status
    // Utilize 'pedidosRef' que já está conectado ao seu Firebase database.ref('pedidos')
    pedidosRef.orderByChild('timestamp').once('value', (snapshot) => {
        const pedidosNoPeriodo = [];
        snapshot.forEach(childSnapshot => {
            const pedido = childSnapshot.val();
            // Apenas pedidos com status 'Finalizado' são considerados para a maioria dos relatórios de vendas.
            if (pedido.status === 'Finalizado' && pedido.timestamp >= dataInicioTimestamp && pedido.timestamp <= dataFimTimestamp) {
                pedidosNoPeriodo.push(pedido);
            }
        });

        if (pedidosNoPeriodo.length === 0) {
            const noDataMessage = '<p class="text-gray-600">Nenhum pedido finalizado no período selecionado.</p>';
            DOM.topProdutosSummary.innerHTML = noDataMessage;
            DOM.vendasPorDiaSummary.innerHTML = noDataMessage;
            DOM.horariosPicoSummary.innerHTML = noDataMessage;
            DOM.metodosPagamentoSummary.innerHTML = noDataMessage;
            DOM.topClientesSummary.innerHTML = noDataMessage;
            DOM.tiposEntregaSummary.innerHTML = noDataMessage; // NOVO: Exibir mensagem para o novo relatório

            DOM.topProdutosChartCanvas.style.display = 'none';
            DOM.vendasPorDiaChartCanvas.style.display = 'none';
            DOM.horariosPicoChartCanvas.style.display = 'none';
            DOM.metodosPagamentoChartCanvas.style.display = 'none';
            DOM.topClientesChartCanvas.style.display = 'none';
            DOM.tiposEntregaChartCanvas.style.display = 'none'; // NOVO: Esconder canvas
            return;
        }

        // Chamar as funções de análise para cada relatório
        analisarProdutosMaisVendidos(pedidosNoPeriodo);
        analisarVendasPorDiaDaSemana(pedidosNoPeriodo);
        analisarHorariosDePico(pedidosNoPeriodo);
        analisarMetodosDePagamento(pedidosNoPeriodo);
        analisarPessoasQueMaisCompraram(pedidosNoPeriodo);
        analisarTiposDeEntrega(pedidosNoPeriodo); // NOVO: Chamar a nova função de análise
    }, (error) => {
        console.error("Erro ao carregar pedidos para relatórios:", error);
        const errorMessage = '<p class="text-red-600">Erro ao carregar dados.</p>';
        DOM.topProdutosSummary.innerHTML = errorMessage;
        DOM.vendasPorDiaSummary.innerHTML = errorMessage;
        DOM.horariosPicoSummary.innerHTML = errorMessage;
        DOM.metodosPagamentoSummary.innerHTML = errorMessage;
        DOM.topClientesSummary.innerHTML = errorMessage;
        DOM.tiposEntregaSummary.innerHTML = errorMessage; // NOVO: Exibir mensagem de erro para o novo relatório

        DOM.topProdutosChartCanvas.style.display = 'none';
        DOM.vendasPorDiaChartCanvas.style.display = 'none';
        DOM.horariosPicoChartCanvas.style.display = 'none';
        DOM.metodosPagamentoChartCanvas.style.display = 'none';
        DOM.topClientesChartCanvas.style.display = 'none';
        DOM.tiposEntregaChartCanvas.style.display = 'none'; // NOVO: Esconder canvas
    });
}

// --- FUNÇÕES DE ANÁLISE DE RELATÓRIOS ---

// 1. Análise de Produtos Mais Vendidos
function analisarProdutosMaisVendidos(pedidos) {
    const contagemProdutos = {};

    pedidos.forEach(pedido => {
        if (pedido.cart && Array.isArray(pedido.cart)) {
            pedido.cart.forEach(item => {
                const nomeProduto = item.name;
                const quantidade = item.quantity;
                contagemProdutos[nomeProduto] = (contagemProdutos[nomeProduto] || 0) + item.quantity;;
            });
        }
    });

    const produtosOrdenados = Object.entries(contagemProdutos)
        .sort(([, qtdA], [, qtdB]) => qtdB - qtdA)
        .slice(0, 5); // Top 5 produtos

    DOM.topProdutosSummary.innerHTML = '';
    if (produtosOrdenados.length > 0) {
        DOM.topProdutosChartCanvas.style.display = 'block';
        const labels = produtosOrdenados.map(item => item[0]);
        const data = produtosOrdenados.map(item => item[1]);

        topProdutosChartInstance = new Chart(DOM.topProdutosChartCanvas, {
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

        DOM.topProdutosSummary.innerHTML = `<p>Os 5 produtos mais vendidos totalizaram **${data.reduce((a, b) => a + b, 0)} unidades**.</p>`;
    } else {
        DOM.topProdutosSummary.innerHTML = '<p class="text-gray-600">Nenhum produto vendido no período.</p>';
        DOM.topProdutosChartCanvas.style.display = 'none';
    }
}

// 2. Análise de Vendas por Dia da Semana
function analisarVendasPorDiaDaSemana(pedidos) {
    const vendasPorDia = {
        0: 0, // Domingo
        1: 0, // Segunda
        2: 0, // Terça
        3: 0, // Quarta
        4: 0, // Quinta
        5: 0, // Sexta
        6: 0  // Sábado
    };
    const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    pedidos.forEach(pedido => {
        const data = new Date(pedido.timestamp);
        const diaSemana = data.getDay(); // 0 para Domingo, 1 para Segunda, etc.
        vendasPorDia[diaSemana] = (vendasPorDia[diaSemana] || 0) + 1;
    });

    const diasParaGrafico = nomesDias.map((name, index) => ({
        day: name,
        count: vendasPorDia[index] || 0
    }));

    const diasOrdenadosParaResumo = Object.entries(vendasPorDia)
        .filter(([, count]) => count > 0)
        .sort(([, countA], [, countB]) => countB - countA);

    DOM.vendasPorDiaSummary.innerHTML = '';
    if (diasParaGrafico.some(d => d.count > 0)) {
        DOM.vendasPorDiaChartCanvas.style.display = 'block';
        const labels = diasParaGrafico.map(item => item.day);
        const data = diasParaGrafico.map(item => item.count);

        vendasPorDiaChartInstance = new Chart(DOM.vendasPorDiaChartCanvas, {
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
            DOM.vendasPorDiaSummary.innerHTML = `<p>O dia com mais vendas foi **${topDay}** com **${topCount} pedidos**.</p>`;
        } else {
            DOM.vendasPorDiaSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de vendas por dia.</p>';
        }

    } else {
        DOM.vendasPorDiaSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de vendas por dia.</p>';
        DOM.vendasPorDiaChartCanvas.style.display = 'none';
    }
}

// 3. Análise de Horários de Pico
function analisarHorariosDePico(pedidos) {
    const pedidosPorHora = {};
    for (let i = 0; i < 24; i++) {
        pedidosPorHora[i] = 0; // Inicializa todas as horas com 0 pedidos
    }

    pedidos.forEach(pedido => {
        const data = new Date(pedido.timestamp);
        const hora = data.getHours();
        pedidosPorHora[hora] = (pedidosPorHora[hora] || 0) + 1;
    });

    // Garante que os horários são ordenados numericamente
    const horariosOrdenados = Object.entries(pedidosPorHora)
        .sort(([horaA, ], [horaB, ]) => parseInt(horaA) - parseInt(horaB));

    DOM.horariosPicoSummary.innerHTML = '';
    // Verifica se há algum dado para exibir (se o contador for maior que zero para alguma hora)
    if (horariosOrdenados.some(h => h[1] > 0)) {
        DOM.horariosPicoChartCanvas.style.display = 'block';
        const labels = horariosOrdenados.map(item => `${item[0]}h`);
        const data = horariosOrdenados.map(item => item[1]);

        horariosPicoChartInstance = new Chart(DOM.horariosPicoChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pedidos',
                    data: data,
                    backgroundColor: 'rgba(255, 159, 64, 0.8)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 2,
                    fill: true, // Preenche a área abaixo da linha
                    tension: 0.3, // Curvatura da linha
                    pointRadius: 3, // Tamanho dos pontos na linha
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
                            precision: 0 // Apenas números inteiros para pedidos
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
                            autoSkip: true, // Pula rótulos para evitar sobreposição
                            maxTicksLimit: 12 // Limita o número de rótulos exibidos no eixo X
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

        // Encontrar o horário de pico para o resumo
        const topHorario = horariosOrdenados.reduce((prev, current) => (prev[1] > current[1] ? prev : current), ["0", 0]);
        if (topHorario[1] > 0) {
            DOM.horariosPicoSummary.innerHTML = `<p>O horário de pico foi entre **${topHorario[0]}h e ${parseInt(topHorario[0]) + 1}h** com **${topHorario[1]} pedidos**.</p>`;
        } else {
            DOM.horariosPicoSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de horário de pico.</p>';
        }

    } else {
        DOM.horariosPicoSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de horário de pico.</p>';
        DOM.horariosPicoChartCanvas.style.display = 'none';
    }
}

function analisarTiposDeEntrega(pedidos) {
    const contagemTipos = {};

    pedidos.forEach(pedido => {
        const tipo = pedido.tipoEntrega || 'Desconhecido';
        contagemTipos[tipo] = (contagemTipos[tipo] || 0) + 1;
    });

    const tiposOrdenados = Object.entries(contagemTipos)
        .sort(([, qtdA], [, qtdB]) => qtdB - qtdA);

    DOM.tiposEntregaSummary.innerHTML = '';
    if (tiposOrdenados.length > 0) {
        DOM.tiposEntregaChartCanvas.style.display = 'block';
        const labels = tiposOrdenados.map(item => item[0]);
        const data = tiposOrdenados.map(item => item[1]);

        tiposEntregaChartInstance = new Chart(DOM.tiposEntregaChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Número de Pedidos',
                    data: data,
                    backgroundColor: [
                        'rgba(255, 165, 0, 0.8)', // Laranja
                        'rgba(0, 128, 0, 0.8)',   // Verde
                        'rgba(128, 0, 128, 0.8)'  // Roxo
                    ],
                    borderColor: [
                        'rgba(255, 165, 0, 1)',
                        'rgba(0, 128, 0, 1)',
                        'rgba(128, 0, 128, 1)'
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
                                return context.label + ': ' + context.raw + ' pedidos';
                            }
                        }
                    }
                }
            }
        });

        DOM.tiposEntregaSummary.innerHTML = `<p>A maioria dos pedidos foi de **${labels[0]}** (${data[0]} pedidos).</p>`;
    } else {
        DOM.tiposEntregaSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de tipo de entrega.</p>';
        DOM.tiposEntregaChartCanvas.style.display = 'none';
    }
}

// 4. Análise de Métodos de Pagamento
function analisarMetodosDePagamento(pedidos) {
    const contagemMetodos = {};

    pedidos.forEach(pedido => {
        const metodo = pedido.pagamento || 'Desconhecido'; // Usa 'Desconhecido' se o método não estiver definido
        contagemMetodos[metodo] = (contagemMetodos[metodo] || 0) + 1;
    });

    // Ordena os métodos do mais usado para o menos usado
    const metodosOrdenados = Object.entries(contagemMetodos)
        .sort(([, qtdA], [, qtdB]) => qtdB - qtdA);

    DOM.metodosPagamentoSummary.innerHTML = '';
    if (metodosOrdenados.length > 0) {
        DOM.metodosPagamentoChartCanvas.style.display = 'block';
        const labels = metodosOrdenados.map(item => item[0]);
        const data = metodosOrdenados.map(item => item[1]);

        metodosPagamentoChartInstance = new Chart(DOM.metodosPagamentoChartCanvas, {
            type: 'pie', // Gráfico de pizza é ideal para proporções
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)', // Vermelho
                        'rgba(54, 162, 235, 0.8)', // Azul
                        'rgba(255, 206, 86, 0.8)', // Amarelo
                        'rgba(75, 192, 192, 0.8)', // Verde Água
                        'rgba(153, 102, 255, 0.8)' // Roxo
                    ],
                    borderColor: '#ffffff', // Borda branca entre as fatias
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right', // Posição da legenda
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

        DOM.metodosPagamentoSummary.innerHTML = `<p>O método de pagamento mais usado é **${labels[0]}**.</p>`;
    } else {
        DOM.metodosPagamentoSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de método de pagamento.</p>';
        DOM.metodosPagamentoChartCanvas.style.display = 'none';
    }
}

// 5. Análise de Pessoas que Mais Compraram (NOVO RELATÓRIO)
function analisarPessoasQueMaisCompraram(pedidos) {
    const gastosPorCliente = {};

    pedidos.forEach(pedido => {
        // Usa 'nomeCliente' (para pedidos online) ou 'cliente' (para pedidos de mesa/presenciais)
        const nomeCliente = pedido.nomeCliente || pedido.cliente;
        const totalPedido = parseFloat(pedido.totalPedido);

        // Verifica se o nome do cliente existe e se o total do pedido é um número válido
        if (nomeCliente && !isNaN(totalPedido)) {
            // Soma o total do pedido ao gasto do cliente
            gastosPorCliente[nomeCliente] = (gastosPorCliente[nomeCliente] || 0) + totalPedido;
        }
    });

    // Converte o objeto para um array de pares [cliente, gastoTotal] e ordena
    const clientesOrdenados = Object.entries(gastosPorCliente)
        .sort(([, gastoA], [, gastoB]) => gastoB - gastoA) // Ordena do maior gasto para o menor
        .slice(0, 5); // Pega os 5 clientes que mais gastaram

    DOM.topClientesSummary.innerHTML = ''; // Limpa o conteúdo anterior do sumário

    if (clientesOrdenados.length > 0) {
        DOM.topClientesChartCanvas.style.display = 'block'; // Mostra o canvas do gráfico

        const labels = clientesOrdenados.map(item => item[0]); // Nomes dos clientes
        // Formata os valores de gasto para duas casas decimais
        const data = clientesOrdenados.map(item => parseFloat(item[1].toFixed(2)));

        topClientesChartInstance = new Chart(DOM.topClientesChartCanvas, {
            type: 'bar', // Gráfico de barras é adequado para comparar valores
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Gasto (R$)',
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)', // Cor 1
                        'rgba(54, 162, 235, 0.8)', // Cor 2
                        'rgba(255, 206, 86, 0.8)', // Cor 3
                        'rgba(75, 192, 192, 0.8)', // Cor 4
                        'rgba(153, 102, 255, 0.8)'  // Cor 5
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
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
                            // Formata os rótulos do eixo Y como moeda (R$)
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
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
                        display: false // Não exibir a legenda do dataset
                    },
                    tooltip: {
                        callbacks: {
                            // Formata o tooltip para exibir o valor em R$
                            label: function(context) {
                                return context.label + ': R$ ' + context.raw.toFixed(2);
                            }
                        }
                    }
                }
            }
        });

        // Atualiza o sumário com o total gasto pelos top clientes
        DOM.topClientesSummary.innerHTML = `<p>Os 5 clientes que mais compraram totalizaram **R$ ${data.reduce((a, b) => a + b, 0).toFixed(2)}**.</p>`;
    } else {
        DOM.topClientesSummary.innerHTML = '<p class="text-gray-600">Nenhum dado de clientes com compras finalizadas no período.</p>';
        DOM.topClientesChartCanvas.style.display = 'none'; // Esconde o canvas se não houver dados
    }
}


// --- SEÇÃO: GERENCIAMENTO DE CUPONS lghn-------------------------------------------------------------------------------------------------------------------------------------------------


function salvarCupom(){
    const codigo = DOM.cupomCodigoInput.value.trim().toUpperCase();
        const valor = parseFloat(DOM.cupomValorInput.value);
        const tipo = DOM.cupomTipoSelect.value;
        const valorMinimo = parseFloat(DOM.cupomMinValorInput.value) || 0;
        const validadeStr = DOM.validadeCupomInput.value;

        console.log("Chegou no evento de click do botão salvar cupom!"); // More descriptive log

        if (!codigo) {
            alert("O código do cupom é obrigatório.");
            return;
        }
        if (isNaN(valor) || valor <= 0) {
            alert("O valor do desconto deve ser um número positivo.");
            return;
        }
        if (!validadeStr) {
            alert("A data de validade é obrigatória.");
            return;
        }

        const validadeDate = parseDateAsLocal(validadeStr);
        validadeDate.setHours(23, 59, 59, 999);
        const validadeTimestamp = validadeDate.getTime();

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        if (validadeDate < hoje) {
            alert("A data de validade não pode ser no passado.");
            return;
        }

        const cupomData = {
            codigo: codigo,
            valor: valor,
            tipo: tipo,
            valorMinimo: valorMinimo,
            validade: validadeTimestamp,
            ativo: true,
            usos: 0
        };

        cuponsRef.child(codigo).set(cupomData)
            .then(() => {
                alert(`Cupom "${codigo}" salvo com sucesso!`);
                DOM.cupomCodigoInput.value = '';
                DOM.cupomValorInput.value = '';
                DOM.cupomMinValorInput.value = '';
                DOM.validadeCupomInput.value = '';
            })
            .catch(error => {
                console.error("Erro ao salvar cupom:", error);
                alert("Erro ao salvar cupom: " + error.message);
            });
}

        
  

function carregarCupons(snapshot) {
    if (!DOM.listaCuponsContainer) return;
    const cupons = snapshot.val(); // Obtém todos os cupons do snapshot do Firebase
    DOM.listaCuponsContainer.innerHTML = ''; // Limpa a lista existente na interface

    if (!cupons) {
        DOM.listaCuponsContainer.innerHTML = '<p class="text-gray-600 col-span-full text-center">Nenhum cupom cadastrado.</p>';
        return;
    }

    const cuponsArray = [];
    // Buscar contagens de uso de cada cupom de forma assíncrona
    const fetchUsagePromises = Object.keys(cupons).map(async (codigo) => {
        const cupom = cupons[codigo];
        // Caminho crucial: 'cupons_usados_admin_view' implica um nó separado para rastreamento de uso
        const usageSnapshot = await database.ref(`cupons/${codigo}/usos`).once('value');
        const totalUsos = usageSnapshot.val() || 0;
        cuponsArray.push({ ...cupom, usos: totalUsos }); // Adiciona os dados do cupom com a contagem de usos
    });

    // Espera todas as buscas de uso serem concluídas
    Promise.all(fetchUsagePromises).then(() => {
        cuponsArray.sort((a, b) => a.codigo.localeCompare(b.codigo)); // Ordena os cupons pelo código para exibição consistente

        // Renderiza cada cupom na interface
        cuponsArray.forEach(cupom => {
            const cupomDiv = document.createElement('div');
            cupomDiv.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col justify-between';

            const validadeDate = new Date(cupom.validade);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas a data
            const expirado = validadeDate < hoje;

            const statusClass = cupom.ativo && !expirado ? 'text-green-600' : 'text-red-600';
            const statusText = expirado ? 'Expirado' : (cupom.ativo ? 'Ativo' : 'Inativo');
            const valorTexto = cupom.tipo === 'porcentagem' ? `${cupom.valor}%` : `R$ ${cupom.valor.toFixed(2)}`;

            cupomDiv.innerHTML = `
                <div class="flex-grow">
                    <h3 class="text-lg font-semibold text-gray-800">${cupom.codigo}</h3>
                    <p class="text-gray-700">Desconto: <strong>${valorTexto}</strong></p>
                    <p class="text-gray-700">Validade: <strong>${new Date(cupom.validade).toLocaleDateString()}</strong></p>
                    ${cupom.valorMinimo > 0 ? `<p class="text-gray-700">Pedido Mínimo: <strong>R$ ${cupom.valorMinimo.toFixed(2)}</strong></p>` : ''}
                    <p class="text-gray-700">Usos Totais: <strong>${cupom.usos || 0}</strong></p>
                    ${cupom.clienteTelefone ? `<p class="text-gray-700">Gerado para: <strong>${cupom.clienteTelefone}</strong></p>` : '<p class="text-gray-500">Cupom Geral</p>'}
                    <p class="font-medium ${statusClass}">Status: ${statusText}</p>
                </div>
                <div class="flex gap-2 mt-4">
                    <button class="btn-toggle-ativo bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm flex-1" data-codigo="${cupom.codigo}" data-ativo="${cupom.ativo}">
                        ${cupom.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button class="btn-excluir-cupom bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm flex-1" data-codigo="${cupom.codigo}">
                        Excluir
                    </button>
                </div>
            `;
            DOM.listaCuponsContainer.appendChild(cupomDiv);
        });
        DOM.listaCuponsContainer.querySelectorAll('.btn-toggle-ativo').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', () => { 
                const codigo = newButton.dataset.codigo;
                const ativo = newButton.dataset.ativo === 'true';
                cuponsRef.child(codigo).update({ ativo: !ativo })
                    .then(() => alert(`Status do cupom ${codigo} alterado!`))
                    .catch(error => alert("Erro ao atualizar status do cupom: " + error.message));
            });
        });

        DOM.listaCuponsContainer.querySelectorAll('.btn-excluir-cupom').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            newButton.addEventListener('click', () => { 
                const codigo = newButton.dataset.codigo;
                if (confirm(`Deseja realmente excluir o cupom ${codigo}?`)) {
                    cuponsRef.child(codigo).remove()
                        .then(() => alert(`Cupom ${codigo} excluído com sucesso!`))
                        .catch(error => alert("Erro ao excluir cupom: " + error.message));
                }
            });
        });
    }).catch(error => {
        console.error("Erro ao carregar usos de cupons:", error);
        DOM.listaCuponsContainer.innerHTML = '<p class="text-red-600 col-span-full text-center">Erro ao carregar cupons.</p>';
    });
}




// --- SEÇÃO: GERENCIAMENTO DE ESTOQUE lghn------------------------------------------------------------------------------------------------------------------------------------------------------



// Cadastro e Atualização de Ingredientes
async function handleSalvarIngredienteDetalhe() {
    const nome = DOM.ingredienteNomeDetalheInput.value.trim();
    const unidade = DOM.ingredienteUnidadeDetalheInput.value.trim();
    const estoqueMinimo = parseFloat(DOM.ingredienteEstoqueMinimoDetalheInput.value) || 0;

    if (!nome || !unidade) {
        alert('Por favor, preencha o nome e a unidade de medida do ingrediente.');
        return;
    }
    if (isNaN(estoqueMinimo) || estoqueMinimo < 0) {
        alert('Por favor, insira um valor válido para o estoque mínimo.');
        return;
    }

    try {
        const snapshot = await ingredientesRef.orderByChild('nome').equalTo(nome).once('value');
        if (snapshot.exists()) {
            const existingIngredientId = Object.keys(snapshot.val())[0];
            await ingredientesRef.child(existingIngredientId).update({
                unidadeMedida: unidade,
                estoqueMinimo: estoqueMinimo
            });
            alert(`Ingrediente "${nome}" atualizado com sucesso!`);
        } else {
            await ingredientesRef.push({
                nome: nome,
                unidadeMedida: unidade,
                quantidadeAtual: 0,
                custoUnitarioMedio: 0,
                estoqueMinimo: estoqueMinimo,
                quantidadeUsadaMensal: 0,
                custoUsadoMensal: 0,
                quantidadeUsadaDiaria: 0,
                custoUsadaDiaria: 0,
                ultimaAtualizacaoConsumo: firebase.database.ServerValue.TIMESTAMP,
                precoAdicional: null,
                ativo: false,
                receita: null
            });
            alert(`Ingrediente "${nome}" adicionado com sucesso!`);
        }
        DOM.ingredienteNomeDetalheInput.value = '';
        DOM.ingredienteUnidadeDetalheInput.value = '';
        DOM.ingredienteEstoqueMinimoDetalheInput.value = '';
        renderAdicionaisConfiguracao();
    } catch (error) {
        console.error('Erro ao salvar ingrediente:', error);
        alert('Erro ao salvar ingrediente. Verifique o console para mais detalhes.');
    }
}

async function handleUpdateIngrediente(event) {
    const ingredienteId = event.target.dataset.id;
    const input = document.getElementById(`qtd-atual-${ingredienteId}`);
    const novaQuantidade = parseFloat(input.value);

    if (isNaN(novaQuantidade) || novaQuantidade < 0) {
        alert('Por favor, insira uma quantidade válida.');
        return;
    }

    try {
        await ingredientesRef.child(ingredienteId).update({ quantidadeAtual: novaQuantidade });
        alert('Estoque atualizado manualmente com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar ingrediente:', error);
        alert('Erro ao atualizar ingrediente.');
    }
}

async function handleDeleteIngrediente(event) {
    const ingredienteId = event.target.dataset.id;
    const ingredienteNome = allIngredients[ingredienteId]?.nome || 'este ingrediente';

    if (confirm(`Tem certeza que deseja excluir "${ingredienteNome}"? Isso também removerá ele de todas as receitas e configurações de adicional.`)) {
        try {
            await ingredientesRef.child(ingredienteId).remove();
            // ... (sua lógica existente para remover de produtos/receitas) ...
            const categories = ['pizzas', 'bebidas', 'esfirras', 'calzone', 'promocoes', 'novidades'];
            for (const categoria of categories) {
                const productsSnapshot = await produtosRef.child(categoria).once('value');
                if (productsSnapshot.exists()) {
                    productsSnapshot.forEach(produtoChild => {
                        const produtoData = produtoChild.val();
                        if (produtoData.tipo === 'pizza' && produtoData.receita) {
                            if (produtoData.receita.grande && produtoData.receita.grande[ingredienteId]) {
                                delete produtoData.receita.grande[ingredienteId];
                            }
                            if (produtoData.receita.broto && produtoData.receita.broto[ingredienteId]) {
                                delete produtoData.receita.broto[ingredienteId];
                            }
                            if (JSON.stringify(produtoData.receita) !== JSON.stringify(produtoChild.val().receita)) {
                                produtosRef.child(categoria).child(produtoChild.key).update({ receita: produtoData.receita });
                            }
                        } else if (produtoData.receita && produtoData.receita[ingredienteId]) {
                            const updatedReceita = { ...produtoData.receita };
                            delete updatedReceita[ingredienteId];
                            produtosRef.child(categoria).child(produtoChild.key).update({ receita: updatedReceita });
                        }
                    });
                }
            }
            alert(`Ingrediente "${ingredienteNome}" excluído com sucesso!`);
            // Re-renderizar listas após exclusão
            renderIngredientesListDetalhe();
            renderAdicionaisConfiguracao();
        } catch (error) {
            console.error('Erro ao excluir ingrediente:', error);
            alert('Erro ao excluir ingrediente.');
        }
    }
}
// Registro de Compras
function popularIngredientesParaReceitaSelects() {
    DOM.receitaIngredienteSelectDetalhe.innerHTML = '<option value="">Selecione um ingrediente</option>';
    const sortedIngredients = Object.entries(allIngredients).sort(([, a], [, b]) => a.nome.localeCompare(b.nome));
    sortedIngredients.forEach(([id, ingrediente]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${ingrediente.nome} (${ingrediente.unidadeMedida})`;
        DOM.receitaIngredienteSelectDetalhe.appendChild(option);
    });
}

function handleAddItemCompraDetalhe() {
    const ingredienteId = DOM.compraIngredienteSelectDetalhe.value;
    const quantidade = parseFloat(DOM.compraQuantidadeDetalheInput.value);
    const precoTotal = parseFloat(DOM.compraPrecoTotalDetalheInput.value); // Pega o PREÇO TOTAL agora

    // Validação inicial
    if (!ingredienteId || isNaN(quantidade) || quantidade <= 0 || isNaN(precoTotal) || precoTotal <= 0) {
        alert('Por favor, selecione um ingrediente e insira uma quantidade e um custo total válidos e positivos.');
        return;
    }
    if (!allIngredients[ingredienteId]) {
        alert('Ingrediente selecionado não encontrado. Por favor, recarregue a página.');
        return;
    }

    // A MÁGICA ACONTECE AQUI: CÁLCULO DO PREÇO UNITÁRIO
    const precoUnitarioCalculado = precoTotal / quantidade;

    const itemExistenteIndex = currentPurchaseItems.findIndex(item => item.ingredienteId === ingredienteId);

    if (itemExistenteIndex > -1) {
        alert('Este ingrediente já foi adicionado à lista de compra. Remova-o e adicione novamente com os valores corretos.');
        return;
    }

    // Adiciona o item à lista com o preço unitário JÁ CALCULADO
    currentPurchaseItems.push({
        ingredienteId: ingredienteId,
        nome: allIngredients[ingredienteId].nome,
        unidadeMedida: allIngredients[ingredienteId].unidadeMedida,
        quantidade: quantidade,
        precoUnitario: precoUnitarioCalculado // Usa o valor calculado
    });

    renderItensCompraDetalhe();

    // Limpa os campos após adicionar
    DOM.compraIngredienteSelectDetalhe.value = '';
    DOM.compraQuantidadeDetalheInput.value = '';
    DOM.compraPrecoTotalDetalheInput.value = '';
    DOM.custoCalculadoDisplay.textContent = ''; // Limpa o display do custo
    DOM.btnRegistrarCompraDetalhe.disabled = currentPurchaseItems.length === 0;
}

function renderItensCompraDetalhe() {
    DOM.itensCompraDetalheListContainer.innerHTML = '';
    if (currentPurchaseItems.length === 0) {
        DOM.itensCompraDetalheListContainer.innerHTML = '<p class="text-gray-600 text-center">Nenhum item adicionado a esta compra.</p>';
        return;
    }

    currentPurchaseItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';
        itemDiv.innerHTML = `
            <span>${item.nome}: <strong>${item.quantidade.toFixed(3)} ${item.unidadeMedida}</strong> a R$ ${item.precoUnitario.toFixed(2)}/un. (Total: R$ ${(item.quantidade * item.precoUnitario).toFixed(2)})</span>
            <button class="text-red-500 hover:text-red-700 btn-remove-item-compra" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
        `;
        DOM.itensCompraDetalheListContainer.appendChild(itemDiv);
    });

    DOM.itensCompraDetalheListContainer.querySelectorAll('.btn-remove-item-compra').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (e) => {
            const indexToRemove = parseInt(e.target.closest('button').dataset.index);
            currentPurchaseItems.splice(indexToRemove, 1);
            renderItensCompraDetalhe();
            DOM.btnRegistrarCompraDetalhe.disabled = currentPurchaseItems.length === 0;
        });
    });
}

async function handleRegistrarCompraDetalhe() {
    const dataCompra = DOM.compraDataDetalheInput.value;
    const fornecedor = DOM.compraFornecedorDetalheInput.value.trim();

    if (!dataCompra) {
        alert('Por favor, preencha a data da compra.');
        return;
    }
    if (currentPurchaseItems.length === 0) {
        alert('Adicione pelo menos um item à compra antes de registrar.');
        return;
    }

    if (confirm('Deseja realmente registrar esta compra e atualizar o estoque?')) {
        try {
            let totalCompra = 0;
            const itemsParaFirebase = {};

            for (const item of currentPurchaseItems) {
                await recalcularCustoUnitarioMedio(item.ingredienteId, item.quantidade, item.precoUnitario);
                totalCompra += item.quantidade * item.precoUnitario;
                itemsParaFirebase[item.ingredienteId] = {
                    nome: item.nome,
                    quantidade: item.quantidade,
                    precoUnitario: item.precoUnitario
                };
            }

            await comprasRef.push({
                data: dataCompra,
                fornecedor: fornecedor || 'Não Informado',
                itensComprados: itemsParaFirebase,
                totalCompra: parseFloat(totalCompra.toFixed(2)),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            alert('Compra registrada e estoque atualizado com sucesso!');
            DOM.compraDataDetalheInput.valueAsDate = new Date();
            DOM.compraFornecedorDetalheInput.value = '';
            currentPurchaseItems = [];
            renderItensCompraDetalhe();
            DOM.btnRegistrarCompraDetalhe.disabled = true;
        } catch (error) {
            console.error('Erro ao registrar compra:', error);
            alert('Erro ao registrar compra. Verifique o console.');
        }
    }
}

async function recalcularCustoUnitarioMedio(ingredienteId, quantidadeComprada, precoUnitarioCompra) {
    const ingredienteRef = ingredientesRef.child(ingredienteId);
    await ingredienteRef.transaction(currentData => {
        if (currentData) {
            const oldQuantity = currentData.quantidadeAtual || 0;
            const oldCost = currentData.custoUnitarioMedio || 0;

            const newTotalCost = (oldQuantity * oldCost) + (quantidadeComprada * precoUnitarioCompra);
            const newTotalQuantity = oldQuantity + quantidadeComprada;

            currentData.quantidadeAtual = newTotalQuantity;
            currentData.custoUnitarioMedio = newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
        }
        return currentData;
    });
}

// Configuração de Receitas
function popularIngredientesParaCompraSelects() { // Ou popularIngredientesParaCompraSelect, se preferir o nome mais curto
    // Adicione esta verificação para garantir que o elemento exista antes de usá-lo
    if (!DOM.compraIngredienteSelectDetalhe) {
        console.warn("DOM.compraIngredienteSelectDetalhe não encontrado. Não é possível popular os ingredientes para a compra.");
        return;
    }
    DOM.compraIngredienteSelectDetalhe.innerHTML = '<option value="">Selecione um ingrediente</option>';
    const sortedIngredients = Object.entries(allIngredients).sort(([, a], [, b]) => a.nome.localeCompare(b.nome));
    sortedIngredients.forEach(([id, ingrediente]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${ingrediente.nome} (${ingrediente.unidadeMedida})`;
        // Mude esta linha para usar o elemento correto do DOM para a compra:
        DOM.compraIngredienteSelectDetalhe.appendChild(option); // <-- CORRIGIDO AQUI
    });
}
//asdawdasd
// 3. handleReceitaProdutoSelectChangeDetalhe: Lida com a seleção do PRODUTO
async function handleReceitaProdutoSelectChangeDetalhe(event) {
    console.log('handleReceitaProdutoSelectChangeDetalhe foi chamada!'); // For debugging
    const selectedProductId = event.target.value;
    const selectedOption = DOM.receitaProdutoSelectDetalhe.options[DOM.receitaProdutoSelectDetalhe.selectedIndex];
    
    // IMPORTANT: Get the category from the option's dataset, as it's correctly set by handleReceitaProdutoCategoriaChangeDetalhe
    const selectedCategory = selectedOption?.dataset.category; 

    if (!selectedProductId || !selectedCategory) {
        DOM.receitaConfigDetalheContainer.classList.add('hidden');
        DOM.pizzaTamanhoSelectContainerDetalhe.classList.add('hidden'); // Hide if no product is selected
        DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none'; // Ensure fully hidden
        DOM.currentPizzaSizeDetalheSpan.textContent = ''; // Clear size text
        currentRecipeProduct = null;
        return;
    }

    const productName = selectedOption.textContent.trim();
    DOM.currentRecipeProductNameDetalhe.textContent = productName;
    DOM.receitaConfigDetalheContainer.classList.remove('hidden'); // Show the recipe configuration area

    try {
        // Fetch the product data using the correct category and product ID
        const produtoSnapshot = await produtosRef.child(selectedCategory).child(selectedProductId).once('value');
        const produtoData = produtoSnapshot.val();

        // Armazena as informações do produto selecionado.
        // We now infer 'tipo' based on 'categoria'.
        currentRecipeProduct = {
            id: selectedProductId,
            nome: productName,
            categoria: selectedCategory, 
            // Infer the 'tipo' property directly here based on the category for internal logic
            tipo: selectedCategory === 'pizzas' ? 'pizza' : 'outro', // Set 'pizza' type if category is 'pizzas'
            receita: produtoData?.receita || {}, // Load existing recipe
            // Ensure correct default sizes, as per your HTML ('grande', 'broto')
            tamanhosDisponiveis: produtoData?.tamanhosDisponiveis || ['Grande', 'Broto'] 
        };

        if (selectedCategory === 'pizzas') { 
            DOM.pizzaTamanhoSelectContainerDetalhe.classList.remove('hidden'); // Ensure visible
            DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'flex'; // Set display style for layout
            console.log("Estou aqui: Produto é pizza (pela categoria)!"); 

            // Populate the dropdown dynamically based on available sizes for the current product
            DOM.pizzaTamanhoSelectDetalhe.innerHTML = ''; // Clear current options
            currentRecipeProduct.tamanhosDisponiveis.forEach(tamanho => {
                const option = document.createElement('option');
                option.value = tamanho;
                option.textContent = tamanho.charAt(0).toUpperCase() + tamanho.slice(1);
                DOM.pizzaTamanhoSelectDetalhe.appendChild(option);
            });
            
            // Set the initial value of the select to the first available size
            // and update the displayed text.
            if (currentRecipeProduct.tamanhosDisponiveis.length > 0) {
                DOM.pizzaTamanhoSelectDetalhe.value = currentRecipeProduct.tamanhosDisponiveis[0];
                DOM.currentPizzaSizeDetalheSpan.textContent = ` (${DOM.pizzaTamanhoSelectDetalhe.value.charAt(0).toUpperCase() + DOM.pizzaTamanhoSelectDetalhe.value.slice(1)})`;
            } else {
                 DOM.currentPizzaSizeDetalheSpan.textContent = ''; // No sizes available
            }
           
        } else {
            DOM.pizzaTamanhoSelectContainerDetalhe.classList.add('hidden'); // Hide for non-pizza products
            DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none'; // Ensure fully hidden
            DOM.currentPizzaSizeDetalheSpan.textContent = ''; // Clear the size text
            console.log("Não estou aqui: Produto não é pizza (pela categoria).");
        }

        renderIngredientesReceitaDetalhe(); // Render ingredients for the default size (or the first)
        DOM.btnSalvarReceitaDetalhe.disabled = false; // Enable the save recipe button

    } catch (error) {
        console.error('Erro ao carregar receita:', error);
        alert('Erro ao carregar receita para este produto.');
        currentRecipeProduct = null;
        DOM.receitaConfigDetalheContainer.classList.add('hidden');
        DOM.pizzaTamanhoSelectContainerDetalhe.classList.add('hidden'); // Ensure hidden in case of error
        DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none'; // Ensure fully hidden in case of error
    }
}


async function handleReceitaProdutoCategoriaChangeDetalhe(event) {
    console.log('handleReceitaProdutoCategoriaChangeDetalhe foi chamada!'); // Para depuração
    let selectedCategory = event.target.value; 
    DOM.receitaProdutoSelectDetalhe.innerHTML = '<option value="">Carregando produtos...</option>';
    DOM.receitaProdutoSelectDetalhe.disabled = true;
    DOM.receitaConfigDetalheContainer.classList.add('hidden'); // Esconde a área de configuração da receita
    DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none'; // Garante que o tamanho da pizza esteja escondido
    currentRecipeProduct = null; // Limpa o produto atual da receita

    if (!selectedCategory) {
        DOM.receitaProdutoSelectDetalhe.innerHTML = '<option value="">Selecione uma categoria primeiro</option>';
        return; // Sai da função se nenhuma categoria for selecionada
    }

    try {
        const productsSnapshot = await produtosRef.child(selectedCategory).once('value');
        const products = [];
        productsSnapshot.forEach(childSnapshot => {
            const product = childSnapshot.val();
            const productName = product.nome || product.titulo;
            if (productName) {
                // Ao adicionar o produto, também guardamos o tipo e a categoria nos datasets
                products.push({ id: childSnapshot.key, nome: productName, tipo: product.tipo, categoria: selectedCategory });
            }
        });


        if(selectedCategory === "pizzas"){
            DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'flex';
        }

        products.sort((a, b) => a.nome.localeCompare(b.nome));

        DOM.receitaProdutoSelectDetalhe.innerHTML = '<option value="">Selecione um produto</option>';
        products.forEach(prod => {
            const option = document.createElement('option');
            option.value = prod.id;
            option.textContent = prod.nome;
            option.dataset.tipo = prod.tipo;
            option.dataset.category = prod.categoria; // Certifique-se de que a categoria também está no dataset
            DOM.receitaProdutoSelectDetalhe.appendChild(option);
        });


        DOM.receitaProdutoSelectDetalhe.disabled = false; // Habilita o select de produtos
    } catch (error) {
        console.error('Erro ao carregar produtos por categoria:', error);
        DOM.receitaProdutoSelectDetalhe.innerHTML = '<option value="">Erro ao carregar produtos</option>';
    }
}

// 3. handleReceitaProdutoSelectChangeDetalhe: Lida com a seleção do PRODUTO
async function handleReceitaProdutoSelectChangeDetalhe(event) {
    console.log('handleReceitaProdutoSelectChangeDetalhe foi chamada!'); // Para depuração
    const selectedProductId = event.target.value;
    const selectedOption = DOM.receitaProdutoSelectDetalhe.options[DOM.receitaProdutoSelectDetalhe.selectedIndex];
    const productType = selectedOption?.dataset.tipo; // Obtém o tipo do produto (ex: 'pizza')
    const selectedCategory = selectedOption?.dataset.category; // Obtém a categoria do produto

    if (!selectedProductId || !selectedCategory) {
        DOM.receitaConfigDetalheContainer.classList.add('hidden');
        
        currentRecipeProduct = null;
        return;
    }

    const productName = selectedOption.textContent.trim();
    DOM.currentRecipeProductNameDetalhe.textContent = productName;
    DOM.receitaConfigDetalheContainer.classList.remove('hidden'); // Mostra a área de configuração da receita

    try {
        const produtoSnapshot = await produtosRef.child(selectedCategory).child(selectedProductId).once('value');
        const produtoData = produtoSnapshot.val();

        // Armazena as informações do produto selecionado, incluindo os tamanhos disponíveis
        currentRecipeProduct = {
            id: selectedProductId,
            nome: productName,
            categoria: selectedCategory,
            tipo: selectedCategory === 'pizzas' ? 'pizza' : 'outro',
            receita: produtoData?.receita || {}, // Carrega a receita existente
            tamanhosDisponiveis: produtoData?.tamanhosDisponiveis || ['Grande', 'Broto'] // Pega do BD ou usa padrão
        };

        // Lógica para mostrar/esconder e popular o select de tamanho da pizza
         if(selectedCategory === "pizzas"){
           DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'flex';
            console.log("nasdasd")
            DOM.pizzaTamanhoSelectDetalhe.innerHTML = ''; // Limpa as opções atuais
            currentRecipeProduct.tamanhosDisponiveis.forEach(tamanho => {
                const option = document.createElement('option');
                option.value = tamanho;
                option.textContent = tamanho.charAt(0).toUpperCase() + tamanho.slice(1);
                DOM.pizzaTamanhoSelectDetalhe.appendChild(option);
            });
            // Atualiza o texto com o tamanho selecionado (geralmente o primeiro da lista)
            DOM.currentPizzaSizeDetalheSpan.textContent = ` (${DOM.pizzaTamanhoSelectDetalhe.value})`;
        } else {
            DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none'; // Esconde o container do select de tamanho
            DOM.currentPizzaSizeDetalheSpan.textContent = ''; // Limpa o texto do tamanho
        }

        renderIngredientesReceitaDetalhe(); // Renderiza os ingredientes da receita para o tamanho padrão (ou o primeiro)
        DOM.btnSalvarReceitaDetalhe.disabled = false; // Habilita o botão de salvar receita
    } catch (error) {
        console.error('Erro ao carregar receita:', error);
        alert('Erro ao carregar receita para este produto.');
        currentRecipeProduct = null;
        DOM.receitaConfigDetalheContainer.classList.add('hidden');
        DOM.pizzaTamanhoSelectContainerDetalhe.style.display = 'none'; // Garante que esteja escondido em caso de erro
    }
}

function handlePizzaTamanhoSelectChangeDetalhe() {
    if (currentRecipeProduct && currentRecipeProduct.tipo === 'pizza') {
        DOM.currentPizzaSizeDetalheSpan.textContent = ` (${DOM.pizzaTamanhoSelectDetalhe.value})`;
        renderIngredientesReceitaDetalhe();
    }
}

function renderIngredientesReceitaDetalhe() {
    DOM.ingredientesParaReceitaDetalheList.innerHTML = '';
    let ingredientesDaReceita = {};

    if (currentRecipeProduct && currentRecipeProduct.tipo === 'pizza') {
        const tamanhoSelecionado = DOM.pizzaTamanhoSelectDetalhe.value;
        ingredientesDaReceita = currentRecipeProduct.receita?.[tamanhoSelecionado] || {};
    } else if (currentRecipeProduct) {
        ingredientesDaReceita = currentRecipeProduct.receita || {};
    }

    const ingredientIds = Object.keys(ingredientesDaReceita);

    if (ingredientIds.length === 0) {
        DOM.ingredientesParaReceitaDetalheList.innerHTML = '<p class="text-gray-600">Nenhum ingrediente adicionado a esta receita.</p>';
        return;
    }

    ingredientIds.forEach(ingredienteId => {
        const quantidade = ingredientesDaReceita[ingredienteId];
        const ingredienteInfo = allIngredients[ingredienteId];

        const listItem = document.createElement('div');
        listItem.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';

        if (ingredienteInfo) {
            listItem.innerHTML = `
                <span>${ingredienteInfo.nome}: <strong>${quantidade.toFixed(3)} ${ingredienteInfo.unidadeMedida}</strong></span>
                <button class="text-red-500 hover:text-red-700 btn-remove-ingrediente-receita" data-ingrediente-id="${ingredienteId}"><i class="fas fa-trash-alt"></i></button>
            `;
        } else {
            listItem.classList.remove('bg-gray-100');
            listItem.classList.add('bg-red-100', 'text-red-700');
            listItem.innerHTML = `
                <span>Ingrediente Desconhecido (ID: ${ingredienteId}): <strong>${quantidade.toFixed(3)}</strong></span>
                <button class="text-red-500 hover:text-red-700 btn-remove-ingrediente-receita" data-ingrediente-id="${ingredienteId}"><i class="fas fa-trash-alt"></i></button>
            `;
        }
        DOM.ingredientesParaReceitaDetalheList.appendChild(listItem);
    });

    DOM.ingredientesParaReceitaDetalheList.querySelectorAll('.btn-remove-ingrediente-receita').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', handleRemoveIngredienteReceitaDetalhe);
    });
}

function handleAddIngredienteReceitaDetalhe() {
    if (!currentRecipeProduct) {
        alert('Selecione um produto primeiro.');
        return;
    }

    const ingredienteId = DOM.receitaIngredienteSelectDetalhe.value;
    const quantidade = parseFloat(DOM.receitaQuantidadeDetalheInput.value);

    if (!ingredienteId || isNaN(quantidade) || quantidade <= 0) {
        alert('Selecione um ingrediente e insira uma quantidade válida e positiva.');
        return;
    }

    if (!allIngredients[ingredienteId]) {
        alert('Ingrediente selecionado não encontrado. Por favor, recarregue a página.');
        return;
    }

    // --- VALIDAÇÃO ADICIONAL PARA PIZZAS ---
    if (currentRecipeProduct.tipo === 'pizza') {
        const tamanhoSelecionado = DOM.pizzaTamanhoSelectDetalhe.value;
        if (!tamanhoSelecionado || tamanhoSelecionado === "") {
            alert('Para pizzas, selecione um tamanho (Grande, Broto, etc.) antes de adicionar ingredientes à receita.');
            return;
        }
        // Lógica existente para adicionar ingrediente ao tamanho da pizza
        if (!currentRecipeProduct.receita.hasOwnProperty(tamanhoSelecionado)) {
            currentRecipeProduct.receita[tamanhoSelecionado] = {};
        }
        currentRecipeProduct.receita[tamanhoSelecionado][ingredienteId] = quantidade;
    } else {
        // Lógica existente para produtos não-pizza
        currentRecipeProduct.receita[ingredienteId] = quantidade;
    }

    renderIngredientesReceitaDetalhe();
    DOM.receitaIngredienteSelectDetalhe.value = '';
    DOM.receitaQuantidadeDetalheInput.value = '';
}

async function handleSalvarReceitaDetalhe() {
    if (!currentRecipeProduct || !currentRecipeProduct.id || !currentRecipeProduct.categoria) {
        alert('Nenhum produto selecionado ou informações incompletas para salvar a receita.');
        return;
    }

    let custoCalculadoTotal = 0;
    if (currentRecipeProduct.tipo === 'pizza') {
        for (const size in currentRecipeProduct.receita) {
            const recipeForSize = currentRecipeProduct.receita[size];
            if (recipeForSize) {
                custoCalculadoTotal += calcularCustoReceita(recipeForSize);
            }
        }
    } else {
        custoCalculadoTotal = calcularCustoReceita(currentRecipeProduct.receita);
    }

    try {
        await produtosRef.child(currentRecipeProduct.categoria).child(currentRecipeProduct.id).update({
            receita: currentRecipeProduct.receita,
            custoIngredientes: custoCalculadoTotal
        });
        alert(`Receita para "${currentRecipeProduct.nome}" salva com sucesso! (Custo Total da Receita: R$ ${custoCalculadoTotal.toFixed(2)})`);
    } catch (error) {
        console.error('Erro ao salvar receita:', error);
        alert('Erro ao salvar receita. Verifique o console para mais detalhes.');
    }
}

function handleRemoveIngredienteReceitaDetalhe(event) {
    const ingredienteIdToRemove = event.target.closest('button').dataset.ingredienteId;
    if (!currentRecipeProduct) return;

    if (confirm('Tem certeza que deseja remover este ingrediente da receita?')) {
        if (currentRecipeProduct.tipo === 'pizza') {
            const tamanhoSelecionado = DOM.pizzaTamanhoSelectDetalhe.value;
            if (currentRecipeProduct.receita?.[tamanhoSelecionado]) {
                delete currentRecipeProduct.receita[tamanhoSelecionado][ingredienteIdToRemove];
                if (Object.keys(currentRecipeProduct.receita[tamanhoSelecionado]).length === 0) {
                    delete currentRecipeProduct.receita[tamanhoSelecionado];
                }
            }
        } else {
            delete currentRecipeProduct.receita[ingredienteIdToRemove];
        }
        renderIngredientesReceitaDetalhe();
    }
}

function calcularCustoReceita(receita) {
    let custoTotal = 0;
    for (const ingredienteId in receita) {
        const quantidadeNecessaria = receita[ingredienteId];
        const ingredienteInfo = allIngredients[ingredienteId];
        if (ingredienteInfo && ingredienteInfo.custoUnitarioMedio !== undefined) {
            custoTotal += quantidadeNecessaria * (ingredienteInfo.custoUnitarioMedio || 0);
        } else {
            console.warn(`Ingrediente ${ingredienteId} não encontrado ou sem custo médio para cálculo da receita.`);
        }
    }
    return custoTotal;
}

// Relatórios e Análises Rápidas de Estoque
function renderIngredientesPontoPedido(ingredientes) {
    if (!DOM.ingredientesPontoPedidoList) return;
    DOM.ingredientesPontoPedidoList.innerHTML = '';
    DOM.ingredientesPontoPedidoCount.textContent = ingredientes.length;

    if (ingredientes.length === 0) {
        DOM.ingredientesPontoPedidoList.innerHTML = '<p class="text-gray-600 text-center">Nenhum ingrediente abaixo do estoque mínimo.</p>';
        return;
    }

    ingredientes.sort((a, b) => a.nome.localeCompare(b.nome));

    ingredientes.forEach(ingrediente => {
        const listItem = document.createElement('div');
        listItem.className = 'flex justify-between items-center bg-red-100 text-red-800 p-2 rounded-md';
        listItem.innerHTML = `
            <span>${ingrediente.nome}: <strong>${(ingrediente.quantidadeAtual || 0).toFixed(2)} ${ingrediente.unidadeMedida}</strong></span>
            <span class="text-xs">Mínimo: ${ingrediente.estoqueMinimo} ${ingrediente.unidadeMedida}</span>
        `;
        DOM.ingredientesPontoPedidoList.appendChild(listItem);
    });
}

function renderConsumoDiario() {
    if (!DOM.listaConsumoDiarioContainer || !DOM.dataDiaAnteriorSpan || !DOM.totalGastoDiarioSpan) return;

    DOM.listaConsumoDiarioContainer.innerHTML = '';
    let totalCustoDiario = 0;
    const hoje = new Date();
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    DOM.dataDiaAnteriorSpan.textContent = hoje.toLocaleDateString('pt-BR', options);

    const ingredientesConsumidosDiario = [];
    Object.values(allIngredients).forEach(ingrediente => {
        if (ingrediente.quantidadeUsadaDiaria > 0 || ingrediente.custoUsadaDiaria > 0) {
            ingredientesConsumidosDiario.push(ingrediente);
            totalCustoDiario += ingrediente.custoUsadaDiaria || 0;
        }
    });

    if (ingredientesConsumidosDiario.length === 0) {
        DOM.listaConsumoDiarioContainer.innerHTML = '<p class="text-gray-500 text-center">Nenhum consumo registrado para hoje.</p>';
    } else {
        ingredientesConsumidosDiario.sort((a, b) => b.quantidadeUsadaDiaria - a.quantidadeUsadaDiaria);
        ingredientesConsumidosDiario.forEach(ingrediente => {
            const listItem = document.createElement('div');
            listItem.className = 'flex justify-between items-center bg-gray-100 p-1 rounded-sm';
            listItem.innerHTML = `
                <span>${ingrediente.nome}: <strong>${ingrediente.quantidadeUsadaDiaria.toFixed(3)} ${ingrediente.unidadeMedida}</strong></span>
                <span class="text-xs">R$ ${ingrediente.custoUsadaDiaria.toFixed(2)}</span>
            `;
            DOM.listaConsumoDiarioContainer.appendChild(listItem);
        });
    }
    DOM.totalGastoDiarioSpan.textContent = `R$ ${totalCustoDiario.toFixed(2)}`;
}

function renderConsumoMensal() {
    if (!DOM.listaConsumoMensalContainer || !DOM.totalGastoMensalSpan || !DOM.nomeMesAtualSpan) return;

    DOM.listaConsumoMensalContainer.innerHTML = '';
    let totalCustoMes = 0;
    const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    DOM.nomeMesAtualSpan.textContent = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1);

    const ingredientesConsumidosMes = [];
    Object.values(allIngredients).forEach(ingrediente => {
        if (ingrediente.quantidadeUsadaMensal > 0 || ingrediente.custoUsadoMensal > 0) {
            ingredientesConsumidosMes.push(ingrediente);
            totalCustoMes += ingrediente.custoUsadoMensal || 0;
        }
    });

    if (ingredientesConsumidosMes.length === 0) {
        DOM.listaConsumoMensalContainer.innerHTML = '<p class="text-gray-500 text-center">Nenhum consumo registrado para este mês.</p>';
    } else {
        ingredientesConsumidosMes.sort((a, b) => b.quantidadeUsadaMensal - a.quantidadeUsadaMensal);
        ingredientesConsumidosMes.forEach(ingrediente => {
            const listItem = document.createElement('div');
            listItem.className = 'flex justify-between items-center bg-gray-100 p-1 rounded-sm';
            listItem.innerHTML = `
                <span>${ingrediente.nome}: <strong>${ingrediente.quantidadeUsadaMensal.toFixed(3)} ${ingrediente.unidadeMedida}</strong></span>
                <span class="text-xs">R$ ${ingrediente.custoUsadoMensal.toFixed(2)}</span>
            `;
            DOM.listaConsumoMensalContainer.appendChild(listItem);
        });
    }
    DOM.totalGastoMensalSpan.textContent = `R$ ${totalCustoMes.toFixed(2)}`;
}

function calcularEExibirCustoUnitario() {
    const quantidade = parseFloat(DOM.compraQuantidadeDetalheInput.value);
    const precoTotal = parseFloat(DOM.compraPrecoTotalDetalheInput.value);
    const ingredienteId = DOM.compraIngredienteSelectDetalhe.value;

    if (quantidade > 0 && precoTotal > 0 && ingredienteId) {
        const precoUnitario = precoTotal / quantidade;
        const unidadeMedida = allIngredients[ingredienteId]?.unidadeMedida || 'un.';
        DOM.custoCalculadoDisplay.textContent = `(Custo: R$ ${precoUnitario.toFixed(2)} por ${unidadeMedida})`;
    } else {
        DOM.custoCalculadoDisplay.textContent = '';
    }
}

async function fetchAllIngredients() {
    try {
        const snapshot = await firebase.database().ref('ingredientes').once('value');
        allIngredients = snapshot.val() || {};
        console.log("All ingredients loaded:", allIngredients);
    } catch (error) {
        console.error("Error fetching ingredients:", error);
    }
}

// --------- SECÂO ADICIONAIS lghn -----------

function renderAdicionaisConfiguracao() {
    if (!DOM.listaAdicionaisConfiguracao) return;

    DOM.listaAdicionaisConfiguracao.innerHTML = ''; // Limpa a lista existente

    const sortedIngredients = Object.entries(allIngredients).sort(([, a], [, b]) => a.nome.localeCompare(b.nome));

    if (sortedIngredients.length === 0) {
        DOM.listaAdicionaisConfiguracao.innerHTML = '<p class="text-gray-600 text-center">Nenhum ingrediente cadastrado para configurar como adicional.</p>';
        return;
    }

    sortedIngredients.forEach(([id, ingrediente]) => {
        const isAddonActive = ingrediente.ativoAdicional || false; // Novo campo: ativoAdicional
        const addonPrice = typeof ingrediente.precoAdicional === 'number' ? ingrediente.precoAdicional.toFixed(2) : '';
        const addonRecipe = ingrediente.receitaAdicional || {}; // Nova receita específica para o adicional

        const itemDiv = document.createElement('div');
        itemDiv.className = 'bg-gray-100 p-4 rounded-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3';
        itemDiv.innerHTML = `
            <div class="flex-1">
                <p class="font-semibold text-gray-800 text-lg">${ingrediente.nome} <span class="text-sm text-gray-500">(${ingrediente.unidadeMedida})</span></p>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 items-end md:items-center">
                <div class="flex items-center gap-2">
                    <label for="addon-ativo-${id}" class="text-sm font-medium text-gray-700 cursor-pointer">Ativo como Adicional?</label>
                    <input type="checkbox" id="addon-ativo-${id}" class="addon-toggle-active form-checkbox h-5 w-5 text-green-600 rounded" data-id="${id}" ${isAddonActive ? 'checked' : ''}>
                </div>

                <div class="flex-1 min-w-[100px]">
                    <label for="addon-preco-${id}" class="block text-sm font-medium text-gray-700">Preço p/ Cliente (R$):</label>
                    <input type="number" id="addon-preco-${id}" class="addon-price-input mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500" placeholder="0.00" min="0" step="0.01" value="${addonPrice}" data-id="${id}">
                </div>

                <button class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm btn-config-addon-recipe" data-id="${id}" data-name="${ingrediente.nome}">
                    <i class="fas fa-flask"></i> Receita do Adicional
                </button>

                <button class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm btn-salvar-addon-config" data-id="${id}">
                    Salvar
                </button>
            </div>
        `;
        DOM.listaAdicionaisConfiguracao.appendChild(itemDiv);
    });

    // Adicionar event listeners para os novos elementos
    DOM.listaAdicionaisConfiguracao.querySelectorAll('.btn-salvar-addon-config').forEach(button => {
        button.addEventListener('click', handleSalvarAddonConfig);
    });

    // Adicionar event listeners para os inputs de preço (para permitir edição em tempo real do estado)
    DOM.listaAdicionaisConfiguracao.querySelectorAll('.addon-price-input, .addon-toggle-active').forEach(element => {
        element.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            // Marcar o botão de salvar do item correspondente para indicar que houve mudança
            const saveButton = DOM.listaAdicionaisConfiguracao.querySelector(`.btn-salvar-addon-config[data-id="${id}"]`);
            if (saveButton) {
                saveButton.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
                saveButton.classList.remove('bg-green-600', 'hover:bg-green-700');
                saveButton.textContent = 'Salvar Alterações';
            }
        });
    });

    // Event listener para o botão de Receita do Adicional (abre um modal ou expande)
    DOM.listaAdicionaisConfiguracao.querySelectorAll('.btn-config-addon-recipe').forEach(button => {
        button.addEventListener('click', handleConfigAddonRecipe);
    });
}

async function handleSalvarAddonConfig(event) {
    const ingredienteId = event.target.dataset.id;
    const toggleAtivo = DOM.listaAdicionaisConfiguracao.querySelector(`#addon-ativo-${ingredienteId}`);
    const inputPreco = DOM.listaAdicionaisConfiguracao.querySelector(`#addon-preco-${ingredienteId}`);

    const ativoAdicional = toggleAtivo.checked;
    const precoAdicional = parseFloat(inputPreco.value);

    if (ativoAdicional && (isNaN(precoAdicional) || precoAdicional <= 0)) {
        alert('Se o adicional estiver ativo, o preço para o cliente deve ser um valor positivo.');
        return;
    }

    try {
        const updateData = {
            ativoAdicional: ativoAdicional,
            precoAdicional: ativoAdicional ? precoAdicional : null // Define como null se não for ativo
        };
        await ingredientesRef.child(ingredienteId).update(updateData);
        alert('Configuração de adicional salva com sucesso!');
        // Resetar o estilo do botão de salvar
        const saveButton = event.target;
        saveButton.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        saveButton.classList.add('bg-green-600', 'hover:bg-green-700');
        saveButton.textContent = 'Salvar';
    } catch (error) {
        console.error('Erro ao salvar configuração de adicional:', error);
        alert('Erro ao salvar configuração de adicional.');
    }
}

async function handleConfigAddonRecipe(event) {
    const addonId = event.target.dataset.id;
    const addonName = event.target.dataset.name;

    if (!addonId || !addonName) {
        alert('Erro: ID ou nome do adicional não encontrado.');
        return;
    }

    currentAddonRecipeId = addonId;
    DOM_ADDON_RECIPE_MODAL.nameSpan.textContent = addonName;

    // Carrega a receita existente do ingrediente
    const ingredienteData = allIngredients[addonId];
    currentAddonRecipe = ingredienteData?.receitaAdicional || {}; // Use 'receitaAdicional'

    renderAddonRecipeIngredients();
    populateAddonRecipeIngredientSelect();

    DOM_ADDON_RECIPE_MODAL.modal.style.display = 'flex';
}

function renderAddonRecipeIngredients() {
    DOM_ADDON_RECIPE_MODAL.ingredientsList.innerHTML = '';
    const ingredientIds = Object.keys(currentAddonRecipe);

    if (ingredientIds.length === 0) {
        DOM_ADDON_RECIPE_MODAL.ingredientsList.innerHTML = '<p class="text-gray-600">Nenhum ingrediente nesta receita.</p>';
        return;
    }

    ingredientIds.forEach(ingredienteId => {
        const quantidade = currentAddonRecipe[ingredienteId];
        const ingredienteInfo = allIngredients[ingredienteId]; // Pega do allIngredients global

        const listItem = document.createElement('div');
        listItem.className = 'flex justify-between items-center bg-gray-100 p-2 rounded-md';

        if (ingredienteInfo) {
            listItem.innerHTML = `
                <span>${ingredienteInfo.nome}: <strong>${quantidade.toFixed(3)} ${ingredienteInfo.unidadeMedida}</strong></span>
                <button class="text-red-500 hover:text-red-700 btn-remove-addon-recipe-ingrediente" data-ingrediente-id="${ingredienteId}"><i class="fas fa-trash-alt"></i></button>
            `;
        } else {
            listItem.classList.remove('bg-gray-100');
            listItem.classList.add('bg-red-100', 'text-red-700');
            listItem.innerHTML = `
                <span>Ingrediente Desconhecido (ID: ${ingredienteId}): <strong>${quantidade.toFixed(3)}</strong></span>
                <button class="text-red-500 hover:text-red-700 btn-remove-addon-recipe-ingrediente" data-ingrediente-id="${ingredienteId}"><i class="fas fa-trash-alt"></i></button>
            `;
        }
        DOM_ADDON_RECIPE_MODAL.ingredientsList.appendChild(listItem);
    });

    DOM_ADDON_RECIPE_MODAL.ingredientsList.querySelectorAll('.btn-remove-addon-recipe-ingrediente').forEach(button => {
        button.addEventListener('click', handleRemoveAddonRecipeIngrediente);
    });
}

function populateAddonRecipeIngredientSelect() {
    DOM_ADDON_RECIPE_MODAL.ingredienteSelect.innerHTML = '<option value="">Selecione um ingrediente</option>';
    const sortedIngredients = Object.entries(allIngredients).sort(([, a], [, b]) => a.nome.localeCompare(b.nome));
    sortedIngredients.forEach(([id, ingrediente]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${ingrediente.nome} (${ingrediente.unidadeMedida})`;
        DOM_ADDON_RECIPE_MODAL.ingredienteSelect.appendChild(option);
    });
}

function handleAddAddonRecipeIngrediente() {
    const ingredienteId = DOM_ADDON_RECIPE_MODAL.ingredienteSelect.value;
    const quantidade = parseFloat(DOM_ADDON_RECIPE_MODAL.quantidadeInput.value);

    if (!ingredienteId || isNaN(quantidade) || quantidade <= 0) {
        alert('Selecione um ingrediente e insira uma quantidade válida e positiva.');
        return;
    }

    if (!allIngredients[ingredienteId]) {
        alert('Ingrediente selecionado não encontrado. Por favor, recarregue a página.');
        return;
    }

    currentAddonRecipe[ingredienteId] = quantidade;
    renderAddonRecipeIngredients();
    DOM_ADDON_RECIPE_MODAL.ingredienteSelect.value = '';
    DOM_ADDON_RECIPE_MODAL.quantidadeInput.value = '';
}

function handleRemoveAddonRecipeIngrediente(event) {
    const ingredienteIdToRemove = event.target.closest('button').dataset.ingredienteId;
    if (!currentAddonRecipe) return;

    if (confirm('Tem certeza que deseja remover este ingrediente da receita do adicional?')) {
        delete currentAddonRecipe[ingredienteIdToRemove];
        renderAddonRecipeIngredients();
    }
}

async function handleSaveAddonRecipe() {
    if (!currentAddonRecipeId) {
        alert('Nenhum adicional selecionado para salvar a receita.');
        return;
    }

    try {
        // Atualiza a receitaAdicional do ingrediente no Firebase
        await ingredientesRef.child(currentAddonRecipeId).update({
            receitaAdicional: currentAddonRecipe
        });
        alert('Receita do adicional salva com sucesso!');
        DOM_ADDON_RECIPE_MODAL.modal.style.display = 'none';
        // Atualize allIngredients globalmente (se o listener não fizer isso rápido o suficiente)
        // ou recarregue a lista de adicionais para refletir a mudança
        // renderAdicionaisConfiguracao(); // Pode ser chamado aqui se necessário
    } catch (error) {
        console.error('Erro ao salvar receita do adicional:', error);
        alert('Erro ao salvar receita do adicional.');
    }
}

// Listener para fechar o modal de receita do adicional

// --- SEÇÃO: GERENCIAMENTO DE GARÇONS -----------------------------------------------------------------------------------------------------------------------------------------------------



function carregarGarcom(snapshot) {
    if (!DOM.listaGarconsContainer) {
        console.error("Container da lista de garçons (listaGarconsContainer) não encontrado no DOM. Não foi possível carregar a lista.");
        return;
    }

    const garcons = snapshot.val();
    DOM.listaGarconsContainer.innerHTML = ''; // Limpa a lista existente

    if (!garcons) {
        DOM.listaGarconsContainer.innerHTML = '<p class="text-gray-600 col-span-full text-center">Nenhum garçom cadastrado.</p>';
        return;
    }

    Object.entries(garcons).forEach(([uid, garcom]) => {
        if (!garcom) return; // Garante que o objeto garcom não é nulo

        const garcomDiv = document.createElement('div');
        garcomDiv.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col justify-between';

        garcomDiv.innerHTML = `
            <div class="flex-grow">
                <h3 class="text-lg font-semibold text-gray-800">${garcom.nome}</h3>
                <p class="text-sm text-gray-500">ID: ${uid}</p>
                <p class="text-sm text-gray-500">Email: ${garcom.email || 'N/A'}</p>
            </div>
            <div class="flex gap-2 mt-4">
                <button class="btn-reset-senha-garcom bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm flex-1" data-email="${garcom.email}" data-nome="${garcom.nome}">
                    Redefinir Senha
                </button>
                <button class="btn-excluir-garcom bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm flex-1" data-uid="${uid}" data-nome="${garcom.nome}">
                    Excluir
                </button>
            </div>
        `;
        DOM.listaGarconsContainer.appendChild(garcomDiv);
    });

    // Anexa os event listeners aos botões criados dinamicamente
    // É crucial clonar e substituir o nó para garantir que não haja listeners duplicados
    DOM.listaGarconsContainer.querySelectorAll('.btn-reset-senha-garcom').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button); // Substitui o botão existente pelo clone
        newButton.addEventListener('click', (e) => {
            const email = e.target.dataset.email;
            const nome = e.target.dataset.nome;
            if (confirm(`Deseja enviar um e-mail de redefinição de senha para ${nome} (${email})?`)) {
                firebase.auth().sendPasswordResetEmail(email)
                    .then(() => {
                        alert(`E-mail de redefinição de senha enviado para ${email}.`);
                    })
                    .catch((error) => {
                        alert('Erro ao enviar e-mail: ' + error.message);
                        console.error("Erro ao enviar redefinição de senha:", error);
                    });
            }
        });
    });

    DOM.listaGarconsContainer.querySelectorAll('.btn-excluir-garcom').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button); // Substitui o botão existente pelo clone
        newButton.addEventListener('click', async (e) => {
            const uid = e.target.dataset.uid;
            const nome = e.target.dataset.nome;
            if (confirm(`Deseja realmente excluir o garçom ${nome}? Esta ação removerá os dados do banco de dados.`)) {
                try {
                    await garconsInfoRef.child(uid).remove();
                    alert(`Dados do garçom ${nome} excluídos do banco de dados.`);
                    alert("Atenção: O usuário correspondente no Firebase Authentication NÃO foi excluído. Faça isso manualmente no console do Firebase (Authentication).");
                } catch (error) {
                    alert("Erro ao excluir dados do garçom: " + error.message);
                    console.error("Erro ao excluir dados do garçom:", error);
                }
            }
        });
    });
}


// --- INÍCIO DO SEU document.addEventListener('DOMContentLoaded', ...) em panel.js ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAllIngredients();
    renderAdicionaisConfiguracao();

    Object.assign(DOM, {
        // ... (outros elementos DOM do seu painel principal, ex: btnAtivos, pedidosAtivosContainer)

        // Elementos DOM para Gerenciar Garçons
        btnGerenciarGarcom: document.getElementById('btn-gerenciar-garcom'), // Botão da sidebar
        abaGerenciarGarcom: document.getElementById('aba-gerenciar-garcom'), // A div da aba
        garcomNomeInput: document.getElementById('garcom-nome'),
        garcomSenhaInput: document.getElementById('garcom-senha'),
        btnSalvarGarcom: document.getElementById('btn-salvar-garcom'),
        listaGarconsContainer: document.getElementById('lista-garcons-container'),
        // ... (outros elementos DOM)
    });

    // --- Lógica de Autenticação (já deve existir no seu panel.js) ---
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Admin: Usuário autenticado:", user.email);
            document.body.style.display = 'flex'; // Mostra o corpo da página
            
            // Ouve as mudanças nos garçons para atualizar a lista AUTOMATICAMENTE
            garconsInfoRef.on('value', carregarGarcom);
            
            // ... (outras inicializações e listeners para o resto do seu painel)
        } else {
            console.log("Admin: Nenhum usuário autenticado. Redirecionando para login.html");
            window.location.replace('login.html');
        }
    });

    // --- Listeners para os Botões do Menu Principal ---
    // (Ajuste conforme a estrutura do seu menu, ex: sidebar buttons)
    if (DOM.btnGerenciarGarcom) {
        DOM.btnGerenciarGarcom.addEventListener('click', () => {
            // Lógica para ativar a aba de gerenciamento de garçons
            // (Assumindo que você tem funções como `ativaAba` e `estilizaBotaoAtivo` para gerenciar a visibilidade das abas)
            // Exemplo:
            // ativaAba(DOM.abaGerenciarGarcom, DOM.outrasAbasInativas);
            // estilizaBotaoAtivo(DOM.btnGerenciarGarcom, DOM.outrosBotoesInativos);
            DOM.abaGerenciarGarcom.classList.remove('hidden'); // Apenas para garantir que a aba apareça
            
            // Carregar garçons ao clicar no botão do menu
            // O listener 'garconsInfoRef.on('value', carregarGarcom);' já faz isso automaticamente ao detectar mudanças
            // mas chamar 'once' aqui garante uma atualização imediata ao abrir a aba, caso a conexão seja lenta.
            garconsInfoRef.once('value', carregarGarcom); 
        });
    }

    // --- SEÇÃO: GERENCIAMENTO DE GARÇONS (Listener do Botão Salvar) ---
    // ############ ATENÇÃO AQUI: O LISTENER É ADICIONADO APÓS OS ELEMENTOS DOM SEREM MAPEADOS ############
    if (DOM.btnSalvarGarcom) { // Verifica se o botão foi encontrado e não é null
        DOM.btnSalvarGarcom.addEventListener('click', async () => {
            // Certifique-se de que os inputs também foram encontrados
            const nomeGarcom = DOM.garcomNomeInput ? DOM.garcomNomeInput.value.trim() : '';
            const senhaGarcom = DOM.garcomSenhaInput ? DOM.garcomSenhaInput.value.trim() : '';

            if (!nomeGarcom || !senhaGarcom) {
                alert("O nome e a senha do garçom são obrigatórios.");
                return;
            }
            if (senhaGarcom.length < 6) {
                alert("A senha deve ter pelo menos 6 caracteres.");
                return;
            }

            // A lógica de criação de e-mail deve ser robusta para garantir unicidade
            // O replace(/\s+/g, '_') substitui múltiplos espaços por um único underscore
            // O replace(/[^a-z0-9_]/g, '') remove qualquer caractere que não seja letra, número ou underscore
            const emailGarcom = `${nomeGarcom.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}@seu-restaurante.com`;

            try {
                // Tenta criar o usuário no Firebase Authentication
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(emailGarcom, senhaGarcom);
                const user = userCredential.user;

                // Salva os dados do garçom no Realtime Database usando o UID como chave
                await garconsInfoRef.child(user.uid).set({
                    nome: nomeGarcom,
                    email: emailGarcom,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });

                alert(`Garçom "${nomeGarcom}" adicionado com sucesso!`);
                // Limpa os campos do formulário
                if (DOM.garcomNomeInput) DOM.garcomNomeInput.value = '';
                if (DOM.garcomSenhaInput) DOM.garcomSenhaInput.value = '';

                // Como há um listener 'on('value')' para garconsInfoRef, a lista deve ser atualizada automaticamente.
            } catch (error) {
                console.error("Erro ao adicionar garçom:", error);
                if (error.code === 'auth/email-already-in-use') {
                    alert('Erro: Já existe um garçom com este nome (ou e-mail interno). Use um nome diferente.');
                } else if (error.code === 'auth/weak-password') {
                    alert('Erro: A senha deve ter pelo menos 6 caracteres.');
                } else {
                    alert("Erro ao adicionar garçom: " + error.message);
                }
            }
        });
    }

    // ... (restante do seu código DOMContentLoaded, outros listeners, etc.)

}); // Fim de DOMContentLoaded


// SEÇÂO CLIENTES INATIVOS lghn ------------------------------------------------------------------------------------------------

database.ref('config/menuLink').on('value', (snapshot) => {
    menuLink = snapshot.val() || '';
    if (DOM.menuLinkInput) {
        DOM.menuLinkInput.value = menuLink;
    }
    console.log("Link do cardápio atualizado:", menuLink);
});

async function verificarClientesInativos() {
    DOM.clientesInativosContainer.innerHTML = '<p class="text-gray-600">Buscando pedidos...</p>';
    const diasInatividade = parseInt(DOM.diasInatividadeInput.value, 10);

    if (isNaN(diasInatividade) || diasInatividade <= 0) {
        alert('Por favor, insira um número válido de dias para inatividade (maior que zero).');
        DOM.clientesInativosContainer.innerHTML = '<p class="text-red-600">Erro: Número de dias inválido.</p>';
        return;
    }

    try {
        const snapshot = await pedidosRef.orderByChild('timestamp').once('value');
        const pedidos = snapshot.val();

        if (!pedidos) {
            DOM.clientesInativosContainer.innerHTML = '<p class="text-gray-600">Nenhum pedido encontrado no sistema.</p>';
            return;
        }

        const clientesLastOrder = {}; // { telefone: lastOrderTimestamp, ... }
        const clientesInfo = {}; // { telefone: { nome: '...', email: '...' }, ... }

        Object.values(pedidos).forEach(pedido => {
            if (pedido.status === 'Finalizado' && pedido.telefone) {
                const telefoneLimpo = pedido.telefone.replace(/\D/g, ''); // Clean phone number
                const timestamp = pedido.timestamp;

                if (!clientesLastOrder[telefoneLimpo] || timestamp > clientesLastOrder[telefoneLimpo]) {
                    clientesLastOrder[telefoneLimpo] = timestamp;
                    clientesInfo[telefoneLimpo] = {
                        nome: pedido.nomeCliente || 'Cliente Desconhecido',
                        telefone: pedido.telefone // Keep original format for display/messaging
                    };
                }
            }
        });

        const now = Date.now();
        const cutoffTimestamp = now - (diasInatividade * 24 * 60 * 60 * 1000); // 15 days ago in milliseconds

        const inactiveCustomers = Object.entries(clientesLastOrder)
            .filter(([telefone, lastOrderTimestamp]) => lastOrderTimestamp < cutoffTimestamp)
            .map(([telefone, lastOrderTimestamp]) => ({
                telefone: clientesInfo[telefone].telefone, // Use the original formatted phone
                nome: clientesInfo[telefone].nome,
                lastOrder: new Date(lastOrderTimestamp).toLocaleDateString('pt-BR')
            }))
            .sort((a, b) => new Date(a.lastOrder).getTime() - new Date(b.lastOrder).getTime()); // Sort by oldest last order first

        renderInactiveCustomers(inactiveCustomers);

    } catch (error) {
        console.error("Erro ao verificar clientes inativos:", error);
        DOM.clientesInativosContainer.innerHTML = `<p class="text-red-600">Erro ao carregar dados dos clientes: ${error.message}</p>`;
    }
}

function renderInactiveCustomers(customers) {
    DOM.clientesInativosContainer.innerHTML = '';

    if (customers.length === 0) {
        DOM.clientesInativosContainer.innerHTML = '<p class="text-gray-600">Nenhum cliente inativo encontrado com os critérios atuais.</p>';
        return;
    }

    const title = document.createElement('h4');
    title.className = 'text-md font-semibold mb-3';
    title.textContent = `Clientes inativos (${customers.length} encontrados):`;
    DOM.clientesInativosContainer.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'space-y-3';

    customers.forEach(customer => {
        const listItem = document.createElement('li');
        listItem.className = 'flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200';
        listItem.innerHTML = `
            <div>
                <p class="font-medium text-gray-800">${customer.nome}</p>
                <p class="text-sm text-gray-600">Telefone: ${customer.telefone}</p>
                <p class="text-sm text-gray-600">Último pedido: ${customer.lastOrder}</p>
            </div>
            <button class="btn-send-inactive-message bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition duration-200 text-sm" data-phone="${customer.telefone}" data-name="${customer.nome}">
                Enviar Mensagem
            </button>
        `;
        list.appendChild(listItem);
    });
    DOM.clientesInativosContainer.appendChild(list);

    DOM.clientesInativosContainer.querySelectorAll('.btn-send-inactive-message').forEach(button => {
        button.addEventListener('click', sendInactiveCustomerMessage);
    });
}

function sendInactiveCustomerMessage(event) {
    const phone = event.target.dataset.phone;
    const name = event.target.dataset.name;

    const cleanedPhone = phone.replace(/\D/g, ''); // Remove non-digits for WhatsApp URL

    const defaultMessage = `Olá ${name}! 👋 Notamos que você não faz um pedido conosco há um tempo. Sentimos sua falta! Que tal dar uma olhada no nosso cardápio atualizado e matar a saudade dos seus sabores favoritos? Estamos esperando você! 😊 [Seu link do cardápio aqui]`;

    const message = prompt("Edite a mensagem antes de enviar:", defaultMessage);

    if (message) {
        window.open(`https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(message)}`, '_blank');
    }
}

// --- SEÇÃO: CONFIGURAÇÕES GERAIS - GERENCIAMENTO DE CLIENTES INATIVOS ---
async function verificarClientesInativos() {
    DOM.clientesInativosContainer.innerHTML = '<p class="text-gray-600">Buscando pedidos...</p>';
    const diasInatividade = parseInt(DOM.diasInatividadeInput.value, 10);

    // Get the current date and time in Brazil timezone
    const nowInBrazil = new Date(); // This will be in the local timezone of the server/browser
    const offset = nowInBrazil.getTimezoneOffset() + (3 * 60); // Difference to BRT (UTC-3) in minutes
    const nowAdjusted = new Date(nowInBrazil.getTime() - (offset * 60 * 1000));

    // Set cutoff timestamp to the beginning of the day 'diasInatividade' days ago
    const cutoffDate = new Date(nowAdjusted);
    cutoffDate.setDate(nowAdjusted.getDate() - diasInatividade);
    cutoffDate.setHours(0, 0, 0, 0); // Start of the day
    const cutoffTimestamp = cutoffDate.getTime();


    if (isNaN(diasInatividade) || diasInatividade <= 0) {
        alert('Por favor, insira um número válido de dias para inatividade (maior que zero).');
        DOM.clientesInativosContainer.innerHTML = '<p class="text-red-600">Erro: Número de dias inválido.</p>';
        return;
    }

    try {
        const snapshot = await pedidosRef.orderByChild('timestamp').once('value');
        const pedidos = snapshot.val();

        if (!pedidos) {
            DOM.clientesInativosContainer.innerHTML = '<p class="text-gray-600">Nenhum pedido encontrado no sistema.</p>';
            return;
        }

        const clientesLastOrder = {}; // { telefone: lastOrderTimestamp, ... }
        const clientesInfo = {}; // { telefone: { nome: '...', originalPhone: '...' }, ... }

        Object.values(pedidos).forEach(pedido => {
            if (pedido.status === 'Finalizado' && pedido.telefone) {
                const telefoneLimpo = pedido.telefone.replace(/\D/g, ''); // Clean phone number
                const timestamp = pedido.timestamp;

                if (!clientesLastOrder[telefoneLimpo] || timestamp > clientesLastOrder[telefoneLimpo]) {
                    clientesLastOrder[telefoneLimpo] = timestamp;
                    clientesInfo[telefoneLimpo] = {
                        nome: pedido.nomeCliente || 'Cliente Desconhecido',
                        originalPhone: pedido.telefone // Keep original format for display/messaging
                    };
                }
            }
        });

        const inactiveCustomers = Object.entries(clientesLastOrder)
            .filter(([telefone, lastOrderTimestamp]) => lastOrderTimestamp < cutoffTimestamp)
            .map(([telefone, lastOrderTimestamp]) => ({
                telefone: clientesInfo[telefone].originalPhone, // Use the original formatted phone
                nome: clientesInfo[telefone].nome,
                lastOrder: new Date(lastOrderTimestamp).toLocaleDateString('pt-BR')
            }))
            .sort((a, b) => new Date(a.lastOrder).getTime() - new Date(b.lastOrder).getTime()); // Sort by oldest last order first

        renderInactiveCustomers(inactiveCustomers);

    } catch (error) {
        console.error("Erro ao verificar clientes inativos:", error);
        DOM.clientesInativosContainer.innerHTML = `<p class="text-red-600">Erro ao carregar dados dos clientes: ${error.message}</p>`;
    }
}

function renderInactiveCustomers(customers) {
    DOM.clientesInativosContainer.innerHTML = '';

    if (customers.length === 0) {
        DOM.clientesInativosContainer.innerHTML = '<p class="text-gray-600">Nenhum cliente inativo encontrado com os critérios atuais.</p>';
        return;
    }

    const title = document.createElement('h4');
    title.className = 'text-md font-semibold mb-3';
    title.textContent = `Clientes inativos (${customers.length} encontrados):`;
    DOM.clientesInativosContainer.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'space-y-3';

    customers.forEach(customer => {
        const listItem = document.createElement('li');
        listItem.className = 'flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200';
        listItem.innerHTML = `
            <div>
                <p class="font-medium text-gray-800">${customer.nome}</p>
                <p class="text-sm text-gray-600">Telefone: ${customer.telefone}</p>
                <p class="text-sm text-gray-600">Último pedido: ${customer.lastOrder}</p>
            </div>
            <button class="btn-send-inactive-message bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition duration-200 text-sm" data-phone="${customer.telefone}" data-name="${customer.nome}">
                Enviar Mensagem
            </button>
        `;
        list.appendChild(listItem);
    });
    DOM.clientesInativosContainer.appendChild(list);

    DOM.clientesInativosContainer.querySelectorAll('.btn-send-inactive-message').forEach(button => {
        const newButton = button.cloneNode(true); // Clone to remove existing listeners
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', sendInactiveCustomerMessage);
    });
}

function sendInactiveCustomerMessage(event) {
    const phone = event.target.dataset.phone;
    const name = event.target.dataset.name;

    const cleanedPhone = phone.replace(/\D/g, ''); // Remove non-digits for WhatsApp URL

    const dynamicMenuLink = menuLink ? `\n\nConfira nosso cardápio: ${menuLink}` : '';
    const defaultMessage = `Olá ${name}! 👋 Notamos que você não faz um pedido conosco há um tempo. Sentimos sua falta! Que tal dar uma olhada no nosso cardápio atualizado e matar a saudade dos seus pratos favoritos? Estamos esperando você! 😊${dynamicMenuLink}`;

    const message = prompt("Edite a mensagem antes de enviar:", defaultMessage);

    if (message) {
        window.open(`https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(message)}`, '_blank');
    }
}

// --- New Functions for Menu Link Modal ---
function abrirModalMenuLink() {
    DOM.menuLinkInput.value = menuLink; // Populate input with current saved link
    DOM.modalMenuLink.classList.remove('hidden');
    DOM.modalMenuLink.classList.add('flex');
}

function fecharModalMenuLink() {
    DOM.modalMenuLink.classList.add('hidden');
    DOM.modalMenuLink.classList.remove('flex');
}

async function salvarMenuLink() {
    const newMenuLink = DOM.menuLinkInput.value.trim();

    if (!newMenuLink) {
        alert('Por favor, insira um link para o cardápio.');
        return;
    }
    if (!newMenuLink.startsWith('http://') && !newMenuLink.startsWith('https://')) {
        alert('O link deve começar com "http://" ou "https://".');
        return;
    }

    try {
        await database.ref('config/menuLink').set(newMenuLink);
        menuLink = newMenuLink; // Update global variable
        alert('Link do cardápio salvo com sucesso!');
        fecharModalMenuLink();
    } catch (error) {
        console.error('Erro ao salvar link do cardápio:', error);
        alert('Erro ao salvar link do cardápio: ' + error.message);
    }
}

// SEÇÃO PEDIDOS: Pedido Manual LGHN------------------------------------------------------------------------------------------------------------------------------

function openManualOrderModal() {
    const modal = document.getElementById('modal-pedido-manual');
    if (modal) {
        resetManualOrderModal(); // Limpa a modal antes de abrir.
        populateCategorySelect('manual-select-categoria');
        populateBordasSelect('pizza-borda');
        handleDeliveryTypeChange();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

/**
 * Reseta todos os campos e o carrinho da modal para um estado limpo.
 */
function resetManualOrderModal() {
    manualOrderCart = [];
    updateManualCartView();
    ['manual-nome-cliente', 'manual-telefone', 'manual-input-rua', 'manual-input-numero', 'manual-input-bairro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('manual-qtd-produto').value = '1';
    document.getElementById('manual-select-categoria').value = '';
    document.getElementById('container-montagem-pizza').classList.add('hidden');
    document.getElementById('container-outros-itens').classList.add('hidden');
    document.getElementById('pizza-meio-a-meio-check').checked = false;
    document.getElementById('container-sabor2').classList.add('hidden');
    document.getElementById('container-endereco').classList.add('hidden'); // Esconde o contêiner do endereço
    document.getElementById('manual-tipo-entrega').value = 'Retirada'; // Reseta o tipo de entrega para "Retirada"
}

/**
 * Popula o <select> de categorias com base nos produtos carregados.
 */
function populateCategorySelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecione a Categoria --</option>';
    if (allProducts) {
        Object.keys(allProducts).sort().forEach(catKey => {
            const option = document.createElement('option');
            option.value = catKey;
            option.textContent = catKey.charAt(0).toUpperCase() + catKey.slice(1);
            select.appendChild(option);
        });
    }
}

/**
 * Popula o <select> de bordas com base nas bordas carregadas.
 */
function populateBordasSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Sem Borda</option>';

    if (allBordas) {
        // Ordena as bordas pelo nome para exibição consistente
        Object.entries(allBordas).sort(([, a], [, b]) => a.nome.localeCompare(b.nome)).forEach(([key, borda]) => {
            const option = document.createElement('option');
            option.value = key;
            
            // Verifica se a borda tem preços por tamanho ou um preço único
            let bordaText = borda.nome;
            if (borda.precos && borda.precos.broto !== undefined && borda.precos.grande !== undefined) {
                bordaText += ` (+ R$${borda.precos.broto.toFixed(2)} Broto / R$${borda.precos.grande.toFixed(2)} Grande)`;
            } else if (borda.preco !== undefined) { // Fallback para preço único, se necessário
                bordaText += ` (+ R$${borda.preco.toFixed(2)})`;
            }
            
            option.textContent = bordaText;
            select.appendChild(option);
        });
    }
}
/**
 * Popula um <select> de produtos (ex: sabores de pizza, bebidas).
 */
function populateProductSelect(selectId, category) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">-- Selecione --</option>';
    if (allProducts && allProducts[category]) {
        Object.entries(allProducts[category]).sort(([, a], [, b]) => a.nome.localeCompare(b.nome)).forEach(([id, product]) => {
            if (product.ativo !== false) {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = product.nome;
                select.appendChild(option);
            }
        });
    }
}

/**
 * Controla a interface, mostrando as opções de pizza ou de outros itens.
 */
function updateItemSelectionUI(category) {
    const containerPizza = document.getElementById('container-montagem-pizza');
    const containerOutros = document.getElementById('container-outros-itens');

    containerPizza.classList.add('hidden');
    containerOutros.classList.add('hidden');

    if (category === 'pizzas') {
        containerPizza.classList.remove('hidden');
        populateProductSelect('pizza-sabor1', 'pizzas');
        populateProductSelect('pizza-sabor2', 'pizzas');
    } else if (category) {
        containerOutros.classList.remove('hidden');
        populateProductSelect('manual-select-produto', category);
    }
}

/**
 * Adiciona o item configurado ao carrinho (`manualOrderCart`).
 */
function addItemToManualCart() {
    const categoria = document.getElementById('manual-select-categoria').value;
    const quantidade = parseInt(document.getElementById('manual-qtd-produto').value);

    if (!categoria || isNaN(quantidade) || quantidade <= 0) {
        alert("Selecione uma categoria e uma quantidade válida.");
        return;
    }

    let item;
    if (categoria === 'pizzas') {
        item = buildPizzaItem();
    } else {
        item = buildGenericItem(categoria);
    }

    if (item) {
        item.quantity = quantidade;
        item.totalPrice = item.price * item.quantity;

        // Certifique-se que estas propriedades estão presentes para a dedução de estoque
        // buildPizzaItem já retorna originalProductId, productCategory, etc.
        // buildGenericItem precisa ter isso adicionado.
        if (categoria !== 'pizzas' && item.id) { // Para itens genéricos
             item.originalProductId = item.id; // O ID já é o Firebase Key
             item.productCategory = categoria; // A categoria selecionada
        }

        manualOrderCart.push(item);
        updateManualCartView();
    }
}

/**
 * Constrói o objeto de uma pizza com todas as suas customizações.
 */
function buildPizzaItem() {
    const tamanho = document.getElementById('pizza-tamanho').value; // Retorna 'Grande' ou 'Broto'
    const bordaKey = document.getElementById('pizza-borda').value;
    const sabor1Key = document.getElementById('pizza-sabor1').value;
    const isMeioAMeio = document.getElementById('pizza-meio-a-meio-check').checked;
    const sabor2Key = document.getElementById('pizza-sabor2').value;

    if (!sabor1Key || (isMeioAMeio && !sabor2Key)) {
        alert("Selecione os sabores da pizza corretamente.");
        return null;
    }

    const sabor1 = allProducts.pizzas[sabor1Key];
    let precoBase1 = 0;
    const tamanhoKey = tamanho.toLowerCase();

    if (sabor1 && sabor1.precos && sabor1.precos[tamanhoKey] !== undefined) {
        precoBase1 = sabor1.precos[tamanhoKey];
    } else if (sabor1 && sabor1.preco !== undefined) {
        precoBase1 = sabor1.preco;
    } else {
        alert(`Erro: Preço do 1º sabor (${sabor1?.nome || 'desconhecido'}) para o tamanho ${tamanho} não encontrado.`);
        return null;
    }

    let nomeProdutoPizza = `${sabor1.nome}`; // Inicia a formatação do nome

    let precoFinalPizza = precoBase1;
    let sabor2 = null;

    if (isMeioAMeio && sabor2Key) {
        sabor2 = allProducts.pizzas[sabor2Key];
        let precoBase2 = 0;

        if (sabor2 && sabor2.precos && sabor2.precos[tamanhoKey] !== undefined) {
            precoBase2 = sabor2.precos[tamanhoKey];
        } else if (sabor2 && sabor2.preco !== undefined) {
            precoBase2 = sabor2.preco;
        } else {
            alert(`Erro: Preço do 2º sabor (${sabor2?.nome || 'desconhecido'}) para o tamanho ${tamanho} não encontrado.`);
            return null;
        }

        precoFinalPizza = Math.max(precoBase1, precoBase2);
        nomeProdutoPizza = `${sabor1.nome} / ${sabor2.nome}`; // Formato para meio a meio
    }

    if (tamanho === 'Broto') {
        const sabor1Nome = sabor1.nome || '';
        const sabor2Nome = sabor2 ? sabor2.nome || '' : '';

        const temSaborEspecial =
            sabor1Nome.toLowerCase().includes('costela') ||
            sabor2Nome.toLowerCase().includes('costela') ||
            sabor1Nome.toLowerCase().includes('morango com chocolate') ||
            sabor2Nome.toLowerCase().includes('morango com chocolate');

        if (temSaborEspecial) {
            precoFinalPizza = 35.00; // Preço especial para Broto de Costela ou Morango com Chocolate
        } else {
            precoFinalPizza = 30.00;
        }
    }

    let precoBorda = 0;
    if (bordaKey && allBordas[bordaKey]) {
        if (allBordas[bordaKey].precos && allBordas[bordaKey].precos[tamanhoKey] !== undefined) {
            precoBorda = allBordas[bordaKey].precos[tamanhoKey];
            nomeProdutoPizza += ` (Borda ${allBordas[bordaKey].nome})`; // Adiciona a borda ao nome
        }
    }
    
    // Adiciona o tamanho ao final do nome do produto

    const precoCalculadoDoItem = precoFinalPizza + precoBorda;

    return {
        id: isMeioAMeio ? `${sabor1Key}|${sabor2Key}|${tamanho}` : `${sabor1Key}|${tamanho}`,
        name: nomeProdutoPizza, // Usa o nome formatado
        price: precoCalculadoDoItem,
        size: tamanho,
    };
}

/**
 * Constrói o objeto de um item genérico (bebida, esfiha, etc.).
 */
function buildGenericItem(categoria) {
    const produtoId = document.getElementById('manual-select-produto').value;
    if (!produtoId) {
        alert("Selecione um produto.");
        return null;
    }
    const produto = allProducts[categoria][produtoId];
    return {
        id: produtoId,
        name: produto.nome,
        price: produto.preco || 0,
        size: '',
    };
}

/**
 * Atualiza a lista de itens no carrinho da modal e o valor total.
 */
function updateManualCartView() {
    const lista = document.getElementById('manual-itens-lista');
    const totalEl = document.getElementById('manual-total-pedido');
    lista.innerHTML = '';
    let totalPedido = 0;

    if (manualOrderCart.length === 0) {
        lista.innerHTML = '<p class="text-gray-500">Nenhum item adicionado.</p>';
    } else {
        manualOrderCart.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex justify-between items-center bg-gray-100 p-2 rounded';
            itemDiv.innerHTML = `
                <div><span class="font-semibold">${item.quantity}x</span> ${item.name}</div>
                <div class="flex items-center gap-3">
                    <span class="font-bold">R$ ${item.totalPrice.toFixed(2)}</span>
                    <button class="text-red-500 hover:text-red-700 font-bold text-lg" onclick="removeManualItem(${index})">&times;</button>
                </div>`;
            lista.appendChild(itemDiv);
            totalPedido += item.totalPrice;
        });
    }
    totalEl.textContent = `R$ ${totalPedido.toFixed(2)}`;
}

/**
 * Remove um item do carrinho da modal.
 */
function removeManualItem(index) {
    manualOrderCart.splice(index, 1);
    updateManualCartView();
}

/**
 * Lida com a mudança no tipo de entrega para mostrar/esconder campos de endereço.
 */
function handleDeliveryTypeChange() {
    const tipoEntrega = document.getElementById('manual-tipo-entrega').value;
    const containerEndereco = document.getElementById('container-endereco');

    if (containerEndereco) { // Adicionado verificação para garantir que o container existe
        if (tipoEntrega === 'Entrega') {
            containerEndereco.classList.remove('hidden');
        } else {
            containerEndereco.classList.add('hidden');
            // Opcional: Limpar os campos de endereço quando escondidos
            // Isso evita que dados antigos fiquem "escondidos"
            const ruaEl = document.getElementById('manual-input-rua');
            const numeroEl = document.getElementById('manual-input-numero');
            const bairroEl = document.getElementById('manual-input-bairro');
            if(ruaEl) ruaEl.value = '';
            if(numeroEl) numeroEl.value = '';
            if(bairroEl) bairroEl.value = '';
        }
    }
}

/**
 * Deducts ingredients from stock based on the order's cart.
 * Updates quantidadeAtual, quantidadeUsadaDiaria, custoUsadaDiaria,
 * quantidadeUsadaMensal, and custoUsadoMensal for each ingredient.
 * @param {Array} cart The array of items in the order's cart.
 */
async function deductIngredientsFromStock(cart) {
    const updates = {};
    const today = new Date();
    const currentDay = today.getDate(); // 1-31
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();

    for (const item of cart) {
        const productCategory = item.productCategory;
        const originalProductId = item.originalProductId;
        const quantityOrdered = item.quantity;
        let recipe = {};

        // Fetch product details to get the recipe
        if (productCategory && originalProductId) {
            const productSnapshot = await firebase.database().ref('produtos').child(productCategory).child(originalProductId).once('value');
            const productData = productSnapshot.val();

            if (productData && productData.receita) {
                if (productCategory === 'pizzas' && item.pizzaSize) {
                    const sizeKey = item.pizzaSize.toLowerCase();
                    recipe = productData.receita[sizeKey] || {};
                } else {
                    recipe = productData.receita || {};
                }
            }
        }

        for (const ingredientId in recipe) {
            const quantityPerItem = recipe[ingredientId];
            const totalQuantityUsed = quantityPerItem * quantityOrdered;

            if (allIngredients[ingredientId]) {
                const currentIngred = allIngredients[ingredientId];
                const costPerUnit = currentIngred.custoUnitarioMedio || 0;
                const totalCostUsed = totalQuantityUsed * costPerUnit;

                // Update current stock
                const newQuantidadeAtual = (currentIngred.quantidadeAtual || 0) - totalQuantityUsed;
                updates[`ingredientes/${ingredientId}/quantidadeAtual`] = newQuantidadeAtual;

                // Update daily usage
                const lastUpdateTimestamp = currentIngred.ultimaAtualizacaoConsumo;
                let lastUpdateDate = null;
                if (lastUpdateTimestamp) {
                    lastUpdateDate = new Date(lastUpdateTimestamp);
                }

                let newQuantidadeUsadaDiaria = currentIngred.quantidadeUsadaDiaria || 0;
                let newCustoUsadaDiaria = currentIngred.custoUsadaDiaria || 0;

                // Reset daily usage if it's a new day (based on current date)
                if (!lastUpdateDate || lastUpdateDate.getDate() !== currentDay || lastUpdateDate.getMonth() !== currentMonth || lastUpdateDate.getFullYear() !== currentYear) {
                    newQuantidadeUsadaDiaria = totalQuantityUsed;
                    newCustoUsadaDiaria = totalCostUsed;
                } else {
                    newQuantidadeUsadaDiaria += totalQuantityUsed;
                    newCustoUsadaDiaria += totalCostUsed;
                }
                updates[`ingredientes/${ingredientId}/quantidadeUsadaDiaria`] = newQuantidadeUsadaDiaria;
                updates[`ingredientes/${ingredientId}/custoUsadaDiaria`] = newCustoUsadaDiaria;
                updates[`ingredientes/${ingredientId}/ultimaAtualizacaoConsumo`] = firebase.database.ServerValue.TIMESTAMP;


                // Update monthly usage (accumulates for this example)
                let newQuantidadeUsadaMensal = currentIngred.quantidadeUsadaMensal || 0;
                let newCustoUsadoMensal = currentIngred.custoUsadoMensal || 0;
                
                newQuantidadeUsadaMensal += totalQuantityUsed;
                newCustoUsadoMensal += totalCostUsed;
                
                updates[`ingredientes/${ingredientId}/quantidadeUsadaMensal`] = newQuantidadeUsadaMensal;
                updates[`ingredientes/${ingredientId}/custoUsadoMensal`] = newCustoUsadoMensal;
            } else {
                console.warn(`Ingrediente com ID ${ingredientId} não encontrado em allIngredients. Não é possível deduzir.`);
            }
        }
    }

    if (Object.keys(updates).length > 0) {
        await firebase.database().ref().update(updates);
        console.log("Estoque e uso dos ingredientes atualizados com sucesso.");
    }
}

/**
 * Salva o pedido final no Firebase.
 */
async function saveManualOrder() {
    const nomeCliente = document.getElementById('manual-nome-cliente').value.trim();
    const telefone = document.getElementById('manual-telefone').value.trim();
    const tipoEntrega = document.getElementById('manual-tipo-entrega').value;

    if (!nomeCliente || !telefone) {
        alert("Nome e telefone do cliente são obrigatórios.");
        return;
    }
    if (manualOrderCart.length === 0) {
        alert("Adicione pelo menos um item ao pedido.");
        return;
    }

    let endereco = { rua: 'N/A', numero: 'N/A', bairro: 'N/A' };
    if (tipoEntrega === 'Entrega') {
        const rua = document.getElementById('manual-input-rua').value.trim();
        const numero = document.getElementById('manual-input-numero').value.trim();
        const bairro = document.getElementById('manual-input-bairro').value.trim();

        if (!rua || !numero || !bairro) {
            alert("Rua, número e bairro são obrigatórios para entrega.");
            return;
        }
        endereco = { rua, numero, bairro };
    }

    const totalPedido = manualOrderCart.reduce((acc, item) => acc + item.totalPrice, 0);

    try {
        // 1. Obter ultimoPedidoId
        const configRef = firebase.database().ref('config/ultimoPedidoId');
        const snapshot = await configRef.transaction(currentId => {
            return (currentId || 1000) + 1;
        });

        const newOrderId = snapshot.snapshot.val();

        const novoPedido = {
            nomeCliente,
            telefone,
            cart: manualOrderCart,
            pagamento: document.getElementById('manual-pagamento').value,
            tipoEntrega: tipoEntrega,
            status: 'Aceito',
            totalPedido: totalPedido,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            observacao: "Pedido adicionado manualmente pelo painel.",
            endereco: endereco
        };

        // Salva o novo pedido com o ID incrementado
        await firebase.database().ref('pedidos/' + newOrderId).set(novoPedido);

        // Deduce ingredientes após o pedido ser salvo com sucesso
        await deductIngredientsFromStock(manualOrderCart);
        
        alert("Pedido manual salvo com sucesso com ID: " + newOrderId);
        document.getElementById('modal-pedido-manual').classList.add('hidden');
        resetManualOrderModal(); // Chame para limpar o formulário e o carrinho após o sucesso
    } catch (error) {
        console.error("Erro ao salvar pedido manual:", error);
        alert("Ocorreu um erro ao salvar o pedido.");
    }
}

// Event Listeners (exemplo - ajuste conforme seu código principal) aaa
document.addEventListener('DOMContentLoaded', () => {

    fetchAllIngredients();

    window.allProducts = {
        pizzas: {
            "mussarela": { "nome": "Mussarela", "precos": { "grande": 40, "broto": 25 }, "ativo": true },
            "calabresa": { "nome": "Calabresa", "precos": { "grande": 42, "broto": 27 }, "ativo": true },
            "frangoCatupiry": { "nome": "Frango com Catupiry", "precos": { "grande": 48, "broto": 30 }, "ativo": true }
        },
        bebidas: {
            "cocaCola": { "nome": "Coca-Cola 2L", "preco": 10, "ativo": true },
            "guarana": { "nome": "Guaraná 1L", "preco": 7, "ativo": true }
        },
        esfihas: {
            "carne": { "nome": "Esfiha de Carne", "preco": 5, "ativo": true },
            "queijo": { "nome": "Esfiha de Queijo", "preco": 6, "ativo": true }
        }
    };
    
    window.allBordas = {
        "catupiry": { "nome": "Catupiry", "precos": { "broto": 10.00, "grande": 12.00 } }, 
        "cheddar": { "nome": "Cheddar", "precos": { "broto": 10.00, "grande": 12.00 } }   
    };
    window.manualOrderCart = []; // Inicializa manualOrderCart
//asdasd
    const modal = document.getElementById('modal-pedido-manual');
    const closeBtn = document.getElementById('manual-btn-fechar');
    const cancelBtn = document.getElementById('manual-btn-cancelar');
    const categoriaSelect = document.getElementById('manual-select-categoria');
    const addItemBtn = document.getElementById('manual-btn-add-item');
    const saveOrderBtn = document.getElementById('manual-btn-salvar');
    const pizzaMeioAMeioCheck = document.getElementById('pizza-meio-a-meio-check');
    const containerSabor2 = document.getElementById('container-sabor2');
     // Pega o select de tipo de entrega

    if (modal) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (categoriaSelect) {
        categoriaSelect.addEventListener('change', (event) => updateItemSelectionUI(event.target.value));
    }

    if (addItemBtn) {
        addItemBtn.addEventListener('click', addItemToManualCart);
    }

    if (saveOrderBtn) {
        saveOrderBtn.addEventListener('click', saveManualOrder);
    }

    if (pizzaMeioAMeioCheck) {
        pizzaMeioAMeioCheck.addEventListener('change', (event) => {
            if (event.target.checked) {
                containerSabor2.classList.remove('hidden');
            } else {
                containerSabor2.classList.add('hidden');
                document.getElementById('pizza-sabor2').value = ''; // Limpa o segundo sabor quando desmarcado
            }
        });
    }
});