import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { findCloudAccount } from "@/lib/cloud-accounts";
import { getCloudProgressByAccount } from "@/lib/cloud-progress";
import {
  clearAdminSession,
  tryStartAdminSession,
} from "@/lib/admin-auth";

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

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dob, setDob] = useState("");

  const router = useRouter();



  const toStorageDob = (displayDob: string) => {
    const parts = displayDob.split("-");
    if (parts.length !== 3) return "";
    const [day, month, year] = parts;
    if (!day || !month || !year) return "";
    return `${year}-${month}-${day}`;
  };

  const formatDobInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  };

  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  const storageSeparator = "::";
  const legacyMigrationFlagKey = "legacyProgressMigrationCompletedV1";

  const getAccountKey = (phone: string, dateOfBirth: string) => {
    return `${normalizePhone(phone)}|${dateOfBirth.trim()}`;
  };

  const getScopedProgressKey = (
    prefix: "aaradhana" | "points" | "submitted",
    accountKey: string,
    dateKey: string,
  ) => {
    return `${prefix}${storageSeparator}${accountKey}${storageSeparator}${dateKey}`;
  };

  const migrateLegacyProgressData = async (accountKey: string) => {
    const migrationDone = await AsyncStorage.getItem(legacyMigrationFlagKey);
    if (migrationDone === "true") return;

    const allKeys = await AsyncStorage.getAllKeys();
    const scopedPrefixes = [
      `aaradhana${storageSeparator}${accountKey}${storageSeparator}`,
      `points${storageSeparator}${accountKey}${storageSeparator}`,
      `submitted${storageSeparator}${accountKey}${storageSeparator}`,
    ];
    const hasScopedData = allKeys.some((key) =>
      scopedPrefixes.some((prefix) => key.startsWith(prefix)),
    );
    const legacyKeys = allKeys.filter(
      (key) =>
        key.startsWith("aaradhana-") ||
        key.startsWith("points-") ||
        key.startsWith("submitted-"),
    );
    if (legacyKeys.length === 0) {
      await AsyncStorage.setItem(legacyMigrationFlagKey, "true");
      return;
    }

    if (hasScopedData) {
      await AsyncStorage.multiRemove(legacyKeys);
      await AsyncStorage.setItem(legacyMigrationFlagKey, "true");
      return;
    }

    const legacyEntries = await AsyncStorage.multiGet(legacyKeys);
    const migratedEntries: [string, string][] = [];

    legacyEntries.forEach(([legacyKey, value]) => {
      if (value === null) return;

      if (legacyKey.startsWith("aaradhana-")) {
        const dateKey = legacyKey.replace("aaradhana-", "");
        migratedEntries.push([
          getScopedProgressKey("aaradhana", accountKey, dateKey),
          value,
        ]);
        return;
      }

      if (legacyKey.startsWith("points-")) {
        const dateKey = legacyKey.replace("points-", "");
        migratedEntries.push([
          getScopedProgressKey("points", accountKey, dateKey),
          value,
        ]);
        return;
      }

      if (legacyKey.startsWith("submitted-")) {
        const dateKey = legacyKey.replace("submitted-", "");
        migratedEntries.push([
          getScopedProgressKey("submitted", accountKey, dateKey),
          value,
        ]);
      }
    });

    if (migratedEntries.length > 0) {
      await AsyncStorage.multiSet(migratedEntries);
    }
    await AsyncStorage.multiRemove(legacyKeys);
    await AsyncStorage.setItem(legacyMigrationFlagKey, "true");
  };

  const login = async () => {
    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone || !dob.trim()) {
      Alert.alert(
        "માહિતી અધૂરી (Missing details)",
        "ફોન નંબર અને DOB લખો. (Enter phone number and DOB.)",
      );
      return;
    }

    const normalizedDob = toStorageDob(dob.trim());
    if (!normalizedDob) {
      Alert.alert(
        "DOB ફોર્મેટ ખોટું છે (Invalid DOB format)",
        "DOB DD-MM-YYYY માં પસંદ કરો. (Select DOB in DD-MM-YYYY.)",
      );
      return;
    }

    if (await tryStartAdminSession(normalizedPhone, normalizedDob)) {
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
        "adminSelectedAccountKey",
      ]);
      router.replace("/admin-dashboard");
      return;
    }

    const accountsRaw = await AsyncStorage.getItem("accounts");
    const accounts: StoredAccount[] = accountsRaw ? JSON.parse(accountsRaw) : [];

    const matched = accounts.find(
      (a) =>
        normalizePhone(a.phoneNumber) === normalizedPhone &&
        a.dob.trim() === normalizedDob,
    );

    // Backward compatibility for older single-account data.
    let active = matched;
    if (!active) {
      const savedPhone = (await AsyncStorage.getItem("phoneNumber")) || "";
      const savedDob =
        (await AsyncStorage.getItem("dateOfBirth")) ||
        (await AsyncStorage.getItem("dob")) ||
        "";
      if (
        normalizePhone(savedPhone) === normalizedPhone &&
        savedDob.trim() === normalizedDob
      ) {
        active = {
          firstName: (await AsyncStorage.getItem("firstName")) || "",
          middleName: (await AsyncStorage.getItem("middleName")) || "",
          lastName: (await AsyncStorage.getItem("lastName")) || "",
          gender: (await AsyncStorage.getItem("gender")) || "",
          fullName: (await AsyncStorage.getItem("userName")) || "",
          dob: savedDob,
          hotiNo:
            (await AsyncStorage.getItem("hotiNo")) ||
            (await AsyncStorage.getItem("villageCode")) ||
            "",
          phoneNumber: normalizePhone(savedPhone),
          address: (await AsyncStorage.getItem("address")) || "",
          photoUri:
            (await AsyncStorage.getItem("profilePhoto")) ||
            (await AsyncStorage.getItem("photoUri")) ||
            "",
        };
      }
    }
    if (!active) {
      try {
        const cloudAccount = await findCloudAccount(normalizedPhone, normalizedDob);
        if (cloudAccount) {
          active = cloudAccount;
          const updatedAccounts = [...accounts];
          const existingIndex = updatedAccounts.findIndex(
            (a) =>
              normalizePhone(a.phoneNumber) === normalizePhone(cloudAccount.phoneNumber) &&
              a.dob.trim() === cloudAccount.dob.trim(),
          );
          if (existingIndex >= 0) {
            updatedAccounts[existingIndex] = cloudAccount;
          } else {
            updatedAccounts.push(cloudAccount);
          }
          await AsyncStorage.setItem("accounts", JSON.stringify(updatedAccounts));
        }
      } catch {
        // Continue with local-only login behavior when cloud sync is unavailable.
      }
    }

    if (!active && accounts.length === 0) {
      Alert.alert(
        "No account found",
        "App data was reset. Please create your account again.",
        [{ text: "Register", onPress: () => router.push("/register") }],
      );
      return;
    }


    if (!active) {
      Alert.alert(
        "અમાન્ય એકાઉન્ટ (Invalid account)",
        "ફોન નંબર અથવા DOB મેળ ખાતું નથી. (Phone number or DOB does not match.)",
      );
      return;
    }

    const activeAccountKey = getAccountKey(active.phoneNumber, active.dob);
    await migrateLegacyProgressData(activeAccountKey);
    try {
      const cloudProgress = await getCloudProgressByAccount(activeAccountKey);
      const cloudEntries: [string, string][] = [];
      cloudProgress.forEach((row) => {
        cloudEntries.push([
          getScopedProgressKey("aaradhana", activeAccountKey, row.dateKey),
          JSON.stringify(row.checklist || {}),
        ]);
        cloudEntries.push([
          getScopedProgressKey("points", activeAccountKey, row.dateKey),
          String(row.points || 0),
        ]);
        cloudEntries.push([
          getScopedProgressKey("submitted", activeAccountKey, row.dateKey),
          row.submitted ? "true" : "false",
        ]);
      });
      if (cloudEntries.length > 0) {
        await AsyncStorage.multiSet(cloudEntries);
      }
    } catch {
      // Continue login even if cloud progress sync fails.
    }

    await AsyncStorage.multiSet([
      ["firstName", active.firstName],
      ["middleName", active.middleName],
      ["lastName", active.lastName],
      ["gender", active.gender || ""],
      ["userName", active.fullName],
      ["dateOfBirth", active.dob],
      ["dob", active.dob],
      ["hotiNo", active.hotiNo],
      ["villageCode", active.hotiNo],
      ["profilePhoto", active.photoUri],
      ["photoUri", active.photoUri],
      ["phoneNumber", normalizePhone(active.phoneNumber)],
      ["address", active.address],
      ["activeAccountKey", activeAccountKey],
    ]);
    await clearAdminSession();

    router.replace("/(tabs)");
  };

  const heroSize = 210;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff7ed" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 12}
      >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={true}
      >
      <View
        style={{
          flex: 1,
          justifyContent: "space-evenly",
          paddingHorizontal: 18,
          paddingTop: 24,
          paddingBottom: 2,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: "#fed7aa",
            opacity: 0.45,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 40,
            left: -40,
            width: 170,
            height: 170,
            borderRadius: 85,
            backgroundColor: "#fdba74",
            opacity: 0.35,
          }}
        />
        <Text
            style={{
              textAlign: "center",
              color: "#9a3412",
              fontSize: 18,
              fontWeight: "700",
              marginTop: -8,
              marginBottom: 16,
            }}
          >
            પૂરણ નગરે 125 મી ધ્વજારોહણ નિમિત્તે સંભવનાથ દાદાને ભેટણું
          </Text>
        <View
          style={{
            marginTop: -10,
            marginBottom: 12,
            alignSelf: "center",
            width: heroSize,
            height: heroSize,
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#fdba74",
            backgroundColor: "#fff7ed",
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          }}
        >
          <ExpoImage
            source={require("../assets/images/dhwaja-square.jpg")}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            contentPosition="top"
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: Math.floor(heroSize * 0.45),
              backgroundColor: "rgba(255, 255, 255, 0.20)",
            }}
          />
          <View
              pointerEvents="none"
              style={{
                position: "absolute",
              top: Math.floor(heroSize * 0.45),
              left: 0,
              right: 0,
              height: Math.floor(heroSize * 0.35),
              backgroundColor: "rgba(255, 255, 255, 0.09)",
            }}
          />
        </View>

        <View
          style={{
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 36,
              lineHeight: 42,
              textAlign: "center",
              marginBottom: 3,
              color: "#111827",
              fontWeight: "800",
              letterSpacing: 0.8,
              textShadowColor: "rgba(255,255,255,0.75)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            સંભવનાથાર્પણ
          </Text>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 20,
              textAlign: "center",
              color: "#7c2d12",
              letterSpacing: 2.1,
              fontWeight: "600",
              textTransform: "uppercase",
            }}
          >
              Sambhavnatharpan
            </Text>
        </View>

        <TextInput
          placeholder="ફોન નંબર (Phone Number)"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          placeholderTextColor="#64748b"
          style={{
            borderWidth: 1,
            borderColor: "#cbd5e1",
            paddingVertical: 11,
            paddingHorizontal: 12,
            borderRadius: 12,
            marginBottom: 12,
            backgroundColor: "#f8fafc",
            color: "#0f172a",
          }}
        />

        <TextInput
          placeholder="જન્મ તારીખ (DOB) (DD-MM-YYYY)"
          value={dob}
          onChangeText={(value) => setDob(formatDobInput(value))}
          keyboardType="number-pad"
          placeholderTextColor="#64748b"
          maxLength={10}
          style={{
            borderWidth: 1,
            borderColor: "#cbd5e1",
            paddingVertical: 11,
            paddingHorizontal: 12,
            borderRadius: 12,
            marginBottom: 12,
            backgroundColor: "#f8fafc",
            color: "#0f172a",
          }}
        />



        <TouchableOpacity
          onPress={login}
          style={{
            backgroundColor: "#ea580c",
            paddingVertical: 12,
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontSize: 16 }}>
            લોગિન (Login)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/register")}
          style={{
            borderWidth: 1,
            borderColor: "#ea580c",
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#000", textAlign: "center", fontSize: 16 }}>
            એકાઉન્ટ બનાવો / રજીસ્ટર કરો (Create Account / Register)
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}




