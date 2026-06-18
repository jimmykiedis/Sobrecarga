import { FIREBASE_CONFIG } from "../src/js/firebase/firebaseConfig.js";

const apiKey = process.env.FIREBASE_API_KEY || FIREBASE_CONFIG.apiKey;
const email = process.env.FIREBASE_EMAIL;
const password = process.env.FIREBASE_PASSWORD;
const displayName = process.env.FIREBASE_DISPLAY_NAME || "Sobrecarga";

if (!email || !password) {
  console.error(
    "Falta informar FIREBASE_EMAIL e FIREBASE_PASSWORD no ambiente."
  );
  process.exit(1);
}

const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email,
    password,
    displayName,
    returnSecureToken: true,
  }),
});

const payload = await response.json();

if (!response.ok) {
  console.error("Falha ao criar usuario no Firebase.");
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log("Usuario criado com sucesso no Firebase Authentication.");
console.log(
  JSON.stringify(
    {
      email: payload.email,
      localId: payload.localId,
      displayName,
    },
    null,
    2
  )
);
