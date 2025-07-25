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

const database = firebase.database();
const auth = firebase.auth(); // Usaremos o serviço de autenticação

// Elementos do formulário
const loginForm = document.getElementById('login-garcom-form');
const nameInput = document.getElementById('garcom-name-input');
const passwordInput = document.getElementById('garcom-password-input');
const accessButton = document.getElementById('access-panel-btn');
const loginText = document.getElementById('login-text-garcom');
const loginSpinner = document.getElementById('login-spinner-garcom');
const errorMessage = document.getElementById('error-message-garcom');

// Chaves para o sessionStorage
const WAITER_NAME_STORAGE_KEY = 'garcomName';
const WAITER_EMAIL_STORAGE_KEY = 'garcomEmail'; 

// Evento de submit do formulário
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    errorMessage.classList.add('hidden');

    const name = nameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!name || !password) {
        showError('Por favor, preencha nome e senha.');
        return;
    }

    loginText.textContent = 'Acessando...';
    loginSpinner.classList.remove('hidden');
    accessButton.disabled = true;

    // Gera o e-mail no MESMO formato que o painel de admin cria
    const email = `${name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}@seu-restaurante.com`;

    // Tenta fazer o login com o sistema de autenticação do Firebase
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Se o login for bem-sucedido...
            const user = userCredential.user;
            console.log("Login do garçom bem-sucedido:", user.email);

            // Salva o nome e o e-mail para usar na outra página
            sessionStorage.setItem(WAITER_NAME_STORAGE_KEY, name); // Salva o nome original para exibição
            sessionStorage.setItem(WAITER_EMAIL_STORAGE_KEY, user.email);
            
            // Redireciona para o painel do garçom
            window.location.href = 'garcom.html';
        })
        .catch((error) => {
            // Se o login falhar...
            console.error("Erro no login do garçom:", error.code, error.message);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showError('Nome ou senha incorretos.');
            } else {
                showError('Erro ao conectar. Tente novamente.');
            }
        });
});

function showError(message) {
    errorMessage.querySelector('span').textContent = message;
    errorMessage.classList.remove('hidden');
    
    loginText.textContent = 'Acessar Painel';
    loginSpinner.classList.add('hidden');
    accessButton.disabled = false;
}