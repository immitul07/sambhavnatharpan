import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isAdminSessionValid } from "@/lib/admin-auth";

type StoredAccount = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender?: string;
  fullName: string;
  dob: string;
  phoneNumber: string;
};

const storageSeparator = "::";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function getAccountKey(phoneNumber: string, dob: string): string {
  return `${normalizePhone(phoneNumber)}|${dob.trim()}`;
}

export default function AdminAccountActionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ accountKey?: string }>();
  const rawParam = Array.isArray(params.accountKey) ? params.accountKey[0] : params.accountKey;
  const accountKeyFromParam = rawParam ? decodeURIComponent(rawParam) : "";
  const [resolvedAccountKey, setResolvedAccountKey] = useState("");
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);

  const selectedAccount = useMemo(
    () =>
      accounts.find((account) => getAccountKey(account.phoneNumber, account.dob) === resolvedAccountKey) ||
      null,
    [accounts, resolvedAccountKey],
  );

  const loadAccounts = useCallback(async () => {
    const raw = await AsyncStorage.getItem("accounts");
    const stored: StoredAccount[] = raw ? JSON.parse(raw) : [];
    setAccounts(stored);
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
        await loadAccounts();
      };
      load();
    }, [accountKeyFromParam, loadAccounts, router]),
  );

  const deleteAccount = async () => {
    if (!selectedAccount) return;

    Alert.alert("Delete Account", "Are you sure you want to delete this account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const raw = await AsyncStorage.getItem("accounts");
          const stored: StoredAccount[] = raw ? JSON.parse(raw) : [];
          const next = stored.filter(
            (account) => getAccountKey(account.phoneNumber, account.dob) !== resolvedAccountKey,
          );
          await AsyncStorage.setItem("accounts", JSON.stringify(next));

          const allKeys = await AsyncStorage.getAllKeys();
          const scopedPrefixes = [
            `aaradhana${storageSeparator}${resolvedAccountKey}${storageSeparator}`,
            `points${storageSeparator}${resolvedAccountKey}${storageSeparator}`,
            `submitted${storageSeparator}${resolvedAccountKey}${storageSeparator}`,
          ];
          const keysToRemove = allKeys.filter((key) =>
            scopedPrefixes.some((prefix) => key.startsWith(prefix)),
          );
          if (keysToRemove.length > 0) {
            await AsyncStorage.multiRemove(keysToRemove);
          }

          const activeAccountKey = (await AsyncStorage.getItem("activeAccountKey")) || "";
          if (activeAccountKey === resolvedAccountKey) {
            await AsyncStorage.multiRemove([
              "firstName",
              "middleName",
              "lastName",
              "gender",
              "userName",
              "dateOfBirth",
              "dob",
              "hotiNo",
              "villageCode",
              "profilePhoto",
              "photoUri",
              "phoneNumber",
              "address",
              "activeAccountKey",
            ]);
          }
          await AsyncStorage.removeItem("adminSelectedAccountKey");

          router.replace("/admin-dashboard");
        },
      },
    ]);
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
          <Text style={{ fontSize: 22, color: "#0f172a" }}>Account Actions</Text>
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

        <View
          style={{
            borderWidth: 1,
            borderColor: "#dbe3ee",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <Text style={{ fontWeight: "700", marginBottom: 10 }}>
            {selectedAccount
              ? selectedAccount.fullName ||
                `${selectedAccount.firstName} ${selectedAccount.middleName} ${selectedAccount.lastName}`.replace(
                  /\s+/g,
                  " ",
                )
              : "Account not found"}
          </Text>
          {selectedAccount ? (
            <Text style={{ color: "#6b7280", marginBottom: 12 }}>
              {selectedAccount.phoneNumber} | {selectedAccount.dob}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={async () => {
              await AsyncStorage.setItem("adminSelectedAccountKey", resolvedAccountKey);
              router.push("/admin-account-details");
            }}
            disabled={!selectedAccount}
            style={{
              backgroundColor: selectedAccount ? "#1e293b" : "#9ca3af",
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
Edit Account Details
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await AsyncStorage.setItem("adminSelectedAccountKey", resolvedAccountKey);
              router.push("/admin-edit-points");
            }}
            disabled={!selectedAccount}
            style={{
              backgroundColor: selectedAccount ? "#1e293b" : "#9ca3af",
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
Edit Points
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={deleteAccount}
            disabled={!selectedAccount}
            style={{
              backgroundColor: selectedAccount ? "#dc2626" : "#fca5a5",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
Delete Account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


