import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isAdminSessionValid } from "@/lib/admin-auth";

type StoredAccount = {
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

const storageSeparator = "::";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function getAccountKey(phoneNumber: string, dob: string): string {
  return `${normalizePhone(phoneNumber)}|${dob.trim()}`;
}

async function migrateAccountScopedProgress(oldAccountKey: string, newAccountKey: string) {
  if (oldAccountKey === newAccountKey) return;

  const keys = await AsyncStorage.getAllKeys();
  const prefixes: ("aaradhana" | "points" | "submitted")[] = [
    "aaradhana",
    "points",
    "submitted",
  ];
  const setEntries: [string, string][] = [];
  const removeKeys: string[] = [];

  for (const prefix of prefixes) {
    const oldPrefix = `${prefix}${storageSeparator}${oldAccountKey}${storageSeparator}`;
    const matchingKeys = keys.filter((key) => key.startsWith(oldPrefix));
    if (matchingKeys.length === 0) continue;
    const entries = await AsyncStorage.multiGet(matchingKeys);
    entries.forEach(([oldKey, value]) => {
      if (value === null) return;
      const dateKey = oldKey.slice(oldPrefix.length);
      const newKey = `${prefix}${storageSeparator}${newAccountKey}${storageSeparator}${dateKey}`;
      setEntries.push([newKey, value]);
      removeKeys.push(oldKey);
    });
  }

  if (setEntries.length > 0) {
    await AsyncStorage.multiSet(setEntries);
  }
  if (removeKeys.length > 0) {
    await AsyncStorage.multiRemove(removeKeys);
  }
}

export default function AdminAccountDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ accountKey?: string }>();
  const rawParam = Array.isArray(params.accountKey) ? params.accountKey[0] : params.accountKey;
  const accountKeyFromParam = rawParam ? decodeURIComponent(rawParam) : "";
  const [resolvedAccountKey, setResolvedAccountKey] = useState("");
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [draft, setDraft] = useState<StoredAccount | null>(null);

  const selectedAccount = useMemo(
    () =>
      accounts.find((account) => getAccountKey(account.phoneNumber, account.dob) === resolvedAccountKey) ||
      null,
    [accounts, resolvedAccountKey],
  );

  const loadAccount = useCallback(async (selectedKey: string) => {
    const raw = await AsyncStorage.getItem("accounts");
    const stored: StoredAccount[] = raw ? JSON.parse(raw) : [];
    setAccounts(stored);
    const found =
      stored.find((account) => getAccountKey(account.phoneNumber, account.dob) === selectedKey) ||
      null;
    if (!found) {
      setDraft(null);
      return;
    }
    setDraft({
      firstName: found.firstName,
      middleName: found.middleName,
      lastName: found.lastName,
      gender: found.gender || "",
      fullName: found.fullName,
      dob: found.dob,
      hotiNo: found.hotiNo,
      phoneNumber: found.phoneNumber,
      address: found.address,
      photoUri: found.photoUri,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!(await isAdminSessionValid())) {
          router.replace("/login");
          return;
        }
        const selectedKey =
          accountKeyFromParam || (await AsyncStorage.getItem("adminSelectedAccountKey")) || "";
        if (!selectedKey) {
          router.replace("/admin-dashboard");
          return;
        }
        setResolvedAccountKey(selectedKey);
        await AsyncStorage.setItem("adminSelectedAccountKey", selectedKey);
        await loadAccount(selectedKey);
      };
      load();
    }, [accountKeyFromParam, loadAccount, router]),
  );

  const saveDetails = async () => {
    if (!selectedAccount || !draft) return;
    if (
      !draft.firstName.trim() ||
      !draft.lastName.trim() ||
      !draft.dob.trim() ||
      !draft.phoneNumber.trim()
    ) {
      Alert.alert("Missing details", "First name, last name, DOB and phone are required.");
      return;
    }

    const normalizedPhone = normalizePhone(draft.phoneNumber);
    if (!normalizedPhone) {
      Alert.alert("Invalid phone", "Enter a valid phone number.");
      return;
    }

    const updated: StoredAccount = {
      firstName: draft.firstName.trim(),
      middleName: draft.middleName.trim(),
      lastName: draft.lastName.trim(),
      gender: (draft.gender || "").trim(),
      fullName: `${draft.firstName.trim()} ${draft.middleName.trim()} ${draft.lastName.trim()}`.replace(
        /\s+/g,
        " ",
      ),
      dob: draft.dob.trim(),
      hotiNo: draft.hotiNo.trim(),
      phoneNumber: normalizedPhone,
      address: draft.address.trim(),
      photoUri: draft.photoUri.trim(),
    };

    const raw = await AsyncStorage.getItem("accounts");
    const stored: StoredAccount[] = raw ? JSON.parse(raw) : [];
    const index = stored.findIndex(
      (account) => getAccountKey(account.phoneNumber, account.dob) === resolvedAccountKey,
    );
    if (index < 0) {
      Alert.alert("Not found", "This user no longer exists.");
      router.replace("/admin-dashboard");
      return;
    }

    const newKey = getAccountKey(updated.phoneNumber, updated.dob);
    stored[index] = updated;
    await AsyncStorage.setItem("accounts", JSON.stringify(stored));
    await migrateAccountScopedProgress(resolvedAccountKey, newKey);

    const activeAccountKey = (await AsyncStorage.getItem("activeAccountKey")) || "";
    if (activeAccountKey === resolvedAccountKey) {
      await AsyncStorage.multiSet([
        ["activeAccountKey", newKey],
        ["firstName", updated.firstName],
        ["middleName", updated.middleName],
        ["lastName", updated.lastName],
        ["gender", updated.gender || ""],
        ["userName", updated.fullName],
        ["dateOfBirth", updated.dob],
        ["dob", updated.dob],
        ["hotiNo", updated.hotiNo],
        ["villageCode", updated.hotiNo],
        ["profilePhoto", updated.photoUri],
        ["photoUri", updated.photoUri],
        ["phoneNumber", updated.phoneNumber],
        ["address", updated.address],
      ]);
    }
    await AsyncStorage.setItem("adminSelectedAccountKey", newKey);

    Alert.alert("Saved", "Account details updated.");
    router.replace("/admin-account-actions");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 24 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 22, color: "#0f172a" }}>Edit Account Details</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <Text>Back</Text>
          </TouchableOpacity>
        </View>

        {!draft ? (
          <Text style={{ color: "#6b7280" }}>Account not found.</Text>
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#dbe3ee",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <TextInput
              value={draft.firstName}
              onChangeText={(value) => setDraft((prev) => (prev ? { ...prev, firstName: value } : prev))}
              placeholder="First Name"
              style={styles.input}
            />
            <TextInput
              value={draft.middleName}
              onChangeText={(value) => setDraft((prev) => (prev ? { ...prev, middleName: value } : prev))}
              placeholder="Middle Name"
              style={styles.input}
            />
            <TextInput
              value={draft.lastName}
              onChangeText={(value) => setDraft((prev) => (prev ? { ...prev, lastName: value } : prev))}
              placeholder="Last Name"
              style={styles.input}
            />
            <Text style={{ color: "#6b7280", marginBottom: 4 }}>Gender</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setDraft((prev) => (prev ? { ...prev, gender: "Male" } : prev))}
                style={[
                  styles.genderChip,
                  draft.gender === "Male" && styles.genderChipActive,
                ]}
              >
                <Text style={draft.gender === "Male" ? styles.genderChipTextActive : styles.genderChipText}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDraft((prev) => (prev ? { ...prev, gender: "Female" } : prev))}
                style={[
                  styles.genderChip,
                  draft.gender === "Female" && styles.genderChipActive,
                ]}
              >
                <Text style={draft.gender === "Female" ? styles.genderChipTextActive : styles.genderChipText}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={draft.dob}
              onChangeText={(value) => setDraft((prev) => (prev ? { ...prev, dob: value } : prev))}
              placeholder="DOB (YYYY-MM-DD)"
              style={styles.input}
            />
            <TextInput
              value={draft.hotiNo}
              onChangeText={(value) => setDraft((prev) => (prev ? { ...prev, hotiNo: value } : prev))}
              placeholder="Hoti No"
              style={styles.input}
            />
            <TextInput
              value={draft.phoneNumber}
              onChangeText={(value) => setDraft((prev) => (prev ? { ...prev, phoneNumber: value } : prev))}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              value={draft.address}
              onChangeText={(value) => setDraft((prev) => (prev ? { ...prev, address: value } : prev))}
              placeholder="Address"
              multiline
              style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
            />
            <TouchableOpacity
              onPress={saveDetails}
              style={{
                backgroundColor: "#ea580c",
                borderRadius: 10,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
                Save Details
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  genderChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center" as const,
    backgroundColor: "#f8fafc",
  },
  genderChipActive: {
    backgroundColor: "#ea580c",
    borderColor: "#ea580c",
  },
  genderChipText: {
    color: "#0f172a",
    fontWeight: "600" as const,
  },
  genderChipTextActive: {
    color: "#fff",
    fontWeight: "600" as const,
  },
};


