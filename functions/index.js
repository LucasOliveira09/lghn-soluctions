const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Função "chamável" que deleta um usuário do Firebase Authentication
 * e também remove suas informações do Realtime Database.
 *
 * @param {object} data - O objeto de dados enviado pelo cliente.
 * @param {string} data.uid - O UID do garçom a ser deletado.
 * @param {functions.https.CallableContext} context - O contexto da chamada.
 */
exports.deletarGarcom = functions.https.onCall(async (data, context) => {
  // Opcional, mas recomendado: Verificar se o usuário que chama a função é um admin.
  // Por enquanto, vamos apenas verificar se ele está autenticado.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "A função só pode ser chamada por um usuário autenticado."
    );
  }

  const uid = data.uid;
  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O UID do garçom é obrigatório e deve ser uma string."
    );
  }

  try {
    // Deleta o usuário do Firebase Authentication
    await admin.auth().deleteUser(uid);

    // Deleta as informações do usuário do Realtime Database
    await admin.database().ref(`garcons_info/${uid}`).remove();

    console.log(`Sucesso ao deletar garçom com UID: ${uid}`);
    return { success: true, message: "Garçom deletado com sucesso!" };
  } catch (error) {
    console.error(`Erro ao deletar garçom com UID: ${uid}`, error);
    // Transforma o erro em um erro que o cliente pode entender
    throw new functions.https.HttpsError(
      "unknown",
      error.message,
      error
    );
  }
});
