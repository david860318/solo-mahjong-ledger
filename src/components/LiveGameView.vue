<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { 
  RotateCcw, Plus, Share2, Settings, BookOpen, X, 
  SlidersHorizontal, ShieldAlert, Sun, Moon, Radio 
} from 'lucide-vue-next';
import { useLiveGameStore } from '../stores/useLiveGameStore';
import { useRecordStore } from '../stores/useRecordStore';
import LiveSettleModal from './LiveSettleModal.vue';
import FanRuleManagerModal from './FanRuleManagerModal.vue';
import { generateTableBill } from '../utils/formatters';
import { calculateMinimalTransfers } from '../utils/settleDebts';

const emit = defineEmits(['switch-to-ledger']);
const liveStore = useLiveGameStore();
const recordStore = useRecordStore();

const showSettleModal = ref(false);
const showSettingsModal = ref(false);
const showFanRuleModal = ref(false);
const showPenaltyModal = ref(false);
const showBillModal = ref(false);

const isWakeLockActive = ref(false);
let wakeLockSentinel: any = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      isWakeLockActive.value = true;
      wakeLockSentinel.addEventListener('release', () => {
        isWakeLockActive.value = false;
      });
    } catch {
      isWakeLockActive.value = false;
    }
  }
}

function releaseWakeLock() {
  if (wakeLockSentinel) {
    wakeLockSentinel.release();
    wakeLockSentinel = null;
    isWakeLockActive.value = false;
  }
}

function toggleWakeLock() {
  if (isWakeLockActive.value) releaseWakeLock();
  else requestWakeLock();
}

onMounted(() => {
  requestWakeLock();
});

onUnmounted(() => {
  releaseWakeLock();
});

function triggerHaptic(type: 'light' | 'success' | 'warning' = 'light') {
  if ('vibrate' in navigator) {
    if (type === 'success') navigator.vibrate([40, 60, 40]);
    else if (type === 'warning') navigator.vibrate([80, 40, 80]);
    else navigator.vibrate(30);
  }
}

const settingsForm = reactive({
  baseScore: liveStore.baseScore,
  pointScore: liveStore.pointScore,
  mySeatIndex: liveStore.mySeatIndex,
  maxFanCap: liveStore.maxFanCap,
  playerNames: liveStore.players.map((p) => p.name)
});

function openSettings() {
  settingsForm.baseScore = liveStore.baseScore;
  settingsForm.pointScore = liveStore.pointScore;
  settingsForm.mySeatIndex = liveStore.mySeatIndex;
  settingsForm.maxFanCap = liveStore.maxFanCap;
  settingsForm.playerNames = liveStore.players.map((p) => p.name);
  showSettingsModal.value = true;
}

function saveTableSettings() {
  liveStore.saveTableSettings(
    Number(settingsForm.baseScore),
    Number(settingsForm.pointScore),
    [...settingsForm.playerNames],
    settingsForm.mySeatIndex,
    Number(settingsForm.maxFanCap)
  );
  showSettingsModal.value = false;
}

const penaltyForm = reactive({
  targetPlayerIndex: 0,
  penaltyAmount: 0,
  reason: '詐胡 (賠三家)'
});

function openPenaltyModal() {
  penaltyForm.targetPlayerIndex = (liveStore.mySeatIndex + 1) % 4;
  penaltyForm.penaltyAmount = (liveStore.baseScore + 4 * liveStore.pointScore) * 3;
  showPenaltyModal.value = true;
}

