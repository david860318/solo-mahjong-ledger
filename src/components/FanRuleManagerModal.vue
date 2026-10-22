<script setup lang="ts">
import { ref } from 'vue';
import { X, Plus, Trash2, RotateCcw } from 'lucide-vue-next';
import { useLiveGameStore } from '../stores/useLiveGameStore';
import type { FanRule } from '../types/mahjong';

const emit = defineEmits(['close']);
const store = useLiveGameStore();

// 建立可編輯的副本
const editingRules = ref<FanRule[]>(JSON.parse(JSON.stringify(store.fanRules)));

// 新增自訂役種表單
const newRuleName = ref('');
const newRuleFan = ref<number>(1);

function addCustomRule() {
  if (!newRuleName.value.trim()) return;
  editingRules.value.push({
    id: 'custom-' + Date.now(),
    name: newRuleName.value.trim(),
    fan: Number(newRuleFan.value) || 1,
    enabled: true,
    isCustom: true
  });
  newRuleName.value = '';
  newRuleFan.value = 1;
}

function removeRule(index: number) {
  editingRules.value.splice(index, 1);
}

function handleSave() {
  store.saveFanRules(editingRules.value);
  emit('close');
}

function handleResetDefaults() {
  if (confirm('確定要將所有台數與規則恢復為台灣正規十六張預設值嗎？')) {
    store.resetFanRulesToDefault();
    editingRules.value = JSON.parse(JSON.stringify(store.fanRules));
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-table-800 border border-table-border w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
      <!-- 標頭 -->
      <div class="flex items-center justify-between pb-3 border-b border-table-border">
        <div>
          <h3 class="text-base font-bold text-gold-400">自訂麻將台數規則</h3>
          <p class="text-xs text-gray-400">可自訂台數數值、啟用或停用、新增私人牌規</p>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white p-1">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 規則列表區 (滾動) -->
      <div class="flex-1 overflow-y-auto space-y-2 py-3 my-2 pr-1">
        <div
          v-for="(rule, index) in editingRules"
          :key="rule.id"
          class="flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all"
          :class="rule.enabled ? 'bg-table-900/90 border-table-border' : 'bg-table-900/40 border-table-border/40 opacity-60'"
        >
          <div class="flex items-center gap-2.5 flex-1">
            <!-- 開啟/停用 Checkbox -->
            <input
              type="checkbox"
              v-model="rule.enabled"
              class="w-4 h-4 rounded text-gold-500 focus:ring-0 cursor-pointer accent-gold-500"
            />
            <span class="text-xs font-semibold text-gray-200">{{ rule.name }}</span>
            <span v-if="rule.isCustom" class="text-[9px] bg-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded border border-gold-500/30">自訂</span>
          </div>

          <div class="flex items-center gap-2">
            <!-- 台數輸入框 -->
            <div class="flex items-center gap-1">
              <input
                v-model.number="rule.fan"
                type="number"
                min="0"
                class="w-14 bg-table-800 border border-table-border rounded-lg px-2 py-1 text-xs text-center font-mono font-bold text-gold-400 outline-none focus:border-gold-500"
              />
              <span class="text-xs text-gray-400">台</span>
            </div>

            <!-- 若為使用者自訂，可直接刪除 -->
            <button
              v-if="rule.isCustom"
              @click="removeRule(index)"
              class="text-gray-500 hover:text-rose-400 p-1"
              title="刪除自訂規則"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- 新增自訂役種表單 -->
      <div class="pt-3 border-t border-table-border">
        <label class="block text-xs font-semibold text-gray-300 mb-1.5">➕ 新增自訂牌型 / 特殊役種</label>
        <div class="flex gap-2">
          <input
            v-model="newRuleName"
            type="text"
            placeholder="牌型名稱 (例：眼牌、平胡、五暗刻)"
            class="flex-1 bg-table-900 border border-table-border rounded-xl px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-gold-500"
          />
          <div class="flex items-center gap-1">
            <input
              v-model.number="newRuleFan"
              type="number"
              min="0"
              class="w-14 bg-table-900 border border-table-border rounded-xl px-2 py-1.5 text-xs text-center font-mono font-bold text-gold-400 outline-none focus:border-gold-500"
            />
            <span class="text-xs text-gray-400">台</span>
          </div>
          <button
            @click="addCustomRule"
            class="bg-table-700 hover:bg-table-600 text-gray-200 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all"
          >
            <Plus class="w-3.5 h-3.5" /> 加入
          </button>
        </div>
      </div>

      <!-- 底部動作按鈕 -->
      <div class="flex items-center justify-between pt-4 mt-2 border-t border-table-border gap-3">
        <button
          @click="handleResetDefaults"
          class="text-xs text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
        >
          <RotateCcw class="w-3.5 h-3.5" /> 還原預設
        </button>

        <div class="flex items-center gap-2">
          <button
            @click="$emit('close')"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
          >
            取消
          </button>
          <button
            @click="handleSave"
            class="px-5 py-2 bg-gold-500 hover:bg-gold-400 text-table-900 text-xs font-black rounded-xl shadow-md active:scale-95 transition-all"
          >
            儲存台數設定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>