/* eslint-disable no-bitwise, no-multi-assign, import/no-cycle */
import toDate from 'date-fns-tz/toDate';
import getISOWeek from 'date-fns/getISOWeek';
import getWeek from 'date-fns/getWeek';
import addDays from 'date-fns/addDays';
import {
  CalendarDate,
  createCalendar,
  endOfYear,
  getDayOfWeek,
  getLocalTimeZone,
  getWeeksInMonth,
  isToday,
  isWeekend,
  startOfWeek,
  startOfYear,
  toCalendar,
} from '@internationalized/date';
import DateInfo from './dateInfo';
import defaultLocales from './defaults/locales';
import { addPages, arrayHasItems, pad } from './helpers';
import { clamp, defaultsDeep, has, isArray, isDate, isNumber, isObject, isString, pick } from './_';

export const PATCH = {
  DATE_TIME: 1,
  DATE: 2,
  TIME: 3,
};

const PATCH_KEYS = {
  1: ['year', 'month', 'day', 'hours', 'minutes', 'seconds', 'milliseconds'],
  2: ['year', 'month', 'day'],
  3: ['hours', 'minutes', 'seconds', 'milliseconds'],
};

const token =
  /d{1,2}|W{1,4}|M{1,4}|YY(?:YY)?|S{1,3}|Do|Z{1,4}|([HhMsDm])\1?|[aA]|"[^"]*"|'[^']*'/g;
const twoDigits = /\d\d?/;
const threeDigits = /\d{3}/;
const fourDigits = /\d{4}/;
const word =
  /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF/]+(\s*?[\u0600-\u06FF]+){1,2}/i;
const literal = /\[([^]*?)\]/gm;
const noop = () => {};
const monthUpdate = arrName => (d, v, l) => {
  const index = l[arrName].indexOf(
    v.charAt(0).toUpperCase() + v.substr(1).toLowerCase(),
  );
  if (~index) {
    d.month = index;
  }
};
const maskMacros = ['L', 'iso'];

