<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Share2, Download, Upload, FileSpreadsheet, MapPin, LayoutDashboard, Disc3 } from 'lucide-vue-next';
import { useRecordStore } from './stores/useRecordStore';
import type { MahjongRecord } from './types/mahjong';
import StatCard from './components/StatCard.vue';
import TrendChart from './components/TrendChart.vue';
import RecordCard from './components/RecordCard.vue';
import RecordFormModal from './components/RecordFormModal.vue';
import ShareModal from './components/ShareModal.vue';
import LiveGameView from './components/LiveGameView.vue';
import { formatCurrency, generateLineReport } from './utils/formatters';

const currentTab = ref<'ledger' | 'live'>('live'); // 預設進牌桌計分器

const store = useRecordStore();
const showModal = ref(false);
const editingRecord = ref<MahjongRecord | null>(null);
const showShareModal = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// 搜尋與篩選
const searchQuery = ref('');
const filterStatus = ref<'all' | 'win' | 'loss'>('all');

const filteredRecords = computed(() => {
  return store.sortedRecords.filter((r) => {
    if (filterStatus.value === 'win' && r.amount <= 0) return false;
    if (filterStatus.value === 'loss' && r.amount >= 0) return false;

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      const matchLoc = r.location?.toLowerCase().includes(q);
      const matchTags = r.tags?.some((t) => t.toLowerCase().includes(q));
      const matchNotes = r.notes?.toLowerCase().includes(q);
      return matchLoc || matchTags || matchNotes;
    }
    return true;
  });
});

const reportText = computed(() => {
  return generateLineReport(store.stats, store.sortedRecords[0]);
});

function openCreateModal() {
  editingRecord.value = null;
  showModal.value = true;
}

function openEditModal(record: MahjongRecord) {
  editingRecord.value = record;
  showModal.value = true;
}

function triggerFileInput() {
  fileInput.value?.click();
}

