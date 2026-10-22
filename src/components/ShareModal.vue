<script setup lang="ts">
import { ref } from 'vue';
import { X, Copy, Check, Image as ImageIcon, Loader2 } from 'lucide-vue-next';
import { useRecordStore } from '../stores/useRecordStore';
import { useAuthStore } from '../stores/useAuthStore';
import { generateStatsImageCard } from '../utils/cardGenerator';

const props = defineProps<{ reportText: string }>();
defineEmits(['close']);

const recordStore = useRecordStore();
const authStore = useAuthStore();

const copied = ref(false);
const isGeneratingImg = ref(false);
const generatedImgUrl = ref<string | null>(null);

async function copyToClipboard() {
  await navigator.clipboard.writeText(props.reportText);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

async function handleGenerateCard() {
  isGeneratingImg.value = true;
  try {
    const dataUrl = await generateStatsImageCard(
      recordStore.stats,
      recordStore.sortedRecords[0],
      authStore.currentDisplayName
    );
    generatedImgUrl.value = dataUrl;
  } finally {
    isGeneratingImg.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-table-800 border border-table-border w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between pb-3 border-b border-table-border">
        <h3 class="text-base font-bold text-gold-400">LINE / 社群戰報分享</h3>
        <button @click="$emit('close')" class="p-1 text-gray-400 hover:text-white">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 文字戰報 -->
      <div class="mt-4">
        <textarea
          readonly
          rows="8"
          class="w-full bg-table-900 border border-table-border rounded-xl p-3 text-xs font-mono text-gray-200 outline-none resize-none"
        >{{ reportText }}</textarea>
      </div>

      <div class="flex gap-2 mt-3">
        <button
          @click="copyToClipboard"
          class="flex-1 py-2.5 bg-gold-500 hover:bg-gold-400 text-table-900 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 text-xs"
        >
          <Check v-if="copied" class="w-4 h-4" />
          <Copy v-else class="w-4 h-4" />
          {{ copied ? '已複製！' : '複製文字戰報' }}
        </button>

        <button
          @click="handleGenerateCard"
          :disabled="isGeneratingImg"
          class="flex-1 py-2.5 bg-table-700 hover:bg-table-600 border border-table-border text-gray-200 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs"
        >
          <Loader2 v-if="isGeneratingImg" class="w-4 h-4 animate-spin" />
          <ImageIcon v-else class="w-4 h-4 text-emerald-400" />
          產生成績圖卡
        </button>
      </div>

      <!-- 產生的圖卡預覽與下載 -->
      <div v-if="generatedImgUrl" class="mt-4 pt-4 border-t border-table-border space-y-2">
        <span class="text-xs text-gray-400 block font-semibold">戰報圖卡預覽 (可長按或直接下載)：</span>
        <img :src="generatedImgUrl" class="w-full rounded-xl border border-table-border shadow-lg" />
        <a
          :href="generatedImgUrl"
          download="mahjong-report.png"
          class="block text-center py-2 bg-emerald-500 hover:bg-emerald-400 text-table-900 font-bold text-xs rounded-xl shadow-md"
        >
          下載高畫質 PNG 圖卡
        </a>
      </div>
    </div>
  </div>
</template>