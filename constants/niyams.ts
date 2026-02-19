export type NiyamItem = {
  key: string;
  gu: string;
  en: string;
  points: number;
};

type NiyamDefinition = Omit<NiyamItem, "points">;

export type NiyamAgeGroup =
  | "born_2011_or_later"
  | "born_1981_to_2010"
  | "born_1980_or_earlier";

const NIYAM_DEFINITIONS: Record<string, NiyamDefinition> = {
  jin_pooja: { key: "jin_pooja", en: "Jin Pooja", gu: "જિન પૂજા" },
  say_namo_jinanam_on_dhwaja_darshan: {
    key: "say_namo_jinanam_on_dhwaja_darshan",
    en: "Say Namo Jinanam on Dhwaja Darshan",
    gu: "ધ્વજાના દર્શન સમયે 'ણમો જિણાણં' બોલવું",
  },
  say_nissihi_while_entering_derasar: {
    key: "say_nissihi_while_entering_derasar",
    en: "Say Nissihi while entering Derasar",
    gu: "દેરાસરમાં પ્રવેશ કરતી વખતે 'નિસિહિ' બોલવું",
  },
  offer_3_pradakshinas: {
    key: "offer_3_pradakshinas",
    en: "Offer 3 Pradakshinas",
    gu: "૩ પ્રદક્ષિણા આપવી",
  },
  chaityavandan: { key: "chaityavandan", en: "Chaityavandan", gu: "ચૈત્યવંદન" },
  guruvandan: { key: "guruvandan", en: "Guruvandan", gu: "ગુરુવંદન" },
  evening_darshan: { key: "evening_darshan", en: "Evening Darshan", gu: "સાંજના દર્શન" },
  navkar_27: { key: "navkar_27", en: "27 Navkar", gu: "૨૭ નવકાર" },
  om_hrim_arham_27_times: {
    key: "om_hrim_arham_27_times",
    en: "Om Hrim Arham Shri Sambhavnathay Namah Jaap 27 Times",
    gu: "'ૐ હ્રીં અર્હં શ્રી સંભવનાથાય નમઃ' નો ૨૭ વાર જાપ",
  },
  attend_pathshala: { key: "attend_pathshala", en: "Attend Pathshala", gu: "પાઠશાળામાં જવું" },
  seven_navkar_sleep_eight_wake: {
    key: "seven_navkar_sleep_eight_wake",
    en: "7 Navkar Before Sleep, 8 on Waking",
    gu: "સૂતા ૭ અને ઊઠતાં ૮ નવકાર",
  },
  navkarshi: { key: "navkarshi", en: "Navkarshi", gu: "નવકારશી" },
  give_up_night_meal: { key: "give_up_night_meal", en: "Give Up Night Meal", gu: "રાત્રિભોજન ત્યાગ" },
  give_up_root_vegetables: {
    key: "give_up_root_vegetables",
    en: "Give Up Root Vegetables",
    gu: "કંદમૂળ ત્યાગ",
  },
  drink_water_after_washing_plate_one_meal: {
    key: "drink_water_after_washing_plate_one_meal",
    en: "Drink Water After Washing Plate - One Meal",
    gu: "થાળી ધોઈને પછી પાણી પીવું (એક ટાણું)",
  },
  no_talking_while_eating_before_water: {
    key: "no_talking_while_eating_before_water",
    en: "Don't speak while eating before drinking water.",
    gu: "પાણી પીતા પહેલાં ભોજન દરમ્યાન બોલવું નહીં",
  },
  eat_1_roti_without_ghee: {
    key: "eat_1_roti_without_ghee",
    en: "Eat 1 Roti without Ghee",
    gu: "ઘી વગર ૧ રોટલી ખાવી",
  },
  give_up_prohibited_food: {
    key: "give_up_prohibited_food",
    en: "Give Up Prohibited Food",
    gu: "અભક્ષ્ય ભોજનનો ત્યાગ",
  },
  no_tv_mobile_during_meals: {
    key: "no_tv_mobile_during_meals",
    en: "No TV/Mobile During Meals",
    gu: "ભોજન સમયે ટીવી/મોબાઇલનો ત્યાગ",
  },
  feeding_any_animal: {
    key: "feeding_any_animal",
    en: "Feeding any animal",
    gu: "કોઈપણ પ્રાણીને ખવડાવવું",
  },
  perform_anukampa_daan: {
    key: "perform_anukampa_daan",
    en: "Perform Anukampa Daan",
    gu: "અનુકંપા દાન કરવું",
  },
  do_not_lie: { key: "do_not_lie", en: "Do Not Lie", gu: "જૂઠું ન બોલવું" },
  seek_forgiveness_for_anger_at_family: {
    key: "seek_forgiveness_for_anger_at_family",
    en: "Seek Forgiveness for Getting Angry at Family Member",
    gu: "પરિવારના સભ્ય પર ગુસ્સો કરવા બદલ ક્ષમા માંગવી",
  },
  do_not_use_abusive_words: {
    key: "do_not_use_abusive_words",
    en: "Do Not Use Abusive Words",
    gu: "અપશબ્દ ન બોલવા",
  },
  praise_family_member_for_good_deed: {
    key: "praise_family_member_for_good_deed",
    en: "Praise Family member for any good deed/behavior",
    gu: "પરિવારના સભ્યના સારા કાર્ય/વર્તન માટે પ્રશંસા કરવી",
  },
  bow_to_parents_or_photo: {
    key: "bow_to_parents_or_photo",
    en: "Bow to Parents or Their Photo",
    gu: "માતા-પિતા અથવા તેમના ફોટોને પ્રણામ કરવો",
  },
  give_up_movies_web_series_tv_mobile: {
    key: "give_up_movies_web_series_tv_mobile",
    en: "Give Up Movies/Web Series on TV/Mobile",
    gu: "ટીવી/મોબાઇલમાં ફિલ્મ-વેબ સિરીઝનો ત્યાગ",
  },
  give_up_bathing_soap: {
    key: "give_up_bathing_soap",
    en: "Give Up Bathing Soap",
    gu: "નાહવાના સાબુનો ત્યાગ",
  },
  sit_with_family_15_min: {
    key: "sit_with_family_15_min",
    en: "Sit with Family for 15 Minutes",
    gu: "૧૫ મિનિટ પરિવાર સાથે બેસવું",
  },
  no_tv_phone_11pm_to_6am: {
    key: "no_tv_phone_11pm_to_6am",
    en: "No TV/Phone from 11 PM to 6 AM",
    gu: "રાત્રે ૧૧ થી સવારે ૬ સુધી ટીવી/ફોન નહીં",
  },
  ashtaprakari_pooja: {
    key: "ashtaprakari_pooja",
    en: "Ashtaprakari Pooja",
    gu: "અષ્ટપ્રકારી પૂજા",
  },
  samayik: { key: "samayik", en: "Samayik", gu: "સામાયિક" },
  jinvani_shravan_30_min: {
    key: "jinvani_shravan_30_min",
    en: "30 Minutes of Listening to Jain Teachings",
    gu: "૩૦ મિનિટ જિનવાણી શ્રવણ",
  },
  navkarvali: { key: "navkarvali", en: "Navkarvali", gu: "નવકારવાળી" },
  om_hrim_arham_jaapmala: {
    key: "om_hrim_arham_jaapmala",
    en: "Om Hrim Arham Shri Sambhavnathay Namah Jaapmala",
    gu: "'ૐ હ્રીં અર્હં શ્રી સંભવનાથાય નમઃ' ની જાપમાળા",
  },
  give_up_tobacco_smoking_vape: {
    key: "give_up_tobacco_smoking_vape",
    en: "Give Up Tobacco/Smoking/Vape",
    gu: "તમાકુ/ધૂમ્રપાન/વેપનો ત્યાગ",
  },
  do_not_speak_ill_of_others: {
    key: "do_not_speak_ill_of_others",
    en: "Do Not Speak Ill of Others",
    gu: "પરનિંદા ન કરવી",
  },
  give_up_perfume: { key: "give_up_perfume", en: "Give Up Perfume", gu: "પરફ્યુમનો ત્યાગ" },
  silence_1_hour: { key: "silence_1_hour", en: "1 Hour Silence", gu: "૧ કલાક મૌન" },
  restrict_social_media_1_hour: {
    key: "restrict_social_media_1_hour",
    en: "Restrict Social Media usage to 1 Hour",
    gu: "સોશિયલ મીડિયા વપરાશ ૧ કલાક સુધી મર્યાદિત કરવો",
  },
  rai_or_devasiya_pratikraman: {
    key: "rai_or_devasiya_pratikraman",
    en: "Rai or Devasiya Pratikraman",
    gu: "રાઈ અથવા દેવસિય પ્રતિક્રમણ",
  },
  drink_boiled_water: { key: "drink_boiled_water", en: "Drink Boiled Water", gu: "ઉકાળેલું પાણી પીવું" },
};

