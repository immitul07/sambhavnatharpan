import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isAdminSessionValid } from "@/lib/admin-auth";

export default function AdminLoginScreen() {
  const router = useRouter();

  useEffect(() => {
    let isActive = true;
    const redirect = async () => {
      const sessionValid = await isAdminSessionValid();
      if (!isActive) return;
      if (sessionValid) {
        router.replace("/admin-dashboard");
        return;
      }
      router.replace("/login");
    };
    redirect();
    return () => {
      isActive = false;
    };
  }, [router]);

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
          Admin access moved to the main login screen.
        </Text>

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


