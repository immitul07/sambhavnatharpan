import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { deleteCloudAccount, upsertCloudAccount } from "@/lib/cloud-accounts";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

const storageSeparator = "::";

function getAccountKey(phoneNumber: string, dob: string): string {
  return `${normalizePhone(phoneNumber)}|${dob.trim()}`;
}

async function moveScopedProgressDataForAccount(
  oldAccountKey: string,
  newAccountKey: string,
): Promise<void> {
  if (!oldAccountKey || !newAccountKey || oldAccountKey === newAccountKey) return;

  const keys = await AsyncStorage.getAllKeys();
  const entriesToWrite: [string, string][] = [];
  const keysToRemove: string[] = [];

  (["aaradhana", "points", "submitted"] as const).forEach((prefix) => {
    const oldPrefix = `${prefix}${storageSeparator}${oldAccountKey}${storageSeparator}`;
    const matched = keys.filter((key) => key.startsWith(oldPrefix));
    matched.forEach((oldKey) => {
      const dateKey = oldKey.slice(oldPrefix.length);
      const newKey = `${prefix}${storageSeparator}${newAccountKey}${storageSeparator}${dateKey}`;
      keysToRemove.push(oldKey);
      entriesToWrite.push([newKey, ""]);
    });
  });

  if (entriesToWrite.length === 0) return;
  const oldValues = await AsyncStorage.multiGet(keysToRemove);
  const updates: [string, string][] = [];
  oldValues.forEach(([oldKey, value], index) => {
    if (value === null) return;
    updates.push([entriesToWrite[index][0], value]);
  });
  if (updates.length > 0) {
    await AsyncStorage.multiSet(updates);
  }
  await AsyncStorage.multiRemove(keysToRemove);
}

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEditMode = params.mode === "edit";
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"" | "Male" | "Female">("");
  const [dob, setDob] = useState("");
  const [hotiNo, setHotiNo] = useState("");
  const [photo, setPhoto] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const loadExistingProfile = async () => {
      const savedFirstName = (await AsyncStorage.getItem("firstName")) || "";
      const savedMiddleName = (await AsyncStorage.getItem("middleName")) || "";
      const savedLastName = (await AsyncStorage.getItem("lastName")) || "";
      const savedDob =
        (await AsyncStorage.getItem("dateOfBirth")) ||
        (await AsyncStorage.getItem("dob")) ||
        "";
      const savedHoti =
        (await AsyncStorage.getItem("hotiNo")) ||
        (await AsyncStorage.getItem("villageCode")) ||
        "";
      const savedPhoto =
        (await AsyncStorage.getItem("profilePhoto")) ||
        (await AsyncStorage.getItem("photoUri")) ||
        "";
      const savedPhone = (await AsyncStorage.getItem("phoneNumber")) || "";
      const savedAddress = (await AsyncStorage.getItem("address")) || "";
      const savedGender = ((await AsyncStorage.getItem("gender")) || "") as
        | ""
        | "Male"
        | "Female";

      setFirstName(savedFirstName);
      setMiddleName(savedMiddleName);
      setLastName(savedLastName);
      const dobParts = savedDob.split("-");
      if (dobParts.length === 3) {
        setDob(`${dobParts[2]}-${dobParts[1]}-${dobParts[0]}`);
      } else {
        setDob(savedDob);
      }
      setHotiNo(savedHoti);
      setPhoto(savedPhoto);
      setPhoneNumber(savedPhone);
      setAddress(savedAddress);
      setGender(savedGender);

    };

    loadExistingProfile();
  }, []);
  const formatDobInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  };

  const toStorageDob = (displayDob: string) => {
    const parts = displayDob.split("-");
    if (parts.length !== 3) return "";
    const [day, month, year] = parts;
    if (day.length !== 2 || month.length !== 2 || year.length !== 4) return "";
    return `${year}-${month}-${day}`;
  };

    const saveProfile = async () => {
    if (
      !firstName.trim() ||
      !middleName.trim() ||
      !lastName.trim() ||
      !gender.trim() ||
      !dob.trim() ||
      !hotiNo.trim() ||
      !photo.trim() ||
      !phoneNumber.trim() ||
      !address.trim()
    ) {
      Alert.alert("Missing details", "Please fill all required fields.");
      return;
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      Alert.alert("Invalid phone", "Please enter a valid phone number.");
      return;
    }

    const storageDob = toStorageDob(dob.trim());
    if (!storageDob) {
      Alert.alert("Invalid DOB", "Please enter DOB in DD-MM-YYYY format.");
      return;
    }

    const fullName = `${firstName.trim()} ${middleName.trim()} ${lastName.trim()}`;
    const account = {
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      gender: gender.trim(),
      fullName,
      dob: storageDob,
      hotiNo: hotiNo.trim(),
      phoneNumber: normalizedPhone,
      address: address.trim(),
      photoUri: photo.trim(),
    };

    const oldActiveAccountKey = (await AsyncStorage.getItem("activeAccountKey")) || "";
    const newAccountKey = getAccountKey(account.phoneNumber, account.dob);
    const accountsRaw = await AsyncStorage.getItem("accounts");
    const accounts = accountsRaw ? (JSON.parse(accountsRaw) as typeof account[]) : [];
    const indexByOldKey = oldActiveAccountKey
      ? accounts.findIndex(
          (a) => getAccountKey(a.phoneNumber, a.dob) === oldActiveAccountKey,
        )
      : -1;
    const indexByNewKey = accounts.findIndex(
      (a) => getAccountKey(a.phoneNumber, a.dob) === newAccountKey,
    );
    const idx = indexByOldKey >= 0 ? indexByOldKey : indexByNewKey;
    if (idx >= 0) {
      accounts[idx] = account;
    } else {
      accounts.push(account);
    }
    const dedupedAccounts = accounts.filter(
      (a, index, arr) =>
        arr.findIndex((x) => getAccountKey(x.phoneNumber, x.dob) === getAccountKey(a.phoneNumber, a.dob)) === index,
    );

    await moveScopedProgressDataForAccount(oldActiveAccountKey, newAccountKey);

    await AsyncStorage.multiSet([
      ["accounts", JSON.stringify(dedupedAccounts)],
      ["firstName", account.firstName],
      ["middleName", account.middleName],
      ["lastName", account.lastName],
      ["gender", account.gender],
      ["userName", account.fullName],
      ["dateOfBirth", account.dob],
      ["dob", account.dob],
      ["hotiNo", account.hotiNo],
      ["villageCode", account.hotiNo],
      ["profilePhoto", account.photoUri],
      ["photoUri", account.photoUri],
      ["phoneNumber", account.phoneNumber],
      ["address", account.address],
      ["activeAccountKey", newAccountKey],
    ]);

    try {
      await upsertCloudAccount(account);
      if (oldActiveAccountKey && oldActiveAccountKey !== newAccountKey) {
        const oldParts = oldActiveAccountKey.split("|");
        const oldPhone = oldParts[0] || "";
        const oldDob = oldParts.slice(1).join("|") || "";
        if (oldPhone && oldDob) {
          await deleteCloudAccount(oldPhone, oldDob);
        }
      }
    } catch {
      // Keep registration usable offline or without Firebase setup.
    }

    if (isEditMode) {
      Alert.alert("Changes saved", "Your profile changes have been saved.", [
        { text: "OK", onPress: () => router.replace("/(tabs)/profile") },
      ]);
      return;
    }
    router.replace("/thank-you");
  };

  const chooseFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow gallery access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const persistedPhoto = await persistProfilePhoto(result.assets[0].uri);
      setPhoto(persistedPhoto);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const persistedPhoto = await persistProfilePhoto(result.assets[0].uri);
      setPhoto(persistedPhoto);
    }
  };
  const persistProfilePhoto = async (inputUri: string) => {
    if (!inputUri) return "";

    try {
      const extensionMatch = inputUri.match(/\.(\w+)(?:\?|$)/);
      const extension = extensionMatch ? extensionMatch[1] : "jpg";
      const destination = `${FileSystem.documentDirectory}profile-photo-${Date.now()}.${extension}`;
      await FileSystem.copyAsync({ from: inputUri, to: destination });
      return destination;
    } catch {
      return inputUri;
    }
  };

  const selectPhoto = () => {
    Alert.alert("Profile Photo", "Choose photo source", [
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: chooseFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }} edges={["top"]}>
      <Stack.Screen options={{ title: "Register" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingTop: 14, paddingBottom: 80 }}
      >
        <Text style={{ fontSize: 24, textAlign: "center", marginBottom: 20 }}>
          Register / નોંધણી
        </Text>

        <Text style={styles.label}>પ્રથમ નામ (First Name) *</Text>
        <TextInput
          placeholder="પ્રથમ નામ લખો (Enter first name)"
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
        />
        <Text style={styles.label}>મધ્ય નામ (Middle Name) *</Text>
        <TextInput
          placeholder="મધ્ય નામ લખો (Enter middle name)"
          value={middleName}
          onChangeText={setMiddleName}
          style={styles.input}
        />
        <Text style={styles.label}>અટક (Last Name) *</Text>
        <TextInput
          placeholder="અટક લખો (Enter last name)"
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
        />
        <Text style={styles.label}>Gender *</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setGender("Male")}
            style={[
              styles.genderChip,
              gender === "Male" && styles.genderChipActive,
            ]}
          >
            <Text style={gender === "Male" ? styles.genderChipTextActive : styles.genderChipText}>
              Male
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGender("Female")}
            style={[
              styles.genderChip,
              gender === "Female" && styles.genderChipActive,
            ]}
          >
            <Text style={gender === "Female" ? styles.genderChipTextActive : styles.genderChipText}>
              Female
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>જન્મ તારીખ (Date of Birth) *</Text>
        <TextInput
          placeholder="DD-MM-YYYY"
          value={dob}
          onChangeText={(value) => setDob(formatDobInput(value))}
          keyboardType="number-pad"
          maxLength={10}
          style={styles.input}
        />
        <Text style={styles.label}>હોટી નંબર (Hoti No.) *</Text>
        <TextInput
          placeholder="હોટી નંબર લખો (Enter Hoti No.)"
          value={hotiNo}
          onChangeText={setHotiNo}
          keyboardType="number-pad"
          style={styles.input}
        />
        <Text style={styles.label}>ફોટો (Photo) *</Text>
        <View style={[styles.input, { paddingVertical: 10 }]}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={{ width: 96, height: 96, borderRadius: 12, marginBottom: 10 }}
            />
          ) : (
            <Text style={{ color: "#666", marginBottom: 10 }}>
              કોઈ ફોટો પસંદ કર્યો નથી (No photo selected)
            </Text>
          )}
          <TouchableOpacity onPress={selectPhoto} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              કેમેરા / ગેલેરીમાંથી પસંદ કરો (Choose from Camera / Gallery)
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>ફોન નંબર (Phone Number) *</Text>
        <TextInput
          placeholder="ફોન નંબર લખો (Enter phone number)"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          style={styles.input}
        />
        <Text style={styles.label}>સરનામું (Address) *</Text>
        <TextInput
          placeholder="સરનામું લખો (Enter address)"
          value={address}
          onChangeText={setAddress}
          multiline
          style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
        />

        <TouchableOpacity onPress={saveProfile} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Save Profile & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  label: {
    marginBottom: 6,
    color: "#0f172a",
    fontWeight: "600" as const,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
  },
  calendarBox: {
    borderWidth: 1,
    borderColor: "#dbe3ee",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
  },
  pickerChip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
  },
  inlinePicker: {
    borderWidth: 1,
    borderColor: "#dbe3ee",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  inlinePickerItem: {
    width: "25%",
    paddingVertical: 6,
    alignItems: "center" as const,
    borderRadius: 6,
    marginBottom: 4,
  },
  inlinePickerItemActive: {
    backgroundColor: "#000",
  },
  yearItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
  },
  decadeItem: {
    width: "50%",
    paddingVertical: 8,
    alignItems: "center" as const,
    borderRadius: 6,
    marginBottom: 6,
  },
  genderChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center" as const,
    backgroundColor: "#f8fafc",
  },
  genderChipActive: {
    backgroundColor: "#ea580c",
    borderColor: "#ea580c",
  },
  genderChipText: {
    color: "#0f172a",
    fontWeight: "600" as const,
  },
  genderChipTextActive: {
    color: "#fff",
    fontWeight: "600" as const,
  },
  primaryButton: {
    backgroundColor: "#ea580c",
    padding: 14,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#fff",
    textAlign: "center" as const,
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#ea580c",
    padding: 14,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: "#000",
    textAlign: "center" as const,
    fontSize: 16,
  },
};