type AgeGroupRow = { key: keyof typeof NIYAM_DEFINITIONS; points: number };

const NIYAMS_BY_AGE_GROUP: Record<NiyamAgeGroup, AgeGroupRow[]> = {
  born_2011_or_later: [
    { key: "jin_pooja", points: 20 },
    { key: "say_namo_jinanam_on_dhwaja_darshan", points: 20 },
    { key: "say_nissihi_while_entering_derasar", points: 20 },
    { key: "offer_3_pradakshinas", points: 20 },
    { key: "chaityavandan", points: 30 },
    { key: "guruvandan", points: 30 },
    { key: "evening_darshan", points: 20 },
    { key: "navkar_27", points: 20 },
    { key: "om_hrim_arham_27_times", points: 20 },
    { key: "attend_pathshala", points: 20 },
    { key: "seven_navkar_sleep_eight_wake", points: 20 },
    { key: "navkarshi", points: 20 },
    { key: "give_up_night_meal", points: 40 },
    { key: "give_up_root_vegetables", points: 30 },
    { key: "drink_water_after_washing_plate_one_meal", points: 30 },
    { key: "no_talking_while_eating_before_water", points: 20 },
    { key: "eat_1_roti_without_ghee", points: 20 },
    { key: "give_up_prohibited_food", points: 40 },
    { key: "no_tv_mobile_during_meals", points: 20 },
    { key: "feeding_any_animal", points: 20 },
    { key: "perform_anukampa_daan", points: 20 },
    { key: "do_not_lie", points: 30 },
    { key: "seek_forgiveness_for_anger_at_family", points: 20 },
    { key: "do_not_use_abusive_words", points: 20 },
    { key: "praise_family_member_for_good_deed", points: 20 },
    { key: "bow_to_parents_or_photo", points: 20 },
    { key: "give_up_movies_web_series_tv_mobile", points: 30 },
    { key: "give_up_bathing_soap", points: 20 },
    { key: "sit_with_family_15_min", points: 20 },
    { key: "no_tv_phone_11pm_to_6am", points: 20 },
  ],
  born_1981_to_2010: [
    { key: "jin_pooja", points: 20 },
    { key: "offer_3_pradakshinas", points: 20 },
    { key: "chaityavandan", points: 30 },
    { key: "guruvandan", points: 20 },
    { key: "samayik", points: 40 },
    { key: "jinvani_shravan_30_min", points: 30 },
    { key: "navkarvali", points: 20 },
    { key: "om_hrim_arham_jaapmala", points: 20 },
    { key: "attend_pathshala", points: 20 },
    { key: "seven_navkar_sleep_eight_wake", points: 10 },
    { key: "navkarshi", points: 20 },
    { key: "give_up_night_meal", points: 30 },
    { key: "give_up_root_vegetables", points: 20 },
    { key: "drink_water_after_washing_plate_one_meal", points: 20 },
    { key: "no_talking_while_eating_before_water", points: 20 },
    { key: "give_up_prohibited_food", points: 30 },
    { key: "give_up_tobacco_smoking_vape", points: 20 },
    { key: "no_tv_mobile_during_meals", points: 20 },
    { key: "seek_forgiveness_for_anger_at_family", points: 20 },
    { key: "do_not_use_abusive_words", points: 20 },
    { key: "do_not_speak_ill_of_others", points: 20 },
    { key: "praise_family_member_for_good_deed", points: 20 },
    { key: "bow_to_parents_or_photo", points: 20 },
    { key: "give_up_movies_web_series_tv_mobile", points: 40 },
    { key: "give_up_bathing_soap", points: 20 },
    { key: "give_up_perfume", points: 20 },
    { key: "silence_1_hour", points: 30 },
    { key: "sit_with_family_15_min", points: 20 },
    { key: "restrict_social_media_1_hour", points: 40 },
    { key: "no_tv_phone_11pm_to_6am", points: 20 },
  ],
  born_1980_or_earlier: [
    { key: "jin_pooja", points: 20 },
    { key: "ashtaprakari_pooja", points: 40 },
    { key: "offer_3_pradakshinas", points: 20 },
    { key: "chaityavandan", points: 20 },
    { key: "guruvandan", points: 20 },
    { key: "rai_or_devasiya_pratikraman", points: 40 },
    { key: "samayik", points: 40 },
    { key: "jinvani_shravan_30_min", points: 30 },
    { key: "navkarvali", points: 20 },
    { key: "om_hrim_arham_jaapmala", points: 20 },
    { key: "attend_pathshala", points: 20 },
    { key: "seven_navkar_sleep_eight_wake", points: 20 },
    { key: "navkarshi", points: 20 },
    { key: "give_up_night_meal", points: 30 },
    { key: "give_up_root_vegetables", points: 20 },
    { key: "drink_water_after_washing_plate_one_meal", points: 30 },
    { key: "no_talking_while_eating_before_water", points: 20 },
    { key: "drink_boiled_water", points: 30 },
    { key: "give_up_prohibited_food", points: 20 },
    { key: "give_up_tobacco_smoking_vape", points: 20 },
    { key: "seek_forgiveness_for_anger_at_family", points: 20 },
    { key: "do_not_use_abusive_words", points: 20 },
    { key: "do_not_speak_ill_of_others", points: 20 },
    { key: "praise_family_member_for_good_deed", points: 20 },
    { key: "bow_to_parents_or_photo", points: 20 },
    { key: "give_up_movies_web_series_tv_mobile", points: 20 },
    { key: "give_up_bathing_soap", points: 20 },
    { key: "silence_1_hour", points: 20 },
    { key: "sit_with_family_15_min", points: 20 },
    { key: "restrict_social_media_1_hour", points: 20 },
  ],
};