const daysInWeek = 7;
const hourOptions = [
  { value: 0, label: '00' },
  { value: 1, label: '01' },
  { value: 2, label: '02' },
  { value: 3, label: '03' },
  { value: 4, label: '04' },
  { value: 5, label: '05' },
  { value: 6, label: '06' },
  { value: 7, label: '07' },
  { value: 8, label: '08' },
  { value: 9, label: '09' },
  { value: 10, label: '10' },
  { value: 11, label: '11' },
  { value: 12, label: '12' },
  { value: 13, label: '13' },
  { value: 14, label: '14' },
  { value: 15, label: '15' },
  { value: 16, label: '16' },
  { value: 17, label: '17' },
  { value: 18, label: '18' },
  { value: 19, label: '19' },
  { value: 20, label: '20' },
  { value: 21, label: '21' },
  { value: 22, label: '22' },
  { value: 23, label: '23' },
];
const formatFlags = {
  D(d) {
    return d.day;
  },
  DD(d) {
    return pad(d.day);
  },
  Do(d, l) {
    return l.DoFn(d.day);
  },
  d(d) {
    return d.weekday - 1;
  },
  dd(d) {
    return pad(d.weekday - 1);
  },
  W(d, l) {
    return l.dayNamesNarrow[d.weekday - 1];
  },
  WW(d, l) {
    return l.dayNamesShorter[d.weekday - 1];
  },
  WWW(d, l) {
    return l.dayNamesShort[d.weekday - 1];
  },
  WWWW(d, l) {
    return l.dayNames[d.weekday - 1];
  },
  M(d) {
    return d.month;
  },
  MM(d) {
    return pad(d.month);
  },
  MMM(d) {
    const dtf = new Intl.DateTimeFormat(d.locale, {
      month: 'short',
      timezone: 'UTC',
      calendar: d.calendar,
    });
    return dtf.formatToParts(d.date).find(p => p.type === 'month').value;
  },
  MMMM(d) {
    const dtf = new Intl.DateTimeFormat(d.locale, {
      month: 'long',
      timezone: 'UTC',
      calendar: d.calendar,
    });
    return dtf.formatToParts(d.date).find(p => p.type === 'month').value;
  },
  YY(d) {
    return String(d.year).substr(2);
  },
  YYYY(d) {
    return pad(d.year, 4);
  },
  h(d) {
    return d.hours % 12 || 12;
  },
  hh(d) {
    return pad(d.hours % 12 || 12);
  },
  H(d) {
    return d.hours;
  },
  HH(d) {
    return pad(d.hours);
  },
  m(d) {
    return d.minutes;
  },
  mm(d) {
    return pad(d.minutes);
  },
  s(d) {
    return d.seconds;
  },
  ss(d) {
    return pad(d.seconds);
  },
  S(d) {
    return Math.round(d.milliseconds / 100);
  },
  SS(d) {
    return pad(Math.round(d.milliseconds / 10), 2);
  },
  SSS(d) {
    return pad(d.milliseconds, 3);
  },
  a(d, l) {
    return d.hours < 12 ? l.amPm[0] : l.amPm[1];
  },
  A(d, l) {
    return d.hours < 12 ? l.amPm[0].toUpperCase() : l.amPm[1].toUpperCase();
  },
  Z() {
    return 'Z';
  },
  ZZ(d) {
    const o = d.timezoneOffset;
    return `${o > 0 ? '-' : '+'}${pad(Math.floor(Math.abs(o) / 60), 2)}`;
  },
  ZZZ(d) {
    const o = d.timezoneOffset;
    return `${o > 0 ? '-' : '+'}${pad(
      Math.floor(Math.abs(o) / 60) * 100 + (Math.abs(o) % 60),
      4,
    )}`;
  },
  ZZZZ(d) {
    const o = d.timezoneOffset;
    return `${o > 0 ? '-' : '+'}${pad(Math.floor(Math.abs(o) / 60), 2)}:${pad(
      Math.abs(o) % 60,
      2,
    )}`;
  },
};
const parseFlags = {
  D: [
    twoDigits,
    (d, v) => {
      d.day = v;
    },
  ],
  Do: [
    new RegExp(twoDigits.source + word.source),
    (d, v) => {
      d.day = parseInt(v, 10);
    },
  ],
  d: [twoDigits, noop],
  W: [word, noop],
  M: [
    twoDigits,
    (d, v) => {
      d.month = v - 1;
    },
  ],
  MMM: [word, monthUpdate('monthNamesShort')],
  MMMM: [word, monthUpdate('monthNames')],
  YY: [
    twoDigits,
    (d, v) => {
      const da = new Date();
      const cent = +da.getFullYear().toString().substr(0, 2);
      d.year = `${v > 68 ? cent - 1 : cent}${v}`;
    },
  ],
  YYYY: [
    fourDigits,
    (d, v) => {
      d.year = v;
    },
  ],
  S: [
    /\d/,
    (d, v) => {
      d.millisecond = v * 100;
    },
  ],
  SS: [
    /\d{2}/,
    (d, v) => {
      d.millisecond = v * 10;
    },
  ],
  SSS: [
    threeDigits,
    (d, v) => {
      d.millisecond = v;
    },
  ],
  h: [
    twoDigits,
    (d, v) => {
      d.hour = v;
    },
  ],
  m: [
    twoDigits,
    (d, v) => {
      d.minute = v;
    },
  ],
  s: [
    twoDigits,
    (d, v) => {
      d.second = v;
    },
  ],
  a: [
    word,
    (d, v, l) => {
      const val = v.toLowerCase();
      if (val === l.amPm[0]) {
        d.isPm = false;
      } else if (val === l.amPm[1]) {
        d.isPm = true;
      }
    },
  ],
  Z: [
    /[^\s]*?[+-]\d\d:?\d\d|[^\s]*?Z?/,
    (d, v) => {
      if (v === 'Z') v = '+00:00';
      const parts = `${v}`.match(/([+-]|\d\d)/gi);
      if (parts) {
        const minutes = +(parts[1] * 60) + parseInt(parts[2], 10);
        d.timezoneOffset = parts[0] === '+' ? minutes : -minutes;
      }
    },
  ],
};
parseFlags.DD = parseFlags.D;
parseFlags.dd = parseFlags.d;
parseFlags.WWWW = parseFlags.WWW = parseFlags.WW = parseFlags.W;
parseFlags.MM = parseFlags.M;
parseFlags.mm = parseFlags.m;
parseFlags.hh = parseFlags.H = parseFlags.HH = parseFlags.h;
parseFlags.ss = parseFlags.s;
parseFlags.A = parseFlags.a;
parseFlags.ZZZZ = parseFlags.ZZZ = parseFlags.ZZ = parseFlags.Z;

