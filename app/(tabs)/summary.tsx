import { useLanguage } from "@/components/LanguageContext";
import { useTheme } from "@/components/ThemeContext";
import { getNiyamListForDob, NIYAM_LIST, type NiyamItem } from "@/constants/niyams";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const storageSeparator = "::";
const legacyMigrationFlagKey = "legacyProgressMigrationCompletedV1";

function getScopedProgressKey(
  prefix: "aaradhana" | "points" | "submitted",
  accountKey: string,
  dateKey: string,
): string {
  return `${prefix}${storageSeparator}${accountKey}${storageSeparator}${dateKey}`;
}

async function getAccountKeyFromStorage(): Promise<string> {
  const activeAccountKey = (await AsyncStorage.getItem("activeAccountKey")) || "";
  if (activeAccountKey.trim()) {
    return activeAccountKey.trim();
  }

  const accountParts = await AsyncStorage.multiGet(["phoneNumber", "dob"]);
  const phoneNumber = accountParts[0]?.[1]?.trim() || "";
  const dob = accountParts[1]?.[1]?.trim() || "";
  if (!phoneNumber || !dob) return "";
  return `${phoneNumber}|${dob}`;
}

async function migrateLegacyProgressData(accountKey: string): Promise<void> {
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
      migratedEntries.push([getScopedProgressKey("aaradhana", accountKey, dateKey), value]);
      return;
    }
    if (legacyKey.startsWith("points-")) {
      const dateKey = legacyKey.replace("points-", "");
      migratedEntries.push([getScopedProgressKey("points", accountKey, dateKey), value]);
      return;
    }
    if (legacyKey.startsWith("submitted-")) {
      const dateKey = legacyKey.replace("submitted-", "");
      migratedEntries.push([getScopedProgressKey("submitted", accountKey, dateKey), value]);
    }
  });

  if (migratedEntries.length > 0) {
    await AsyncStorage.multiSet(migratedEntries);
  }
  await AsyncStorage.multiRemove(legacyKeys);
  await AsyncStorage.setItem(legacyMigrationFlagKey, "true");
}

async function getPointsForDate(
  accountKey: string,
  dateKey: string,
  niyamList: NiyamItem[],
): Promise<number> {
  const savedPoints = await AsyncStorage.getItem(
    getScopedProgressKey("points", accountKey, dateKey),
  );
  if (savedPoints !== null) {
    const parsed = Number(savedPoints);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const savedChecklist = await AsyncStorage.getItem(
    getScopedProgressKey("aaradhana", accountKey, dateKey),
  );
  if (!savedChecklist) return 0;

  try {
    const parsedChecklist = JSON.parse(savedChecklist) as Record<string, boolean>;
    return niyamList.reduce((sum, item) => {
      return sum + (parsedChecklist[item.key] ? item.points : 0);
    }, 0);
  } catch {
    return 0;
  }
}

async function getAllDateKeysWithData(accountKey: string): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  const dateKeys = new Set<string>();
  const pointsPrefix = `points${storageSeparator}${accountKey}${storageSeparator}`;
  const checklistPrefix = `aaradhana${storageSeparator}${accountKey}${storageSeparator}`;

  keys.forEach((key) => {
    if (key.startsWith(pointsPrefix)) dateKeys.add(key.slice(pointsPrefix.length));
    if (key.startsWith(checklistPrefix)) dateKeys.add(key.slice(checklistPrefix.length));
  });

  return Array.from(dateKeys);
}

async function getAllTimeTotal(accountKey: string, niyamList: NiyamItem[]): Promise<number> {
  const dateKeys = await getAllDateKeysWithData(accountKey);
  if (dateKeys.length === 0) return 0;

  const values = await Promise.all(
    dateKeys.map((dateKey) => getPointsForDate(accountKey, dateKey, niyamList)),
  );
  return values.reduce((sum, points) => sum + points, 0);
}

