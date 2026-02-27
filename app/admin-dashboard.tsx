import { useTheme } from "@/components/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { clearAdminSession, isAdminSessionValid } from "@/lib/admin-auth";
import { listCloudAccounts } from "@/lib/cloud-accounts";
import { getCloudProgressByAccount } from "@/lib/cloud-progress";

type StoredAccount = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender?: string;
  fullName: string;
  dob: string;
  phoneNumber: string;
};

type AccountOption = {
  accountKey: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
  totalPoints: number;
};

const storageSeparator = "::";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function getAccountKey(phoneNumber: string, dob: string): string {
  return `${normalizePhone(phoneNumber)}|${dob.trim()}`;
}

function getScopedProgressKey(
  prefix: "aaradhana" | "points" | "submitted",
  accountKey: string,
  dateKey: string,
): string {
  return `${prefix}${storageSeparator}${accountKey}${storageSeparator}${dateKey}`;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

async function getPointsForDate(accountKey: string, dateKey: string): Promise<number> {
  const saved = await AsyncStorage.getItem(getScopedProgressKey("points", accountKey, dateKey));
  if (saved === null) return 0;
  const parsed = Number(saved);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountKey, setSelectedAccountKey] = useState("");
  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [usersGenderFilter, setUsersGenderFilter] = useState<"All" | "Male" | "Female">("All");
  const [leaderboardGenderFilter, setLeaderboardGenderFilter] = useState<"All" | "Male" | "Female">("All");
  const [todaySubmittedCount, setTodaySubmittedCount] = useState(0);
  const [avgPoints, setAvgPoints] = useState(0);

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.accountKey === selectedAccountKey) || null,
    [accounts, selectedAccountKey],
  );

  const leaderboard = useMemo(
    () => [...accounts].sort((a, b) => b.totalPoints - a.totalPoints),
    [accounts],
  );

  const filteredUsers = useMemo(
    () =>
      usersGenderFilter === "All"
        ? accounts
        : accounts.filter((account) => account.gender === usersGenderFilter),
    [accounts, usersGenderFilter],
  );

  const filteredLeaderboard = useMemo(
    () =>
      leaderboardGenderFilter === "All"
        ? leaderboard
        : leaderboard.filter((account) => account.gender === leaderboardGenderFilter),
    [leaderboard, leaderboardGenderFilter],
  );

  const loadAccounts = useCallback(async () => {
    const raw = await AsyncStorage.getItem("accounts");
    let stored: StoredAccount[] = raw ? JSON.parse(raw) : [];
    try {
      const cloudAccounts = await listCloudAccounts();
      if (cloudAccounts.length > 0) {
        stored = cloudAccounts;
        await AsyncStorage.setItem("accounts", JSON.stringify(cloudAccounts));
      }
    } catch {
      // Continue with local cache if cloud list is unavailable.
    }
    const todayKey = getLocalDateKey();

    let submittedToday = 0;
    let totalPtsAll = 0;

    const options = await Promise.all(
      stored.map(async (account) => {
        const accountKey = getAccountKey(account.phoneNumber, account.dob);
        let totalPoints = 0;
        let submittedTodayForAccount = false;
        try {
          const cloudProgress = await getCloudProgressByAccount(accountKey);
          if (cloudProgress.length > 0) {
            totalPoints = cloudProgress.reduce((sum, row) => sum + (row.points || 0), 0);
            submittedTodayForAccount = cloudProgress.some(
              (row) => row.dateKey === todayKey && !!row.submitted,
            );
          } else {
            const dates = await getAllDateKeysWithData(accountKey);
            const points = await Promise.all(
              dates.map((dateKey) => getPointsForDate(accountKey, dateKey)),
            );
            totalPoints = points.reduce((sum, value) => sum + value, 0);
            const submittedFlag = await AsyncStorage.getItem(
              getScopedProgressKey("submitted", accountKey, todayKey),
            );
            submittedTodayForAccount = submittedFlag === "true";
          }
        } catch {
          const dates = await getAllDateKeysWithData(accountKey);
          const points = await Promise.all(
            dates.map((dateKey) => getPointsForDate(accountKey, dateKey)),
          );
          totalPoints = points.reduce((sum, value) => sum + value, 0);
          const submittedFlag = await AsyncStorage.getItem(
            getScopedProgressKey("submitted", accountKey, todayKey),
          );
          submittedTodayForAccount = submittedFlag === "true";
        }
        totalPtsAll += totalPoints;

        if (submittedTodayForAccount) submittedToday++;

        return {
          accountKey,
          name:
            account.fullName ||
            `${account.firstName} ${account.middleName} ${account.lastName}`.replace(/\s+/g, " ").trim(),
          phone: account.phoneNumber,
          dob: account.dob,
          gender: account.gender || "Not set",
          totalPoints,
        };
      }),
    );

    setAccounts(options);
    setTodaySubmittedCount(submittedToday);
    setAvgPoints(options.length > 0 ? Math.round(totalPtsAll / options.length) : 0);
    if (!selectedAccountKey && options[0]) {
      setSelectedAccountKey(options[0].accountKey);
    }
  }, [selectedAccountKey]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!(await isAdminSessionValid())) {
          router.replace("/login");
          return;
        }
        await loadAccounts();
      };
      load();
    }, [loadAccounts, router]),
  );

  const logoutAdmin = async () => {
    await clearAdminSession();
    router.replace("/login");
  };

  const continueToActions = async () => {
    if (!selectedAccountKey) return;
    await AsyncStorage.setItem("adminSelectedAccountKey", selectedAccountKey);
    router.push("/admin-account-actions");
  };

  const exportUsersCsv = async () => {
    if (accounts.length === 0) {
      Alert.alert("No data", "No users available to export.");
      return;
    }
    const lines = [
      "Name,Gender,Phone,DOB,TotalPoints",
      ...accounts.map((account) =>
        [
          escapeCsv(account.name),
          escapeCsv(account.gender),
          escapeCsv(account.phone),
          escapeCsv(account.dob),
          String(account.totalPoints),
        ].join(","),
      ),
    ];
    const csv = `${lines.join("\n")}\n`;
    const uri = `${FileSystem.documentDirectory}users-list-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Share.share({
      message: `Users list exported.\nFile: ${uri}`,
      url: uri,
    });
  };

  const exportLeaderboardCsv = async () => {
    if (leaderboard.length === 0) {
      Alert.alert("No data", "No leaderboard data to export.");
      return;
    }
    const lines = [
      "Rank,Name,Gender,Phone,DOB,TotalPoints",
      ...leaderboard.map((account, index) =>
        [
          String(index + 1),
          escapeCsv(account.name),
          escapeCsv(account.gender),
          escapeCsv(account.phone),
          escapeCsv(account.dob),
          String(account.totalPoints),
        ].join(","),
      ),
    ];
    const csv = `${lines.join("\n")}\n`;
    const uri = `${FileSystem.documentDirectory}leaderboard-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Share.share({
      message: `Leaderboard exported.\nFile: ${uri}`,
      url: uri,
    });
  };

  const sendBulkNotification = async () => {
    if (accounts.length === 0) {
      Alert.alert("No users", "No registered users to notify.");
      return;
    }
    const message = `🙏 Jai Jinendra!\n\nDaily Reminder: Fill your today's niyam in Samarpanam app.\n\nદૈનિક રિમાઇન્ડર: આજનું નિયમ Samarpanam એપમાં ભરો.\n\n— Admin`;
    try {
      await Share.share({ message });
    } catch { /* ignore */ }
  };

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 24 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <Text style={{ fontSize: 22, color: colors.text }}>Admin Dashboard</Text>
          <TouchableOpacity
            onPress={logoutAdmin}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: colors.text }}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ── Analytics Cards ── */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{accounts.length}</Text>
            <Text style={s.statLabel}>Total Users</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{todaySubmittedCount}</Text>
            <Text style={s.statLabel}>Submitted Today</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{avgPoints}</Text>
            <Text style={s.statLabel}>Avg Points/User</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{leaderboard[0]?.totalPoints || 0}</Text>
            <Text style={s.statLabel}>Top Score</Text>
          </View>
        </View>

        {/* ── Bulk Notification ── */}
        <TouchableOpacity
          onPress={sendBulkNotification}
          style={{
            backgroundColor: "#16a34a",
            borderRadius: 10,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 15 }}>
            📢 Send Bulk Reminder (Share)
          </Text>
        </TouchableOpacity>

        {/* ── Edit Admin Credentials ── */}
        <TouchableOpacity
          onPress={() => router.push("/admin-credentials")}
          style={s.adminCredentialsButton}
        >
          <Text style={s.adminCredentialsButtonText}>Edit Admin Credentials</Text>
        </TouchableOpacity>

        {/* ── Select Account ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Select Account</Text>
          <TouchableOpacity
            onPress={() => setShowAccountOptions((prev) => !prev)}
            style={s.selector}
          >
            <Text style={{ color: colors.text }}>
              {selectedAccount
                ? `${selectedAccount.name} (${selectedAccount.phone})`
                : accounts.length === 0
                  ? "No accounts available"
                  : "Choose account"}
            </Text>
          </TouchableOpacity>
          {showAccountOptions &&
            accounts.map((account) => (
              <TouchableOpacity
                key={account.accountKey}
                onPress={() => {
                  setSelectedAccountKey(account.accountKey);
                  setShowAccountOptions(false);
                }}
                style={s.option}
              >
                <Text style={{ fontWeight: "600", color: colors.text }}>{account.name}</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                  {account.gender} | {account.phone} | {account.dob}
                </Text>
              </TouchableOpacity>
            ))}

          <TouchableOpacity
            onPress={continueToActions}
            disabled={!selectedAccountKey}
            style={{
              marginTop: 12,
              backgroundColor: selectedAccountKey ? "#1e293b" : "#9ca3af",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── List of Users ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>List of Users</Text>
          <TouchableOpacity
            onPress={() => setShowUsersList((prev) => !prev)}
            style={s.toggleButton}
          >
            <Text style={s.toggleButtonText}>
              {showUsersList ? "Hide List of Users" : "Show List of Users"}
            </Text>
          </TouchableOpacity>
          {showUsersList && (
            <>
              <TouchableOpacity onPress={exportUsersCsv} style={s.exportButton}>
                <Text style={s.exportButtonText}>Export Users File - CSV</Text>
              </TouchableOpacity>
              <View style={s.filterRow}>
                {(["All", "Male", "Female"] as const).map((filter) => (
                  <TouchableOpacity
                    key={`users-${filter}`}
                    onPress={() => setUsersGenderFilter(filter)}
                    style={[
                      s.filterChip,
                      usersGenderFilter === filter && s.filterChipActive,
                    ]}
                  >
                    <Text
                      style={
                        usersGenderFilter === filter
                          ? s.filterChipTextActive
                          : s.filterChipText
                      }
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {filteredUsers.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>No users found.</Text>
              ) : (
                <>
                  <View style={s.tableHeaderRow}>
                    <Text style={[s.tableHeaderText, { width: "33%" }]}>Name</Text>
                    <Text style={[s.tableHeaderText, { width: "17%", textAlign: "center" }]}>Gender</Text>
                    <Text style={[s.tableHeaderText, { width: "28%", textAlign: "center" }]}>Phone</Text>
                    <Text style={[s.tableHeaderText, { width: "22%", textAlign: "right" }]}>DOB</Text>
                  </View>
                  {filteredUsers.map((account, index) => (
                    <View
                      key={`user-${account.accountKey}`}
                      style={[
                        s.tableRow,
                        index === 0 && { borderTopWidth: 0 },
                      ]}
                    >
                      <Text style={{ width: "33%", color: colors.text }}>{account.name}</Text>
                      <Text style={{ width: "17%", textAlign: "center", color: colors.textSecondary }}>{account.gender}</Text>
                      <Text style={{ width: "28%", textAlign: "center", color: colors.textSecondary }}>{account.phone}</Text>
                      <Text style={{ width: "22%", textAlign: "right", color: colors.textSecondary }}>{account.dob}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* ── Leaderboard ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Leaderboard</Text>
          <TouchableOpacity
            onPress={() => setShowLeaderboard((prev) => !prev)}
            style={s.toggleButton}
          >
            <Text style={s.toggleButtonText}>
              {showLeaderboard ? "Hide Leaderboard" : "Show Leaderboard"}
            </Text>
          </TouchableOpacity>
          {showLeaderboard && (
            <>
              <TouchableOpacity onPress={exportLeaderboardCsv} style={s.exportButton}>
                <Text style={s.exportButtonText}>Export Leaderboard - CSV</Text>
              </TouchableOpacity>
              <View style={s.filterRow}>
                {(["All", "Male", "Female"] as const).map((filter) => (
                  <TouchableOpacity
                    key={`lb-${filter}`}
                    onPress={() => setLeaderboardGenderFilter(filter)}
                    style={[
                      s.filterChip,
                      leaderboardGenderFilter === filter && s.filterChipActive,
                    ]}
                  >
                    <Text
                      style={
                        leaderboardGenderFilter === filter
                          ? s.filterChipTextActive
                          : s.filterChipText
                      }
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {filteredLeaderboard.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>No leaderboard data yet.</Text>
              ) : (
                <>
                  <View style={s.tableHeaderRow}>
                    <Text style={[s.tableHeaderText, { width: "14%" }]}>Rank</Text>
                    <Text style={[s.tableHeaderText, { width: "46%" }]}>Name</Text>
                    <Text style={[s.tableHeaderText, { width: "20%", textAlign: "center" }]}>Gender</Text>
                    <Text style={[s.tableHeaderText, { width: "20%", textAlign: "right" }]}>Points</Text>
                  </View>
                  {filteredLeaderboard.map((account, index) => (
                    <View
                      key={`lb-${account.accountKey}`}
                      style={[
                        s.tableRow,
                        index === 0 && { borderTopWidth: 0 },
                      ]}
                    >
                      <Text style={{ width: "14%", color: colors.text }}>{index + 1}</Text>
                      <Text style={{ width: "46%", color: colors.text }}>{account.name}</Text>
                      <Text style={{ width: "20%", textAlign: "center", color: colors.textSecondary }}>{account.gender}</Text>
                      <Text style={{ width: "20%", textAlign: "right", fontWeight: "700", color: colors.text }}>
                        {account.totalPoints}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return {
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      backgroundColor: colors.card,
    } as const,
    cardTitle: {
      fontSize: 17,
      fontWeight: "700" as const,
      marginBottom: 8,
      color: colors.text,
    },
    statCard: {
      flex: 1,
      minWidth: "45%" as unknown as number,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      backgroundColor: colors.card,
      alignItems: "center" as const,
    },
    statValue: {
      fontSize: 26,
      fontWeight: "800" as const,
      color: colors.accent,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    selector: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      backgroundColor: colors.inputBg,
    } as const,
    option: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      marginTop: 8,
      backgroundColor: colors.inputBg,
    } as const,
    toggleButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      marginBottom: 10,
      backgroundColor: colors.inputBg,
    } as const,
    toggleButtonText: {
      textAlign: "center" as const,
      fontWeight: "700" as const,
      color: colors.text,
    },
    exportButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 10,
      marginBottom: 10,
      backgroundColor: colors.inputBg,
    } as const,
    exportButtonText: {
      textAlign: "center" as const,
      fontWeight: "700" as const,
      color: colors.text,
    },
    filterRow: {
      flexDirection: "row" as const,
      gap: 8,
      marginBottom: 10,
    },
    filterChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: colors.inputBg,
    } as const,
    filterChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterChipText: {
      color: colors.text,
      fontWeight: "600" as const,
    },
    filterChipTextActive: {
      color: "#fff",
      fontWeight: "600" as const,
    },
    tableHeaderRow: {
      flexDirection: "row" as const,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 6,
      marginBottom: 2,
    },
    tableHeaderText: {
      fontWeight: "700" as const,
      color: colors.text,
      fontSize: 12,
    },
    tableRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 7,
    },
    adminCredentialsButton: {
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 10,
      backgroundColor: colors.inputBg,
    } as const,
    adminCredentialsButtonText: {
      textAlign: "center" as const,
      color: colors.text,
      fontWeight: "700" as const,
    },
  };
}
