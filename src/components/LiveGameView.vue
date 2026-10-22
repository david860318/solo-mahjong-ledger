<script setup lang="ts">
import { ref, reactive } from 'vue';
import { RotateCcw, Plus, Share2, Settings, BookOpen, X, SlidersHorizontal } from 'lucide-vue-next';
import { useLiveGameStore } from '../stores/useLiveGameStore';
import { useRecordStore } from '../stores/useRecordStore';
import LiveSettleModal from './LiveSettleModal.vue';
import FanRuleManagerModal from './FanRuleManagerModal.vue';
import { generateTableBill } from '../utils/formatters';

const emit = defineEmits(['switch-to-ledger']);
const liveStore = useLiveGameStore();
const recordStore = useRecordStore();

const showSettleModal = ref(false);
const showSettingsModal = ref(false);
const showFanRuleModal = ref(false);

const settingsForm = reactive({
  baseScore: liveStore.baseScore,
  pointScore: liveStore.pointScore,
  playerNames: liveStore.players.map((p) => p.name)
});

function openSettings() {
  settingsForm.baseScore = liveStore.baseScore;
  settingsForm.pointScore = liveStore.pointScore;
  settingsForm.playerNames = liveStore.players.map((p) => p.name);
  showSettingsModal.value = true;
}

function saveTableSettings() {
  liveStore.saveTableSettings(
    Number(settingsForm.baseScore),
    Number(settingsForm.pointScore),
    [...settingsForm.playerNames]
  );
  showSettingsModal.value = false;
}

function handleUndo() {
  if (confirm('確定要復原上一把的胡牌紀錄嗎？')) {
    liveStore.undoLastRound();
  }
}

function handleReset() {
  if (confirm('確定要結束重置本桌嗎？現有分數將會清空。')) {
    liveStore.resetGame();
  }
}

function saveToPersonalLedger() {
  const myScore = Number(liveStore.players[0].score) || 0;
  const now = new Date();
  const currentIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  recordStore.addRecord({
    date: currentIso,
    baseScore: Number(liveStore.baseScore),
    pointScore: Number(liveStore.pointScore),
    rounds: 1,
    amount: myScore,
    location: '現場牌桌結算',
    tags: [`牌桌結算(${liveStore.logs.length}把)`],
    notes: `四家對戰結算，個人淨損益 ${myScore} 元`
  });

  alert(`已將「${liveStore.players[0].name}」的戰果 ${myScore > 0 ? '+' + myScore : myScore} 元同步存入個人帳本！`);
  emit('switch-to-ledger');
}

async function copyTableBill() {
  const text = generateTableBill(
    liveStore.players,
    liveStore.baseScore,
    liveStore.pointScore,
    liveStore.logs
  );
  await navigator.clipboard.writeText(text);
  alert('對帳單已成功複製至剪貼簿！可直接貼在 LINE 群組結算。');
}
</script>

