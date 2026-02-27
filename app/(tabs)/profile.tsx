import { useLanguage } from "@/components/LanguageContext";
import { useTheme } from "@/components/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAgeGroupFromDob, getAgeGroupLabel } from "@/constants/niyams";

type ProfileData = {
  name: string;
  gender: string;
  dob: string;
  ageCategory: string;
  hotiNo: string;
  phoneNumber: string;
  address: string;
};

function getAgeCategory(dob: string): string {
  if (!dob) return "";
  return getAgeGroupLabel(getAgeGroupFromDob(dob));
}

function formatDobForDisplay(dob: string): string {
  const trimmed = (dob || "").trim();
  const parts = trimmed.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return trimmed;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark, toggleDarkMode, colors } = useTheme();
  const { lang, toggleLang, t } = useLanguage();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const loadProfile = useCallback(async () => {
    const keys = [
      "userName", "gender", "dob", "hotiNo", "villageCode",
      "phoneNumber", "address",
    ];
    const entries = await AsyncStorage.multiGet(keys);
    const obj: Record<string, string> = {};
    entries.forEach(([key, value]) => { obj[key] = (value || "").trim(); });

    const name = obj.userName || "";
    const gender = obj.gender || "";
    const dob = obj.dob || "";
    const hotiNo = obj.hotiNo || obj.villageCode || "";
    const phoneNumber = obj.phoneNumber || "";
    const address = obj.address || "";

    setProfile({
      name,
      gender,
      dob,
      ageCategory: getAgeCategory(dob),
      hotiNo,
      phoneNumber,
      address,
    });
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const logout = async () => {
    await AsyncStorage.multiRemove([
      "firstName", "middleName", "lastName", "gender",
      "userName", "dateOfBirth", "dob", "hotiNo", "villageCode",
      "profilePhoto", "photoUri", "phoneNumber", "address",
      "activeAccountKey", "adminSession", "adminSelectedAccountKey",
    ]);
    router.replace("/login");
  };

  const editProfile = () => {
    router.push("/register");
  };

  if (!profile) return null;

  const infoRow = (label: string, value: string) => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ color: colors.textSecondary, fontWeight: "600", fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, flex: 1, textAlign: "right" }}>{value || "—"}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 }}>
        {/* ── Header ── */}
        <View style={{ position: "relative", marginBottom: 14 }}>
          <Text style={{ fontSize: 22, textAlign: "center", color: colors.text }}>
            {t('profile')}
          </Text>
          <TouchableOpacity
            onPress={() => setShowMenu((prev) => !prev)}
            style={{ position: "absolute", right: 0, top: 0, padding: 4 }}
          >
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

        {/* ── Profile Info ── */}
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: "hidden", marginBottom: 16, backgroundColor: colors.card }}>
          {infoRow(t('name'), profile.name)}
          {infoRow(t('gender'), profile.gender)}
          {infoRow(t('dateOfBirth'), formatDobForDisplay(profile.dob))}
          {infoRow(t('ageCategory'), profile.ageCategory)}
          {infoRow(t('hotiNo'), profile.hotiNo)}
          {infoRow(t('phoneNumber'), profile.phoneNumber)}
          {infoRow(t('address'), profile.address)}
        </View>

        {/* ── Settings Section ── */}
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: "hidden", marginBottom: 16, backgroundColor: colors.card }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 }}>
            ⚙️ {t('settings')}
          </Text>

          {/* Dark Mode Toggle */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 14 }}>🌙 {t('darkMode')}</Text>
            <Switch
              value={isDark}
              onValueChange={toggleDarkMode}
              trackColor={{ false: "#d1d5db", true: colors.accent }}
              thumbColor={isDark ? "#fff" : "#f4f3f4"}
            />
          </View>

          {/* Language Toggle */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 14 }}>🌐 {t('language')}</Text>
            <TouchableOpacity
              onPress={toggleLang}
              style={{
                backgroundColor: colors.accent,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
                {lang === "gu" ? "English" : "ગુજરાતી"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <TouchableOpacity
          onPress={editProfile}
          style={{
            backgroundColor: "#1e293b",
            padding: 14,
            borderRadius: 14,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600", fontSize: 16 }}>
            ✏️ {t('editDetails')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={logout}
          style={{
            borderWidth: 1,
            borderColor: "#ef4444",
            padding: 14,
            borderRadius: 14,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#ef4444", textAlign: "center", fontWeight: "600", fontSize: 16 }}>
            {t('logout')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}


