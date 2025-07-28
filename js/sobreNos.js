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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const horariosRef = database.ref('central/config/horarios');

/**
 * NOVA FUNÇÃO: Formata uma string de hora para HH:mm.
 * @param {string} horaString - A string de hora, ex: "18:30:00" ou "18:30".
 * @returns {string} - A hora formatada como "HH:mm".
 */
function formatarHora(horaString) {
    if (typeof horaString === 'string' && horaString.includes(':')) {
        const partes = horaString.split(':');
        return `${partes[0]}:${partes[1]}`; // Pega apenas as horas e minutos
    }
    return horaString; // Retorna o valor original se não for o formato esperado
}

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

function atualizarStatusEHorarios() {
    horariosRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            console.warn("Horários de funcionamento não encontrados no Firebase.");
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

        if (minutosInicio > minutosFim) {
            if (minutosAtuais >= minutosInicio || minutosAtuais < minutosFim) {
                estaAberto = true;
            }
        } else {
            if (minutosAtuais >= minutosInicio && minutosAtuais < minutosFim) {
                estaAberto = true;
            }
        }
        
        // APLICA A FORMATAÇÃO DA HORA AQUI
        const horaInicioFormatada = formatarHora(configDia.inicio);
        const horaFimFormatada = formatarHora(configDia.fim);

        if (estaAberto) {
            mensagemStatus = `Aberto agora (fecha às ${horaFimFormatada})`;
        } else {
             mensagemStatus = `Fechado agora (abre às ${horaInicioFormatada})`;
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

function renderizarListaDeHorarios(horarios) {
    const container = document.getElementById('lista-horarios');
    if (!container) return;

    const diasDaSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    container.innerHTML = '';

    diasDaSemana.forEach((diaNome, index) => {
        const configDia = horarios[index];
        let horarioTexto = '<span class="text-red-500">Fechado</span>';

        if (configDia && configDia.aberto && configDia.inicio && configDia.fim) {
            // APLICA A FORMATAÇÃO DA HORA AQUI TAMBÉM
            horarioTexto = `${formatarHora(configDia.inicio)} às ${formatarHora(configDia.fim)}`;
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

document.addEventListener('DOMContentLoaded', () => {
    atualizarStatusEHorarios();
    inicializarSidebar();
});