function applyPenalty() {
  const pIdx = penaltyForm.targetPlayerIndex;
  const amt = Number(penaltyForm.penaltyAmount) || 0;
  const payPerOther = Math.floor(amt / 3);

  liveStore.players[pIdx].score -= amt;
  liveStore.players.forEach((p, idx) => {
    if (idx !== pIdx) p.score += payPerOther;
  });

  liveStore.logs.unshift({
    id: 'penalty-' + Date.now(),
    windDesc: liveStore.currentRoundName,
    dealerIndex: liveStore.currentDealerIndex,
    dealerStreak: liveStore.dealerStreak,
    winnerIndex: -1,
    loserIndex: pIdx,
    isSelfDrawn: false,
    baseScore: liveStore.baseScore,
    pointScore: liveStore.pointScore,
    fanCount: 0,
    amountWon: 0,
    details: `[違規罰款] ${liveStore.players[pIdx].name} ${penaltyForm.reason} (${amt}元)`,
    prevScores: liveStore.players.map(p => p.score),
    prevWindIndex: liveStore.currentWindIndex,
    prevDealerIndex: liveStore.currentDealerIndex,
    prevDealerStreak: liveStore.dealerStreak
  });

  liveStore.syncSessionToCloud();
  triggerHaptic('warning');
  showPenaltyModal.value = false;
}

function handleResetGame() {
  if (window.confirm('確定要結束重置本桌嗎？現有分數與對戰紀錄將會清空。')) {
    liveStore.resetGame();
    triggerHaptic('warning');
  }
}

function handleUndoRound() {
  if (window.confirm('確定要復原上一把的胡牌紀錄嗎？')) {
    liveStore.undoLastRound();
    triggerHaptic('light');
  }
}

const minimalTransfers = computed(() => calculateMinimalTransfers(liveStore.players));

function saveToPersonalLedger() {
  const me = liveStore.myPlayer;
  const myScore = Number(me.score) || 0;
  const now = new Date();
  const currentIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  recordStore.addRecord({
    date: currentIso,
    baseScore: Number(liveStore.baseScore),
    pointScore: Number(liveStore.pointScore),
    rounds: 1,
    amount: myScore,
    location: '現場牌桌結算',
    tags: [`座次:${['東','南','西','北'][liveStore.mySeatIndex]}家`, `局數:${liveStore.logs.length}把`],
    notes: `四家結算，個人(${me.name})淨損益 ${myScore} 元`
  });

  triggerHaptic('success');
  alert(`已將「${me.name}」的戰果 ${myScore > 0 ? '+' + myScore : myScore} 元存入個人雀歷帳本！`);
  emit('switch-to-ledger');
}

async function copyTableBill() {
  let text = generateTableBill(
    liveStore.players,
    liveStore.baseScore,
    liveStore.pointScore,
    liveStore.logs
  );

  text += `\n💸 【LINE Pay / 轉帳極簡指南】 💸\n`;
  if (minimalTransfers.value.length === 0) {
    text += `四家均無損益，無需轉帳。\n`;
  } else {
    minimalTransfers.value.forEach((t) => {
      text += `👉 ${t.from} 轉給 ${t.to}：${t.amount} 元\n`;
    });
  }

  await navigator.clipboard.writeText(text);
  triggerHaptic('success');
  alert('精簡轉帳對帳單已複製到剪貼簿！');
}

const tableSeats = computed(() => {
  const myIdx = liveStore.mySeatIndex;
  const getPlayer = (offset: number) => {
    const seatIdx = (myIdx + offset) % 4;
    return {
      player: liveStore.players[seatIdx],
      seatIndex: seatIdx,
      windLabel: ['東', '南', '西', '北'][seatIdx],
      isDealer: liveStore.currentDealerIndex === seatIdx,
      isMe: seatIdx === myIdx
    };
  };

  return {
    bottom: getPlayer(0),
    right:  getPlayer(1),
    top:    getPlayer(2),
    left:   getPlayer(3)
  };
});
</script>

