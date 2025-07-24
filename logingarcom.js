const firebaseConfig = {
    apiKey: "AIzaSyCxpZd8Bu1IKzFHMUMzX1AAU1id8AcjCYw",
    authDomain: "bonanzapizzaria-b2513.firebaseapp.com",
    databaseURL: "https://bonanzapizzaria-b2513-default-rtdb.firebaseio.com",
    projectId: "bonanzapizzaria-b2513",
    storageBucket: "bonanzapizzaria-b2513.firebasestorage.app",
    messagingSenderId: "7433511053",
    appId: "1:7433511053:web:44414e66d7e601e23b82c4",
    measurementId: "G-TZ9RC0E7WN"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Elementos do formulário
const loginForm = document.getElementById('login-garcom-form');
const nameInput = document.getElementById('garcom-name-input');
const passwordInput = document.getElementById('garcom-password-input');
const accessButton = document.getElementById('access-panel-btn');
const loginText = document.getElementById('login-text-garcom');
const loginSpinner = document.getElementById('login-spinner-garcom');
const errorMessage = document.getElementById('error-message-garcom');

const WAITER_NAME_STORAGE_KEY = 'garcomName'; // Chave para o sessionStorage

// Evento de submit do formulário
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Impede o recarregamento da página
    errorMessage.classList.add('hidden'); // Esconde a mensagem de erro

    const name = nameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!name || !password) {
        showError('Por favor, preencha nome e senha.');
        return;
    }

    loginText.textContent = 'Acessando...';
    loginSpinner.classList.remove('hidden');
    accessButton.disabled = true;

    const garconsRef = database.ref('garcons');

    garconsRef.orderByChild('nome').equalTo(name).once('value', (snapshot) => {
        if (snapshot.exists()) {
            const garcomData = snapshot.val();
            const garcomKey = Object.keys(garcomData)[0];
            const garcom = garcomData[garcomKey];

            if (garcom.senha === password) {
                sessionStorage.setItem(WAITER_NAME_STORAGE_KEY, garcom.nome);
                window.location.href = 'garcom.html';
            } else {
                showError('Nome ou senha incorretos.');
            }
        } else {
            showError('Nome ou senha incorretos.');
        }
    }).catch(error => {
        console.error("Erro ao acessar o Firebase:", error);
        showError('Erro ao conectar com o servidor. Tente novamente.');
    });
});

function showError(message) {
    errorMessage.querySelector('span').textContent = message;
    errorMessage.classList.remove('hidden');
    
    loginText.textContent = 'Acessar Painel';
    loginSpinner.classList.add('hidden');
    accessButton.disabled = false;
}