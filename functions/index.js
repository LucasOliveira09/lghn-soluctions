// SINTAXE V2: Importa apenas os módulos necessários
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onValueCreated } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

// Inicializa o Admin SDK (sem mudanças aqui)
admin.initializeApp();

const db = admin.database();

// ===========================================================================
// FUNÇÃO 1: deletarGarcom (Convertida para V2)
// ===========================================================================
// SINTAXE V2: A função agora é chamada com onCall() importado
exports.deletarGarcom = onCall(async (request) => {
  // SINTAXE V2: O 'context' agora faz parte do objeto 'request'. Acessamos com 'request.auth'.
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "A função só pode ser chamada por um usuário autenticado."
    );
  }

  // SINTAXE V2: Os dados enviados pelo cliente agora estão em 'request.data'.
  const uid = request.data.uid;
  if (!uid || typeof uid !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "O UID do garçom é obrigatório e deve ser uma string."
    );
  }

  try {
    await admin.auth().deleteUser(uid);
    await db.ref(`garcons_info/${uid}`).remove();
    console.log(`Sucesso ao deletar garçom com UID: ${uid}`);
    return { success: true, message: "Garçom deletado com sucesso!" };
  } catch (error) {
    console.error(`Erro ao deletar garçom com UID: ${uid}`, error);
    throw new HttpsError("unknown", error.message, error);
  }
});
