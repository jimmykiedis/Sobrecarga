const FIREBASE_CONFIG = window.__FIREBASE_CONFIG__ || null;
const FIREBASE_VERSION = "10.12.5";
let firebaseAuthPromise = null;
let firebaseFirestorePromise = null;

const hasConfig = Boolean(FIREBASE_CONFIG?.apiKey && FIREBASE_CONFIG?.projectId);

const toFirestoreSafeData = (value) => JSON.parse(JSON.stringify(value));

async function loadFirebaseAuth() {
  if (!hasConfig) {
    throw new Error("Configuração do Firebase ausente.");
  }

  if (!firebaseAuthPromise) {
    firebaseAuthPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    ]).then(([appModule, authModule]) => {
      const app = appModule.initializeApp(FIREBASE_CONFIG);
      const auth = authModule.getAuth(app);
      return { app, auth, authModule };
    });
  }

  return firebaseAuthPromise;
}

export const isFirebaseReady = () => hasConfig;

export async function onAuthStateChanged(callback) {
  const { auth, authModule } = await loadFirebaseAuth();
  return authModule.onAuthStateChanged(auth, callback);
}

export async function signInWithEmailAndPassword(email, password) {
  const { auth, authModule } = await loadFirebaseAuth();
  return authModule.signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  const { auth, authModule } = await loadFirebaseAuth();
  return authModule.signOut(auth);
}

async function loadFirebaseFirestore() {
  if (!hasConfig) {
    throw new Error("Configuração do Firebase ausente.");
  }

  if (!firebaseFirestorePromise) {
    firebaseFirestorePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
      loadFirebaseAuth(),
    ]).then(([firestoreModule, authBundle]) => {
      const firestore = firestoreModule.getFirestore(authBundle.app);
      return { firestore, firestoreModule, app: authBundle.app };
    });
  }

  return firebaseFirestorePromise;
}

export async function getFirestoreDb() {
  const { firestore } = await loadFirebaseFirestore();
  return firestore;
}

export async function getAuthUserData() {
  const { auth } = await loadFirebaseAuth();
  return auth.currentUser;
}

export async function loadUserWorkspace(uid) {
  const { firestore, firestoreModule } = await loadFirebaseFirestore();
  const docRef = firestoreModule.doc(firestore, "users", uid, "workspace", "main");
  const snapshot = await firestoreModule.getDoc(docRef);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveUserWorkspace(uid, data) {
  const { firestore, firestoreModule } = await loadFirebaseFirestore();
  const docRef = firestoreModule.doc(firestore, "users", uid, "workspace", "main");
  await firestoreModule.setDoc(docRef, toFirestoreSafeData(data), { merge: true });
}

export async function listenUserWorkspace(uid, callback) {
  const { firestore, firestoreModule } = await loadFirebaseFirestore();
  const docRef = firestoreModule.doc(firestore, "users", uid, "workspace", "main");
  return firestoreModule.onSnapshot(docRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() : null);
  });
}

export async function ensureUserWorkspace(uid, seedData) {
  const { firestore, firestoreModule } = await loadFirebaseFirestore();
  const docRef = firestoreModule.doc(firestore, "users", uid, "workspace", "main");
  const snapshot = await firestoreModule.getDoc(docRef);

  if (!snapshot.exists()) {
    await firestoreModule.setDoc(docRef, toFirestoreSafeData(seedData));
    return toFirestoreSafeData(seedData);
  }

  return snapshot.data();
}
