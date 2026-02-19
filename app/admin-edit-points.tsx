import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getNiyamListForDob, type NiyamItem } from "@/constants/niyams";

type StoredAccount = {
  firstName: string;
  middleName: string;
  lastName: string;
  gender?: string;
  fullName: string;
  dob: string;
  phoneNumber: string;
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

function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateKey(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function formatDisplayDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}-${month}-${year}`;
}

function getMonthLabel(year: number, monthIndex: number): string {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${monthNames[monthIndex]} ${year}`;
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

export default function AdminEditPointsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ accountKey?: string }>();
  const rawParam = Array.isArray(params.accountKey) ? params.accountKey[0] : params.accountKey;
  const accountKeyFromParam = rawParam ? decodeURIComponent(rawParam) : "";
  const [resolvedAccountKey, setResolvedAccountKey] = useState("");

  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [dateKeys, setDateKeys] = useState<string[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [showDates, setShowDates] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const selectedAccount = useMemo(
    () =>
      accounts.find((account) => getAccountKey(account.phoneNumber, account.dob) === resolvedAccountKey) ||
      null,
    [accounts, resolvedAccountKey],
  );

  const niyamList = useMemo<NiyamItem[]>(
    () => (selectedAccount ? getNiyamListForDob(selectedAccount.dob) : []),
    [selectedAccount],
  );

  const points = niyamList.reduce(
    (sum, item) => sum + (checklist[item.key] ? item.points : 0),
    0,
  );

  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const firstDayOfMonth = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calendarCells = [
    ...Array.from({ length: firstDayOfMonth }, () => 0),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const loadAll = useCallback(async (selectedKey: string) => {
    const raw = await AsyncStorage.getItem("accounts");
    const stored: StoredAccount[] = raw ? JSON.parse(raw) : [];
    setAccounts(stored);
    const dates = await getAllDateKeysWithData(selectedKey);
    setDateKeys([...dates].sort((a, b) => b.localeCompare(a)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const session = await AsyncStorage.getItem("adminSession");
        if (session !== "true") {
          router.replace("/login");
          return;
        }
        const selectedKey =
          accountKeyFromParam || (await AsyncStorage.getItem("adminSelectedAccountKey")) || "";
        if (!selectedKey) {
          router.replace("/admin-dashboard");
          return;
        }
        setResolvedAccountKey(selectedKey);
        await AsyncStorage.setItem("adminSelectedAccountKey", selectedKey);
        await loadAll(selectedKey);
      };
      load();
    }, [accountKeyFromParam, loadAll, router]),
  );

  const loadChecklist = async (dateKey: string) => {
    if (!resolvedAccountKey) return;
    const raw = await AsyncStorage.getItem(
      getScopedProgressKey("aaradhana", resolvedAccountKey, dateKey),
    );
    if (!raw) {
      setChecklist({});
      return;
    }
    try {
      setChecklist(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      setChecklist({});
    }
  };

  const selectDate = async (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setShowDates(false);
    await loadChecklist(dateKey);
  };

  const selectCalendarDate = async (day: number) => {
    const chosen = formatDateKey(calendarYear, calendarMonthIndex + 1, day);
    if (chosen > getLocalDateKey()) return;
    setSelectedDateKey(chosen);
    setShowCalendar(false);
    if (!dateKeys.includes(chosen)) {
      setDateKeys((prev) => [...prev, chosen].sort((a, b) => b.localeCompare(a)));
    }
    await loadChecklist(chosen);
  };

  const toggleNiyam = (key: string) => {
    setChecklist((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const saveChecklist = async () => {
    if (!resolvedAccountKey || !selectedDateKey) {
      Alert.alert("Select date", "Please select a date first.");
      return;
    }
    await AsyncStorage.multiSet([
      [
        getScopedProgressKey("aaradhana", resolvedAccountKey, selectedDateKey),
        JSON.stringify(checklist),
      ],
      [getScopedProgressKey("points", resolvedAccountKey, selectedDateKey), String(points)],
    ]);
    Alert.alert("Saved", "Niyam selection and points updated.");
  };

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
          <Text style={{ fontSize: 22, color: "#0f172a" }}>Edit Points</Text>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text>
            {selectedAccount
              ? selectedAccount.fullName ||
                `${selectedAccount.firstName} ${selectedAccount.middleName} ${selectedAccount.lastName}`.replace(
                  /\s+/g,
                  " ",
                )
              : "Not found"}
          </Text>
          {selectedAccount ? (
            <Text style={{ color: "#6b7280", marginTop: 2 }}>
              {selectedAccount.phoneNumber} | {selectedAccount.dob}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Date</Text>
          <TouchableOpacity
            onPress={() => setShowDates((prev) => !prev)}
            style={styles.selector}
          >
            <Text>{selectedDateKey ? formatDisplayDate(selectedDateKey) : "Choose existing date"}</Text>
          </TouchableOpacity>
          {showDates &&
            dateKeys.map((dateKey) => (
              <TouchableOpacity
                key={dateKey}
                onPress={() => selectDate(dateKey)}
                style={styles.option}
              >
                <Text>{formatDisplayDate(dateKey)}</Text>
              </TouchableOpacity>
            ))}

          <TouchableOpacity
            onPress={() => setShowCalendar((prev) => !prev)}
            style={[styles.selector, { marginTop: 10, borderColor: "#ea580c" }]}
          >
            <Text style={{ color: "#0f172a", fontWeight: "600" }}>
              {showCalendar ? "Close Calendar" : "Pick Any Date (Calendar)"}
            </Text>
          </TouchableOpacity>

          {showCalendar && (
            <View style={styles.calendarBox}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))}>
                  <Text style={{ fontSize: 18 }}>{"<"}</Text>
                </TouchableOpacity>
                <Text>{getMonthLabel(calendarYear, calendarMonthIndex)}</Text>
                <TouchableOpacity onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))}>
                  <Text style={{ fontSize: 18 }}>{">"}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {weekdayLabels.map((label) => (
                  <Text
                    key={label}
                    style={{ width: "14.28%", textAlign: "center", marginBottom: 6 }}
                  >
                    {label}
                  </Text>
                ))}
                {calendarCells.map((day, index) => {
                  if (day === 0) {
                    return <View key={`empty-${index}`} style={{ width: "14.28%", height: 34 }} />;
                  }
                  const dateKey = formatDateKey(calendarYear, calendarMonthIndex + 1, day);
                  const isFuture = dateKey > getLocalDateKey();
                  const isSelected = dateKey === selectedDateKey;
                  return (
                    <TouchableOpacity
                      key={dateKey}
                      onPress={() => selectCalendarDate(day)}
                      disabled={isFuture}
                      style={{
                        width: "14.28%",
                        height: 34,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: isSelected ? "#1e293b" : "transparent",
                        borderRadius: 6,
                        opacity: isFuture ? 0.35 : 1,
                      }}
                    >
                      <Text style={{ color: isSelected ? "#fff" : "#000" }}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Edit Niyam Checklist</Text>
          {!selectedDateKey ? (
            <Text style={{ color: "#6b7280" }}>Select date to edit niyams.</Text>
          ) : (
            <>
              <Text style={{ marginBottom: 10, fontWeight: "700" }}>
                {formatDisplayDate(selectedDateKey)} Points: {points}
              </Text>
              {niyamList.map((item, index) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => toggleNiyam(item.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: "#eef2f9",
                  }}
                >
                  <Text style={{ width: "8%" }}>{index + 1}</Text>
                  <View style={{ width: "62%" }}>
                    <Text style={{ color: "#0f172a" }}>{item.gu}</Text>
                    <Text style={{ color: "#6b7280", fontSize: 12 }}>{item.en}</Text>
                  </View>
                  <Text style={{ width: "12%", textAlign: "center" }}>{item.points}</Text>
                  <View style={{ width: "18%", alignItems: "center" }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderWidth: 1,
                        borderColor: "#ea580c",
                        borderRadius: 5,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: checklist[item.key] ? "#1e293b" : "#fff",
                      }}
                    >
                      {checklist[item.key] ? <Text style={{ color: "#fff" }}>X</Text> : null}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={saveChecklist}
                style={{
                  marginTop: 12,
                  backgroundColor: "#ea580c",
                  padding: 12,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
                  Save Niyam Changes
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  card: {
    borderWidth: 1,
    borderColor: "#dbe3ee",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 8,
    color: "#0f172a",
  },
  selector: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f8fafc",
  },
  option: {
    borderWidth: 1,
    borderColor: "#dbe3ee",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    backgroundColor: "#f8fafc",
  },
  calendarBox: {
    borderWidth: 1,
    borderColor: "#dbe3ee",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    backgroundColor: "#f8fafc",
  },
};