<template>
  <div class="space-y-6">
    <!-- 牌桌設定與局況條 -->
    <div class="bg-table-800/90 border border-table-border p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
      <div class="flex items-center gap-2">
        <button
          @click="openSettings"
          class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gold-500/20 text-gold-400 font-extrabold border border-gold-500/30 hover:bg-gold-500/30 transition-all"
          title="修改底台與座次"
        >
          <Settings class="w-3.5 h-3.5" />
          {{ liveStore.baseScore }} / {{ liveStore.pointScore }} 底台
        </button>

        <button
          @click="showFanRuleModal = true"
          class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-table-700/80 text-gray-300 font-bold border border-table-border hover:text-gold-400 transition-all"
          title="自定義每一項牌型台數"
        >
          <SlidersHorizontal class="w-3.5 h-3.5" />
          自訂台數規則
        </button>

        <div class="text-sm font-black text-gray-200 ml-1">
          局況：<span class="text-gold-400 text-lg">{{ liveStore.currentRoundName }}</span>
          <span v-if="liveStore.dealerStreak > 0" class="ml-2 text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
            連 {{ liveStore.dealerStreak }} 拉 {{ liveStore.dealerStreak }} (+{{ liveStore.currentDealerFan }}台)
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button @click="liveStore.passDraw" class="btn-action text-gray-300">
          臭莊流局
        </button>
        <button
          @click="handleUndo"
          :disabled="liveStore.logs.length === 0"
          class="btn-action text-gray-300 disabled:opacity-40"
          title="復原上一把"
        >
          <RotateCcw class="w-3.5 h-3.5" /> 復原
        </button>
        <button @click="copyTableBill" class="btn-action text-gold-400 border-gold-500/40">
          <Share2 class="w-3.5 h-3.5" /> 對帳單
        </button>
      </div>
    </div>

    <!-- 牌桌畫面 (維持原貌) -->
    <div class="relative bg-gradient-to-b from-[#144231] to-[#0c2a1f] border-4 border-table-border rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden min-h-[340px] flex items-center justify-center">
      <div class="text-center z-10 p-5 rounded-2xl bg-table-900/80 border border-table-border/80 backdrop-blur shadow-2xl">
        <div class="text-xs text-gray-400">當前莊家</div>
        <div class="text-2xl font-black text-gold-400 mt-0.5">
          {{ liveStore.players[liveStore.currentDealerIndex].name }}
        </div>
        <button
          @click="showSettleModal = true"
          class="mt-3 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 text-table-900 font-black rounded-xl text-sm shadow-xl shadow-gold-500/30 active:scale-95 transition-all flex items-center gap-1.5 mx-auto"
        >
          <Plus class="w-4 h-4 stroke-[3]" /> 胡牌結算
        </button>
      </div>

      <!-- 北家 (上) -->
      <div class="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <div class="player-pill" :class="{ 'dealer-active': liveStore.currentDealerIndex === 3 }">
          <span class="text-xs text-gray-400">{{ liveStore.players[3].name }}</span>
          <span class="font-mono font-black text-base" :class="liveStore.players[3].score >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ liveStore.players[3].score }}
          </span>
        </div>
      </div>

      <!-- 西家 (左) -->
      <div class="absolute left-4 top-1/2 -translate-y-1/2 text-center">
        <div class="player-pill" :class="{ 'dealer-active': liveStore.currentDealerIndex === 2 }">
          <span class="text-xs text-gray-400">{{ liveStore.players[2].name }}</span>
          <span class="font-mono font-black text-base" :class="liveStore.players[2].score >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ liveStore.players[2].score }}
          </span>
        </div>
      </div>

      <!-- 東家 (我 - 下) -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <div class="player-pill border-gold-500/60" :class="{ 'dealer-active': liveStore.currentDealerIndex === 0 }">
          <span class="text-xs text-gold-400 font-bold">{{ liveStore.players[0].name }}</span>
          <span class="font-mono font-black text-xl" :class="liveStore.players[0].score >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ liveStore.players[0].score }}
          </span>
        </div>
      </div>

      <!-- 南家 (右) -->
      <div class="absolute right-4 top-1/2 -translate-y-1/2 text-center">
        <div class="player-pill" :class="{ 'dealer-active': liveStore.currentDealerIndex === 1 }">
          <span class="text-xs text-gray-400">{{ liveStore.players[1].name }}</span>
          <span class="font-mono font-black text-base" :class="liveStore.players[1].score >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ liveStore.players[1].score }}
          </span>
        </div>
      </div>
    </div>

    <!-- 牌局結束結轉 -->
    <div class="bg-table-800/80 border border-table-border p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="text-sm font-bold text-gray-200">打完要保存戰果了嗎？</div>
        <div class="text-xs text-gray-400">將「{{ liveStore.players[0].name }}」結算損益 ({{ liveStore.players[0].score }} 元) 存入個人記帳本</div>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="saveToPersonalLedger"
          class="bg-emerald-500 hover:bg-emerald-400 text-table-900 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
        >
          <BookOpen class="w-4 h-4" /> 存入個人帳本
        </button>
        <button
          @click="handleReset"
          class="text-xs text-gray-400 hover:text-rose-400 px-3 py-2 rounded-xl border border-table-border hover:border-rose-500/30 transition-all"
        >
          清空重開
        </button>
      </div>
    </div>

    <!-- 歷程明細 -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-gray-200">本桌明細 (共 {{ liveStore.logs.length }} 把)</h3>
        <span class="text-xs text-gray-400">最新在最前</span>
      </div>

      <div v-if="liveStore.logs.length > 0" class="space-y-2">
        <div
          v-for="log in liveStore.logs"
          :key="log.id"
          class="bg-table-800/70 border border-table-border p-3.5 rounded-xl flex items-center justify-between text-xs"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-gold-400">{{ log.windDesc }}</span>
              <span v-if="log.winnerIndex !== -1" class="text-gray-300">
                <span class="font-bold text-emerald-400">{{ liveStore.players[log.winnerIndex].name }}</span>
                {{ log.isSelfDrawn ? '自摸' : `胡 ${liveStore.players[log.loserIndex].name}` }}
              </span>
              <span v-else class="text-gray-400">流局</span>
              <span v-if="log.fanCount > 0" class="bg-table-900 text-gray-400 px-2 py-0.5 rounded border border-table-border">
                {{ log.fanCount }} 台
              </span>
            </div>
            <div class="text-[11px] text-gray-500 mt-1">{{ log.details }}</div>
          </div>

          <div class="text-right font-mono font-bold text-sm" :class="log.amountWon > 0 ? 'text-emerald-400' : 'text-gray-400'">
            {{ log.amountWon > 0 ? '+' + log.amountWon : '0' }}
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8 text-xs text-gray-500 border border-dashed border-table-border rounded-xl">
        尚無紀錄，點擊中央「胡牌結算」開始紀錄！
      </div>
    </div>

    <!-- 牌桌底台與座次設定彈窗 -->
    <div v-if="showSettingsModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-table-800 border border-table-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-table-border">
          <h3 class="text-base font-bold text-gold-400 flex items-center gap-2">
            <Settings class="w-4 h-4" /> 牌桌底台與座次設定
          </h3>
          <button @click="showSettingsModal = false" class="text-gray-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">底 (元)</label>
            <input
              v-model.number="settingsForm.baseScore"
              type="number"
              min="0"
              class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:border-gold-500 font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">台 (元)</label>
            <input
              v-model.number="settingsForm.pointScore"
              type="number"
              min="0"
              class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:border-gold-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1.5">四家姓名 / 暱稱</label>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="(_, i) in settingsForm.playerNames" :key="i">
              <span class="text-[10px] text-gray-400 font-bold block mb-0.5">
                {{ ['東家 (我)', '南家', '西家', '北家'][i] }}
              </span>
              <input
                v-model="settingsForm.playerNames[i]"
                type="text"
                class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-gold-500"
              />
            </div>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            @click="saveTableSettings"
            class="flex-1 py-2.5 bg-gold-500 hover:bg-gold-400 text-table-900 font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            儲存牌桌設定
          </button>
        </div>
      </div>
    </div>

    <!-- 自定義台數規則彈窗 -->
    <FanRuleManagerModal v-if="showFanRuleModal" @close="showFanRuleModal = false" />

    <!-- 胡牌結算彈窗 -->
    <LiveSettleModal v-if="showSettleModal" @close="showSettleModal = false" />
  </div>
</template>

<style scoped>
.btn-action {
  @apply bg-table-900 hover:bg-table-700 border border-table-border text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all;
}
.player-pill {
  @apply bg-table-900/90 border border-table-border px-4 py-2 rounded-2xl flex flex-col items-center shadow-lg backdrop-blur min-w-[100px] transition-all;
}
.dealer-active {
  @apply ring-2 ring-gold-500 bg-gold-500/20 border-gold-500;
}
</style>