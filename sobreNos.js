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

// Inicializa o Firebase (com segurança para não reiniciar)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const horariosRef = database.ref('config/horarios');

/**
 * Converte uma string de tempo "HH:mm" OU um número de hora para o total de minutos.
 * @param {string|number} timeInput - A string "HH:mm" ou o número da hora.
 * @returns {number} - O total de minutos.
 */
function timeStringToMinutes(timeInput) {
    if (typeof timeInput === 'string' && timeInput.includes(':')) {
        const [hours, minutes] = timeInput.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    }
    if (typeof timeInput === 'number') {
        return timeInput * 60;
    }
    return 0;
}

/**
 * Função principal que busca os horários no Firebase e atualiza a página.
 */
function atualizarStatusEHorarios() {
    horariosRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            console.warn("Horários de funcionamento não encontrados no Firebase.");
            // Exibe uma mensagem padrão se não houver horários configurados
            const statusElement = document.getElementById('status-funcionamento');
            if (statusElement) {
                statusElement.textContent = "Horários não definidos";
                statusElement.className = 'font-bold text-gray-500';
            }
            const container = document.getElementById('lista-horarios');
            if (container) {
                container.innerHTML = '<li>Horários de funcionamento não configurados.</li>';
            }
            return;
        }

        const horarios = snapshot.val();
        atualizarStatus(horarios);
        renderizarListaDeHorarios(horarios);

    }, (error) => {
        console.error("Erro ao buscar horários do Firebase:", error);
    });
}

/**
 * Verifica se o restaurante está aberto e atualiza o elemento de status na tela.
 */
function atualizarStatus(horarios) {
    const agora = new Date();
    const diaSemana = agora.getDay();
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();

    const configDia = horarios[diaSemana];
    let estaAberto = false;
    let mensagemStatus = "Fechado agora";

    if (configDia && configDia.aberto && configDia.inicio && configDia.fim) {
        const minutosInicio = timeStringToMinutes(configDia.inicio);
        const minutosFim = timeStringToMinutes(configDia.fim);

        // Lógica para horários que viram a noite (ex: 18:00 - 02:00)
        if (minutosInicio > minutosFim) {
            if (minutosAtuais >= minutosInicio || minutosAtuais < minutosFim) {
                estaAberto = true;
            }
        } else { // Lógica para horários no mesmo dia
            if (minutosAtuais >= minutosInicio && minutosAtuais < minutosFim) {
                estaAberto = true;
            }
        }

        if (estaAberto) {
            mensagemStatus = `Aberto agora (fecha às ${configDia.fim})`;
        } else {
             mensagemStatus = `Fechado agora (abre às ${configDia.inicio})`;
        }
    } else {
        mensagemStatus = "Fechado hoje";
    }

    const statusElement = document.getElementById('status-funcionamento');
    if (statusElement) {
        statusElement.textContent = mensagemStatus;
        statusElement.className = estaAberto ? 'font-bold text-green-600' : 'font-bold text-red-600';
    }
}

/**
 * Renderiza a lista de horários de funcionamento em um container na página.
 */
function renderizarListaDeHorarios(horarios) {
    const container = document.getElementById('lista-horarios');
    if (!container) return;

    const diasDaSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    container.innerHTML = '';

    diasDaSemana.forEach((diaNome, index) => {
        const configDia = horarios[index];
        let horarioTexto = '<span class="text-red-500">Fechado</span>';

        if (configDia && configDia.aberto && configDia.inicio && configDia.fim) {
            horarioTexto = `${configDia.inicio} às ${configDia.fim}`;
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