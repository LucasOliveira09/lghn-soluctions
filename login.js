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
const auth = firebase.auth();

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const loginButton = document.getElementById('login-button');
const loginText = document.getElementById('login-text');
const loginSpinner = document.getElementById('login-spinner');

// Verifica se o usuário já está logado ao carregar a página
auth.onAuthStateChanged(user => {
    if (user) {
        // Se já estiver logado, redireciona para o painel
        window.location.replace('painel.html');
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    // Mostra o spinner e desabilita o botão
    loginText.classList.add('hidden');
    loginSpinner.classList.remove('hidden');
    loginButton.disabled = true;
    errorMessage.classList.add('hidden');

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login bem-sucedido, o onAuthStateChanged vai redirecionar
            console.log('Login bem-sucedido:', userCredential.user);
        })
        .catch((error) => {
            // Lida com erros
            console.error('Erro de login:', error.code, error.message);
            errorMessage.classList.remove('hidden');
        })
        .finally(() => {
            // Esconde o spinner e reabilita o botão
            loginText.classList.remove('hidden');
            loginSpinner.classList.add('hidden');
            loginButton.disabled = false;
        });
});