export function resolveConfig(config, locales) {
  // Get the detected locale string
  const detLocale = new Intl.DateTimeFormat(config?.id).resolvedOptions().locale;
  // Resolve the locale id
  let id;
  if (isString(config)) {
    id = config;
  } else if (has(config, 'id')) {
    id = config.id;
  }
  id = (id || detLocale).toLowerCase();
  const localeKeys = Object.keys(locales);
  const validKey = k => localeKeys.find(lk => lk.toLowerCase() === k);
  id = validKey(id) || validKey(id.substring(0, 2)) || detLocale;
  // get calendar
  let calendar = new Intl.DateTimeFormat(id).resolvedOptions().calendar;
  // supported calendars by @internationalized/date
  const supportedCalendars = ['gregory', 'buddhist', 'ethiopic', 'ethioaa', 'coptic', 'hebrew', 'indian',
    'islamic-civil', 'islamic-tbla', 'islamic-umalqura', 'japanese', 'persian', 'roc'];
  if (locales[id]?.calendar && supportedCalendars.includes(locales[id]?.calendar)) {
    calendar = locales[id]?.calendar;
  }
  if (config?.calendar && !supportedCalendars.includes(config?.calendar)) {
    delete config.calendar;
  } else if (config?.calendar && supportedCalendars.includes(config?.calendar)) {
    calendar = config?.calendar;
  }
  // get direction
  let direction = new Intl.Locale(id)?.textInfo?.direction;
  if (locales[id]?.direction && ['ltr', 'rtl'].includes(locales[id]?.direction)) {
    direction = locales[id]?.direction;
  }
  if (config?.direction && !['ltr', 'rtl'].includes(config?.direction)) {
    delete config.direction;
  } else if (config?.direction && ['ltr', 'rtl'].includes(config?.direction)) {
    direction = config?.direction;
  }
  // Add fallback and spread default locale to prevent repetitive update loops
  const defLocale = { ...locales['en-IE'], ...locales[id], id, calendar, direction };
  // Assign or merge defaults with provided config
  config = isObject(config) ? defaultsDeep(config, defLocale) : defLocale;
  // Return resolved config
  return config;
}

export default class Locale {
  constructor(config, { locales = defaultLocales, timezone } = {}) {
    const { id, firstDayOfWeek, masks, calendar, direction, amPM } = resolveConfig(config, locales);
    this.id = id;
    this.daysInWeek = daysInWeek;
    this.firstDayOfWeek = clamp(firstDayOfWeek, 1, daysInWeek);
    this.masks = masks;
    this.timezone = timezone || undefined;
    this.dayNames = this.getDayNames('long');
    this.dayNamesShort = this.getDayNames('short');
    this.dayNamesShorter = this.dayNamesShort.map(s => s.substring(0, 2));
    this.dayNamesNarrow = this.getDayNames('narrow');
    this.monthNames = this.getMonthNames(calendar, 'long');
    this.monthNamesShort = this.getMonthNames(calendar, 'short');
    this.amPm = amPM ?? ['am', 'pm'];
    this.monthData = {};
    this.calendar = calendar;
    this.direction = direction;
    this.createCalendar = createCalendar(calendar);
    // Bind methods
    this.getMonthComps = this.getMonthComps.bind(this);
    this.parse = this.parse.bind(this);
    this.format = this.format.bind(this);
    this.toPage = this.toPage.bind(this);
  }

  format(date, mask) {
    date = this.normalizeDate(date);
    if (!date) return '';
    mask = this.normalizeMasks(mask)[0];
    const literals = [];
    // Make literals inactive by replacing them with ??
    mask = mask.replace(literal, ($0, $1) => {
      literals.push($1);
      return '??';
    });
    const timezone = /Z$/.test(mask) ? 'utc' : this.timezone;
    const dateParts = this.getDateParts(date, timezone);
    // Apply formatting rules
    mask = mask.replace(token, $0 =>
      $0 in formatFlags
        ? formatFlags[$0](dateParts, this)
        : $0.slice(1, $0.length - 1),
    );
    // Inline literal values back into the formatted value
    return mask.replace(/\?\?/g, () => literals.shift());
  }

