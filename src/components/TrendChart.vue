<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: Array<{ date: string; matchAmount: number; cumulative: number }>;
}>();

const width = 600;
const height = 180;
const padding = 25;

const points = computed(() => {
  if (props.data.length < 2) return [];
  const values = props.data.map((d) => d.cumulative);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  return props.data.map((d, index) => {
    const x = padding + (index / (props.data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.cumulative - min) / range) * (height - padding * 2);
    return { x, y, ...d };
  });
});

const zeroY = computed(() => {
  if (props.data.length < 2) return height / 2;
  const values = props.data.map((d) => d.cumulative);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  return height - padding - ((0 - min) / range) * (height - padding * 2);
});

const pathString = computed(() => {
  if (points.value.length === 0) return '';
  return points.value.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
});
</script>

<template>
  <div class="w-full bg-table-800/80 border border-table-border p-4 rounded-xl shadow-lg">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-semibold text-gray-300">📈 近期淨利走勢 (近 {{ data.length }} 場)</h3>
      <span class="text-xs text-gray-400">虛線為平盤損益基準</span>
    </div>

    <div v-if="data.length >= 2" class="relative w-full aspect-[10/3]">
      <svg :viewBox="`0 0 ${width} ${height}`" class="w-full h-full overflow-visible">
        <line
          :x1="padding"
          :y1="zeroY"
          :x2="width - padding"
          :y2="zeroY"
          stroke="#475569"
          stroke-dasharray="4 4"
          stroke-width="1.5"
        />
        <path
          :d="pathString"
          fill="none"
          stroke="#eab308"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle
          v-for="(p, i) in points"
          :key="i"
          :cx="p.x"
          :cy="p.y"
          r="4"
          :fill="p.cumulative >= 0 ? '#34d399' : '#f87171'"
          stroke="#0b231a"
          stroke-width="2"
        />
      </svg>
    </div>
    <div v-else class="h-28 flex items-center justify-center text-xs text-gray-500">
      記錄超過 2 場後將在此繪製淨利折線走勢
    </div>
  </div>
</template>