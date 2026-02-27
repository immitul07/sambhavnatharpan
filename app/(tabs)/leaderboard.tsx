import { useLanguage } from "@/components/LanguageContext";
import { useTheme } from "@/components/ThemeContext";
import {
  getAgeGroupFromDob,
  getAgeGroupLabel,
  getNiyamListForDob,
  type NiyamItem,
} from "@/constants/niyams";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listCloudAccounts } from "@/lib/cloud-accounts";
import { getCloudProgressByAccount } from "@/lib/cloud-progress";

const storageSeparator = "::";

type StoredAccount = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender?: string;
  fullName: string;
  dob: string;
  phoneNumber: string;
  hotiNo?: string;
};

type LeaderboardEntry = {
  name: string;
  totalPoints: number;
  isCurrentUser: boolean;
};

function normalizePhone(value: string): string {
  return (value || "").replace(/\D/g, "");
}

function getAccountKey(phoneNumber: string, dob: string): string {
  return `${normalizePhone(phoneNumber)}|${(dob || "").trim()}`;
}

function getScopedProgressKey(
  prefix: "aaradhana" | "points" | "submitted",
  accountKey: string,
  dateKey: string,
): string {
  return `${prefix}${storageSeparator}${accountKey}${storageSeparator}${dateKey}`;
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

async function getPointsForDate(
  accountKey: string,
  dateKey: string,
  niyamList: NiyamItem[],
): Promise<number> {
  const savedPoints = await AsyncStorage.getItem(getScopedProgressKey("points", accountKey, dateKey));
  if (savedPoints !== null) {
    const parsed = Number(savedPoints);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const savedChecklist = await AsyncStorage.getItem(getScopedProgressKey("aaradhana", accountKey, dateKey));
  if (!savedChecklist) return 0;
  try {
    const parsed = JSON.parse(savedChecklist) as Record<string, boolean>;
    return niyamList.reduce((sum, item) => sum + (parsed[item.key] ? item.points : 0), 0);
  } catch {
    return 0;
  }
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [hotiLabel, setHotiLabel] = useState("");
  const [ageGroupLabel, setAgeGroupLabel] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    const currentHoti =
      (await AsyncStorage.getItem("villageCode")) ||
      (await AsyncStorage.getItem("hotiNo")) || "";
    setHotiLabel(currentHoti);

    const currentPhone = (await AsyncStorage.getItem("phoneNumber")) || "";
    const currentDob = (await AsyncStorage.getItem("dob")) || "";
    const currentAccountKey = getAccountKey(currentPhone, currentDob);
    const currentAgeGroup = getAgeGroupFromDob(currentDob);
    setAgeGroupLabel(getAgeGroupLabel(currentAgeGroup));

    const raw = await AsyncStorage.getItem("accounts");
    let accounts: StoredAccount[] = raw ? (JSON.parse(raw) as StoredAccount[]) : [];
    try {
      const cloudAccounts = await listCloudAccounts();
      if (cloudAccounts.length > 0) {
        accounts = cloudAccounts;
        await AsyncStorage.setItem("accounts", JSON.stringify(cloudAccounts));
      }
    } catch {
      // Continue with local cache if cloud list is unavailable.
    }

    // Filter accounts by hotiNo matching the current user's hoti
    const sameHotiAccounts = currentHoti
      ? accounts.filter((acc) => {
          const accHoti = (acc.hotiNo || "").trim();
          return accHoti === currentHoti || getAccountKey(acc.phoneNumber, acc.dob) === currentAccountKey;
        })
      : accounts;
    const sameAgeGroupAccounts = sameHotiAccounts.filter(
      (acc) => getAgeGroupFromDob(acc.dob) === currentAgeGroup,
    );

    const leaderboardPromises = sameAgeGroupAccounts.map(async (acc) => {
        const accKey = getAccountKey(acc.phoneNumber, acc.dob);
        let total = 0;
        try {
          const cloudProgress = await getCloudProgressByAccount(accKey);
          if (cloudProgress.length > 0) {
            total = cloudProgress.reduce((sum, row) => sum + (row.points || 0), 0);
          } else {
            const niyamList = getNiyamListForDob(acc.dob);
            const dateKeys = await getAllDateKeysWithData(accKey);
            const pointsArr = await Promise.all(
              dateKeys.map((dk) => getPointsForDate(accKey, dk, niyamList)),
            );
            total = pointsArr.reduce((sum, p) => sum + p, 0);
          }
        } catch {
          const niyamList = getNiyamListForDob(acc.dob);
          const dateKeys = await getAllDateKeysWithData(accKey);
          const pointsArr = await Promise.all(
            dateKeys.map((dk) => getPointsForDate(accKey, dk, niyamList)),
          );
          total = pointsArr.reduce((sum, p) => sum + p, 0);
        }
        return {
          name: acc.fullName || `${acc.firstName || ""} ${acc.middleName || ""} ${acc.lastName || ""}`.trim(),
          totalPoints: total,
          isCurrentUser: accKey === currentAccountKey,
        };
      });

    const results = await Promise.all(leaderboardPromises);
    results.sort((a, b) => b.totalPoints - a.totalPoints);
    setEntries(results);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadLeaderboard(); }, [loadLeaderboard]));

  const logout = async () => {
    await AsyncStorage.multiRemove([
      "firstName", "middleName", "lastName", "gender",
      "userName", "dateOfBirth", "dob", "hotiNo", "villageCode",
      "profilePhoto", "photoUri", "phoneNumber", "address",
      "activeAccountKey", "adminSession", "adminSelectedAccountKey",
    ]);
    router.replace("/login");
  };

  const medalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 24 }}>
        {/* ── Header ── */}
        <View style={{ position: "relative", marginBottom: 14 }}>
          <Text style={{ fontSize: 22, textAlign: "center", color: colors.text }}>
            {t('leaderboard')}
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

        {hotiLabel ? (
          <Text style={{ textAlign: "center", color: colors.textSecondary, marginBottom: 16 }}>
            Hoti: {hotiLabel}
          </Text>
        ) : null}
        {ageGroupLabel ? (
          <Text style={{ textAlign: "center", color: colors.textSecondary, marginBottom: 16 }}>
            Age Group: {ageGroupLabel}
          </Text>
        ) : null}

        {loading ? (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading...</Text>
          </View>
        ) : entries.length === 0 ? (
          <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 40 }}>
            No data yet
          </Text>
        ) : (
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: "hidden", backgroundColor: colors.card }}>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: colors.tableHeaderBg,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ width: "15%", fontWeight: "700", color: colors.text }}>{t('ranks')}</Text>
              <Text style={{ width: "55%", fontWeight: "700", color: colors.text }}>{t('name')}</Text>
              <Text style={{ width: "30%", fontWeight: "700", textAlign: "right", color: colors.text }}>{t('points')}</Text>
            </View>

            {entries.map((entry, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  backgroundColor: entry.isCurrentUser ? (colors.accent + "15") : "transparent",
                }}
              >
                <Text style={{ width: "15%", fontSize: 16, color: colors.text }}>{medalEmoji(index + 1)}</Text>
                <Text style={{ width: "55%", fontSize: 14, color: colors.text, fontWeight: entry.isCurrentUser ? "700" : "400" }}>
                  {entry.name} {entry.isCurrentUser ? "(You)" : ""}
                </Text>
                <Text style={{ width: "30%", textAlign: "right", fontSize: 16, fontWeight: "700", color: colors.text }}>
                  {entry.totalPoints}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
