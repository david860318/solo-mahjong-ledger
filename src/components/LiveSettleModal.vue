<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, Check, Plus, Minus } from 'lucide-vue-next';
import { useLiveGameStore } from '../stores/useLiveGameStore';
import type { FanRule } from '../types/mahjong';

const emit = defineEmits(['close']);
const store = useLiveGameStore();

const winnerIndex = ref<number>(0);
const loserIndex = ref<number>(-1); // -1 代表自摸
const manualFan = ref<number>(0);

// 已選中的役種 ID
const selectedRuleIds = ref<string[]>([]);

function toggleRule(rule: FanRule) {
  const idx = selectedRuleIds.value.indexOf(rule.id);
  if (idx > -1) {
    selectedRuleIds.value.splice(idx, 1);
    manualFan.value = Math.max(0, manualFan.value - rule.fan);
  } else {
    selectedRuleIds.value.push(rule.id);
    manualFan.value += rule.fan;
  }
}

// 產生選中標籤名稱
const selectedTags = computed(() => {
  return selectedRuleIds.value
    .map((id) => store.fanRules.find((r) => r.id === id)?.name)
    .filter(Boolean) as string[];
});

// 是否包含莊家台
const isDealerBonus = computed(() => {
  return winnerIndex.value === store.currentDealerIndex || loserIndex.value === store.currentDealerIndex;
});

// 當前總台數 (含莊家連莊台)
const totalFan = computed(() => {
  return manualFan.value + (isDealerBonus.value ? store.currentDealerFan : 0);
});

// 單家應付金額
const singlePay = computed(() => {
  return store.baseScore + totalFan.value * store.pointScore;
});

// 贏家預期實收
const totalIncome = computed(() => {
  return loserIndex.value === -1 ? singlePay.value * 3 : singlePay.value;
});

function handleSettle() {
  store.settleRound({
    winnerIndex: winnerIndex.value,
    loserIndex: loserIndex.value,
    fanCount: manualFan.value,
    tags: [...selectedTags.value]
  });
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div class="bg-table-800 border border-table-border w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
      <div class="flex items-center justify-between pb-3 border-b border-table-border">
        <div>
          <h2 class="text-lg font-black text-gold-400">牌局胡牌結算 ({{ store.currentRoundName }})</h2>
          <p class="text-xs text-gray-400">目前莊家：{{ store.players[store.currentDealerIndex].name }} (莊家連莊台 +{{ store.currentDealerFan }}台)</p>
        </div>
        <button @click="$emit('close')" class="p-1.5 text-gray-400 hover:text-white rounded-lg bg-table-900/50">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 誰胡牌 (贏家) -->
      <div class="mt-4">
        <label class="block text-xs font-semibold text-gray-300 mb-1.5">🀄 誰胡牌 (贏家)</label>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="p in store.players"
            :key="p.id"
            type="button"
            @click="winnerIndex = p.id"
            class="py-2.5 text-xs font-bold rounded-xl border transition-all"
            :class="winnerIndex === p.id ? 'bg-gold-500 border-gold-400 text-table-900 shadow-md font-black scale-[1.02]' : 'bg-table-900 border-table-border text-gray-300'"
          >
            {{ p.name }}
          </button>
        </div>
      </div>

      <!-- 放槍者 -->
      <div class="mt-4">
        <label class="block text-xs font-semibold text-gray-300 mb-1.5">🎯 放槍者 (若自摸選「自摸」)</label>
        <div class="grid grid-cols-5 gap-1.5">
          <button
            type="button"
            @click="loserIndex = -1"
            class="py-2.5 text-xs font-bold rounded-xl border transition-all"
            :class="loserIndex === -1 ? 'bg-emerald-500 border-emerald-400 text-table-900 shadow-md font-black' : 'bg-table-900 border-table-border text-gray-300'"
          >
            自摸 (3家)
          </button>
          <template v-for="p in store.players" :key="p.id">
            <button
              v-if="p.id !== winnerIndex"
              type="button"
              @click="loserIndex = p.id"
              class="py-2.5 text-xs font-bold rounded-xl border transition-all"
              :class="loserIndex === p.id ? 'bg-rose-500 border-rose-400 text-white shadow-md font-black' : 'bg-table-900 border-table-border text-gray-300'"
            >
              {{ p.name }} 放槍
            </button>
          </template>
        </div>
      </div>

      <!-- 自定義台數勾選區 -->
      <div class="mt-4">
        <div class="flex justify-between items-center mb-1.5">
          <label class="text-xs font-semibold text-gray-300">台數勾選 (自訂規則)</label>
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-gold-400">
              役種 {{ manualFan }} 台 + 莊台 {{ isDealerBonus ? store.currentDealerFan : 0 }} = 共 {{ totalFan }} 台
            </span>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 bg-table-900/50 rounded-xl border border-table-border/50">
          <button
            v-for="rule in store.activeFanRules"
            :key="rule.id"
            type="button"
            @click="toggleRule(rule)"
            class="text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1"
            :class="selectedRuleIds.includes(rule.id) ? 'bg-gold-500 text-table-900 font-bold border-gold-400 shadow-sm' : 'bg-table-900 border-table-border text-gray-300 hover:border-gray-500'"
          >
            <Check v-if="selectedRuleIds.includes(rule.id)" class="w-3.5 h-3.5 stroke-[3]" />
            {{ rule.name }} (+{{ rule.fan }})
          </button>
        </div>

        <!-- 台數手動微調 -->
        <div class="flex items-center justify-between mt-2 px-1">
          <span class="text-[11px] text-gray-400">手動增減微調台數：</span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="manualFan = Math.max(0, manualFan - 1)"
              class="p-1 rounded bg-table-900 border border-table-border text-gray-300 hover:text-white"
            >
              <Minus class="w-3.5 h-3.5" />
            </button>
            <span class="font-mono text-sm font-bold text-gold-400 min-w-[20px] text-center">{{ manualFan }}</span>
            <button
              type="button"
              @click="manualFan++"
              class="p-1 rounded bg-table-900 border border-table-border text-gray-300 hover:text-white"
            >
              <Plus class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- 即時金額試算 -->
      <div class="mt-4 bg-table-900/90 border border-table-border p-4 rounded-2xl flex items-center justify-between">
        <div>
          <div class="text-xs text-gray-400">單家應付</div>
          <div class="text-base font-bold text-gray-200">{{ singlePay }} 元</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-400">贏家實收金額</div>
          <div class="text-2xl font-black text-emerald-400 font-mono">+{{ totalIncome }} 元</div>
        </div>
      </div>

      <button
        @click="handleSettle"
        class="w-full mt-5 py-3.5 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 text-table-900 font-black rounded-xl text-base shadow-lg shadow-gold-500/20 active:scale-[0.98] transition-all"
      >
        確認結算入帳
      </button>
    </div>
  </div>
</template>