  parse(dateString, mask) {
    const masks = this.normalizeMasks(mask);
    return (
      masks
        .map(m => {
          if (typeof m !== 'string') {
            throw new Error('Invalid mask in fecha.parse');
          }
          // Reset string value
          let str = dateString;
          // Avoid regular expression denial of service, fail early for really long strings
          // https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS
          if (str.length > 1000) {
            return false;
          }

          let isValid = true;
          const dateInfo = {};
          m.replace(token, $0 => {
            if (parseFlags[$0]) {
              const info = parseFlags[$0];
              const index = str.search(info[0]);
              if (!~index) {
                isValid = false;
              } else {
                str.replace(info[0], result => {
                  info[1](dateInfo, result, this);
                  str = str.substr(index + result.length);
                  return result;
                });
              }
            }

            return parseFlags[$0] ? '' : $0.slice(1, $0.length - 1);
          });

          if (!isValid) {
            return false;
          }

          const today = new Date();
          if (
            dateInfo.isPm === true &&
            dateInfo.hour != null &&
            +dateInfo.hour !== 12
          ) {
            dateInfo.hour = +dateInfo.hour + 12;
          } else if (dateInfo.isPm === false && +dateInfo.hour === 12) {
            dateInfo.hour = 0;
          }

          let date;
          if (dateInfo.timezoneOffset != null) {
            dateInfo.minute =
              +(dateInfo.minute || 0) - +dateInfo.timezoneOffset;
            date = new Date(
              Date.UTC(
                dateInfo.year || today.getFullYear(),
                dateInfo.month || 0,
                dateInfo.day || 1,
                dateInfo.hour || 0,
                dateInfo.minute || 0,
                dateInfo.second || 0,
                dateInfo.millisecond || 0,
              ),
            );
          } else {
            date = this.getDateFromParts({
              year: dateInfo.year || today.getFullYear(),
              month: (dateInfo.month || 0) + 1,
              day: dateInfo.day || 1,
              hours: dateInfo.hour || 0,
              minutes: dateInfo.minute || 0,
              seconds: dateInfo.second || 0,
              milliseconds: dateInfo.millisecond || 0,
            });
          }
          return date;
        })
        .find(d => d) || new Date(dateString)
    );
  }

  // Normalizes mask(s) as an array with replaced mask macros
  normalizeMasks(masks) {
    return (
      (arrayHasItems(masks) && masks) || [
        (isString(masks) && masks) || 'YYYY-MM-DD',
      ]
    ).map(m =>
      maskMacros.reduce(
        (prev, curr) => prev.replace(curr, this.masks[curr] || ''),
        m,
      ),
    );
  }

  normalizeDate(d, config = {}) {
    let result = null;
    let { type, fillDate } = config;
    const { mask, patch, time } = config;
    const auto = type === 'auto' || !type;
    if (isNumber(d)) {
      type = 'number';
      result = new Date(+d);
    } else if (isString(d)) {
      type = 'string';
      result = d ? this.parse(d, mask || 'iso') : null;
    } else if (isObject(d)) {
      type = 'object';
      result = this.getDateFromParts(d);
    } else {
      type = 'date';
      result = isDate(d) ? new Date(d.getTime()) : null;
    }

    if (result && patch) {
      fillDate = fillDate == null ? new Date() : this.normalizeDate(fillDate);
      const parts = {
        ...this.getDateParts(fillDate),
        ...pick(this.getDateParts(result), PATCH_KEYS[patch]),
      };
      result = this.getDateFromParts(parts);
    }
    if (auto) config.type = type;
    if (result && !isNaN(result.getTime())) {
      if (time) {
        result = this.adjustTimeForDate(result, {
          timeAdjust: time,
        });
      }
      return result;
    }
    return null;
  }

  denormalizeDate(date, { type, mask } = {}) {
    switch (type) {
      case 'number':
        return date ? date.getTime() : NaN;
      case 'string':
        return date ? this.format(date, mask || 'iso') : '';
      default:
        return date ? new Date(date) : null;
    }
  }

  hourIsValid(hour, validHours, dateParts) {
    if (!validHours) return true;
    if (isArray(validHours)) return validHours.includes(hour);
    if (isObject(validHours)) {
      const min = validHours.min || 0;
      const max = validHours.max || 24;
      return min <= hour && max >= hour;
    }
    return validHours(hour, dateParts);
  }

  getHourOptions(validHours, dateParts) {
    return hourOptions.filter(opt =>
      this.hourIsValid(opt.value, validHours, dateParts),
    );
  }

  getMinuteOptions(minuteIncrement) {
    const options = [];
    minuteIncrement = minuteIncrement > 0 ? minuteIncrement : 1;
    for (let i = 0; i <= 59; i += minuteIncrement) {
      options.push({
        value: i,
        label: pad(i, 2),
      });
    }
    return options;
  }

  nearestOptionValue(value, options) {
    if (value == null) return value;
    const result = options.reduce((prev, opt) => {
      if (opt.disabled) return prev;
      if (isNaN(prev)) return opt.value;
      const diffPrev = Math.abs(prev - value);
      const diffCurr = Math.abs(opt.value - value);
      return diffCurr < diffPrev ? opt.value : prev;
    }, NaN);
    return isNaN(result) ? value : result;
  }

