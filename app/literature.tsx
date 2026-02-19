import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type LiteratureItem = {
  id: string;
  title: string;
};

export const LITERATURE_ITEMS: LiteratureItem[] = [
  { id: "gyan-na-5-duha", title: "Gyan na 5 Duha" },
  { id: "sambhavnath-bhagwan-stuti", title: "Sambhavnath Bhagwan Stuti" },
  { id: "pradakshina-duha", title: "Pradakshina Duha" },
];

export default function LiteratureScreen() {
  const router = useRouter();

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
          <Text style={{ fontSize: 22, color: "#0f172a" }}>Literature</Text>
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
            backgroundColor: "#ffffff",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {LITERATURE_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(`/literature-file?id=${item.id}`)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: item.id === LITERATURE_ITEMS[LITERATURE_ITEMS.length - 1].id ? 0 : 1,
                borderBottomColor: "#e2e8f0",
              }}
            >
              <Text style={{ color: "#0f172a", fontSize: 16 }}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
