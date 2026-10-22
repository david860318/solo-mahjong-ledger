<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  Plus, Share2, Download, Upload, FileSpreadsheet, MapPin, 
  LayoutDashboard, Disc3, LogIn, LogOut, Settings2,
  Users, Layers
} from 'lucide-vue-next';
import { useRecordStore } from './stores/useRecordStore';
import { useAuthStore } from './stores/useAuthStore';
import { useLiveGameStore } from './stores/useLiveGameStore';
import type { MahjongRecord } from './types/mahjong';
import StatCard from './components/StatCard.vue';
import TrendChart from './components/TrendChart.vue';
import RecordCard from './components/RecordCard.vue';
import RecordFormModal from './components/RecordFormModal.vue';
import ShareModal from './components/ShareModal.vue';
import LiveGameView from './components/LiveGameView.vue';
import ProfileModal from './components/ProfileModal.vue';
import LoginView from './components/LoginView.vue';
import { formatCurrency, generateLineReport } from './utils/formatters';
import { supabase } from './utils/supabase';

const currentTab = ref<'ledger' | 'live'>('live');
const isLoginPage = ref(false);

const store = useRecordStore();
const authStore = useAuthStore();
const liveStore = useLiveGameStore();

const showModal = ref(false);
const showProfileModal = ref(false);
const editingRecord = ref<MahjongRecord | null>(null);
const showShareModal = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const searchQuery = ref('');
const filterStatus = ref<'all' | 'win' | 'loss'>('all');

async function syncAllData() {
  if (authStore.user) {
    await Promise.all([
      store.fetchCloudRecords(),
      liveStore.fetchCloudLiveSettings()
    ]);
  }
}

async function handleSignOut() {
  if (window.confirm('確定要登出帳號嗎？')) {
    await authStore.signOut();
    store.clearRecordsOnSignOut();
    isLoginPage.value = true;
  }
}

onMounted(async () => {
  // 1. 如果網址帶有 OAuth 回傳的 Hash 或 Code，代表正在轉跳回呼中，先不要開登入頁
  const isOAuthCallback = 
    window.location.hash.includes('access_token=') || 
    window.location.search.includes('code=');

  if (isOAuthCallback) {
    isLoginPage.value = false;
  }

  // 2. 註冊 Session 狀態監聽器（Google 登入回跳成功時會第一時間觸發）
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth 狀態變更:', event, session?.user?.email);

    if (session?.user) {
      authStore.user = session.user;
      await authStore.fetchProfile();
      isLoginPage.value = false; // 登入成功，關閉登入頁
      await syncAllData();

      // 清除網址列多餘的 hash token
      if (window.location.hash.includes('access_token=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else if (event === 'SIGNED_OUT') {
      authStore.user = null;
      authStore.profile = null;
      store.clearRecordsOnSignOut();
      isLoginPage.value = true;
    }
  });

  // 3. 執行本地初次檢查
  await authStore.init();
  if (authStore.user) {
    isLoginPage.value = false;
    await syncAllData();
  } else if (!isOAuthCallback) {
    isLoginPage.value = true;
  }
});

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

