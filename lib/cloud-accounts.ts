import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { deleteDoc, doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import Constants from "expo-constants";

export type CloudAccount = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender?: string;
  fullName: string;
  dob: string;
  hotiNo: string;
  phoneNumber: string;
  address: string;
  photoUri: string;
};

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function getFirebaseConfig(): FirebaseOptions | null {
  const fromEnv = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  if (fromEnv.apiKey && fromEnv.projectId && fromEnv.appId) {
    return fromEnv;
  }

  const fromExtra = (Constants.expoConfig?.extra?.firebase || null) as FirebaseOptions | null;
  if (fromExtra?.apiKey && fromExtra?.projectId && fromExtra?.appId) {
    return fromExtra;
  }

  return null;
}

function getFirestoreClient() {
  const config = getFirebaseConfig();
  if (!config) return null;
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
  return { app, db: getFirestore(app) };
}

async function ensureSignedIn(app: ReturnType<typeof initializeApp>): Promise<void> {
  const auth = getAuth(app);
  if (auth.currentUser) return;
  await signInAnonymously(auth);
}

function toDocId(phoneNumber: string, dob: string): string {
  return `${normalizePhone(phoneNumber)}|${dob.trim()}`;
}

export async function upsertCloudAccount(account: CloudAccount): Promise<boolean> {
  const client = getFirestoreClient();
  if (!client) return false;
  await ensureSignedIn(client.app);

  const docId = toDocId(account.phoneNumber, account.dob);
  await setDoc(
    doc(client.db, "accounts", docId),
    {
      ...account,
      phoneNumber: normalizePhone(account.phoneNumber),
      dob: account.dob.trim(),
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  return true;
}

export async function findCloudAccount(
  phoneNumber: string,
  dob: string,
): Promise<CloudAccount | null> {
  const client = getFirestoreClient();
  if (!client) return null;
  await ensureSignedIn(client.app);

  const snapshot = await getDoc(doc(client.db, "accounts", toDocId(phoneNumber, dob)));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Partial<CloudAccount>;
  if (!data.phoneNumber || !data.dob) return null;

  return {
    firstName: data.firstName || "",
    middleName: data.middleName || "",
    lastName: data.lastName || "",
    gender: data.gender || "",
    fullName: data.fullName || "",
    dob: data.dob.trim(),
    hotiNo: data.hotiNo || "",
    phoneNumber: normalizePhone(data.phoneNumber),
    address: data.address || "",
    photoUri: data.photoUri || "",
  };
}

export async function deleteCloudAccount(
  phoneNumber: string,
  dob: string,
): Promise<boolean> {
  const client = getFirestoreClient();
  if (!client) return false;
  await ensureSignedIn(client.app);
  await deleteDoc(doc(client.db, "accounts", toDocId(phoneNumber, dob)));
  return true;
}
