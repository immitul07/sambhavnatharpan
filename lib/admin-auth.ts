import AsyncStorage from "@react-native-async-storage/async-storage";

const ADMIN_PHONE_KEY = "adminPhoneNumber";
const ADMIN_DOB_KEY = "adminDob";
const DEFAULT_ADMIN_PHONE = "9999999999";
const DEFAULT_ADMIN_DOB = "2000-01-01";
const ADMIN_SESSION_KEY = "adminSession";
const ADMIN_SESSION_EXPIRES_AT_KEY = "adminSessionExpiresAt";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export async function getAdminCredentials(): Promise<{ phoneNumber: string; dob: string }> {
  const entries = await AsyncStorage.multiGet([ADMIN_PHONE_KEY, ADMIN_DOB_KEY]);
  const storedPhone = entries[0]?.[1]?.trim() || DEFAULT_ADMIN_PHONE;
  const storedDob = entries[1]?.[1]?.trim() || DEFAULT_ADMIN_DOB;
  return {
    phoneNumber: normalizePhone(storedPhone),
    dob: storedDob,
  };
}

export async function hasAdminCredentials(): Promise<boolean> {
  return true;
}

export async function verifyAdminCredentials(
  phoneNumber: string,
  dob: string,
): Promise<boolean> {
  const creds = await getAdminCredentials();
  return normalizePhone(phoneNumber) === creds.phoneNumber && dob.trim() === creds.dob;
}

export async function setAdminCredentials(phoneNumber: string, dob: string): Promise<void> {
  await AsyncStorage.multiSet([
    [ADMIN_PHONE_KEY, normalizePhone(phoneNumber)],
    [ADMIN_DOB_KEY, dob.trim()],
  ]);
}

export async function startAdminSession(): Promise<void> {
  const expiresAt = String(Date.now() + SESSION_DURATION_MS);
  await AsyncStorage.multiSet([
    [ADMIN_SESSION_KEY, "true"],
    [ADMIN_SESSION_EXPIRES_AT_KEY, expiresAt],
  ]);
}

export async function tryStartAdminSession(
  phoneNumber: string,
  dob: string,
): Promise<boolean> {
  if (!(await verifyAdminCredentials(phoneNumber, dob))) {
    return false;
  }
  await startAdminSession();
  return true;
}

export async function clearAdminSession(): Promise<void> {
  await AsyncStorage.multiRemove([
    ADMIN_SESSION_KEY,
    "adminSelectedAccountKey",
    ADMIN_SESSION_EXPIRES_AT_KEY,
  ]);
}

export async function isAdminSessionValid(): Promise<boolean> {
  const [session, expiresAtRaw] = await AsyncStorage.multiGet([
    ADMIN_SESSION_KEY,
    ADMIN_SESSION_EXPIRES_AT_KEY,
  ]);
  if (session?.[1] !== "true") return false;
  const expiresAt = Number(expiresAtRaw?.[1] || 0);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await clearAdminSession();
    return false;
  }
  return true;
}
