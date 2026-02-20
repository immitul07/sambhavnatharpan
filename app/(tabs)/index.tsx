import { useLanguage } from "@/components/LanguageContext";
import { useTheme } from "@/components/ThemeContext";
import { getNiyamListForDob, NIYAM_LIST, type NiyamItem } from "@/constants/niyams";
import { getDailySuvichar } from "@/constants/suvichar";
import { upsertCloudProgress } from "@/lib/cloud-progress";
import { scheduleDailyReminder } from "@/lib/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Event date for countdown ──
const DHWAJA_AROHAN_DATE = new Date(2026, 11, 19); // Dec 19, 2026

function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
  if (!phoneNumber || !dob) {
    return "";
  }

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
      migratedEntries.push([
        getScopedProgressKey("aaradhana", accountKey, dateKey),
        value,
      ]);
      return;
    }

    if (legacyKey.startsWith("points-")) {
      const dateKey = legacyKey.replace("points-", "");
      migratedEntries.push([getScopedProgressKey("points", accountKey, dateKey), value]);
      return;
    }

    if (legacyKey.startsWith("submitted-")) {
      const dateKey = legacyKey.replace("submitted-", "");
      migratedEntries.push([
        getScopedProgressKey("submitted", accountKey, dateKey),
        value,
      ]);
    }
  });

  if (migratedEntries.length > 0) {
    await AsyncStorage.multiSet(migratedEntries);
  }
  await AsyncStorage.multiRemove(legacyKeys);
  await AsyncStorage.setItem(legacyMigrationFlagKey, "true");
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
    if (value === "true") {
      submittedDates.add(key.slice(submittedPrefix.length));
    }
  });

  let streak = 0;
  const current = new Date();
  // Check today first; if not submitted yet, start from yesterday
  const todayKey = getLocalDateKey(current);
  let startDate = submittedDates.has(todayKey) ? current : new Date(current.getTime() - 86400000);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(startDate.getTime() - i * 86400000);
    const checkKey = getLocalDateKey(checkDate);
    if (submittedDates.has(checkKey)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ── Countdown helper ──
function getDaysUntilEvent(): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = DHWAJA_AROHAN_DATE.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [name, setName] = useState("");
  const [accountKey, setAccountKey] = useState("");
  const [checked, setChecked] = useState<{ [key: string]: boolean }>({});
  const [niyamList, setNiyamList] = useState<NiyamItem[]>(NIYAM_LIST);
  const [points, setPoints] = useState(0);
  const [isSubmittedForDate, setIsSubmittedForDate] = useState(false);
  const [streak, setStreak] = useState(0);

  const todayKey = getLocalDateKey();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const suvichar = getDailySuvichar();
  const daysUntilEvent = getDaysUntilEvent();

  const calculatePoints = (items: { [key: string]: boolean }) =>
    niyamList.reduce((sum, item) => {
      return sum + (items[item.key] ? item.points : 0);
    }, 0);

  const isWithinEditableWindow = (dateKey: string) => {
    const selected = new Date(`${dateKey}T00:00:00`);
    const today = new Date(`${todayKey}T00:00:00`);
    const diffMs = today.getTime() - selected.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 10;
  };

  const formatDisplayDate = (dateKey: string) => {
    const [year, month, day] = dateKey.split("-");
    return `${day}-${month}-${year}`;
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const getMonthLabel = (year: number, monthIndex: number) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${monthNames[monthIndex]} ${year}`;
  };

  const loadChecklistForDate = useCallback(
    async (
      dateKey: string,
      currentAccountKey: string,
      activeNiyamList: NiyamItem[],
      isActive: () => boolean = () => true,
    ) => {
      const checklistKey = getScopedProgressKey("aaradhana", currentAccountKey, dateKey);
      const pointsKey = getScopedProgressKey("points", currentAccountKey, dateKey);
      const submittedKey = getScopedProgressKey("submitted", currentAccountKey, dateKey);

      const savedChecklist = await AsyncStorage.getItem(checklistKey);
      const parsedChecklist = savedChecklist
        ? (JSON.parse(savedChecklist) as { [key: string]: boolean })
        : {};
      if (!isActive()) return;
      setChecked(parsedChecklist);

      const savedPoints = await AsyncStorage.getItem(pointsKey);
      if (!isActive()) return;
      if (savedPoints) {
        setPoints(Number(savedPoints) || 0);
      } else {
        const calculatedPoints = activeNiyamList.reduce(
          (sum, item) => sum + (parsedChecklist[item.key] ? item.points : 0),
          0,
        );
        setPoints(calculatedPoints);
        await AsyncStorage.setItem(pointsKey, String(calculatedPoints));
      }

      const submittedFlag = await AsyncStorage.getItem(submittedKey);
      if (!isActive()) return;
      setIsSubmittedForDate(submittedFlag === "true");
    },
    [],
  );

  useEffect(() => {
    let isActive = true;
    const loadData = async () => {
      const savedName = await AsyncStorage.getItem("userName");
      const savedHoti =
        (await AsyncStorage.getItem("villageCode")) ||
        (await AsyncStorage.getItem("hotiNo"));
      const resolvedAccountKey = await getAccountKeyFromStorage();

      if (!savedName || !savedHoti || !resolvedAccountKey) {
        if (isActive) {
          router.replace("/login");
        }
        return;
      }

      await migrateLegacyProgressData(resolvedAccountKey);
      const savedDob = (await AsyncStorage.getItem("dob")) || "";
      const resolvedNiyamList = getNiyamListForDob(savedDob);
      const initialDateKey = getLocalDateKey();
      if (!isActive) return;
      setNiyamList(resolvedNiyamList);
      setName(savedName);
      setAccountKey(resolvedAccountKey);
      setSelectedDate(initialDateKey);
      await loadChecklistForDate(initialDateKey, resolvedAccountKey, resolvedNiyamList, () => isActive);

      const currentStreak = await calculateStreak(resolvedAccountKey);
      if (!isActive) return;
      setStreak(currentStreak);

      // Schedule daily reminder notification
      try { await scheduleDailyReminder(); } catch { /* ignore if notification setup fails */ }
    };

    loadData();
    return () => {
      isActive = false;
    };
  }, [loadChecklistForDate, router]);

  useEffect(() => {
    let isActive = true;
    const loadForSelectedDate = async () => {
      if (!accountKey) return;
      await loadChecklistForDate(selectedDate, accountKey, niyamList, () => isActive);
    };
    loadForSelectedDate();
    return () => {
      isActive = false;
    };
  }, [selectedDate, accountKey, niyamList, loadChecklistForDate]);

  useEffect(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    setCalendarMonth(new Date(year, month - 1, 1));
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const resetToToday = async () => {
        if (!accountKey) return;
        const currentToday = getLocalDateKey();
        setSelectedDate(currentToday);
        setShowCalendar(false);
        await loadChecklistForDate(currentToday, accountKey, niyamList, () => isActive);
        const currentStreak = await calculateStreak(accountKey);
        if (!isActive) return;
        setStreak(currentStreak);
      };
      resetToToday();
      return () => {
        isActive = false;
      };
    }, [accountKey, loadChecklistForDate, niyamList]),
  );

  const toggleItem = async (key: string) => {
    if (!isWithinEditableWindow(selectedDate)) {
      Alert.alert("Date locked", "You can submit/edit only within 10 days from that date.");
      return;
    }

    if (isSubmittedForDate) {
      Alert.alert("Already submitted", "Details for this date are locked and cannot be changed.");
      return;
    }

    const updated = { ...checked, [key]: !checked[key] };
    const updatedPoints = calculatePoints(updated);
    setChecked(updated);
    setPoints(updatedPoints);
    if (!accountKey) return;
    await AsyncStorage.multiSet([
      [getScopedProgressKey("aaradhana", accountKey, selectedDate), JSON.stringify(updated)],
      [getScopedProgressKey("points", accountKey, selectedDate), String(updatedPoints)],
    ]);
    try {
      await upsertCloudProgress({
        accountKey,
        dateKey: selectedDate,
        checklist: updated,
        points: updatedPoints,
        submitted: isSubmittedForDate,
      });
    } catch {
      // Keep local progress working even if cloud sync fails.
    }
  };

  const submitDate = async () => {
    if (!isWithinEditableWindow(selectedDate)) {
      Alert.alert("Date locked", "You can submit/edit only within 10 days from that date.");
      return;
    }

    if (isSubmittedForDate) {
      Alert.alert("Already submitted", "This date is already locked.");
      return;
    }

    if (!accountKey) return;
    await AsyncStorage.setItem(
      getScopedProgressKey("submitted", accountKey, selectedDate),
      "true",
    );
    try {
      await upsertCloudProgress({
        accountKey,
        dateKey: selectedDate,
        checklist: checked,
        points,
        submitted: true,
      });
    } catch {
      // Keep submit flow working even if cloud sync fails.
    }
    setIsSubmittedForDate(true);
    const currentStreak = await calculateStreak(accountKey);
    setStreak(currentStreak);
    Alert.alert("Submitted", "This date is now locked and cannot be edited.");
  };

  const changeMonth = (offset: number) => {
    const next = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + offset,
      1,
    );
    setCalendarMonth(next);
  };

  const selectDate = (day: number) => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    const chosenDateKey = formatDateKey(year, month, day);
    if (chosenDateKey > todayKey) {
      return;
    }
    setSelectedDate(chosenDateKey);
    setShowCalendar(false);
  };

  const year = calendarMonth.getFullYear();
  const monthIndex = calendarMonth.getMonth();
  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calendarCells = [
    ...Array.from({ length: firstDayOfMonth }, () => 0),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const logout = async () => {
    await AsyncStorage.multiRemove([
      "firstName", "middleName", "lastName", "gender",
      "userName", "dateOfBirth", "dob", "hotiNo", "villageCode",
      "profilePhoto", "photoUri", "phoneNumber", "address",
      "activeAccountKey", "adminSession", "adminSelectedAccountKey",
    ]);
    router.replace("/login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 }}
      >
        {/* ── Header with menu ── */}
        <View style={{ position: "relative", marginBottom: 14 }}>
          <Text style={{ fontSize: 22, textAlign: "center", color: colors.text }}>
            {t('appTitle')}
          </Text>
          <TouchableOpacity
            onPress={() => setShowMenu((prev) => !prev)}
            style={{ position: "absolute", right: 0, top: 0, padding: 4 }}
          >
            <Text style={{ fontSize: 26, color: colors.text }}>☰</Text>
          </TouchableOpacity>
          {showMenu && (
            <View
              style={{
                position: "absolute",
                right: 0,
                top: 34,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingVertical: 6,
                width: 150,
                zIndex: 10,
              }}
            >
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

        {/* ── Countdown Timer ── */}
        <View
          style={{
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginBottom: 12,
            backgroundColor: daysUntilEvent <= 0 ? '#16a34a' : colors.accent,
            alignItems: "center",
          }}
        >
          {daysUntilEvent > 0 ? (
            <>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600", marginBottom: 2 }}>
                {t('countdownTitle')}
              </Text>
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>
                {daysUntilEvent} {t('days')}
              </Text>
            </>
          ) : daysUntilEvent === 0 ? (
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>
              {t('eventToday')}
            </Text>
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              {t('eventPassed')}
            </Text>
          )}
        </View>

        {/* ── Daily Suvichar ── */}
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.accent, marginBottom: 6 }}>
            🙏 {t('dailySuvichar')}
          </Text>
          <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>
            {lang === 'gu' ? suvichar.gu : suvichar.en}
          </Text>
        </View>

        {/* ── Streak + Name ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, flex: 1 }}>
            {name}
          </Text>
          {streak > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#fef3c7",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
              }}
            >
              <Text style={{ fontSize: 18 }}>🔥</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#92400e", marginLeft: 4 }}>
                {streak} {t('daysStreak')}
              </Text>
            </View>
          )}
        </View>

        {/* ── Date selector ── */}
        <Text style={{ marginBottom: 8, fontSize: 16, fontWeight: "600", color: colors.text }}>
          {t('selectDate')}
        </Text>
        <TouchableOpacity
          onPress={() => setShowCalendar((prev) => !prev)}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: 14,
            borderRadius: 14,
            marginBottom: 12,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ textAlign: "center", fontSize: 19, color: colors.text, fontWeight: "600" }}>
            {formatDisplayDate(selectedDate)}
          </Text>
        </TouchableOpacity>

        {/* ── Calendar ── */}
        {showCalendar && (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              padding: 12,
              marginBottom: 20,
              backgroundColor: colors.card,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Text style={{ fontSize: 18, color: colors.text }}>{"<"}</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text }}>{getMonthLabel(year, monthIndex)}</Text>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Text style={{ fontSize: 18, color: colors.text }}>{">"}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {weekdayLabels.map((label) => (
                <Text
                  key={label}
                  style={{
                    width: "14.28%",
                    textAlign: "center",
                    marginBottom: 6,
                    color: colors.textSecondary,
                  }}
                >
                  {label}
                </Text>
              ))}
              {calendarCells.map((day, index) => {
                if (day === 0) {
                  return (
                    <View key={`empty-${index}`} style={{ width: "14.28%", height: 34 }} />
                  );
                }

                const dateKey = formatDateKey(year, monthIndex + 1, day);
                const isFuture = dateKey > todayKey;
                const isSelected = dateKey === selectedDate;

                return (
                  <TouchableOpacity
                    key={dateKey}
                    onPress={() => selectDate(day)}
                    disabled={isFuture}
                    style={{
                      width: "14.28%",
                      height: 34,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: isSelected ? colors.accent : "transparent",
                      borderRadius: 6,
                      opacity: isFuture ? 0.3 : 1,
                    }}
                  >
                    <Text style={{ color: isSelected ? "#fff" : colors.text }}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Date Points ── */}
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            paddingVertical: 14,
            paddingHorizontal: 12,
            marginBottom: 16,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
            {t('datePoints')} : {points}
          </Text>
        </View>

        {/* ── Niyam checklist ── */}
        <Text style={{ fontSize: 24, marginBottom: 12, color: colors.text }}>
          {t('dailyNiyams')}
        </Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.tableHeaderBg,
              paddingVertical: 10,
              paddingHorizontal: 8,
            }}
          >
            <Text style={{ width: "12%", fontWeight: "700", color: colors.text }}>{t('sr')}</Text>
            <Text style={{ width: "52%", fontWeight: "700", color: colors.text }}>{t('niyam')}</Text>
            <Text style={{ width: "18%", fontWeight: "700", textAlign: "center", color: colors.text }}>
              {t('pts')}
            </Text>
            <Text style={{ width: "18%", fontWeight: "700", textAlign: "center", color: colors.text }}>
              {t('done')}
            </Text>
          </View>

          {niyamList.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => toggleItem(item.key)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={{ width: "12%", color: colors.text }}>{index + 1}</Text>
              <View style={{ width: "52%" }}>
                <Text style={{ fontSize: 16, color: colors.text }}>{lang === 'gu' ? item.gu : item.en}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{lang === 'gu' ? item.en : item.gu}</Text>
              </View>
              <Text style={{ width: "18%", textAlign: "center", color: colors.text }}>{item.points}</Text>
              <View style={{ width: "18%", alignItems: "center" }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderWidth: 1,
                    borderColor: colors.accent,
                    borderRadius: 5,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: checked[item.key] ? colors.accent : "transparent",
                  }}
                >
                  {checked[item.key] && <Text style={{ fontSize: 14, color: "#fff" }}>✓</Text>}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Submit Button ── */}
        <TouchableOpacity
          onPress={submitDate}
          disabled={isSubmittedForDate}
          style={{
            marginTop: 30,
            backgroundColor: isSubmittedForDate ? "#9ca3af" : "#1e293b",
            padding: 14,
            borderRadius: 14,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontSize: 18, fontWeight: "600" }}>
            {isSubmittedForDate ? t('submitted') : t('submit')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
