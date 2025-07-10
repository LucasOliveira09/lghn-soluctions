// Configuração do Firebase
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

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Funções de Utilitário ---

/**
 * Gera um cupom com palavras aleatórias que fazem sentido.
 * Formato: ADJETIVO_SUBSTANTIVO
 */
function generateMeaningfulCouponCode() {
    const adjectives = [
        "GRANDE", "RAPIDO", "DOURADO", "FELIZ", "MELHOR",
        "NOVO", "SECRETO", "MAGICO", "EXTRA", "UNICO",
        "TOP", "CHEF", "GOSTOSO", "SUPER", "PREMIUM"
    ];
    const nouns = [
        "DESCONTO", "OFERTA", "PIZZA", "PREMIO", "RECOMPENSA",
        "SABOR", "CUPOM", "BRINDE", "MIMO", "PRESENTE",
        "GANHO", "ESTRELA", "CLIENTE", "AMIGO", "FESTA"
    ];

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${randomAdjective}_${randomNoun}`;
}

/**
 * Exibe uma mensagem Toastify.
 * @param {string} text A mensagem a ser exibida.
 * @param {string} type O tipo de toast ('success', 'error', 'warning').
 */
function showToast(text, type) {
    let background;
    switch (type) {
        case 'success':
            background = "#22c55e";
            break;
        case 'error':
            background = "#ef4444";
            break;
        case 'warning':
            background = "#ffc107";
            break;
        default:
            background = "#333";
    }

    Toastify({
        text: text,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        style: {
            background: background,
        },
    }).showToast();
}

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
}

/**
 * Obtém o valor de um cookie pelo seu nome.
 * @param {string} name O nome do cookie a ser recuperado.
 * @returns {string|null} O valor do cookie ou null se não for encontrado.
 */
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

// --- Conteúdo Principal do Script (Executado após o carregamento do DOM) ---
document.addEventListener("DOMContentLoaded", () => {
    // --- Elementos do DOM ---
    const phoneInputSection = document.getElementById('phone-input-section');
    const phoneDisplaySection = document.getElementById('phone-display-section');
    const displayedPhone = document.getElementById('displayed-phone');

    const customerPhoneInput = document.getElementById('customer-phone');
    const phoneError = document.getElementById('phone-error');
    const checkCouponsBtn = document.getElementById('check-coupons-btn');
    const couponDisplayArea = document.getElementById('coupon-display-area');
    const couponCodeSpan = document.getElementById('coupon-code');
    const copyCouponBtn = document.getElementById('copy-coupon-btn');
    const noCouponMessage = document.getElementById('no-coupon-message');

    // Elementos de Visualização de Progresso
    const progressContainer = document.getElementById('progress-container');
    const completedOrdersText = document.getElementById('completed-orders-text');
    const nextCouponText = document.getElementById('next-coupon-text');
    const progressStepsWrapper = document.getElementById('progress-steps-wrapper');

    // Elementos da Sidebar (Esses IDs devem estar no seu HTML, no rewards.html)
    const menuButton = document.getElementById('menu-button');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const closeSidebarButton = document.getElementById('close-sidebar-button');

    // --- Lógica da Sidebar (Garanta que seu rewards.html tenha os IDs corretos para isso) ---
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeSidebarButton) {
        closeSidebarButton.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // --- Função para Atualizar a Visualização de Progresso ---
    /**
     * Atualiza a visualização do progresso do cliente em direção ao próximo cupom.
     * @param {number} completedOrders O número total de pedidos finalizados do cliente.
     * @param {number} threshold O número de pedidos necessários para um cupom (e.g., 10).
     */
    function updateProgressVisualization(completedOrders, threshold) {
        progressStepsWrapper.innerHTML = ''; // Limpa passos anteriores
        const currentMilestoneOrders = completedOrders % threshold; // Pedidos dentro do ciclo atual (0-9)

        completedOrdersText.innerHTML = `Pedidos finalizados: <span class="font-bold">${completedOrders}</span>`;

        let ordersUntilNextCoupon = threshold - currentMilestoneOrders;
        // Ajusta para quando atinge exatamente um marco
        if (ordersUntilNextCoupon === threshold && completedOrders > 0 && completedOrders % threshold === 0) {
            ordersUntilNextCoupon = 0; // Significa que acabou de ganhar ou está pronto para ganhar
        } else if (completedOrders === 0) {
            ordersUntilNextCoupon = threshold; // Se 0 pedidos, precisa do threshold completo para o primeiro cupom
        }

        if (ordersUntilNextCoupon === 0) {
            nextCouponText.textContent = "Parabéns! Você ganhou ou está pronto para ganhar um cupom!";
            nextCouponText.classList.remove('text-green-400');
            nextCouponText.classList.add('text-yellow-400');
        } else {
            nextCouponText.innerHTML = `Próximo cupom em <span class="font-bold">${ordersUntilNextCoupon}</span> pedidos!`;
            nextCouponText.classList.add('text-green-400');
            nextCouponText.classList.remove('text-yellow-400');
        }

        // Cria os passos para o ciclo atual (e.g., 10 passos para um threshold de 10)
        for (let i = 1; i <= threshold; i++) {
            const stepDiv = document.createElement('div');
            stepDiv.classList.add('progress-step');
            stepDiv.textContent = i; // Exibe o número do pedido dentro do ciclo

            // Determina se o passo deve estar ativo
            if (completedOrders > 0 && completedOrders % threshold === 0 && i <= threshold) {
                 stepDiv.classList.add('active'); // Se for um múltiplo exato do threshold, todos os passos estão ativos
            } else if (i <= currentMilestoneOrders) {
                stepDiv.classList.add('active'); // Caso contrário, ativa os passos até a contagem atual no ciclo
            }

            progressStepsWrapper.appendChild(stepDiv);

            if (i < threshold) { // Adiciona linha entre os passos, mas não após o último
                const lineDiv = document.createElement('div');
                lineDiv.classList.add('progress-line');
                // A linha deve estar ativa se o passo atual já foi atingido
                if (completedOrders > 0 && completedOrders % threshold === 0 && i < threshold) {
                    lineDiv.classList.add('active');
                } else if (i < currentMilestoneOrders) {
                    lineDiv.classList.add('active');
                }
                progressStepsWrapper.appendChild(lineDiv);
            }
        }
        progressContainer.classList.remove('hidden'); // Mostra a seção de progresso
    }

    // --- Lógica Principal de Cupons (Verifica e Gera) ---
    /**
     * Verifica os pedidos do cliente e gera um cupom se os critérios forem atendidos.
     * @param {string} clienteTelefone O número de telefone do cliente.
     */
    async function checkAndGenerateCoupon(clienteTelefone) {
        showToast("Verificando seus pedidos...", "warning");
        noCouponMessage.classList.add('hidden');
        couponDisplayArea.classList.add('hidden');
        progressContainer.classList.add('hidden'); // Oculta o progresso enquanto busca os dados

        try {
            const pedidosSnapshot = await database.ref('pedidos')
                .orderByChild('telefone')
                .equalTo(clienteTelefone)
                .once('value');

            let completedOrdersCount = 0;
            if (pedidosSnapshot.exists()) {
                pedidosSnapshot.forEach(childSnapshot => {
                    const pedido = childSnapshot.val();
                    if (pedido.status === 'Finalizado') {
                        completedOrdersCount++;
                    }
                });
            }

            console.log(`Pedidos finalizados para ${clienteTelefone}: ${completedOrdersCount}`);

            const threshold = 10;
            updateProgressVisualization(completedOrdersCount, threshold); // Atualiza a visualização ANTES de qualquer toast de erro

            if (completedOrdersCount === 0) {
                showToast("Você ainda não tem pedidos finalizados para ganhar cupons.", "warning");
                noCouponMessage.classList.remove('hidden');
                return;
            }

            const couponsToIssue = Math.floor(completedOrdersCount / threshold);
            console.log(`Cupons que deveriam ser emitidos com base na contagem (${completedOrdersCount} pedidos finalizados / ${threshold}): ${couponsToIssue}`);

            if (couponsToIssue === 0) {
                noCouponMessage.classList.remove('hidden');
                return;
            }

            const issuedCouponsSnapshot = await database.ref(`cupons_emitidos/${clienteTelefone}`).once('value');
            const issuedCoupons = issuedCouponsSnapshot.val() || {};

            const allCuponsSnapshot = await database.ref('cupons').once('value'); // Busca todos os cupons
            const allCupons = allCuponsSnapshot.val() || {};

            let generatedThisSession = false;
            let foundExistingActiveAndUnusedCoupon = null;

            // 1. Tenta gerar um NOVO cupom se um marco for atingido e ainda não emitido
            for (let i = 1; i <= couponsToIssue; i++) {
                const couponMilestoneId = `milestone_${i * threshold}`;

                if (!issuedCoupons[couponMilestoneId]) { // Se este cupom de marco ainda não foi emitido
                    const newCouponCode = generateMeaningfulCouponCode();
                    const validityDays = 30; // Cupom válido por 30 dias
                    const validityTimestamp = Date.now() + (validityDays * 24 * 60 * 60 * 1000);

                    const couponData = {
                        codigo: newCouponCode,
                        tipo: "porcentagem",
                        valor: 10, // 10% de desconto
                        ativo: true, // Novos cupons são sempre ativos
                        validade: validityTimestamp,
                        emitidoEm: Date.now(),
                        clienteTelefone: clienteTelefone, // CORRIGIDO: nome da propriedade
                        milestone: couponMilestoneId
                    };

                    await database.ref(`cupons/${newCouponCode}`).set(couponData);
                    await database.ref(`cupons_emitidos/${clienteTelefone}/${couponMilestoneId}`).set(true);

                    couponCodeSpan.textContent = newCouponCode;
                    couponDisplayArea.classList.remove('hidden');
                    noCouponMessage.classList.add('hidden');
                    showToast("Parabéns! Você ganhou um novo cupom!", "success");
                    generatedThisSession = true;
                    break; // Gera apenas um novo cupom por verificação
                }
            }

            // 2. Se nenhum novo cupom foi gerado, verifica se há cupons existentes ativos e NÃO UTILIZADOS
            if (!generatedThisSession) {
                const clientSpecificCupons = [];
                // Filtra todos os cupons globais para encontrar aqueles emitidos especificamente para este cliente
                for (const code in allCupons) {
                    if (allCupons.hasOwnProperty(code) && allCupons[code].clienteTelefone === clienteTelefone) {
                        clientSpecificCupons.push({ id: code, ...allCupons[code] });
                    }
                }

                // Verifica o status de cada cupom específico do cliente
                const couponChecks = clientSpecificCupons.map(async (coupon) => {
                    // Verifica se está ativo E não expirou
                    if (coupon.ativo && Date.now() < coupon.validade) {
                        // Verifica se este CÓDIGO de cupom específico foi marcado como usado por este cliente
                        const usedSnapshot = await database.ref(`cupons_usados/${clienteTelefone}/${coupon.id}`).once('value');
                        if (!usedSnapshot.exists()) { // Se o cupom NÃO FOI usado
                            return coupon; // Retorna o cupom se não foi usado
                        }
                    }
                    return null; // Retorna null se não atender aos critérios ou já foi usado
                });

                const results = await Promise.all(couponChecks);
                // Encontra o primeiro cupom ativo e não utilizado na lista
                foundExistingActiveAndUnusedCoupon = results.find(coupon => coupon !== null);

                if (foundExistingActiveAndUnusedCoupon) {
                    couponCodeSpan.textContent = foundExistingActiveAndUnusedCoupon.codigo;
                    couponDisplayArea.classList.remove('hidden');
                    noCouponMessage.classList.add('hidden');
                    showToast("Você tem um cupom de recompensa ativo!", "success");
                } else {
                    // Se nenhum novo cupom foi gerado e nenhum cupom ativo/não utilizado foi encontrado
                    showToast("Você já possui todos os cupons de recompensa disponíveis ou eles expiraram/foram usados.", "warning");
                    noCouponMessage.classList.remove('hidden');
                }
            }

        } catch (error) {
            console.error("Erro ao verificar/gerar cupons:", error);
            showToast("Erro ao verificar cupons. Tente novamente.", "error");
            noCouponMessage.classList.remove('hidden');
            progressContainer.classList.add('hidden');
        }
    }

    // --- Listeners de Evento e Carregamento Inicial ---

    // Auto-preenche e verifica o número de telefone ao carregar a página
    let storedPhone = getCookie('clienteId'); // Tenta do cookie primeiro
    if (!storedPhone) { // Se não encontrar no cookie, tenta no localStorage (fallback)
        storedPhone = localStorage.getItem('clienteId');
    }

    if (storedPhone && customerPhoneInput) {
        customerPhoneInput.value = storedPhone;
        // Oculta a seção de input e mostra a seção de exibição
        phoneInputSection.classList.add('hidden');
        phoneDisplaySection.classList.remove('hidden');
        displayedPhone.textContent = storedPhone; // Exibe o número de telefone
        
        // Dispara a verificação de cupons automaticamente
        checkAndGenerateCoupon(storedPhone);
    } else {
        // Se nenhum telefone for encontrado, garante que o input esteja visível e a seção de exibição oculta
        phoneInputSection.classList.remove('hidden');
        phoneDisplaySection.classList.add('hidden');
        noCouponMessage.classList.remove('hidden'); // Exibe a mensagem "nenhum cupom" por padrão
        updateProgressVisualization(0, 10); // Exibe o progresso vazio
    }


    if (checkCouponsBtn) {
        checkCouponsBtn.addEventListener('click', () => {
            const phone = customerPhoneInput.value.trim();
            if (!phone || !/^\d{10,11}$/.test(phone)) {
                phoneError.classList.remove('hidden');
                showToast("Por favor, digite um telefone válido.", "error");
                return;
            }
            phoneError.classList.add('hidden');
            checkAndGenerateCoupon(phone);
        });
    }

    if (copyCouponBtn) {
        copyCouponBtn.addEventListener('click', () => {
            const couponCode = couponCodeSpan.textContent;
            navigator.clipboard.writeText(couponCode).then(() => {
                showToast("Cupom copiado para a área de transferência!", "success");
            }).catch(err => {
                console.error('Erro ao copiar cupom: ', err);
                showToast("Falha ao copiar o cupom. Por favor, copie manualmente.", "error");
            });
        });
    }

}); // Fim do DOMContentLoaded

const menuButton = document.getElementById('menu-button');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

if (menuButton) { // Verificação para garantir que o elemento existe
    menuButton.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        if (scrollbar) scrollbar.classList.add('opacity-25'); // Apenas se scrollbar existir
    });
}

if (overlay) { // Verificação para garantir que o elemento existe
    overlay.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        if (scrollbar) scrollbar.classList.remove('opacity-25'); // Apenas se scrollbar existir
    });
}

const closeSidebarButton = document.getElementById('close-sidebar-button'); // Declare aqui
if (closeSidebarButton) { // Verificação para garantir que o elemento existe
    closeSidebarButton.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        if (scrollbar) scrollbar.classList.remove('opacity-25'); // Apenas se scrollbar existir
    });
}