function resolveNiyamItem(item: AgeGroupRow): NiyamItem {
  const base = NIYAM_DEFINITIONS[item.key];
  return { ...base, points: item.points };
}

// Default list for initial render before DOB is loaded.
export const NIYAM_LIST: NiyamItem[] = NIYAMS_BY_AGE_GROUP.born_1981_to_2010.map(resolveNiyamItem);

export function getBirthYearFromDob(dob: string): number | null {
  const trimmed = (dob || "").trim();
  if (!trimmed) return null;

  const yyyyMmDd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (yyyyMmDd) {
    const year = Number(yyyyMmDd[1]);
    return Number.isFinite(year) ? year : null;
  }

  const ddMmYyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (ddMmYyyy) {
    const year = Number(ddMmYyyy[3]);
    return Number.isFinite(year) ? year : null;
  }

  return null;
}

export function getAgeGroupFromDob(dob: string): NiyamAgeGroup {
  const year = getBirthYearFromDob(dob);
  if (year === null) return "born_1981_to_2010";
  if (year >= 2011) return "born_2011_or_later";
  if (year >= 1981) return "born_1981_to_2010";
  return "born_1980_or_earlier";
}

export function getNiyamListForAgeGroup(ageGroup: NiyamAgeGroup): NiyamItem[] {
  return NIYAMS_BY_AGE_GROUP[ageGroup].map(resolveNiyamItem);
}

export function getNiyamListForDob(dob: string): NiyamItem[] {
  return getNiyamListForAgeGroup(getAgeGroupFromDob(dob));
}

export function getAgeGroupLabel(ageGroup: NiyamAgeGroup): string {
  if (ageGroup === "born_2011_or_later") return "Sambhav Bal Jyoti";
  if (ageGroup === "born_1980_or_earlier") return "Sambhav Gaurav";
  return "Sambhav Yuva Shakti";
}