async function getNiyamProgress(
  accountKey: string,
  niyamList: NiyamItem[],
): Promise<{
  totalDays: number;
  progress: Record<string, number>;
}> {
  const keys = await AsyncStorage.getAllKeys();
  const checklistPrefix = `aaradhana${storageSeparator}${accountKey}${storageSeparator}`;
  const checklistKeys = keys.filter((key) => key.startsWith(checklistPrefix));
  const progress: Record<string, number> = {};
  niyamList.forEach((item) => { progress[item.key] = 0; });

  if (checklistKeys.length === 0) return { totalDays: 0, progress };

  const entries = await AsyncStorage.multiGet(checklistKeys);
  entries.forEach(([, value]) => {
    if (!value) return;
    try {
      const parsed = JSON.parse(value) as Record<string, boolean>;
      niyamList.forEach((item) => {
        if (parsed[item.key]) progress[item.key] += 1;
      });
    } catch { /* Ignore malformed entries */ }
  });

  return { totalDays: checklistKeys.length, progress };
}

// ── Weekly chart data ──
function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getLast7DaysPoints(
  accountKey: string,
  niyamList: NiyamItem[],
): Promise<{ dateKey: string; label: string; points: number }[]> {
  const result: { dateKey: string; label: string; points: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateKey = getLocalDateKey(d);
    const pts = await getPointsForDate(accountKey, dateKey, niyamList);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    result.push({ dateKey, label: dayNames[d.getDay()], points: pts });
  }

  return result;
}

// ── Streak calculation ──
async function calculateStreak(accountKey: string): Promise<number> {
  const allKeys = await AsyncStorage.getAllKeys();
  const submittedPrefix = `submitted${storageSeparator}${accountKey}${storageSeparator}`;
  const submittedKeys = allKeys.filter((k) => k.startsWith(submittedPrefix));
  if (submittedKeys.length === 0) return 0;

  const submittedDates = new Set<string>();
  const entries = await AsyncStorage.multiGet(submittedKeys);
  entries.forEach(([key, value]) => {
    if (value === "true") submittedDates.add(key.slice(submittedPrefix.length));
  });

  let streak = 0;
  const current = new Date();
  const todayKey = getLocalDateKey(current);
  let startDate = submittedDates.has(todayKey) ? current : new Date(current.getTime() - 86400000);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(startDate.getTime() - i * 86400000);
    if (submittedDates.has(getLocalDateKey(checkDate))) streak++;
    else break;
  }
  return streak;
}

// ── PDF exports ──
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type ExportUserInfo = { name: string; phone: string };

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").replace(/\s+/g, " ").trim();
}

async function getExportUserInfo(accountKey: string): Promise<ExportUserInfo> {
  const parts = await AsyncStorage.multiGet(["userName", "phoneNumber", "accounts"]);
  const fallbackName = parts[0]?.[1]?.trim() || "User";
  const fallbackPhone = parts[1]?.[1]?.trim() || "";
  const rawAccounts = parts[2]?.[1] || "";

  if (!rawAccounts || !accountKey) return { name: fallbackName, phone: fallbackPhone };

  try {
    const accounts = JSON.parse(rawAccounts) as {
      fullName?: string; firstName?: string; middleName?: string; lastName?: string;
      phoneNumber?: string; dob?: string;
    }[];
    const current = accounts.find((acc) => {
      const phone = (acc.phoneNumber || "").replace(/\D/g, "");
      const dob = (acc.dob || "").trim();
      return `${phone}|${dob}` === accountKey;
    });
    if (!current) return { name: fallbackName, phone: fallbackPhone };

    const resolvedName = current.fullName?.trim() ||
      `${current.firstName || ""} ${current.middleName || ""} ${current.lastName || ""}`.replace(/\s+/g, " ").trim() ||
      fallbackName;
    return { name: resolvedName, phone: current.phoneNumber?.trim() || fallbackPhone };
  } catch {
    return { name: fallbackName, phone: fallbackPhone };
  }
}