<template>
  <div class="space-y-6">
    <!-- 頂部控制列 -->
    <div class="bg-table-800/90 border border-table-border p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="openSettings"
          class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gold-500/20 text-gold-400 font-extrabold border border-gold-500/30 hover:bg-gold-500/30 transition-all"
        >
          <Settings class="w-3.5 h-3.5" />
          {{ liveStore.baseScore }} / {{ liveStore.pointScore }}
        </button>

        <button
          @click="showFanRuleModal = true"
          class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-table-700/80 text-gray-300 font-bold border border-table-border hover:text-gold-400 transition-all"
        >
          <SlidersHorizontal class="w-3.5 h-3.5" />
          台數規則
        </button>

        <button
          @click="toggleWakeLock"
          class="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all"
          :class="isWakeLockActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-table-700 text-gray-400 border-table-border'"
        >
          <Sun v-if="isWakeLockActive" class="w-3.5 h-3.5" />
          <Moon v-else class="w-3.5 h-3.5" />
          <span class="text-[11px]">{{ isWakeLockActive ? '常亮中' : '自動休眠' }}</span>
        </button>

        <!-- 4位數房號標籤 -->
        <span class="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono font-bold">
          <Radio class="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          房號 #{{ liveStore.roomCode }}
        </span>

        <div class="text-sm font-black text-gray-200 ml-1">
          局況：<span class="text-gold-400 text-base sm:text-lg">{{ liveStore.currentRoundName }}</span>
          <span v-if="liveStore.dealerStreak > 0" class="ml-2 text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
            連 {{ liveStore.dealerStreak }} 拉 {{ liveStore.dealerStreak }} (+{{ liveStore.currentDealerFan }}台)
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button @click="openPenaltyModal" class="btn-action text-rose-400 border-rose-500/30">
          <ShieldAlert class="w-3.5 h-3.5" /> 罰款
        </button>
        <button @click="liveStore.passDraw(); triggerHaptic('warning')" class="btn-action text-gray-300">
          流局
        </button>
        <button
          @click="handleUndoRound"
          :disabled="liveStore.logs.length === 0"
          class="btn-action text-gray-300 disabled:opacity-40"
        >
          <RotateCcw class="w-3.5 h-3.5" /> 復原
        </button>
        <button @click="showBillModal = true" class="btn-action text-gold-400 border-gold-500/40">
          <Share2 class="w-3.5 h-3.5" /> 結算轉帳
        </button>
      </div>
    </div>

    <!-- 牌桌 (依真實視角旋轉：我永遠在正下方) -->
    <div class="relative bg-gradient-to-b from-[#144231] to-[#0c2a1f] border-4 border-table-border rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden min-h-[380px] flex items-center justify-center">
      <div class="text-center z-10 p-5 rounded-2xl bg-table-900/85 border border-table-border/80 backdrop-blur shadow-2xl">
        <div class="text-xs text-gray-400">當前莊家</div>
        <div class="text-2xl font-black text-gold-400 mt-0.5">
          {{ liveStore.players[liveStore.currentDealerIndex].name }}
          <span class="text-xs font-normal text-gray-400">({{ ['東','南','西','北'][liveStore.currentDealerIndex] }}家)</span>
        </div>
        <button
          @click="showSettleModal = true; triggerHaptic('light')"
          class="mt-3 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 text-table-900 font-black rounded-xl text-sm shadow-xl shadow-gold-500/30 active:scale-95 transition-all flex items-center gap-1.5 mx-auto"
        >
          <Plus class="w-4 h-4 stroke-[3]" /> 胡牌結算
        </button>
      </div>

      <!-- 對家 (上方) -->
      <div class="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <div class="player-pill" :class="{ 'dealer-active': tableSeats.top.isDealer }">
          <div class="flex items-center gap-1.5">
            <span class="wind-badge">{{ tableSeats.top.windLabel }}</span>
            <span class="text-xs text-gray-300 font-bold truncate max-w-[90px]">{{ tableSeats.top.player.name }}</span>
            <span v-if="tableSeats.top.isDealer" class="dealer-tag">莊</span>
          </div>
          <span class="font-mono font-black text-base mt-0.5" :class="tableSeats.top.player.score >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ tableSeats.top.player.score }}
          </span>
          <span class="text-[10px] text-gray-500">對家</span>
        </div>
      </div>

      <!-- 上家 (左側) -->
      <div class="absolute left-4 top-1/2 -translate-y-1/2 text-center">
        <div class="player-pill" :class="{ 'dealer-active': tableSeats.left.isDealer }">
          <div class="flex items-center gap-1.5">
            <span class="wind-badge">{{ tableSeats.left.windLabel }}</span>
            <span class="text-xs text-gray-300 font-bold truncate max-w-[90px]">{{ tableSeats.left.player.name }}</span>
            <span v-if="tableSeats.left.isDealer" class="dealer-tag">莊</span>
          </div>
          <span class="font-mono font-black text-base mt-0.5" :class="tableSeats.left.player.score >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ tableSeats.left.player.score }}
          </span>
          <span class="text-[10px] text-gray-500">上家</span>
        </div>
      </div>

      <!-- 自家 (正下方 - 永遠是我) -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <div class="player-pill is-me" :class="{ 'dealer-active': tableSeats.bottom.isDealer }">
          <div class="flex items-center gap-1.5">
            <span class="wind-badge bg-gold-500 text-table-900">{{ tableSeats.bottom.windLabel }}</span>
            <span class="text-xs text-gold-400 font-black truncate max-w-[100px]">{{ tableSeats.bottom.player.name }} (我)</span>
            <span v-if="tableSeats.bottom.isDealer" class="dealer-tag">莊</span>
          </div>
          <span class="font-mono font-black text-xl mt-0.5" :class="tableSeats.bottom.player.score >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ tableSeats.bottom.player.score }}
          </span>
          <span class="text-[10px] text-gold-500/80 font-semibold">自座位</span>
        </div>
      </div>

      <!-- 下家 (右側) -->
      <div class="absolute right-4 top-1/2 -translate-y-1/2 text-center">
        <div class="player-pill" :class="{ 'dealer-active': tableSeats.right.isDealer }">
          <div class="flex items-center gap-1.5">
            <span class="wind-badge">{{ tableSeats.right.windLabel }}</span>
            <span class="text-xs text-gray-300 font-bold truncate max-w-[90px]">{{ tableSeats.right.player.name }}</span>
            <span v-if="tableSeats.right.isDealer" class="dealer-tag">莊</span>
          </div>
          <span class="font-mono font-black text-base mt-0.5" :class="tableSeats.right.player.score >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ tableSeats.right.player.score }}
          </span>
          <span class="text-[10px] text-gray-500">下家</span>
        </div>
      </div>
    </div>

    <!-- 保存與重置 -->
    <div class="bg-table-800/80 border border-table-border p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="text-sm font-bold text-gray-200">打完一雀要保存戰果了嗎？</div>
        <div class="text-xs text-gray-400">
          將「{{ liveStore.myPlayer.name }}」個人損益 ({{ liveStore.myPlayer.score }} 元) 存入雀歷
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="saveToPersonalLedger"
          class="bg-emerald-500 hover:bg-emerald-400 text-table-900 font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
        >
          <BookOpen class="w-4 h-4" /> 存入個人帳本
        </button>
        <button
          @click="handleResetGame"
          class="text-xs text-gray-400 hover:text-rose-400 px-3 py-2 rounded-xl border border-table-border hover:border-rose-500/30 transition-all"
        >
          清空重開
        </button>
      </div>
    </div>

    <!-- 轉帳明細彈窗 -->
    <div v-if="showBillModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-table-800 border border-table-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-table-border">
          <h3 class="text-base font-bold text-gold-400 flex items-center gap-2">
            💸 極簡轉帳對帳單
          </h3>
          <button @click="showBillModal = false" class="text-gray-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-2">
          <div class="text-xs text-gray-400 mb-2">
            借貸已自動抵消，只需轉以下幾筆即可全體結清：
          </div>

          <div v-if="minimalTransfers.length > 0" class="space-y-2">
            <div
              v-for="(t, idx) in minimalTransfers"
              :key="idx"
              class="bg-table-900 border border-table-border p-3 rounded-xl flex items-center justify-between text-xs"
            >
              <div>
                <span class="font-bold text-rose-400">{{ t.from }}</span>
                <span class="text-gray-400 mx-2">轉給</span>
                <span class="font-bold text-emerald-400">{{ t.to }}</span>
              </div>
              <div class="font-mono font-black text-sm text-gold-400">
                ${{ t.amount }}
              </div>
            </div>
          </div>
          <div v-else class="text-center py-6 text-xs text-gray-500">
            目前分數均平盤，無須轉帳。
          </div>
        </div>

        <button
          @click="copyTableBill"
          class="w-full py-2.5 bg-gold-500 hover:bg-gold-400 text-table-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
        >
          <Share2 class="w-4 h-4" /> 複製文字貼到 LINE 群組
        </button>
      </div>
    </div>

    <!-- 罰款彈窗 -->
    <div v-if="showPenaltyModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-table-800 border border-table-border w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-table-border">
          <h3 class="text-sm font-bold text-rose-400 flex items-center gap-1.5">
            <ShieldAlert class="w-4 h-4" /> 登記違規罰款 / 詐胡
          </h3>
          <button @click="showPenaltyModal = false" class="text-gray-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">受罰玩家</label>
          <select
            v-model="penaltyForm.targetPlayerIndex"
            class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
          >
            <option v-for="p in liveStore.players" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">事由</label>
          <input
            v-model="penaltyForm.reason"
            type="text"
            placeholder="詐胡、相公、過水胡"
            class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">罰款金額 (三家均分)</label>
          <input
            v-model.number="penaltyForm.penaltyAmount"
            type="number"
            class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-2 text-sm text-rose-400 font-bold font-mono outline-none"
          />
        </div>

        <button
          @click="applyPenalty"
          class="w-full py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow-md"
        >
          確認執行扣分
        </button>
      </div>
    </div>

    <!-- 牌桌設定 (含滿貫台數上限) -->
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

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1.5">哪一個座次是「我」？</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="(wind, i) in ['東家', '南家', '西家', '北家']"
              :key="wind"
              type="button"
              @click="settingsForm.mySeatIndex = i"
              class="py-2 text-xs font-bold rounded-xl border transition-all"
              :class="settingsForm.mySeatIndex === i ? 'bg-gold-500 text-table-900 border-gold-400 shadow-md font-black' : 'bg-table-900 border-table-border text-gray-300'"
            >
              {{ wind }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2">
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
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">台數封頂</label>
            <select
              v-model.number="settingsForm.maxFanCap"
              class="w-full bg-table-900 border border-table-border rounded-xl px-2 py-2 text-xs text-gray-200 outline-none"
            >
              <option :value="0">不封頂</option>
              <option :value="8">8台滿貫</option>
              <option :value="10">10台封頂</option>
              <option :value="16">16台滿貫</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1.5">四家姓名 / 暱稱</label>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="(_, i) in settingsForm.playerNames" :key="i">
              <span class="text-[10px] text-gray-400 font-bold block mb-0.5">
                {{ ['東家', '南家', '西家', '北家'][i] }}
                <span v-if="settingsForm.mySeatIndex === i" class="text-gold-400">(我)</span>
              </span>
              <input
                v-model="settingsForm.playerNames[i]"
                type="text"
                class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-gold-500"
              />
            </div>
          </div>
        </div>

        <button
          @click="saveTableSettings"
          class="w-full py-2.5 bg-gold-500 hover:bg-gold-400 text-table-900 font-bold rounded-xl transition-all shadow-md active:scale-95"
        >
          儲存牌桌設定
        </button>
      </div>
    </div>

    <FanRuleManagerModal v-if="showFanRuleModal" @close="showFanRuleModal = false" />
    <LiveSettleModal v-if="showSettleModal" @close="showSettleModal = false" />
  </div>
</template>

<style scoped>
.btn-action {
  @apply bg-table-900 hover:bg-table-700 border border-table-border text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all;
}
.player-pill {
  @apply bg-table-900/90 border border-table-border px-3.5 py-2 rounded-2xl flex flex-col items-center shadow-lg backdrop-blur min-w-[110px] transition-all;
}
.player-pill.is-me {
  @apply border-gold-500 bg-gold-500/10 ring-1 ring-gold-500/50 shadow-gold-500/20 shadow-md;
}
.dealer-active {
  @apply ring-2 ring-gold-500 bg-gold-500/20 border-gold-500;
}
.wind-badge {
  @apply text-[10px] font-black w-4 h-4 rounded flex items-center justify-center bg-table-700 text-gray-200;
}
.dealer-tag {
  @apply text-[9px] font-black px-1 rounded bg-rose-500 text-white leading-tight;
}
</style>