const reportText = computed(() => generateLineReport(store.stats, store.sortedRecords[0]));

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
  <!-- 全螢幕登入畫面 -->
  <LoginView 
    v-if="isLoginPage" 
    @login-success="isLoginPage = false" 
    @skip-guest="isLoginPage = false" 
  />

  <!-- 主應用介面 -->
  <div v-else class="max-w-4xl mx-auto px-4 py-6 pb-32">
    <!-- Header -->
    <header class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-amber-300 flex items-center gap-2">
          🀄 台灣麻將助理
        </h1>
        <p class="text-xs text-gray-400 mt-0.5">十六張即時牌桌計分與個人雀歷記帳本</p>
      </div>

      <div class="flex items-center gap-2">
        <!-- 已登入：展示個人頭像與暱稱按鈕 -->
        <div v-if="authStore.user" class="flex items-center gap-1 bg-table-800 border border-table-border p-1 pr-2 rounded-2xl shadow-md">
          <button
            @click="showProfileModal = true"
            class="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-table-700 text-gray-200 hover:text-gold-400 transition-all"
            title="點擊修改個人稱號與底台"
          >
            <!-- 圓形頭像容器 (支援 Google 大頭貼圖片) -->
            <div class="w-7 h-7 rounded-full bg-gold-500/20 border border-gold-500/50 overflow-hidden flex items-center justify-center shrink-0">
              <img
                v-if="authStore.avatarUrl"
                :src="authStore.avatarUrl"
                alt="頭像"
                class="w-full h-full object-cover"
                referrerpolicy="no-referrer"
              />
              <span v-else class="text-xs font-black text-gold-400">
                {{ authStore.currentDisplayName ? authStore.currentDisplayName.slice(0, 1) : '🀄' }}
              </span>
            </div>

            <!-- 顯示名稱 -->
            <span class="font-bold text-xs truncate max-w-[100px] sm:max-w-[130px]">
              {{ authStore.currentDisplayName }}
            </span>
            <Settings2 class="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </button>
          
          <button 
            @click="handleSignOut" 
            class="text-gray-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-table-700/60 transition-colors ml-0.5" 
            title="登出帳號"
          >
            <LogOut class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- 訪客/未登入狀態：進入登入頁 -->
        <button
          v-else
          @click="isLoginPage = true"
          class="bg-table-800 hover:bg-table-700 border border-table-border text-xs font-bold text-gold-400 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
        >
          <LogIn class="w-3.5 h-3.5" /> 登入 / 註冊
        </button>

        <!-- 模式切換 -->
        <div class="flex bg-table-800 border border-table-border p-1 rounded-2xl">
          <button
            @click="currentTab = 'live'"
            class="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all"
            :class="currentTab === 'live' ? 'bg-gold-500 text-table-900 shadow-md' : 'text-gray-400 hover:text-white'"
          >
            <Disc3 class="w-4 h-4" /> 牌桌計分
          </button>
          <button
            @click="currentTab = 'ledger'"
            class="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all"
            :class="currentTab === 'ledger' ? 'bg-gold-500 text-table-900 shadow-md' : 'text-gray-400 hover:text-white'"
          >
            <LayoutDashboard class="w-4 h-4" /> 雀歷帳本
          </button>
        </div>
      </div>
    </header>

    <!-- 牌桌即時計分器 -->
    <LiveGameView v-if="currentTab === 'live'" @switch-to-ledger="currentTab = 'ledger'" />

    <!-- 雀歷記帳本內容 -->
    <div v-else class="space-y-6">
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

      <!-- 統計數據 -->
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

      <TrendChart :data="store.trendPoints" />

      <!-- 三大深度數據切片 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="bg-table-800/80 border border-table-border p-4 rounded-xl shadow-lg">
          <div class="flex items-center gap-1.5 text-xs font-bold text-gold-400 mb-2">
            <MapPin class="w-4 h-4" /> 風水寶地榜
          </div>
          <div v-if="store.locationStats.length > 0" class="space-y-1.5 mt-2">
            <div
              v-for="loc in store.locationStats.slice(0, 3)"
              :key="loc.location"
              class="flex items-center justify-between text-xs py-1 border-b border-table-border/40 last:border-0"
            >
              <div class="truncate max-w-[120px]">
                <div class="font-semibold text-gray-200 truncate">{{ loc.location }}</div>
                <div class="text-[10px] text-gray-400">{{ loc.matches }} 場 · {{ loc.winRate.toFixed(0) }}% 勝</div>
              </div>
              <div class="font-mono font-bold" :class="loc.profit > 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ formatCurrency(loc.profit) }}
              </div>
            </div>
          </div>
          <div v-else class="text-center py-4 text-xs text-gray-500">尚無地點數據</div>
        </div>

        <div class="bg-table-800/80 border border-table-border p-4 rounded-xl shadow-lg">
          <div class="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-2">
            <Users class="w-4 h-4" /> 牌友合拍/剋星榜
          </div>
          <div v-if="store.friendStats.length > 0" class="space-y-1.5 mt-2">
            <div
              v-for="fr in store.friendStats.slice(0, 3)"
              :key="fr.name"
              class="flex items-center justify-between text-xs py-1 border-b border-table-border/40 last:border-0"
            >
              <div class="truncate max-w-[120px]">
                <div class="font-semibold text-gray-200 truncate">{{ fr.name }}</div>
                <div class="text-[10px] text-gray-400">{{ fr.matches }} 場同桌</div>
              </div>
              <div class="font-mono font-bold" :class="fr.profit > 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ formatCurrency(fr.profit) }}
              </div>
            </div>
          </div>
          <div v-else class="text-center py-4 text-xs text-gray-500">填入標籤自動分析</div>
        </div>

        <div class="bg-table-800/80 border border-table-border p-4 rounded-xl shadow-lg">
          <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-2">
            <Layers class="w-4 h-4" /> 底台規格損益
          </div>
          <div v-if="store.stakeStats.length > 0" class="space-y-1.5 mt-2">
            <div
              v-for="st in store.stakeStats.slice(0, 3)"
              :key="st.stake"
              class="flex items-center justify-between text-xs py-1 border-b border-table-border/40 last:border-0"
            >
              <div class="truncate max-w-[120px]">
                <div class="font-semibold text-gray-200">{{ st.stake }} 底台</div>
                <div class="text-[10px] text-gray-400">{{ st.matches }} 場 · {{ st.winRate.toFixed(0) }}% 勝</div>
              </div>
              <div class="font-mono font-bold" :class="st.profit > 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ formatCurrency(st.profit) }}
              </div>
            </div>
          </div>
          <div v-else class="text-center py-4 text-xs text-gray-500">尚無底台規格數據</div>
        </div>
      </div>

      <!-- 歷史明細 -->
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
    <RecordFormModal v-if="showModal" :edit-record="editingRecord" @close="showModal = false" />
    <ShareModal v-if="showShareModal" :report-text="reportText" @close="showShareModal = false" />
    <ProfileModal v-if="showProfileModal" @close="showProfileModal = false" />
  </div>
</template>

<style scoped>
.btn-subtle {
  @apply bg-table-800 hover:bg-table-700 border border-table-border text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all;
}
</style>