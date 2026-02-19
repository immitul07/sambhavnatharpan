import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import Constants from "expo-constants";

export type CloudProgressRecord = {
  accountKey: string;
  dateKey: string;
  checklist: Record<string, boolean>;
  points: number;
  submitted: boolean;
};

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
  return getFirestore(app);
}

function toDocId(accountKey: string, dateKey: string): string {
  return `${encodeURIComponent(accountKey)}__${dateKey}`;
}

export async function upsertCloudProgress(record: CloudProgressRecord): Promise<boolean> {
  const db = getFirestoreClient();
  if (!db) return false;

  await setDoc(
    doc(db, "progress", toDocId(record.accountKey, record.dateKey)),
    {
      accountKey: record.accountKey,
      dateKey: record.dateKey,
      checklist: record.checklist || {},
      points: record.points || 0,
      submitted: !!record.submitted,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  return true;
}

export async function getCloudProgressByAccount(accountKey: string): Promise<CloudProgressRecord[]> {
  const db = getFirestoreClient();
  if (!db) return [];

  const q = query(collection(db, "progress"), where("accountKey", "==", accountKey));
  const snapshots = await getDocs(q);
  const rows: CloudProgressRecord[] = [];
  snapshots.forEach((snap) => {
    const data = snap.data() as Partial<CloudProgressRecord>;
    if (!data.dateKey) return;
    rows.push({
      accountKey,
      dateKey: data.dateKey,
      checklist: data.checklist || {},
      points: typeof data.points === "number" ? data.points : Number(data.points || 0),
      submitted: !!data.submitted,
    });
  });
  return rows;
}
