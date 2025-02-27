import { toPairs } from '../_';

const locales = {
  // Arabic
  ar: { dow: 7, L: 'D/\u200FM/\u200FYYYY' },
  'ar-SA': { dow: 7, L: 'D/\u200FM/\u200FYYYY', amPM: ['ق.ظ', 'ب.ظ'] },
  // Bulgarian
  bg: { dow: 2, L: 'D.MM.YYYY' },
  // Catalan
  ca: { dow: 2, L: 'DD/MM/YYYY' },
  // Chinese (China)
  'zh-CN': { dow: 2, L: 'YYYY/MM/DD', amPM: ['上午', '下午'] },
  // Chinese (Taiwan)
  'zh-TW': { dow: 1, L: 'YYYY/MM/DD', amPM: ['上午', '下午'] },
  // Croatian
  hr: { dow: 2, L: 'DD.MM.YYYY' },
  // Czech
  cs: { dow: 2, L: 'DD.MM.YYYY' },
  // Danish
  da: { dow: 2, L: 'DD.MM.YYYY' },
  // Dutch
  nl: { dow: 2, L: 'DD-MM-YYYY' },
  // English (US)
  'en-US': { dow: 1, L: 'MM/DD/YYYY' },
  // English (Australia)
  'en-AU': { dow: 2, L: 'DD/MM/YYYY' },
  // English (Canada)
  'en-CA': { dow: 1, L: 'YYYY-MM-DD' },
  // English (Great Britain)
  'en-GB': { dow: 2, L: 'DD/MM/YYYY' },
  // English (Ireland)
  'en-IE': { dow: 2, L: 'DD-MM-YYYY' },
  // English (New Zealand)
  'en-NZ': { dow: 2, L: 'DD/MM/YYYY' },
  // English (South Africa)
  'en-ZA': { dow: 1, L: 'YYYY/MM/DD' },
  // Esperanto
  eo: { dow: 2, L: 'YYYY-MM-DD' },
  // Estonian
  et: { dow: 2, L: 'DD.MM.YYYY' },
  // Persian
  'fa-IR': { dow: 7, L: 'YYYY/MM/DD', amPM: ['ق.ظ', 'ب.ظ'] },
  // Finnish
  fi: { dow: 2, L: 'DD.MM.YYYY' },
  // French
  fr: { dow: 2, L: 'DD/MM/YYYY' },
  // French (Canada)
  'fr-CA': { dow: 1, L: 'YYYY-MM-DD' },
  // French (Switzerland)
  'fr-CH': { dow: 2, L: 'DD.MM.YYYY' },
  // German
  de: { dow: 2, L: 'DD.MM.YYYY' },
  // Hebrew
  he: { dow: 1, L: 'DD.MM.YYYY', amPM: ['ל.ה', 'א.ה'] },
  // Indonesian
  id: { dow: 2, L: 'DD/MM/YYYY' },
  // Italian
  it: { dow: 2, L: 'DD/MM/YYYY' },
  // Japanese
  ja: { dow: 1, L: 'YYYY年M月D日', amPM: ['午前', '午後'] },
  // Korean
  ko: { dow: 1, L: 'YYYY.MM.DD', amPM: ['오전', '오후'] },
  // Latvian
  lv: { dow: 2, L: 'DD.MM.YYYY' },
  // Lithuanian
  lt: { dow: 2, L: 'DD.MM.YYYY' },
  // Macedonian
  mk: { dow: 2, L: 'D.MM.YYYY' },
  // Norwegian
  nb: { dow: 2, L: 'D. MMMM YYYY' },
  nn: { dow: 2, L: 'D. MMMM YYYY' },
  // Polish
  pl: { dow: 2, L: 'DD.MM.YYYY' },
  // Portuguese
  pt: { dow: 2, L: 'DD/MM/YYYY' },
  // Romanian
  ro: { dow: 2, L: 'DD.MM.YYYY' },
  // Russian
  ru: { dow: 2, L: 'DD.MM.YYYY' },
  // Slovak
  sk: { dow: 2, L: 'DD.MM.YYYY' },
  // Spanish (Spain)
  'es-ES': { dow: 2, L: 'DD/MM/YYYY' },
  // Spanish (Mexico)
  'es-MX': { dow: 2, L: 'DD/MM/YYYY' },
  // Swedish
  sv: { dow: 2, L: 'YYYY-MM-DD' },
  // Thai
  th: { dow: 1, L: 'DD/MM/YYYY' },
  // Turkish
  tr: { dow: 2, L: 'DD.MM.YYYY', amPM: ['ÖÖ', 'ÖS'] },
  // Ukrainian
  uk: { dow: 2, L: 'DD.MM.YYYY' },
  // Vietnam
  vi: { dow: 2, L: 'DD/MM/YYYY' },
};
locales.ar = locales['ar-SA'];
locales.en = locales['en-US'];
locales.es = locales['es-ES'];
locales.fa = locales['fa-IR'];
locales.no = locales.nb;
locales.zh = locales['zh-CN'];

// Remap from abbr. to intuitive property names
toPairs(locales).forEach(([id, { dow, L, calendar, direction, amPM }]) => {
  locales[id] = {
    id,
    firstDayOfWeek: dow,
    masks: { L },
    calendar,
    direction,
    amPM,
  };
});

export default locales;
