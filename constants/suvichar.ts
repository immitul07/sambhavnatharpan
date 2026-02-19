export type SuvicharItem = {
  gu: string;
  en: string;
};

const SUVICHAR_LIST: SuvicharItem[] = [
  { gu: 'ધર્મ એ જ સાચો મિત્ર છે, જે મૃત્યુ પછી પણ સાથે આવે છે.', en: 'Dharma is the true friend that accompanies even after death.' },
  { gu: 'ક્રોધ ન કરો, ક્ષમા રાખો — આ જ જિનશાસનનો સાર છે.', en: 'Do not be angry, practice forgiveness — this is the essence of Jain teachings.' },
  { gu: 'જે પોતાની જાતને જીતે છે, તે જ સાચો વિજેતા છે.', en: 'One who conquers oneself is the true victor.' },
  { gu: 'અહિંસા પરમો ધર્મ.', en: 'Non-violence is the supreme dharma.' },
  { gu: 'સંયમ એ સાચી તાકાત છે.', en: 'Self-restraint is true strength.' },
  { gu: 'સત્ય બોલો, પણ પ્રિય બોલો.', en: 'Speak the truth, but speak it kindly.' },
  { gu: 'દરેક આત્મા પોતાના કર્મનો શિલ્પી છે.', en: 'Every soul is the architect of its own karma.' },
  { gu: 'ત્યાગમાં જ સાચું સુખ છે.', en: 'True happiness lies in renunciation.' },
  { gu: 'જ્ઞાન વિના ધર્મ નથી, ધર્મ વિના મુક્તિ નથી.', en: 'Without knowledge there is no dharma, without dharma there is no liberation.' },
  { gu: 'પરોપકાર એ સૌથી મોટો ધર્મ છે.', en: 'Helping others is the greatest dharma.' },
  { gu: 'મન જીતે તે જગ જીતે.', en: 'One who conquers the mind conquers the world.' },
  { gu: 'ક્ષમા વીરનું ભૂષણ છે.', en: 'Forgiveness is the ornament of the brave.' },
  { gu: 'સંતોષ એ સૌથી મોટી સંપત્તિ છે.', en: 'Contentment is the greatest wealth.' },
  { gu: 'જિનવાણી સાંભળો, આત્માને જાગૃત કરો.', en: 'Listen to Jain teachings, awaken your soul.' },
  { gu: 'દાન, શીલ, તપ અને ભાવ — આ ચાર ધર્મના મૂળ છે.', en: 'Charity, virtue, austerity, and devotion — these are the four roots of dharma.' },
  { gu: 'કર્મના બંધનમાંથી મુક્ત થવું એ જ મોક્ષ છે.', en: 'Freedom from the bondage of karma is liberation.' },
  { gu: 'સમતા એ સાધનાનું શિખર છે.', en: 'Equanimity is the pinnacle of spiritual practice.' },
  { gu: 'અપરિગ્રહ એ મનની શાંતિ છે.', en: 'Non-possessiveness is peace of mind.' },
  { gu: 'સાચો ધર્મ હૃદયમાં વસે છે, દેખાડામાં નહીં.', en: 'True dharma resides in the heart, not in display.' },
  { gu: 'જે બીજાને સુખ આપે છે, તે પોતે સુખી થાય છે.', en: 'One who brings happiness to others becomes happy.' },
  { gu: 'પ્રતિક્રમણ કરો, ભૂલો સુધારો, આગળ વધો.', en: 'Do Pratikraman, correct your mistakes, move forward.' },
  { gu: 'જીવદયા એ જૈન ધર્મનો પ્રાણ છે.', en: 'Compassion for all living beings is the soul of Jainism.' },
  { gu: 'સારા કર્મ કરો, સારું ફળ મળશે.', en: 'Do good deeds, and good results will follow.' },
  { gu: 'દરેક દિવસ નવો અવસર છે — સારા કર્મ કરવાનો.', en: 'Every day is a new opportunity — to do good deeds.' },
  { gu: 'ગુરુ વિના જ્ઞાન નથી, જ્ઞાન વિના મુક્તિ નથી.', en: 'Without a Guru there is no knowledge, without knowledge no liberation.' },
  { gu: 'ધીરજ ધરો, સમય બધું સારું કરે છે.', en: 'Have patience, time makes everything better.' },
  { gu: 'ભગવાનની ભક્તિ એ આત્માની ખોરાક છે.', en: "Devotion to God is nourishment for the soul." },
  { gu: 'નમ્રતા એ સૌથી મોટું આભૂષણ છે.', en: 'Humility is the greatest ornament.' },
  { gu: 'જય જિનેન્દ્ર — દરેક મુલાકાતમાં આ શબ્દ બોલો.', en: "Say 'Jai Jinendra' — in every meeting." },
  { gu: 'આત્મા અનંત શક્તિવાળો છે, ફક્ત કર્મના પડદા હટાવો.', en: 'The soul has infinite power, just remove the veil of karma.' },
];

export function getDailySuvichar(date: Date = new Date()): SuvicharItem {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24),
  );
  return SUVICHAR_LIST[dayOfYear % SUVICHAR_LIST.length];
}

export { SUVICHAR_LIST };
