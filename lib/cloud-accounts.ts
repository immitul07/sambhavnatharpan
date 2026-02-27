import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, setDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadString } from "firebase/storage";
import * as FileSystem from "expo-file-system/legacy";
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

function getImageContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function uploadProfilePhotoIfNeeded(
  app: ReturnType<typeof initializeApp>,
  photoUri: string,
  docId: string,
): Promise<string> {
  const trimmed = (photoUri || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (!trimmed.startsWith("file://")) return trimmed;

  try {
    const info = await FileSystem.getInfoAsync(trimmed);
    if (!info.exists) return trimmed;

    const base64 = await FileSystem.readAsStringAsync(trimmed, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64) return trimmed;

    const storage = getStorage(app);
    const contentType = getImageContentType(trimmed);
    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const fileRef = ref(storage, `accounts/${encodeURIComponent(docId)}/profile-${Date.now()}.${ext}`);
    await uploadString(fileRef, base64, "base64", { contentType });
    return await getDownloadURL(fileRef);
  } catch {
    return trimmed;
  }
}

export async function upsertCloudAccount(account: CloudAccount): Promise<boolean> {
  const client = getFirestoreClient();
  if (!client) return false;
  await ensureSignedIn(client.app);

  const docId = toDocId(account.phoneNumber, account.dob);
  const cloudPhotoUri = await uploadProfilePhotoIfNeeded(client.app, account.photoUri, docId);
  await setDoc(
    doc(client.db, "accounts", docId),
    {
      ...account,
      phoneNumber: normalizePhone(account.phoneNumber),
      dob: account.dob.trim(),
      photoUri: cloudPhotoUri || account.photoUri.trim(),
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

export async function listCloudAccounts(): Promise<CloudAccount[]> {
  const client = getFirestoreClient();
  if (!client) return [];
  await ensureSignedIn(client.app);

  const snapshots = await getDocs(collection(client.db, "accounts"));
  const rows: CloudAccount[] = [];

  snapshots.forEach((snap) => {
    const data = snap.data() as Partial<CloudAccount>;
    if (!data.phoneNumber || !data.dob) return;
    rows.push({
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
    });
  });

  return rows;
}
