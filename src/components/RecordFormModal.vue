<script setup lang="ts">
import { reactive, watch } from 'vue';
import { X, Check } from 'lucide-vue-next';
import { useRecordStore } from '../stores/useRecordStore';
import type { MahjongRecord } from '../types/mahjong';

const props = defineProps<{
  editRecord?: MahjongRecord | null;
}>();

const emit = defineEmits(['close']);
const store = useRecordStore();

const PRESET_STAKES = [
  { base: 30, point: 10, label: '30/10' },
  { base: 50, point: 20, label: '50/20' },
  { base: 100, point: 30, label: '100/30' },
  { base: 200, point: 50, label: '200/50' },
  { base: 300, point: 100, label: '300/100' }
];

const QUICK_TAGS = ['自摸', '放槍多', '門清', '大三元', '連莊高', '被包自摸', '清一色', '天聽/地聽', '嚦咕嚦咕'];
const COMMON_LOCATIONS = ['朋友家', '西門雀莊', '自家客廳', '信義電動桌'];

const now = new Date();
const currentIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const form = reactive({
  date: currentIso,
  baseScore: 100,
  pointScore: 30,
  rounds: 1,
  amount: 0,
  location: '朋友家',
  tags: [] as string[],
  notes: ''
});

// 若傳入編輯資料，則載入該資料
watch(
  () => props.editRecord,
  (rec) => {
    if (rec) {
      form.date = rec.date;
      form.baseScore = rec.baseScore;
      form.pointScore = rec.pointScore;
      form.rounds = rec.rounds;
      form.amount = rec.amount;
      form.location = rec.location;
      form.tags = [...rec.tags];
      form.notes = rec.notes || '';
    }
  },
  { immediate: true }
);

function adjustAmount(delta: number) {
  form.amount += delta;
}

function setStake(base: number, point: number) {
  form.baseScore = base;
  form.pointScore = point;
}

function toggleTag(tag: string) {
  const index = form.tags.indexOf(tag);
  if (index > -1) form.tags.splice(index, 1);
  else form.tags.push(tag);
}

function handleSubmit() {
  if (props.editRecord) {
    store.updateRecord(props.editRecord.id, { ...form });
  } else {
    store.addRecord({ ...form });
  }
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div class="bg-table-800 border border-table-border w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
      <div class="flex items-center justify-between pb-4 border-b border-table-border">
        <div>
          <h2 class="text-lg font-black text-gold-400">
            {{ editRecord ? '編輯雀歷紀錄' : '記一筆牌局戰績' }}
          </h2>
          <p class="text-xs text-gray-400">紀錄個人損益與勝負細節</p>
        </div>
        <button @click="$emit('close')" class="p-1.5 text-gray-400 hover:text-white rounded-lg bg-table-900/50">
          <X class="w-5 h-5" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4 mt-4">
        <!-- 個人淨損益輸入區塊 -->
        <div class="bg-table-900/80 p-4 rounded-2xl border border-table-border">
          <label class="block text-xs font-semibold text-gray-300 text-center mb-1">個人淨損益 (NTD)</label>
          <input
            v-model.number="form.amount"
            type="number"
            required
            placeholder="0"
            class="w-full bg-transparent text-3xl font-black text-center focus:outline-none tracking-tight font-mono"
            :class="form.amount > 0 ? 'text-emerald-400' : form.amount < 0 ? 'text-rose-400' : 'text-gray-300'"
          />
          <div class="grid grid-cols-6 gap-1.5 mt-3">
            <button type="button" @click="adjustAmount(1000)" class="btn-quick text-emerald-400">+1000</button>
            <button type="button" @click="adjustAmount(500)" class="btn-quick text-emerald-400">+500</button>
            <button type="button" @click="adjustAmount(100)" class="btn-quick text-emerald-400">+100</button>
            <button type="button" @click="adjustAmount(-100)" class="btn-quick text-rose-400">-100</button>
            <button type="button" @click="adjustAmount(-500)" class="btn-quick text-rose-400">-500</button>
            <button type="button" @click="form.amount = 0" class="btn-quick text-gray-400">歸零</button>
          </div>
        </div>

        <!-- 底 / 台 快捷規格 -->
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1.5">底 / 台 規格</label>
          <div class="grid grid-cols-5 gap-1.5">
            <button
              v-for="st in PRESET_STAKES"
              :key="st.label"
              type="button"
              @click="setStake(st.base, st.point)"
              class="py-2 text-xs font-bold rounded-xl border transition-all"
              :class="form.baseScore === st.base && form.pointScore === st.point
                ? 'bg-gold-500/20 border-gold-500 text-gold-400 shadow-sm'
                : 'bg-table-900 border-table-border text-gray-300 hover:border-gray-500'"
            >
              {{ st.label }}
            </button>
          </div>
        </div>

        <!-- 打幾將 & 地點 -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">將數 (Rounds)</label>
            <input
              v-model.number="form.rounds"
              type="number"
              step="0.5"
              min="0.5"
              required
              class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:border-gold-500 font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">日期時間</label>
            <input
              v-model="form.date"
              type="datetime-local"
              required
              class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-gold-500 font-mono"
            />
          </div>
        </div>

        <!-- 地點選擇與輸入 -->
        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="block text-xs font-semibold text-gray-300">牌局地點</label>
            <div class="flex gap-1">
              <button
                v-for="loc in COMMON_LOCATIONS"
                :key="loc"
                type="button"
                @click="form.location = loc"
                class="text-[10px] text-gray-400 hover:text-gold-400 underline decoration-dotted"
              >
                {{ loc }}
              </button>
            </div>
          </div>
          <input
            v-model="form.location"
            type="text"
            placeholder="如：朋友家、某某雀莊"
            class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:border-gold-500"
          />
        </div>

        <!-- 牌型標籤 -->
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1.5">精彩牌型與事件</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="tag in QUICK_TAGS"
              :key="tag"
              type="button"
              @click="toggleTag(tag)"
              class="text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1"
              :class="form.tags.includes(tag)
                ? 'bg-gold-500 border-gold-400 text-table-900 font-bold'
                : 'bg-table-900 border-table-border text-gray-400 hover:border-gray-500'"
            >
              <Check v-if="form.tags.includes(tag)" class="w-3 h-3" />
              {{ tag }}
            </button>
          </div>
        </div>

        <!-- 備忘筆記 -->
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">牌局備忘錄 (選填)</label>
          <input
            v-model="form.notes"
            type="text"
            placeholder="紀錄牌友、大牌役滿、抓位情況..."
            class="w-full bg-table-900 border border-table-border rounded-xl px-3 py-2 text-sm text-gray-200 outline-none focus:border-gold-500"
          />
        </div>

        <button
          type="submit"
          class="w-full mt-4 py-3 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-table-900 font-black rounded-xl transition-all shadow-lg shadow-gold-500/20 active:scale-[0.98]"
        >
          {{ editRecord ? '儲存修改' : '確認儲存戰績' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.btn-quick {
  @apply bg-table-900 hover:bg-table-700 border border-table-border text-xs font-bold py-1.5 rounded-lg transition-all active:scale-95;
}
</style>