function buildMonthSection(
  year: number,
  monthIndex: number,
  user: ExportUserInfo,
  niyamList: NiyamItem[],
  isLastPage: boolean,
): string {
  const monthName = new Date(year, monthIndex, 1).toLocaleString("en-US", { month: "long" });
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => `<th>${i + 1}</th>`).join("");
  const dayCells = Array.from({ length: daysInMonth }, () => "<td></td>").join("");
  const rows = niyamList.map((item, index) => {
    return `<tr>
      <td class="sr">${index + 1}</td>
      <td class="niyam">
        <div class="gu">${escapeHtml(item.gu)}</div>
        <div class="en">${escapeHtml(item.en)}</div>
      </td>
      ${dayCells}
    </tr>`;
  }).join("");

  return `<section class="page${isLastPage ? "" : " with-break"}">
    <div class="header">
      <div><h1>Daily Niyam</h1><p>Month: ${monthName} ${year}</p></div>
      <div class="user-meta">
        <div><strong>Name:</strong> ${escapeHtml(user.name)}</div>
        <div><strong>Phone:</strong> ${escapeHtml(user.phone || "-")}</div>
      </div>
    </div>
    <table>
      <thead><tr><th class="sr">Sr</th><th class="niyam-head">Niyam</th>${dayHeaders}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function buildHardcopyTemplateHtml(user: ExportUserInfo, niyamList: NiyamItem[]): string {
  const sections: string[] = [];
  for (let monthIndex = 2; monthIndex <= 11; monthIndex += 1) {
    sections.push(buildMonthSection(2026, monthIndex, user, niyamList, monthIndex === 11));
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4 portrait; margin: 2mm; }
      body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
      .page { width: 100%; }
      .with-break { page-break-after: always; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
      h1 { margin: 0; font-size: 11px; }
      p { margin: 1px 0 0; font-size: 7px; color: #374151; }
      .user-meta { text-align: right; font-size: 7px; line-height: 1.1; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; }
      th, td { border: 1px solid #cbd5e1; text-align: center; padding: 0.5px; font-size: 5px; height: 8px; line-height: 1; }
      th { background: #f1f5f9; font-weight: 700; }
      .sr { width: 12px; }
      .niyam-head, .niyam { width: 98px; text-align: left; }
      .niyam { padding: 0.8px 1.6px; }
      .gu { font-size: 6px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .en { font-size: 5px; color: #4b5563; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    </style>
  </head>
  <body>${sections.join("")}</body>
</html>`;
}

