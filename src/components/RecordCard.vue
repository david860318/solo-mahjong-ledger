<script setup lang="ts">
import { Trash2, Edit3, MapPin } from 'lucide-vue-next';
import type { MahjongRecord } from '../types/mahjong';
import { formatCurrency, formatDate } from '../utils/formatters';

const props = defineProps<{ record: MahjongRecord }>();
const emit = defineEmits(['edit', 'delete']);

function confirmDelete(e: Event) {
  e.stopPropagation();
  if (confirm(`確定要刪除這筆 ${formatDate(props.record.date)} 的紀錄嗎？`)) {
    emit('delete', props.record.id);
  }
}
</script>

<template>
  <div
    @click="$emit('edit', record)"
    class="group cursor-pointer bg-table-800/80 hover:bg-table-800 border border-table-border hover:border-gold-500/50 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all shadow-md relative overflow-hidden"
  >
    <div
      class="absolute left-0 top-0 bottom-0 w-1.5"
      :class="record.amount > 0 ? 'bg-emerald-400' : record.amount < 0 ? 'bg-rose-400' : 'bg-gray-500'"
    ></div>

    <div class="space-y-1.5 pl-2">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-gray-400 font-mono">{{ formatDate(record.date) }}</span>
        <span class="text-xs px-2 py-0.5 rounded-md bg-table-700 text-gold-400 font-semibold border border-table-border">
          {{ record.baseScore }}/{{ record.pointScore }} · {{ record.rounds }}將
        </span>
        <span v-if="record.location" class="text-xs text-gray-400 flex items-center gap-1">
          <MapPin class="w-3 h-3 text-gold-500/70" />
          {{ record.location }}
        </span>
      </div>

      <div v-if="record.tags && record.tags.length > 0" class="flex flex-wrap gap-1">
        <span
          v-for="t in record.tags"
          :key="t"
          class="text-[10px] bg-table-900 border border-table-border text-gray-300 px-2 py-0.5 rounded-md"
        >
          {{ t }}
        </span>
      </div>

      <p v-if="record.notes" class="text-xs text-gray-400 italic">{{ record.notes }}</p>
    </div>

    <div class="flex items-center gap-3">
      <div class="text-right">
        <div
          class="text-xl font-black font-mono tracking-tight"
          :class="record.amount > 0 ? 'text-emerald-400' : record.amount < 0 ? 'text-rose-400' : 'text-gray-400'"
        >
          {{ formatCurrency(record.amount) }}
        </div>
      </div>

      <div class="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
        <button
          @click.stop="$emit('edit', record)"
          class="text-gray-400 hover:text-gold-400 p-1.5 rounded-lg hover:bg-table-700 transition-colors"
          title="編輯"
        >
          <Edit3 class="w-4 h-4" />
        </button>
        <button
          @click="confirmDelete"
          class="text-gray-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-table-700 transition-colors"
          title="刪除"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>