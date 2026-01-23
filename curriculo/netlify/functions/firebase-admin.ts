import * as admin from 'firebase-admin';

// Inicializa apenas se ainda não foi inicializado
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
        });
        console.log('✅ Firebase Admin SDK inicializado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase Admin SDK:', error);
    }
}

export const db = admin.firestore();
export { admin };