  adjustTimeForDate(date, { timeAdjust, validHours, minuteIncrement }) {
    if (!timeAdjust && !validHours && !minuteIncrement) return date;
    const dateParts = this.getDateParts(date);
    if (timeAdjust) {
      if (timeAdjust === 'now') {
        const timeParts = this.getDateParts(new Date());
        dateParts.hours = timeParts.hours;
        dateParts.minutes = timeParts.minutes;
        dateParts.seconds = timeParts.seconds;
        dateParts.milliseconds = timeParts.milliseconds;
      } else {
        const d = new Date(`2000-01-01T${timeAdjust}Z`);
        dateParts.hours = d.getUTCHours();
        dateParts.minutes = d.getUTCMinutes();
        dateParts.seconds = d.getUTCSeconds();
        dateParts.milliseconds = d.getUTCMilliseconds();
      }
    }
    if (validHours) {
      const options = this.getHourOptions(validHours, dateParts);
      dateParts.hours = this.nearestOptionValue(dateParts.hours, options);
    }
    if (minuteIncrement) {
      const options = this.getMinuteOptions(minuteIncrement);
      dateParts.minutes = this.nearestOptionValue(dateParts.minutes, options);
    }
    date = this.getDateFromParts(dateParts);
    return date;
  }

  normalizeDates(dates, opts) {
    opts = opts || {};
    opts.locale = this;
    // Assign dates
    return (isArray(dates) ? dates : [dates])
      .map(d => d && (d instanceof DateInfo ? d : new DateInfo(d, opts)))
      .filter(d => d);
  }

  getDateParts(date, timezone = this.timezone) {
    if (!date) return null;
    let tzDate = date;
    if (timezone) {
      const normDate = new Date(
        date.toLocaleString('en-US', { timeZone: timezone }),
      );
      normDate.setMilliseconds(date.getMilliseconds());
      const diff = normDate.getTime() - date.getTime();
      tzDate = new Date(date.getTime() + diff);
    }
    const intlDate = new CalendarDate(tzDate.getFullYear(), tzDate.getMonth() + 1, tzDate.getDate());
    const localeCalendarDate = toCalendar(intlDate, this.createCalendar);
    const milliseconds = tzDate.getMilliseconds();
    const seconds = tzDate.getSeconds();
    const minutes = tzDate.getMinutes();
    const hours = tzDate.getHours();
    const month = localeCalendarDate.month;
    const year = localeCalendarDate.year;
    const comps = this.getMonthComps(month, year);
    const day = localeCalendarDate.day;
    const dayFromEnd = comps.days - day + 1;
    const weekday = intlDate.toDate(getLocalTimeZone()).getDay() + 1;
    const weekdayOrdinal = Math.floor((day - 1) / 7 + 1);
    const weekdayOrdinalFromEnd = Math.floor((comps.days - day) / 7 + 1);
    const week = Math.ceil(
      (day + Math.abs(comps.firstWeekday - comps.firstDayOfWeek)) / 7,
    );
    const weekFromEnd = comps.weeks - week + 1;
    const parts = {
      milliseconds,
      seconds,
      minutes,
      hours,
      day,
      dayFromEnd,
      weekday,
      weekdayOrdinal,
      weekdayOrdinalFromEnd,
      week,
      weekFromEnd,
      month,
      year,
      date,
      locale: this.id,
      calendar: this.calendar,
      isValid: true,
    };
    parts.timezoneOffset = this.getTimezoneOffset(parts);
    return parts;
  }

