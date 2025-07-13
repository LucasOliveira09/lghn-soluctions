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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const horariosRef = database.ref('config/horarios');

/**
 * Função principal que busca os horários no Firebase e atualiza a página.
 */
function atualizarStatusEHorarios() {
    horariosRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            console.warn("Horários de funcionamento não encontrados no Firebase em 'config/horarios'.");
            return;
        }

        const horarios = snapshot.val();
        
        // Atualiza o Status (Aberto/Fechado)
        atualizarStatus(horarios);

        // Atualiza a lista de horários visível na página
        renderizarListaDeHorarios(horarios);

    }, (error) => {
        console.error("Erro ao buscar horários do Firebase:", error);
    });
}

/**
 * Verifica se o restaurante está aberto e atualiza o elemento de status na tela.
 * @param {object} horarios - O objeto de horários vindo do Firebase.
 */
function atualizarStatus(horarios) {
    const agora = new Date();
    const diaSemana = agora.getDay(); // 0 = Domingo, ..., 6 = Sábado
    const horaAtual = agora.getHours();

    const configDia = horarios[diaSemana];
    let estaAberto = false;
    let mensagemStatus = "Fechado agora";

    if (configDia && configDia.aberto) {
        if (horaAtual >= configDia.inicio && horaAtual < configDia.fim) {
            estaAberto = true;
            mensagemStatus = `Aberto agora (fecha às ${configDia.fim}:00)`;
        } else {
             mensagemStatus = `Fechado agora (abre às ${configDia.inicio}:00)`;
        }
    } else {
        mensagemStatus = "Fechado hoje";
    }

    // Procura por um elemento de status em qualquer página que usar este script
    const statusElement = document.getElementById('status-funcionamento');
    if (statusElement) {
        statusElement.textContent = mensagemStatus;
        if (estaAberto) {
            statusElement.classList.remove('text-red-600');
            statusElement.classList.add('text-green-600');
        } else {
            statusElement.classList.remove('text-green-600');
            statusElement.classList.add('text-red-600');
        }
    }
}

/**
 * Renderiza a lista de horários de funcionamento em um container na página.
 * @param {object} horarios - O objeto de horários vindo do Firebase.
 */
function renderizarListaDeHorarios(horarios) {
    const container = document.getElementById('lista-horarios');
    if (!container) return; // Se a página não tiver o container, não faz nada.

    const diasDaSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    container.innerHTML = ''; // Limpa a lista antes de recriar

    diasDaSemana.forEach((diaNome, index) => {
        const configDia = horarios[index];
        let horarioTexto = '<span class="text-red-500">Fechado</span>';

        if (configDia && configDia.aberto) {
            horarioTexto = `${String(configDia.inicio).padStart(2, '0')}:00 às ${String(configDia.fim).padStart(2, '0')}:00`;
        }
        
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center py-2 border-b border-gray-700';
        li.innerHTML = `
            <span class="font-semibold">${diaNome}</span>
            <span>${horarioTexto}</span>
        `;
        container.appendChild(li);
    });
}

/**
 * Inicializa a funcionalidade da sidebar (abrir/fechar).
 */
function inicializarSidebar() {
    const menuButton = document.getElementById('menu-button');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const closeSidebarButton = document.getElementById('close-sidebar-button');

    if (menuButton && sidebar && overlay) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
        });
    }

    if (overlay && sidebar) {
        overlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    }

    if (closeSidebarButton && sidebar && overlay) {
        closeSidebarButton.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    }
}

// Inicia o processo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    atualizarStatusEHorarios();
    inicializarSidebar();
});