export default function SummaryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalDaysTracked, setTotalDaysTracked] = useState(0);
  const [niyamProgress, setNiyamProgress] = useState<Record<string, number>>({});
  const [niyamList, setNiyamList] = useState<NiyamItem[]>(NIYAM_LIST);
  const [sortBy, setSortBy] = useState<"serial" | "days" | "alpha" | "points">("days");
  const [weeklyData, setWeeklyData] = useState<{ dateKey: string; label: string; points: number }[]>([]);
  const [streak, setStreak] = useState(0);

  const exportHardcopyPdf = async () => {
    try {
      const accountKey = await getAccountKeyFromStorage();
      const user = await getExportUserInfo(accountKey);
      const currentDob = (await AsyncStorage.getItem("dob")) || "";
      const exportNiyamList = getNiyamListForDob(currentDob);
      const html = buildHardcopyTemplateHtml(user, exportNiyamList);
      const { uri } = await Print.printToFileAsync({ html, width: 842, height: 1191 });
      const safeName = sanitizeFileName(user.name || "User");
      const outputFileName = `Daily Niyam - (${safeName}).pdf`;

      if (Platform.OS === "android") {
        const downloadsUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
        let permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsUri);
        if (!permission.granted) {
          permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        }
        if (!permission.granted) {
          Alert.alert("Permission required", "Please choose a writable folder.");
          return;
        }
        const selectedUri = permission.directoryUri || "";
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        let fileUri = "";
        try {
          fileUri = await FileSystem.StorageAccessFramework.createFileAsync(selectedUri, outputFileName, "application/pdf");
        } catch {
          fileUri = await FileSystem.StorageAccessFramework.createFileAsync(selectedUri, `Daily Niyam - (${safeName})-${Date.now()}.pdf`, "application/pdf");
        }
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert("Download complete", `${outputFileName} saved in Downloads folder.`);
        return;
      }

      const destination = `${FileSystem.documentDirectory}${outputFileName}`;
      await FileSystem.copyAsync({ from: uri, to: destination });
      Alert.alert("Saved", `${outputFileName} saved in app files.`);
    } catch {
      Alert.alert("Export failed", "Could not generate hardcopy PDF.");
    }
  };

  const shareProgress = async () => {
    const accountKey = await getAccountKeyFromStorage();
    const user = await getExportUserInfo(accountKey);
    const message = `🙏 Jai Jinendra!\n\nMy Sambhavnatharpan progress:\n🔥 Streak: ${streak} days\n📊 Total Points: ${totalPoints}\n📅 Days Tracked: ${totalDaysTracked}\n\n— ${user.name}`;
    try {
      await Share.share({ message });
    } catch { /* ignore */ }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([
      "firstName", "middleName", "lastName", "gender",
      "userName", "dateOfBirth", "dob", "hotiNo", "villageCode",
      "profilePhoto", "photoUri", "phoneNumber", "address",
      "activeAccountKey", "adminSession", "adminSelectedAccountKey",
    ]);
    router.replace("/login");
  };

  const loadSummary = useCallback(async () => {
    setLoading(true);
    const accountKey = await getAccountKeyFromStorage();
    if (!accountKey) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    await migrateLegacyProgressData(accountKey);
    const currentDob = (await AsyncStorage.getItem("dob")) || "";
    const currentNiyamList = getNiyamListForDob(currentDob);
    setNiyamList(currentNiyamList);
    const [total, niyamData, weekly, currentStreak] = await Promise.all([
      getAllTimeTotal(accountKey, currentNiyamList),
      getNiyamProgress(accountKey, currentNiyamList),
      getLast7DaysPoints(accountKey, currentNiyamList),
      calculateStreak(accountKey),
    ]);
    setTotalPoints(total);
    setTotalDaysTracked(niyamData.totalDays);
    setNiyamProgress(niyamData.progress);
    setWeeklyData(weekly);
    setStreak(currentStreak);
    setLoading(false);
  }, [router]);

  useFocusEffect(
    useCallback(() => { loadSummary(); }, [loadSummary]),
  );

  const sortedNiyams = [...niyamList].sort((a, b) => {
    if (sortBy === "serial") {
      return niyamList.findIndex((item) => item.key === a.key) - niyamList.findIndex((item) => item.key === b.key);
    }
    const aDays = niyamProgress[a.key] || 0;
    const bDays = niyamProgress[b.key] || 0;
    const aTotalPoints = aDays * a.points;
    const bTotalPoints = bDays * b.points;
    if (sortBy === "alpha") return a.en.localeCompare(b.en);
    if (sortBy === "points") {
      if (bTotalPoints !== aTotalPoints) return bTotalPoints - aTotalPoints;
      return bDays - aDays;
    }
    if (bDays !== aDays) return bDays - aDays;
    return a.en.localeCompare(b.en);
  });

  const maxWeeklyPoints = Math.max(...weeklyData.map((d) => d.points), 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 10, paddingBottom: 24 }}>
        {/* ── Header ── */}
        <View style={{ position: "relative", marginBottom: 14 }}>
          <Text style={{ fontSize: 22, textAlign: "center", color: colors.text }}>
            {t('summary')}
          </Text>
          <TouchableOpacity onPress={() => setShowMenu((prev) => !prev)} style={{ position: "absolute", right: 0, top: 0, padding: 4 }}>
            <Text style={{ fontSize: 26, color: colors.text }}>☰</Text>
          </TouchableOpacity>
          {showMenu && (
            <View style={{ position: "absolute", right: 0, top: 34, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 6, width: 150, zIndex: 10 }}>
              <TouchableOpacity onPress={() => { setShowMenu(false); router.push("/(tabs)"); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: colors.text }}>{t('home')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowMenu(false); router.push("/(tabs)/summary"); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: colors.text }}>{t('summary')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowMenu(false); router.push("/(tabs)/leaderboard"); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: colors.text }}>{t('leaderboard')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowMenu(false); router.push("/literature"); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: colors.text }}>{t('literatureFiles')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowMenu(false); router.push("/(tabs)/profile"); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: colors.text }}>{t('profile')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowMenu(false); logout(); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: colors.text }}>{t('logout')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={{ textAlign: "center", color: colors.textSecondary, marginBottom: 16 }}>
          {t('totalPoints')} & {t('niyamProgress')}
        </Text>

        {/* ── Action buttons row ── */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={exportHardcopyPdf}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.card }}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>{t('downloadBlankCopy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={shareProgress}
            style={{ borderWidth: 1, borderColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.accent }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>📤 {t('shareProgress')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading summary...</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {/* ── Total Points Card ── */}
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, backgroundColor: colors.card }}>
              <Text style={{ fontSize: 16, marginBottom: 4, color: colors.text }}>{t('totalPoints')}</Text>
              <Text style={{ fontSize: 30, fontWeight: "700", color: colors.text }}>{totalPoints}</Text>
            </View>

            {/* ── Weekly Progress Chart ── */}
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, backgroundColor: colors.card }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 12 }}>
                📊 {t('last7Days')}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120 }}>
                {weeklyData.map((day) => {
                  const barHeight = maxWeeklyPoints > 0 ? Math.max((day.points / maxWeeklyPoints) * 100, day.points > 0 ? 8 : 2) : 2;
                  return (
                    <View key={day.dateKey} style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>
                        {day.points > 0 ? day.points : ""}
                      </Text>
                      <View
                        style={{
                          width: 20,
                          height: barHeight,
                          backgroundColor: day.points > 0 ? colors.accent : colors.border,
                          borderRadius: 4,
                        }}
                      />
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                        {day.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── Niyam Progress Table ── */}
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, backgroundColor: colors.card }}>
              <Text style={{ fontSize: 16, marginBottom: 8, color: colors.text }}>{t('niyamProgress')}</Text>

              {/* ── Sort buttons ── */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                {(["serial", "days", "alpha", "points"] as const).map((key) => {
                  const labels = { serial: t('serialNo'), days: t('days'), alpha: t('az'), points: t('maxPoints') };
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setSortBy(key)}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: sortBy === key ? "#1e293b" : colors.card,
                      }}
                    >
                      <Text style={{ color: sortBy === key ? "#fff" : colors.text }}>{labels[key]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden" }}>
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: colors.tableHeaderBg,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                  }}
                >
                  <Text style={{ width: "10%", fontWeight: "700", color: colors.text }}>{t('sr')}</Text>
                  <Text style={{ width: "45%", fontWeight: "700", color: colors.text }}>{t('niyam')}</Text>
                  <Text style={{ width: "20%", fontWeight: "700", textAlign: "center", color: colors.text }}>{t('days')}</Text>
                  <Text style={{ width: "25%", fontWeight: "700", textAlign: "center", color: colors.text }}>{t('totalPts')}</Text>
                </View>

                {sortedNiyams.map((item, index) => {
                  const doneDays = niyamProgress[item.key] || 0;
                  const earnedPoints = doneDays * item.points;
                  return (
                    <View
                      key={item.key}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                      }}
                    >
                      <Text style={{ width: "10%", color: colors.text }}>{index + 1}</Text>
                      <View style={{ width: "45%" }}>
                        <Text style={{ fontSize: 15, color: colors.text }}>{item.gu}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{item.en}</Text>
                      </View>
                      <Text style={{ width: "20%", textAlign: "center", color: colors.text }}>
                        {doneDays}/{totalDaysTracked}
                      </Text>
                      <Text style={{ width: "25%", textAlign: "center", fontWeight: "600", color: colors.text }}>
                        {earnedPoints}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