  getDateFromParts(parts) {
    if (!parts) return null;
    if (this.createCalendar && parts?.calendar) {
      const intlDate = new CalendarDate(this.createCalendar, parts.year, parts.month, parts.day);
      const date = intlDate.toDate(getLocalTimeZone());
      parts.year = date.getFullYear();
      parts.month = date.getMonth() + 1;
      parts.day = date.getDate();
    }
    const d = new Date();
    const {
      year = d.getFullYear(),
      month = d.getMonth() + 1,
      day = d.getDate(),
      hours: hrs = 0,
      minutes: min = 0,
      seconds: sec = 0,
      milliseconds: ms = 0,
    } = parts;

    if (this.timezone) {
      const dateString = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}T${pad(
        hrs,
        2,
      )}:${pad(min, 2)}:${pad(sec, 2)}.${pad(ms, 3)}`;
      return toDate(dateString, { timeZone: this.timezone });
    }
    return new Date(year, month - 1, day, hrs, min, sec, ms);
  }

  getTimezoneOffset(parts) {
    const {
      year: y,
      month: m,
      day: d,
      hours: hrs = 0,
      minutes: min = 0,
      seconds: sec = 0,
      milliseconds: ms = 0,
    } = parts;
    let date;
    const utcDate = new Date(Date.UTC(y, m - 1, d, hrs, min, sec, ms));
    if (this.timezone) {
      const dateString = `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}T${pad(
        hrs,
        2,
      )}:${pad(min, 2)}:${pad(sec, 2)}.${pad(ms, 3)}`;
      date = toDate(dateString, { timeZone: this.timezone });
    } else {
      date = new Date(y, m - 1, d, hrs, min, sec, ms);
    }
    return (date - utcDate) / 60000;
  }

  toPage(arg, fromPage) {
    if (isNumber(arg)) {
      fromPage.calendar = this.calendar;
      return addPages(fromPage, arg);
    }
    if (isString(arg)) {
      return this.getDateParts(this.normalizeDate(arg));
    }
    if (isDate(arg)) {
      return this.getDateParts(arg);
    }
    if (isObject(arg)) {
      return arg;
    }
    return null;
  }

  getStartingYear(calendar) {
    switch (calendar) {
      case 'gregory':
        return 2000;
      case 'buddhist':
        return 2550;
      case 'ethiopic':
        return 2000;
      case 'ethioaa':
        return 7500;
      case 'coptic':
        return 1720;
      case 'hebrew':
        return 5750;
      case 'indian':
        return 1920;
      case 'islamic-civil':
      case 'islamic-tbla':
      case 'islamic-umalqura':
        return 1420;
      case 'japanese':
        return 1;
      case 'persian':
        return 1400;
      case 'roc':
        return 100;
      default:
        return 2000;
    }
  }

  getMonthDates(calendar, year) {
    if (!calendar) {
      return [];
    }

    if (!year) {
      year = this.getStartingYear(calendar);
    }

    const createdCalendar = this.createCalendar ?? createCalendar(calendar);
    const intlDate = new CalendarDate(createdCalendar, year, 1, 1);
    const dates = [];
    for (let i = 0; i < createdCalendar.getMonthsInYear(intlDate); i++) {
      dates.push(intlDate.add({ months: i }));
    }
    return dates;
  }

  getMonthNames(calendar, length) {
    const dtf = new Intl.DateTimeFormat(this.id, {
      month: length,
      timezone: 'UTC',
      calendar,
    });
    return this.getMonthDates(calendar).map(d => dtf.formatToParts(d.toDate(getLocalTimeZone())).find(p => p.type === 'month').value);
  }

  getWeekdayDates(firstDayOfWeek = this.firstDayOfWeek) {
    const dates = [];
    const year = 2020;
    const month = 1;
    const day = 5 + firstDayOfWeek - 1;
    for (let i = 0; i < daysInWeek; i++) {
      dates.push(
        this.getDateFromParts({
          year,
          month,
          day: day + i,
          hours: 12,
        }),
      );
    }
    return dates;
  }

  getDayNames(length) {
    const dtf = new Intl.DateTimeFormat(this.id, {
      weekday: length,
      timeZone: this.timezone,
      calendar: this.calendar,
    });
    return this.getWeekdayDates(1).map(d => dtf.format(d));
  }

  // Days/month/year components for a given month and year
  getMonthComps(month, year) {
    const key = `${month}-${year}`;
    let comps = this.monthData[key];
    if (!comps) {
      let intlDate = new CalendarDate(this.createCalendar, year, month, 1);
      const firstDayOfMonth = intlDate.toDate(getLocalTimeZone());
      const firstWeekday = firstDayOfMonth.getDay() + 1;
      const days = this.createCalendar.getDaysInMonth(intlDate);
      const weekStartsOn = this.firstDayOfWeek - 1;
      let weeks = getWeeksInMonth(intlDate, this.id);
      let addToWeeks = 0;
      let addToAllWeeks = 0;
      if (['indian', 'ethiopic', 'buddhist', 'islamic-umalqura'].includes(this.calendar)) {
        // calculate the number of weeks in indian, ethiopic, umalqura and buddhist calendars
        const prevMonthDaysToShow =
          firstWeekday +
          (firstWeekday < this.firstDayOfWeek ? daysInWeek : 0) -
          this.firstDayOfWeek;
        weeks = Math.ceil((prevMonthDaysToShow + days) / 7);
        if (this.calendar === 'islamic-umalqura' && prevMonthDaysToShow === 0) {
          addToWeeks = 1;
        }

        if (['ethiopic', 'indian'].includes(this.calendar) && getDayOfWeek(endOfYear(intlDate.subtract({ years: 1 })), this.id) === 6) {
          addToAllWeeks = 1;
        }

        if (['ethiopic', 'indian'].includes(this.calendar) && prevMonthDaysToShow === 6) {
          addToWeeks = -1;
        }
      }
      const weeknumbers = [];
      const isoWeeknumbers = [];
      const localeWeeknumbers = [];
      const yearStart = startOfYear(intlDate);
      const yearWeekStart = startOfWeek(yearStart, this.id).toDate(getLocalTimeZone());
      for (let i = 0; i < weeks; i++) {
        const date = addDays(firstDayOfMonth, i * 7);
        weeknumbers.push(getWeek(date, { weekStartsOn }));
        isoWeeknumbers.push(getISOWeek(date));
        // get locale week number
        const diff = startOfWeek(intlDate, this.id).toDate(getLocalTimeZone()) - yearWeekStart;
        // Round the number of weeks to the nearest integer because the number of
        // milliseconds in a week is not constant (e.g., it's different in the week of
        // the daylight-saving time clock shift).
        const millisecondsInWeek = 604800000;
        localeWeeknumbers.push(Math.round(diff / millisecondsInWeek) + 1 + addToWeeks + addToAllWeeks);
        intlDate = intlDate.add({ weeks: 1 });
      }
      comps = {
        firstDayOfWeek: this.firstDayOfWeek,
        firstWeekday,
        days,
        weeks,
        month,
        year,
        weeknumbers,
        isoWeeknumbers,
        localeWeeknumbers,
      };
      this.monthData[key] = comps;
    }
    return comps;
  }

  // Days/month/year components for today's month
  getThisMonthComps() {
    const { month, year } = this.getDateParts(new Date());
    return this.getMonthComps(month, year);
  }

  // Day/month/year components for the previous month
  getPrevMonthComps(month, year) {
    const intlDate = new CalendarDate(this.createCalendar, year, month, 1);
    if (month === 1) return this.getMonthComps(this.createCalendar.getMonthsInYear(intlDate), year - 1);
    return this.getMonthComps(month - 1, year);
  }

  // Day/month/year components for next month
  getNextMonthComps(month, year) {
    const intlDate = new CalendarDate(this.createCalendar, year, month, 1);
    if (month === this.createCalendar.getMonthsInYear(intlDate)) return this.getMonthComps(1, year + 1);
    return this.getMonthComps(month + 1, year);
  }

  getDayId(date) {
    return this.format(date, 'YYYY-MM-DD');
  }

  // Builds day components for a given page
  getCalendarDays({ weeks, monthComps, prevMonthComps, nextMonthComps }) {
    const days = [];
    const { firstDayOfWeek, firstWeekday, isoWeeknumbers, weeknumbers, localeWeeknumbers } =
      monthComps;
    const prevMonthDaysToShow =
      firstWeekday +
      (firstWeekday < firstDayOfWeek ? daysInWeek : 0) -
      firstDayOfWeek;
    let prevMonth = true;
    let thisMonth = false;
    let nextMonth = false;
    // Formatter for aria labels
    const formatter = new Intl.DateTimeFormat(this.id, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      calendar: this.calendar,
    });
    // Init counters with previous month's data
    let day = prevMonthComps.days - prevMonthDaysToShow + 1;
    let dayFromEnd = prevMonthComps.days - day + 1;
    let weekdayOrdinal = Math.floor((day - 1) / daysInWeek + 1);
    let weekdayOrdinalFromEnd = 1;
    let week = prevMonthComps.weeks;
    let weekFromEnd = 1;
    let month = prevMonthComps.month;
    let year = prevMonthComps.year;
    let intlDate = new CalendarDate(this.createCalendar, year, month, day);
    const dft = (y, m, d) => (hours, minutes, seconds, milliseconds) =>
      this.normalizeDate({
        year: y,
        month: m,
        day: d,
        hours,
        minutes,
        seconds,
        milliseconds,
      });
    // Cycle through 6 weeks (max in month)
    for (let w = 1; w <= weeks; w++) {
      // Cycle through days in week
      for (
        let i = 1, weekday = firstDayOfWeek;
        i <= daysInWeek;
        i++, weekday += weekday === daysInWeek ? 1 - daysInWeek : 1
      ) {
        // We need to know when to start counting actual month days
        if (prevMonth && weekday === firstWeekday) {
          // Reset counters for current month
          day = 1;
          dayFromEnd = monthComps.days;
          weekdayOrdinal = Math.floor((day - 1) / daysInWeek + 1);
          weekdayOrdinalFromEnd = Math.floor(
            (monthComps.days - day) / daysInWeek + 1,
          );
          week = 1;
          weekFromEnd = monthComps.weeks;
          month = monthComps.month;
          year = monthComps.year;
          // ...and flag we're tracking actual month days
          prevMonth = false;
          thisMonth = true;
        }
        intlDate = intlDate.set({ month, year, day });
        // Append day info for the current week
        // Note: this might or might not be an actual month day
        //  We don't know how the UI wants to display various days,
        //  so we'll supply all the data we can
        const dateFromTime = dft(intlDate.toDate(getLocalTimeZone()).getFullYear(), intlDate.toDate(getLocalTimeZone()).getMonth() + 1, intlDate.toDate(getLocalTimeZone()).getDate());
        const range = {
          start: dateFromTime(0, 0, 0),
          end: dateFromTime(23, 59, 59, 999),
        };
        const date = range.start;
        const localeID = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
        const id = `${pad(intlDate.toDate(getLocalTimeZone()).getFullYear(), 4)}-${pad(intlDate.toDate(getLocalTimeZone()).getMonth() + 1, 2)}-${pad(intlDate.toDate(getLocalTimeZone()).getDate(), 2)}`;
        const dayID = localeID !== id ? `${id} id-${localeID}` : id;
        const weekend = isWeekend(intlDate, this.id);
        const weekdayPosition = i;
        const weekdayPositionFromEnd = daysInWeek - i;
        const weeknumber = weeknumbers[w - 1];
        const isoWeeknumber = isoWeeknumbers[w - 1];
        const localeWeeknumber = localeWeeknumbers[w - 1];
        const isItToday = isToday(intlDate, getLocalTimeZone());
        const isFirstDay = thisMonth && day === 1;
        const isLastDay = thisMonth && day === monthComps.days;
        const onTop = w === 1;
        const onBottom = w === weeks;
        const onLeft = i === 1;
        const onRight = i === daysInWeek;
        days.push({
          id: localeID,
          label: day.toString(),
          ariaLabel: formatter.format(intlDate.toDate(getLocalTimeZone())),
          day,
          dayFromEnd,
          weekday,
          weekdayPosition,
          weekdayPositionFromEnd,
          weekdayOrdinal,
          weekdayOrdinalFromEnd,
          week,
          weekFromEnd,
          weeknumber,
          isoWeeknumber,
          localeWeeknumber,
          month,
          year,
          dateFromTime,
          date,
          range,
          isToday: isItToday,
          isFirstDay,
          isLastDay,
          inMonth: thisMonth,
          inPrevMonth: prevMonth,
          inNextMonth: nextMonth,
          onTop,
          onBottom,
          onLeft,
          onRight,
          classes: [
            `id-${dayID}`,
            `day-${day}`,
            `day-from-end-${dayFromEnd}`,
            `weekday-${weekday}`,
            `weekday-position-${weekdayPosition}`,
            `weekday-ordinal-${weekdayOrdinal}`,
            `weekday-ordinal-from-end-${weekdayOrdinalFromEnd}`,
            `week-${week}`,
            `week-from-end-${weekFromEnd}`,
            {
              'is-weekend': weekend,
              'is-today': isItToday,
              'is-first-day': isFirstDay,
              'is-last-day': isLastDay,
              'in-month': thisMonth,
              'in-prev-month': prevMonth,
              'in-next-month': nextMonth,
              'on-top': onTop,
              'on-bottom': onBottom,
              [`on-${this.direction === 'ltr' ? 'left' : 'right'}`]: onLeft,
              [`on-${this.direction === 'ltr' ? 'right' : 'left'}`]: onRight,
            },
          ],
        });
        // See if we've hit the last day of the month
        if (thisMonth && isLastDay) {
          thisMonth = false;
          nextMonth = true;
          // Reset counters to next month's data
          day = 1;
          dayFromEnd = nextMonthComps.days;
          weekdayOrdinal = 1;
          weekdayOrdinalFromEnd = Math.floor(
            (nextMonthComps.days - day) / daysInWeek + 1,
          );
          week = 1;
          weekFromEnd = nextMonthComps.weeks;
          month = nextMonthComps.month;
          year = nextMonthComps.year;
          // Still in the middle of the month (hasn't ended yet)
        } else {
          day++;
          dayFromEnd--;
          weekdayOrdinal = Math.floor((day - 1) / daysInWeek + 1);
          weekdayOrdinalFromEnd = Math.floor(
            (monthComps.days - day) / daysInWeek + 1,
          );
        }
      }
      // Append week days
      week++;
      weekFromEnd--;
    }
    return days;
  }
}
