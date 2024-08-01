import {
  type ExtractPropTypes,
  type PropType,
  computed,
  inject,
  provide,
} from 'vue';
import { type DarkModeClassConfig, useDarkMode } from 'vue-screen-utils';
import { Attribute } from '../utils/attribute';
import { type DayOfWeek, addDays } from '../utils/date/helpers';
import { getDefault } from '../utils/defaults';
import { has, isObject, isString } from '../utils/helpers';
import { default as Locale, type LocaleConfig } from '../utils/locale';
import { Theme } from '../utils/theme';

const contextKey = Symbol('__vc_base_context__');

export const propsDef = {
  color: {
    type: String,
    default: () => getDefault('color'),
  },
  isDark: {
    type: [Boolean, String, Object] as PropType<
      boolean | 'system' | DarkModeClassConfig
    >,
    default: () => getDefault('isDark'),
  },
  firstDayOfWeek: Number as PropType<DayOfWeek>,
  masks: Object,
  locale: [String, Object] as PropType<string | Record<string, any> | Locale>,
  timezone: String,
  calendar: String,
  direction: String,
  minDate: null,
  maxDate: null,
  disabledDates: null,
};

export type BaseProps = Readonly<ExtractPropTypes<typeof propsDef>>;

export type BaseContext = ReturnType<typeof createBase>;

export function createBase(props: BaseProps) {
  // #region Computed

  const color = computed(() => props.color ?? '');
  const isDark = computed(() => props.isDark ?? false);
  const { displayMode } = useDarkMode(isDark);
  const theme = computed(() => new Theme(color.value));

  const locale = computed(() => {
    // Return the locale prop if it is an instance of the Locale class
    if (props.locale instanceof Locale) return props.locale;
    // Build up a base config from component props
    let intLocale = null;
    let detID;
    let _id;
    if (isString(props.locale)) {
      _id = props.locale;
    } else if (has(props.locale, 'id')) {
      _id = props.locale!.id;
    }
    if (props.locale) {
      intLocale = new Intl.Locale(_id);
      detID = intLocale.region ? `${intLocale.language}-${intLocale.region}` : intLocale.language;
    }
    const config = (
      isObject(props.locale)
        ? props.locale
        : {
            id: detID,
            firstDayOfWeek: props.firstDayOfWeek,
            masks: props.masks,
            calendar: props.calendar ?? intLocale?.calendar,
            direction: props.direction,
          }
    ) as Partial<LocaleConfig>;
    // Return new locale
    return new Locale(config, props.timezone);
  });

  const masks = computed(() => locale.value.masks);

  const minDate = computed(() => props.minDate);
  const maxDate = computed(() => props.maxDate);

  const disabledDates = computed(() => {
    const dates: any[] = props.disabledDates ? [...props.disabledDates] : [];
    // Add disabled range for min date
    if (minDate.value != null) {
      dates.push({
        start: null,
        end: addDays(locale.value.toDate(minDate.value), -1),
      });
    }
    // Add disabled range for max date
    if (maxDate.value != null) {
      dates.push({
        start: addDays(locale.value.toDate(maxDate.value), 1),
        end: null,
      });
    }
    return locale.value.ranges(dates);
  });

  const disabledAttribute = computed(() => {
    return new Attribute(
      {
        key: 'disabled',
        dates: disabledDates.value,
        order: 100,
      },
      theme.value,
      locale.value,
    );
  });

  // #endregion Computed

  const context = {
    color,
    isDark,
    displayMode,
    theme,
    locale,
    masks,
    minDate,
    maxDate,
    disabledDates,
    disabledAttribute,
  };
  provide(contextKey, context);
  return context;
}

export function useBase() {
  const context = inject<BaseContext>(contextKey);
  if (context) return context;
  throw new Error(
    'Base context missing. Please verify this component is nested within a valid context provider.',
  );
}

export function useOrCreateBase(props: BaseProps) {
  return inject<BaseContext>(contextKey, () => createBase(props), true);
}
