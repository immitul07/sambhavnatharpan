import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LITERATURE_ITEMS } from "./literature";

type DuhaSection = {
  title?: string;
  lines: string[];
};

const STYLED_LITERATURE_SECTIONS: Record<string, DuhaSection[]> = {
  "gyan-na-5-duha": [
    {
      title: "मति ज्ञान",
      lines: [
        "समकित श्रध्धावंतने उपन्यो ज्ञान प्रकाश",
        "प्रणमुं पदकज तेहना भाव धरी उल्लास",
      ],
    },
    {
      title: "श्रुत ज्ञान",
      lines: [
        "पवयण श्रुत सिद्धांत ते आगम समय वखाण",
        "पूजो बहुविध रागथी, चरण कमल चित आण",
      ],
    },
    {
      title: "अवधि ज्ञान",
      lines: [
        "उपन्यो अवधिज्ञान नो, गुण जेहने अविकार",
        "वंदना तेहने मारी, श्वासे मांहे सो वार",
      ],
    },
    {
      title: "मनःपर्यव ज्ञान",
      lines: [
        "ए गुण जेहने उपन्यो, सर्वविरति गुणठाण",
        "प्रणमुं हितथी तेहना, चरण करण चित्त आण",
      ],
    },
    {
      title: "केवळ ज्ञान",
      lines: [
        "केवल दंसण नाणनो, चिदानंद धनतेज",
        "ज्ञानपंचमी दिन पूजिये, विजयलक्ष्मी शुभ हेज",
      ],
    },
  ],
  "pradakshina-duha": [
    {
      title: "१.",
      lines: [
        "काल अनादि अनंतथी, भव भ्रमणानो नहीं पार;",
        "ते भ्रमण निवारवा, प्रदक्षिणा देउं त्रण वार ॥१॥",
        "भमतिमां भमता थकां, भव भावठ दूर पलाय;",
        "दर्शन ज्ञान चारित्र रूप, प्रदक्षिणा त्रण देवाय ॥२॥",
      ],
    },
    {
      title: "२.",
      lines: [
        "जन्म मरणादि भय टळे, सीझे जो दर्शन काज;",
        "रत्नत्रयी प्राप्ति भणी, दर्शन करो जिनराज ॥३॥",
        "ज्ञान वडुं संसारमां, ज्ञान परम सुख हेत;",
        "ज्ञान विना जग जीवडा, न लहे तत्त्व संकेत ॥४॥",
      ],
    },
    {
      title: "३.",
      lines: [
        "चय ते संचय कर्मनो, रिक्त करे वळी जेह;",
        "चारित्र नाम निर्युक्ते कंहुं, वंदो ते गुण गेह ॥५॥",
        "दर्शन ज्ञान चारित्र ए, रत्नत्रयी निरधार;",
        "त्रण प्रदक्षिणा ते कारणे, भवदुःख भंजनहार ॥६॥",
      ],
    },
  ],
};

const LITERATURE_CONTENT: Record<string, string> = {
  "sambhavnath-bhagwan-stuti":
    "Sambhavnath Bhagwan Stuti content will be added here.",
};

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildStyledPdfHtml(sections: DuhaSection[]): string {
  const blocks = sections
    .map(
      (section) => `
        <section class="duha-block">
          <h2>${escapeHtml(section.title || "")}</h2>
          ${section.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        </section>
      `,
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4 portrait; margin: 20px; }
      body {
        margin: 0;
        color: #111827;
        background: #e5e7eb;
        border: 1px solid #facc15;
        font-family: "Noto Sans Devanagari", "Mangal", "Arial Unicode MS", sans-serif;
      }
      .container { padding: 14px 10px; }
      .duha-block { text-align: center; margin-bottom: 28px; }
      .duha-block h2 { margin: 0 0 8px; font-size: 34px; }
      .duha-block p { margin: 0; font-size: 29px; line-height: 1.35; }
    </style>
  </head>
  <body>
    <div class="container">${blocks}</div>
  </body>
</html>`;
}

function buildLiteraturePdfHtml(id: string | undefined, title: string): string {
  if (id && STYLED_LITERATURE_SECTIONS[id]) {
    return buildStyledPdfHtml(STYLED_LITERATURE_SECTIONS[id]);
  }

  const fallback =
    id && LITERATURE_CONTENT[id]
      ? LITERATURE_CONTENT[id]
      : "Selected literature file is not available.";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4 portrait; margin: 24px; }
      body { font-family: Arial, sans-serif; color: #0f172a; }
      h1 { font-size: 24px; margin-bottom: 14px; }
      p { font-size: 16px; line-height: 1.6; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(fallback)}</p>
  </body>
</html>`;
}

export default function LiteratureFileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const selected = LITERATURE_ITEMS.find((item) => item.id === id);
  const styledSections = id ? STYLED_LITERATURE_SECTIONS[id] : undefined;

  const downloadCurrentFilePdf = async () => {
    try {
      const title = selected?.title || "Literature File";
      const safeName = sanitizeFileName(title);
      const outputFileName = `${safeName}.pdf`;
      const html = buildLiteraturePdfHtml(id, title);
      const { uri } = await Print.printToFileAsync({
        html,
        width: 842,
        height: 1191,
      });

      if (Platform.OS === "android") {
        const downloadsUri =
          FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
        let permission =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
            downloadsUri,
          );

        if (!permission.granted) {
          permission =
            await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        }

        if (!permission.granted) {
          Alert.alert("Permission required", "Please allow folder access to save the PDF.");
          return;
        }

        const selectedUri = permission.directoryUri || "";
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        let fileUri = "";
        try {
          fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            selectedUri,
            outputFileName,
            "application/pdf",
          );
        } catch {
          fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            selectedUri,
            `${safeName}-${Date.now()}.pdf`,
            "application/pdf",
          );
        }

        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        Alert.alert("Download complete", `${outputFileName} saved successfully.`);
        return;
      }

      const destination = `${FileSystem.documentDirectory}${outputFileName}`;
      await FileSystem.copyAsync({ from: uri, to: destination });
      Alert.alert("Saved", `${outputFileName} saved in app files.`);
    } catch {
      Alert.alert("Download failed", "Could not generate PDF file.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 24 }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 22, color: "#0f172a", marginBottom: 10 }}>
            {selected ? selected.title : "Literature File"}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TouchableOpacity
              onPress={downloadCurrentFilePdf}
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: "#ffffff",
              }}
            >
              <Text>Download PDF</Text>
            </TouchableOpacity>
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
        </View>

        {styledSections ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#facc15",
              borderRadius: 2,
              paddingHorizontal: 16,
              paddingVertical: 18,
              backgroundColor: "#e5e7eb",
            }}
          >
            {styledSections.map((section, sectionIndex) => (
              <View key={`section-${sectionIndex}`} style={{ marginBottom: 34 }}>
                {section.title ? (
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 34,
                      color: "#111827",
                      fontWeight: "700",
                      marginBottom: 6,
                    }}
                  >
                    {section.title}
                  </Text>
                ) : null}
                {section.lines.map((line) => (
                  <Text
                    key={`${sectionIndex}-${line}`}
                    style={{
                      textAlign: "center",
                      fontSize: 30,
                      color: "#111827",
                      lineHeight: 42,
                    }}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#dbe3ee",
              borderRadius: 14,
              padding: 16,
              backgroundColor: "#ffffff",
            }}
          >
            <Text style={{ color: "#1e293b", lineHeight: 24 }}>
              {id && LITERATURE_CONTENT[id]
                ? LITERATURE_CONTENT[id]
                : "Selected literature file is not available."}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
