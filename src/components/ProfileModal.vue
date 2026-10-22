<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { X, User, Check, Loader2, Sparkles, Coins, Mail, Lock, ShieldCheck } from 'lucide-vue-next';
import { useAuthStore } from '../stores/useAuthStore';
import { useLiveGameStore } from '../stores/useLiveGameStore';

const emit = defineEmits(['close']);
const authStore = useAuthStore();
const liveStore = useLiveGameStore();

const displayName = ref('');
const preferredBase = ref(100);
const preferredPoint = ref(30);

// 修改密碼相關
const newPassword = ref('');
const showPasswordSection = ref(false);

const isSaving = ref(false);
const saveSuccess = ref(false);
const errorMessage = ref('');
const passwordSuccess = ref(false);

onMounted(() => {
  displayName.value = authStore.currentDisplayName;
  if (authStore.profile) {
    preferredBase.value = authStore.profile.preferred_base || 100;
    preferredPoint.value = authStore.profile.preferred_point || 30;
  }
});

async function handleSaveProfile() {
  if (!displayName.value.trim()) {
    errorMessage.value = '請輸入暱稱';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';
  saveSuccess.value = false;

  try {
    await authStore.updateProfile(
      displayName.value,
      preferredBase.value,
      preferredPoint.value
    );

    // 同步更新牌桌中自己的座次名字
    if (liveStore.players[liveStore.mySeatIndex]) {
      liveStore.players[liveStore.mySeatIndex].name = displayName.value.trim();
    }

    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
      emit('close');
    }, 700);
  } catch (err: any) {
    errorMessage.value = err.message || '更新失敗，請稍後再試';
  } finally {
    isSaving.value = false;
  }
}

async function handleChangePassword() {
  if (newPassword.value.length < 6) {
    errorMessage.value = '新密碼至少需要 6 個字元';
    return;
  }

  isSaving.value = true;
  errorMessage.value = '';

  try {
    await authStore.updatePassword(newPassword.value);
    passwordSuccess.value = true;
    newPassword.value = '';
    setTimeout(() => {
      passwordSuccess.value = false;
      showPasswordSection.value = false;
    }, 1500);
  } catch (err: any) {
    errorMessage.value = err.message || '修改密碼失敗';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-table-800 border border-table-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto">
      
      <!-- 關閉按鈕 -->
      <button 
        @click="$emit('close')" 
        class="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg bg-table-900/50 transition-colors"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- 標題 -->
      <div class="text-center pt-2">
        <h2 class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-amber-300 flex items-center justify-center gap-1.5">
          <Sparkles class="w-5 h-5 text-gold-400" /> 個人帳號與基本資料
        </h2>
        <p class="text-xs text-gray-400 mt-1">自訂牌桌稱號與常用開桌底台規格</p>
      </div>

      <!-- 帳號資訊卡片 -->
      <div class="bg-table-900/80 p-3.5 rounded-2xl border border-table-border flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400 font-black text-lg">
          {{ displayName.slice(0, 1) || '🀄' }}
        </div>
        <div class="flex-1 truncate">
          <div class="text-xs font-bold text-gray-200 truncate flex items-center gap-1">
            {{ displayName }}
            <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">已驗證</span>
          </div>
          <div class="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
            <Mail class="w-3 h-3 text-gray-500" />
            {{ authStore.user?.email || 'OAuth 登入帳號' }}
          </div>
        </div>
      </div>

      <!-- 基本資料表單 -->
      <form @submit.prevent="handleSaveProfile" class="space-y-4">
        <!-- 暱稱 -->
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">玩家稱號 / 暱稱</label>
          <div class="relative">
            <User class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="displayName"
              type="text"
              required
              placeholder="輸入您的稱號"
              class="w-full bg-table-900 border border-table-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 outline-none focus:border-gold-500 transition-colors font-bold"
            />
          </div>
          <span class="text-[10px] text-gray-500 mt-1 block">將顯示在頂部導覽列、個人戰報與牌桌座位</span>
        </div>

        <!-- 偏好底台設定 -->
        <div class="bg-table-900/60 p-3.5 rounded-2xl border border-table-border/60">
          <label class="block text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
            <Coins class="w-3.5 h-3.5 text-gold-400" /> 常用開桌規格 (底 / 台)
          </label>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="text-[10px] text-gray-400 block mb-1">預設底 (元)</span>
              <input
                v-model.number="preferredBase"
                type="number"
                min="0"
                class="w-full bg-table-800 border border-table-border rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-gold-500 font-mono font-bold"
              />
            </div>
            <div>
              <span class="text-[10px] text-gray-400 block mb-1">預設台 (元)</span>
              <input
                v-model.number="preferredPoint"
                type="number"
                min="0"
                class="w-full bg-table-800 border border-table-border rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-gold-500 font-mono font-bold"
              />
            </div>
          </div>
        </div>

        <!-- 錯誤提示 -->
        <div v-if="errorMessage" class="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl">
          {{ errorMessage }}
        </div>

        <!-- 儲存個人資料按鈕 -->
        <button
          type="submit"
          :disabled="isSaving"
          class="w-full py-2.5 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 text-table-900 font-black rounded-xl text-xs transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
          <Check v-else-if="saveSuccess" class="w-4 h-4" />
          <span>{{ saveSuccess ? '已成功儲存！' : isSaving ? '儲存中...' : '儲存基本資料' }}</span>
        </button>
      </form>

      <!-- 密碼修改選單 (折疊區) -->
      <div class="pt-3 border-t border-table-border/60">
        <button
          type="button"
          @click="showPasswordSection = !showPasswordSection; errorMessage = ''"
          class="text-xs text-gray-400 hover:text-gold-400 flex items-center justify-between w-full py-1"
        >
          <span class="flex items-center gap-1.5 font-semibold">
            <Lock class="w-3.5 h-3.5" /> 修改帳號密碼
          </span>
          <span class="text-[10px] underline">{{ showPasswordSection ? '收起' : '展開修改' }}</span>
        </button>

        <div v-if="showPasswordSection" class="mt-3 space-y-3 bg-table-900/50 p-3 rounded-2xl border border-table-border/50">
          <div>
            <label class="block text-[11px] font-semibold text-gray-300 mb-1">新密碼 (至少 6 位字元)</label>
            <input
              v-model="newPassword"
              type="password"
              placeholder="請輸入新密碼"
              class="w-full bg-table-800 border border-table-border rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-gold-500"
            />
          </div>

          <div v-if="passwordSuccess" class="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl flex items-center gap-1">
            <ShieldCheck class="w-3.5 h-3.5" /> 密碼已更新成功！
          </div>

          <button
            type="button"
            @click="handleChangePassword"
            :disabled="isSaving || !newPassword"
            class="w-full py-2 bg-table-700 hover:bg-table-600 text-gray-200 font-bold rounded-xl text-xs transition-all disabled:opacity-40"
          >
            確認更新密碼
          </button>
        </div>
      </div>
    </div>
  </div>
</template>