import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const defaultAdminPhoneNumber = "9999999999";
const defaultAdminDob = "2000-01-01";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function toStorageDob(value: string): string {
  const parts = value.trim().split("-");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  if (!day || !month || !year) return "";
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return "";
  return `${year}-${month}-${day}`;
}

function toDisplayDob(storageDob: string): string {
  const parts = storageDob.trim().split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  if (!day || !month || !year) return "";
  return `${day}-${month}-${year}`;
}

export default function AdminCredentialsScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dob, setDob] = useState("");

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const session = await AsyncStorage.getItem("adminSession");
        if (session !== "true") {
          router.replace("/login");
          return;
        }

        const storedPhone =
          (await AsyncStorage.getItem("adminPhoneNumber")) || defaultAdminPhoneNumber;
        const storedDob = (await AsyncStorage.getItem("adminDob")) || defaultAdminDob;

        await AsyncStorage.multiSet([
          ["adminPhoneNumber", storedPhone],
          ["adminDob", storedDob],
        ]);
        setPhoneNumber(storedPhone);
        setDob(toDisplayDob(storedDob));
      };
      load();
    }, [router]),
  );

  const saveCredentials = async () => {
    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      Alert.alert("Invalid phone", "Please enter a valid admin phone number.");
      return;
    }

    const storageDob = toStorageDob(dob);
    if (!storageDob) {
      Alert.alert("Invalid DOB", "Please enter DOB in DD-MM-YYYY format.");
      return;
    }

    await AsyncStorage.multiSet([
      ["adminPhoneNumber", normalizedPhone],
      ["adminDob", storageDob],
    ]);
    Alert.alert("Saved", "Admin login credentials updated.");
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 24 }}>
        <Text style={{ fontSize: 22, color: "#0f172a", marginBottom: 4 }}>
          Admin Credentials
        </Text>
        <Text style={{ color: "#6b7280", marginBottom: 16 }}>
          Set the phone number and DOB used for admin login.
        </Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#dbe3ee",
            borderRadius: 14,
            padding: 14,
            backgroundColor: "#f8fafc",
          }}
        >
          <Text style={{ marginBottom: 6, color: "#0f172a", fontWeight: "600" }}>
            Admin Phone Number
          </Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder="Enter admin phone number"
            style={{
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 10,
              padding: 10,
              marginBottom: 12,
            }}
          />

          <Text style={{ marginBottom: 6, color: "#0f172a", fontWeight: "600" }}>
            Admin DOB (DD-MM-YYYY)
          </Text>
          <TextInput
            value={dob}
            onChangeText={setDob}
            placeholder="DD-MM-YYYY"
            style={{
              borderWidth: 1,
              borderColor: "#cbd5e1",
              borderRadius: 10,
              padding: 10,
              marginBottom: 14,
            }}
          />

          <TouchableOpacity
            onPress={saveCredentials}
            style={{
              backgroundColor: "#ea580c",
              borderRadius: 10,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
              Save Credentials
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

