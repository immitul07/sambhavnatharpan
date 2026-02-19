import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ThankYouScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top"]}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 30, textAlign: "center", marginBottom: 14, color: "#0f172a" }}>
          Thank You for Registering
        </Text>
        <Text style={{ textAlign: "center", color: "#666", marginBottom: 30 }}>
          Your profile has been created successfully.
        </Text>

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={{
            backgroundColor: "#ea580c",
            padding: 14,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontSize: 16 }}>
            Continue to App
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
          <Text style={{ color: "#000", textAlign: "center", fontSize: 16 }}>
            Go to Login
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

