// Configuração do Firebase (MANTENHA SUA CHAVE REAL)
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

            if (completedOrdersCount < threshold) { // Ajuste para garantir que só mostre "nenhum cupom" se não atingiu o primeiro marco
                showToast(`Continue pedindo! Faltam ${threshold - completedOrdersCount} pedidos para seu primeiro cupom.`, "warning");
                noCouponMessage.classList.remove('hidden');
                return;
            }

            const couponsToIssue = Math.floor(completedOrdersCount / threshold);
            console.log(`Cupons que deveriam ser emitidos com base na contagem (${completedOrdersCount} pedidos finalizados / ${threshold}): ${couponsToIssue}`);

            // Buscando cupons que já foram gerados para este cliente
            const issuedCouponsSnapshot = await database.ref(`cupons_emitidos/${clienteTelefone}`).once('value');
            const issuedCoupons = issuedCouponsSnapshot.val() || {}; // Objeto de cupons gerados por milestone

            let foundActiveUnusedCoupon = false;
            let displayedCouponCode = '';

            // Tentar encontrar um cupom ATIVO e NÃO UTILIZADO já emitido para o cliente
            for (let i = 1; i <= couponsToIssue; i++) {
                const milestoneKey = `milestone_${i * threshold}`;
                const generatedCouponCode = issuedCoupons[milestoneKey];

                if (generatedCouponCode) { // Se um cupom foi gerado para este marco
                    const couponDetailsSnapshot = await database.ref(`cupons/${generatedCouponCode}`).once('value');
                    const couponDetails = couponDetailsSnapshot.val();

                    if (couponDetails && couponDetails.ativo && Date.now() < couponDetails.validade) {
                        // Verifica se este CÓDIGO de cupom específico foi marcado como usado por este cliente
                        const usedSnapshot = await database.ref(`cupons_usados/${clienteTelefone}/${generatedCouponCode}`).once('value');
                        if (!usedSnapshot.exists()) { // Se o cupom NÃO FOI usado
                            foundActiveUnusedCoupon = true;
                            displayedCouponCode = generatedCouponCode;
                            console.log(`Cupom ativo e não utilizado encontrado para o marco ${milestoneKey}: ${generatedCouponCode}`);
                            break; // Encontrou um, para de procurar
                        } else {
                            console.log(`Cupom ${generatedCouponCode} para o marco ${milestoneKey} já foi USADO.`);
                        }
                    } else {
                        console.log(`Cupom ${generatedCouponCode} para o marco ${milestoneKey} não está ativo ou expirou.`);
                    }
                } else {
                    console.log(`Nenhum cupom gerado para o marco ${milestoneKey} ainda.`);
                }
            }

            // Se encontrou um cupom ativo e não usado, exibe-o
            if (foundActiveUnusedCoupon) {
                couponCodeSpan.textContent = displayedCouponCode;
                couponDisplayArea.classList.remove('hidden');
                noCouponMessage.classList.add('hidden');
                showToast("Você tem um cupom de recompensa ativo!", "success");
            } else {
                // Se não encontrou um cupom ativo e não usado, tentar gerar um NOVO
                let generatedNewCoupon = false;
                for (let i = 1; i <= couponsToIssue; i++) {
                    const milestoneKey = `milestone_${i * threshold}`;
                    // Verifica se o cupom para este marco JÁ FOI GERADO (se existe um código no issuedCoupons)
                    if (!issuedCoupons[milestoneKey]) {
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
                            clienteTelefone: clienteTelefone, // Salva o telefone do cliente que gerou o cupom
                            milestone: milestoneKey // Salva o marco associado ao cupom
                        };

                        await database.ref(`cupons/${newCouponCode}`).set(couponData); // Salva o cupom no nó 'cupons'
                        await database.ref(`cupons_emitidos/${clienteTelefone}/${milestoneKey}`).set(newCouponCode); // Marca o marco como emitido com o código do cupom

                        couponCodeSpan.textContent = newCouponCode;
                        couponDisplayArea.classList.remove('hidden');
                        noCouponMessage.classList.add('hidden');
                        showToast("Parabéns! Você ganhou um novo cupom!", "success");
                        generatedNewCoupon = true;
                        break; // Gera apenas um novo cupom por vez
                    }
                }

                if (!generatedNewCoupon) {
                    // Se não gerou um novo e não encontrou um ativo/não usado (todos os emitidos foram usados/expirados)
                    showToast("Você já utilizou todos os cupons de recompensa disponíveis ou eles expiraram. Continue pedindo para ganhar mais!", "warning");
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

// Sidebar (mantido separado para melhor organização do rewards.html)
const menuButton = document.getElementById('menu-button');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeSidebarButton = document.getElementById('close-sidebar-button'); // Declarar aqui
const scrollbar = document.getElementById('scrollbar'); // Se scrollbar estiver neste HTML

// Certifique-se de que esses listeners estejam ativos se os elementos existirem fora do DOMContentLoaded
if (menuButton) {
    menuButton.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        if (scrollbar) scrollbar.classList.add('opacity-25');
    });
}

if (overlay) {
    overlay.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        if (scrollbar) scrollbar.classList.remove('opacity-25');
    });
}

if (closeSidebarButton) {
    closeSidebarButton.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        if (scrollbar) scrollbar.classList.remove('opacity-25');
    });
}