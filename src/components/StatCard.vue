<script setup lang="ts">
defineProps<{
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'gold' | 'green' | 'red' | 'default';
}>();
</script>

<template>
  <div class="bg-table-800/80 border border-table-border p-4 rounded-xl shadow-lg flex flex-col justify-between">
    <span class="text-xs font-medium text-gray-400">{{ title }}</span>
    <div class="mt-2 flex items-baseline gap-2">
      <span
        class="text-2xl font-black font-mono tracking-tight"
        :class="{
          'text-gold-400': variant === 'gold',
          'text-emerald-400': variant === 'green',
          'text-rose-400': variant === 'red',
          'text-gray-100': !variant || variant === 'default'
        }"
      >
        {{ value }}
      </span>
    </div>
    <span v-if="subtitle" class="text-xs text-gray-500 mt-1">{{ subtitle }}</span>
  </div>
</template>