function handleFileImport(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files?.length) return;
  const file = target.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target?.result as string;
    if (store.importJSON(content)) {
      alert('戰績匯入成功！');
    } else {
      alert('匯入失敗，請確認檔案格式是否正確。');
    }
  };
  reader.readAsText(file);
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-6 pb-32">
    <!-- 頂端 Header -->
    <header class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-amber-300 flex items-center gap-2">
          🀄 台灣麻將助理
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">十六張即時牌桌計分與個人雀歷記帳本</p>
      </div>

      <!-- 導覽頁籤切換 (模式切換) -->
      <div class="flex bg-table-800 border border-table-border p-1 rounded-2xl">
        <button
          @click="currentTab = 'live'"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          :class="currentTab === 'live' ? 'bg-gold-500 text-table-900 shadow-md' : 'text-gray-400 hover:text-white'"
        >
          <Disc3 class="w-4 h-4" /> 牌桌即時計分
        </button>
        <button
          @click="currentTab = 'ledger'"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          :class="currentTab === 'ledger' ? 'bg-gold-500 text-table-900 shadow-md' : 'text-gray-400 hover:text-white'"
        >
          <LayoutDashboard class="w-4 h-4" /> 個人戰績帳本
        </button>
      </div>
    </header>

    <!-- 模式 1: 沉浸式牌桌即時計分器 -->
    <LiveGameView v-if="currentTab === 'live'" @switch-to-ledger="currentTab = 'ledger'" />

    <!-- 模式 2: 個人雀歷帳本與期望值分析 -->
    <div v-else class="space-y-6">
      <!-- 頂部操作按鈕 -->
      <div class="flex items-center justify-between">
        <div class="flex bg-table-800/90 border border-table-border p-1 rounded-xl text-xs">
          <button
            @click="store.currentTimeRange = 'month'"
            class="px-3 py-1.5 rounded-lg transition-all font-semibold"
            :class="store.currentTimeRange === 'month' ? 'bg-gold-500 text-table-900 shadow-sm' : 'text-gray-400'"
          >
            本月
          </button>
          <button
            @click="store.currentTimeRange = 'year'"
            class="px-3 py-1.5 rounded-lg transition-all font-semibold"
            :class="store.currentTimeRange === 'year' ? 'bg-gold-500 text-table-900 shadow-sm' : 'text-gray-400'"
          >
            今年
          </button>
          <button
            @click="store.currentTimeRange = 'all'"
            class="px-3 py-1.5 rounded-lg transition-all font-semibold"
            :class="store.currentTimeRange === 'all' ? 'bg-gold-500 text-table-900 shadow-sm' : 'text-gray-400'"
          >
            生涯全期
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button @click="showShareModal = true" class="btn-subtle" title="分享戰報">
            <Share2 class="w-4 h-4 text-gold-400" />
            <span class="hidden sm:inline">戰報</span>
          </button>
          <button @click="store.exportCSV" class="btn-subtle" title="匯出 CSV">
            <FileSpreadsheet class="w-4 h-4 text-emerald-400" />
            <span class="hidden sm:inline">CSV</span>
          </button>
          <button @click="store.exportJSON" class="btn-subtle" title="備份 JSON">
            <Download class="w-4 h-4 text-blue-400" />
          </button>
          <button @click="triggerFileInput" class="btn-subtle" title="還原 JSON">
            <Upload class="w-4 h-4 text-gray-400" />
          </button>
          <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleFileImport" />

          <button
            @click="openCreateModal"
            class="bg-gold-500 hover:bg-gold-400 text-table-900 font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md active:scale-95 transition-all"
          >
            <Plus class="w-4 h-4" /> 記一筆
          </button>
        </div>
      </div>

      <!-- 生涯統計看板 -->
      <section class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="累計淨勝負"
          :value="formatCurrency(store.stats.totalProfit)"
          :subtitle="`單場最高: ${formatCurrency(store.stats.maxWin)}`"
          :variant="store.stats.totalProfit > 0 ? 'green' : store.stats.totalProfit < 0 ? 'red' : 'gold'"
        />
        <StatCard
          title="每將期望值 (EV)"
          :value="formatCurrency(Math.round(store.stats.expectedValuePerRound))"
          subtitle="每將平均損益"
          :variant="store.stats.expectedValuePerRound >= 0 ? 'green' : 'red'"
        />
        <StatCard
          title="勝率"
          :value="`${store.stats.winRate.toFixed(1)}%`"
          :subtitle="`${store.stats.winMatches}勝 / ${store.stats.lossMatches}敗 / ${store.stats.drawMatches}平`"
        />
        <StatCard
          title="連勝狀態"
          :value="store.stats.currentStreak >= 0 ? `+${store.stats.currentStreak} 連勝` : `${store.stats.currentStreak} 連敗`"
          :subtitle="`生涯最高: ${store.stats.bestStreak} 連勝`"
        />
      </section>

      <!-- 走勢圖與風水榜 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-2">
          <TrendChart :data="store.trendPoints" />
        </div>
        <div class="bg-table-800/80 border border-table-border p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-1.5 text-xs font-bold text-gold-400 mb-2">
              <MapPin class="w-4 h-4" /> 風水寶地排行榜
            </div>
            <div v-if="store.locationStats.length > 0" class="space-y-2 mt-2">
              <div
                v-for="loc in store.locationStats.slice(0, 3)"
                :key="loc.location"
                class="flex items-center justify-between text-xs py-1 border-b border-table-border/50 last:border-0"
              >
                <div class="truncate max-w-[120px]">
                  <div class="font-semibold text-gray-200 truncate">{{ loc.location }}</div>
                  <div class="text-[10px] text-gray-400">{{ loc.matches }} 場 · 勝率 {{ loc.winRate.toFixed(0) }}%</div>
                </div>
                <div class="font-mono font-bold" :class="loc.profit > 0 ? 'text-emerald-400' : 'text-rose-400'">
                  {{ formatCurrency(loc.profit) }}
                </div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-xs text-gray-500">
              記帳填寫地點即可自動排行
            </div>
          </div>
        </div>
      </div>

      <!-- 歷史牌局清單 -->
      <section class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 class="text-base font-bold text-gray-200">歷史明細 ({{ filteredRecords.length }})</h2>
          <div class="flex items-center gap-2">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜尋地點或標籤..."
              class="bg-table-800 border border-table-border rounded-xl px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-gold-500 w-36 sm:w-44"
            />
            <div class="flex bg-table-800 border border-table-border rounded-xl p-0.5 text-xs">
              <button
                @click="filterStatus = 'all'"
                class="px-2.5 py-1 rounded-lg"
                :class="filterStatus === 'all' ? 'bg-gold-500 text-table-900 font-bold' : 'text-gray-400'"
              >
                全部
              </button>
              <button
                @click="filterStatus = 'win'"
                class="px-2.5 py-1 rounded-lg"
                :class="filterStatus === 'win' ? 'bg-emerald-500 text-table-900 font-bold' : 'text-gray-400'"
              >
                勝
              </button>
              <button
                @click="filterStatus = 'loss'"
                class="px-2.5 py-1 rounded-lg"
                :class="filterStatus === 'loss' ? 'bg-rose-500 text-white font-bold' : 'text-gray-400'"
              >
                負
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredRecords.length > 0" class="space-y-2">
          <RecordCard
            v-for="rec in filteredRecords"
            :key="rec.id"
            :record="rec"
            @edit="openEditModal"
            @delete="store.deleteRecord"
          />
        </div>
        <div v-else class="text-center py-12 border border-dashed border-table-border rounded-2xl text-gray-500 text-sm">
          尚無符合條件的牌局紀錄
        </div>
      </section>
    </div>

    <!-- 彈窗群 -->
    <RecordFormModal
      v-if="showModal"
      :edit-record="editingRecord"
      @close="showModal = false"
    />
    <ShareModal
      v-if="showShareModal"
      :report-text="reportText"
      @close="showShareModal = false"
    />
  </div>
</template>

<style scoped>
.btn-subtle {
  @apply bg-table-800 hover:bg-table-700 border border-table-border text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all;
}
</style>