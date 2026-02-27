export type LangKey = 'gu' | 'en';

const translations: Record<string, Record<LangKey, string>> = {
  // App title
  appTitle: { gu: 'સમર્પણમ્', en: 'Samarpanam' },
  appSubtitle: { gu: 'પૂરણ નગરે 125 મી ધ્વજારોહણ નિમિત્તે સંભવનાથ દાદાને ભેટણું', en: 'Offering to Sambhavnath Dada on 125th Dhwaja-Arohan at Puran Nagare' },

  // Login
  loginTitle: { gu: 'લોગિન', en: 'Login' },
  phoneNumber: { gu: 'ફોન નંબર', en: 'Phone Number' },
  dobLabel: { gu: 'જન્મ તારીખ (DD-MM-YYYY)', en: 'Date of Birth (DD-MM-YYYY)' },
  loginButton: { gu: 'લોગિન', en: 'Login' },
  registerButton: { gu: 'એકાઉન્ટ બનાવો / રજીસ્ટર કરો', en: 'Create Account / Register' },

  // Home
  home: { gu: 'હોમ', en: 'Home' },
  selectDate: { gu: 'તારીખ પસંદ કરો', en: 'Select Date' },
  datePoints: { gu: 'તારીખના પોઈન્ટ', en: 'Date Points' },
  dailyNiyams: { gu: 'દૈનિક નિયમો', en: 'Daily Niyams' },
  submit: { gu: 'સબમિટ', en: 'Submit' },
  submitted: { gu: 'સબમિટ થઈ ગયું', en: 'Submitted' },
  streak: { gu: 'સ્ટ્રીક', en: 'Streak' },
  daysStreak: { gu: 'દિવસ સ્ટ્રીક', en: 'day streak' },

  // Countdown
  countdownTitle: { gu: 'ધ્વજારોહણ સુધી', en: 'Days to Dhwaja-Arohan' },
  days: { gu: 'દિવસ', en: 'days' },
  eventToday: { gu: '🎉 આજે ધ્વજારોહણ છે!', en: '🎉 Dhwaja-Arohan is today!' },
  eventPassed: { gu: 'ધ્વજારોહણ સંપન્ન થયું', en: 'Dhwaja-Arohan completed' },

  // Suvichar
  dailySuvichar: { gu: 'આજનું સુવિચાર', en: "Today's Thought" },

  // Summary
  summary: { gu: 'સારાંશ', en: 'Summary' },
  totalPoints: { gu: 'કુલ પોઈન્ટ', en: 'Total Points' },
  niyamProgress: { gu: 'નિયમ પ્રગતિ', en: 'Niyam Progress' },
  last7Days: { gu: 'છેલ્લા ૭ દિવસ', en: 'Last 7 Days' },
  shareProgress: { gu: 'પ્રગતિ શેર કરો', en: 'Share Progress' },
  downloadBlankCopy: { gu: 'ખાલી કોપી ડાઉનલોડ', en: 'Download Blank Copy' },

  // Profile
  profile: { gu: 'પ્રોફાઈલ', en: 'Profile' },
  name: { gu: 'નામ', en: 'Name' },
  gender: { gu: 'જાતિ', en: 'Gender' },
  dateOfBirth: { gu: 'જન્મ તારીખ', en: 'Date of Birth' },
  ageCategory: { gu: 'ઉંમર વર્ગ', en: 'Age Category' },
  hotiNo: { gu: 'હોટી નંબર', en: 'Hoti No.' },
  address: { gu: 'સરનામું', en: 'Address' },
  editDetails: { gu: 'વિગતો સંપાદિત કરો', en: 'Edit Details' },
  noPhoto: { gu: 'કોઈ ફોટો નથી', en: 'No Photo' },
  photo: { gu: 'ફોટો', en: 'Photo' },

  // Leaderboard
  leaderboard: { gu: 'રેન્કિંગ', en: 'Leaderboard' },
  ranks: { gu: 'રેન્ક', en: 'Ranks' },
  points: { gu: 'પોઈન્ટ', en: 'Points' },

  // Navigation / Menu
  literatureFiles: { gu: 'સાહિત્ય', en: 'Literature Files' },
  logout: { gu: 'લોગઆઉટ', en: 'Logout' },
  back: { gu: 'પાછળ', en: 'Back' },

  // Settings
  darkMode: { gu: 'ડાર્ક મોડ', en: 'Dark Mode' },
  language: { gu: 'ભાષા', en: 'Language' },
  settings: { gu: 'સેટિંગ્સ', en: 'Settings' },
  reminderTime: { gu: 'રિમાઇન્ડર સમય', en: 'Reminder Time' },

  // Table headers
  sr: { gu: 'ક્ર.', en: 'Sr' },
  niyam: { gu: 'નિયમ', en: 'Niyam' },
  pts: { gu: 'પો.', en: 'Pts' },
  done: { gu: 'થયું', en: 'Done' },
  totalPts: { gu: 'કુલ પો.', en: 'Total Pts' },

  // Sort
  serialNo: { gu: 'ક્રમ નં.', en: 'Serial No.' },
  az: { gu: 'A-Z', en: 'A-Z' },
  maxPoints: { gu: 'મહત્તમ પોઈન્ટ', en: 'Max Points' },
};

export function t(key: string, lang: LangKey): string {
  return translations[key]?.[lang] || translations[key]?.en || key;
}

export default translations;
