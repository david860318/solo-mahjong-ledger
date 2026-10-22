<script setup lang="ts">
import { ref } from 'vue';
import { X, Copy, Check } from 'lucide-vue-next';

const props = defineProps<{ reportText: string }>();
defineEmits(['close']);

const copied = ref(false);

async function copyToClipboard() {
  await navigator.clipboard.writeText(props.reportText);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-table-800 border border-table-border w-full max-w-md rounded-2xl p-6 shadow-2xl">
      <div class="flex items-center justify-between pb-3 border-b border-table-border">
        <h3 class="text-base font-bold text-gold-400">LINE / 社群戰報</h3>
        <button @click="$emit('close')" class="p-1 text-gray-400 hover:text-white">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="mt-4">
        <textarea
          readonly
          rows="9"
          class="w-full bg-table-900 border border-table-border rounded-xl p-3 text-xs font-mono text-gray-200 outline-none resize-none"
        >{{ reportText }}</textarea>
      </div>

      <button
        @click="copyToClipboard"
        class="w-full mt-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-table-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
      >
        <Check v-if="copied" class="w-4 h-4" />
        <Copy v-else class="w-4 h-4" />
        {{ copied ? '已複製戰報！' : '一鍵複製戰報文字' }}
      </button>
    </div>
  </div>
</template>