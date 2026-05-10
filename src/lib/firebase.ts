import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Connection test as required by instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase is offline. Check configuration.");
    }
  }
}
testConnection();
