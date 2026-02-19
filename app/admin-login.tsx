import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const defaultAdminUsername = "admin";
const defaultAdminPassword = "admin123";

export default function AdminLoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const setup = async () => {
      const session = await AsyncStorage.getItem("adminSession");
      if (session === "true") {
        router.replace("/admin-dashboard");
        return;
      }

      const storedUsername = await AsyncStorage.getItem("adminUsername");
      const storedPassword = await AsyncStorage.getItem("adminPassword");
      const seedEntries: [string, string][] = [];
      if (!storedUsername) {
        seedEntries.push(["adminUsername", defaultAdminUsername]);
      }
      if (!storedPassword) {
        seedEntries.push(["adminPassword", defaultAdminPassword]);
      }
      if (seedEntries.length > 0) {
        await AsyncStorage.multiSet(seedEntries);
      }
    };
    setup();
  }, [router]);

  const loginAdmin = async () => {
    const storedUsername =
      (await AsyncStorage.getItem("adminUsername")) || defaultAdminUsername;
    const storedPassword =
      (await AsyncStorage.getItem("adminPassword")) || defaultAdminPassword;

    if (username.trim() !== storedUsername.trim() || password !== storedPassword) {
      Alert.alert("Invalid admin credentials", "Username or password is incorrect.");
      return;
    }

    await AsyncStorage.setItem("adminSession", "true");
    router.replace("/admin-dashboard");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top"]}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            textAlign: "center",
            color: "#0f172a",
            marginBottom: 8,
          }}
        >
          Admin Login
        </Text>
        <Text style={{ textAlign: "center", color: "#6b7280", marginBottom: 24 }}>
          Separate admin access for managing all users.
        </Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="Admin Username"
          style={{
            borderWidth: 1,
            borderColor: "#cbd5e1",
            padding: 12,
            borderRadius: 12,
            marginBottom: 12,
          }}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Admin Password"
          style={{
            borderWidth: 1,
            borderColor: "#cbd5e1",
            padding: 12,
            borderRadius: 12,
            marginBottom: 12,
          }}
        />

        <TouchableOpacity
          onPress={loginAdmin}
          style={{
            backgroundColor: "#ea580c",
            padding: 14,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "600" }}>
Login as Admin
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/login")}
          style={{
            borderWidth: 1,
            borderColor: "#ea580c",
            padding: 14,
            borderRadius: 12,
          }}
        >
          <Text style={{ textAlign: "center", fontSize: 16 }}>Back to User Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


