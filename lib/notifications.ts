import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const REMINDER_KEY = "dailyReminderScheduled";

let Notifications: typeof import("expo-notifications") | null = null;

async function getNotifications() {
  if (!Notifications) {
    try {
      Notifications = await import("expo-notifications");
    } catch {
      return null;
    }
  }
  return Notifications;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const mod = await getNotifications();
  if (!mod) return false;

  const { status: existingStatus } = await mod.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await mod.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  if (Platform.OS === "android") {
    try {
      await mod.setNotificationChannelAsync("daily-reminder", {
        name: "Daily Reminder",
        importance: mod.AndroidImportance.HIGH,
        sound: "default",
      });
    } catch {
      // Channel setup may fail on some Android versions, non-critical
    }
  }

  return true;
}

export async function scheduleDailyReminder(): Promise<void> {
  const alreadyScheduled = await AsyncStorage.getItem(REMINDER_KEY);
  if (alreadyScheduled === "true") return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const mod = await getNotifications();
  if (!mod) return;

  // Set notification handler
  mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Cancel any existing scheduled reminders
  await mod.cancelAllScheduledNotificationsAsync();

  // Schedule daily at 8 PM using calendar trigger
  try {
    await mod.scheduleNotificationAsync({
      content: {
        title: "🙏 Sambhavnatharpan",
        body: "દૈનિક નિયમ ભરો! / Fill your daily niyam!",
        sound: true,
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });
  } catch {
    // Fallback: schedule with repeating calendar trigger
    try {
      await mod.scheduleNotificationAsync({
        content: {
          title: "🙏 Sambhavnatharpan",
          body: "દૈનિક નિયમ ભરો! / Fill your daily niyam!",
          sound: true,
        },
        trigger: {
          hour: 20,
          minute: 0,
          repeats: true,
        } as any,
      });
    } catch {
      // If both fail, skip notification setup silently
      return;
    }
  }

  await AsyncStorage.setItem(REMINDER_KEY, "true");
}

export async function cancelDailyReminder(): Promise<void> {
  const mod = await getNotifications();
  if (!mod) return;
  await mod.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.setItem(REMINDER_KEY, "false");
}
