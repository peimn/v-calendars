<template>
  <!-- Only render <Component> if slot is not null or undefined -->
  <Component v-if="slot" :is="slot" v-bind="$attrs" />

  <!-- Render default slot if slot is null or undefined -->
  <slot v-else />
</template>

<script lang="ts">
export default {
  inheritAttrs: false, // Ensures $attrs are manually passed
};
</script>

<script setup lang="ts">
import { useSlot } from '../../use/slots';

export type CalendarSlotName =
  | 'day-content'
  | 'day-popover'
  | 'dp-footer'
  | 'footer'
  | 'header-title-wrapper'
  | 'header-title'
  | 'header-prev-button'
  | 'header-next-button'
  | 'nav'
  | 'nav-prev-button'
  | 'nav-next-button'
  | 'page'
  | 'time-header';

const props = defineProps<{
  name: CalendarSlotName;
}>();

// Include null in the possible types for slot
const slot = useSlot(props.name) as string | null | undefined;
</script>
