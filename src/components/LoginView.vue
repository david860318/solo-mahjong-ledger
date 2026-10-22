<script setup lang="ts">
import { ref } from 'vue';
import { Mail, Lock, User, Loader2, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-vue-next';
import { useAuthStore } from '../stores/useAuthStore';
import { useRecordStore } from '../stores/useRecordStore';

const emit = defineEmits(['login-success', 'skip-guest']);
const authStore = useAuthStore();
const recordStore = useRecordStore();

const mode = ref<'signin' | 'signup'>('signin');
const email = ref('');
const password = ref('');
const displayName = ref('');
const errorMessage = ref('');
const isSubmitting = ref(false);

async function handleEmailAuth() {
  errorMessage.value = '';
  isSubmitting.value = true;

  try {
    if (mode.value === 'signup') {
      if (!displayName.value.trim()) {
        throw new Error('請輸入牌桌稱號 / 暱稱');
      }
      if (password.value.length < 6) {
        throw new Error('密碼長度至少需要 6 個字元');
      }
      await authStore.signUpWithEmail(email.value, password.value, displayName.value.trim());
      alert('註冊成功！若有啟用信箱確認，請查看驗證信件。');
    } else {
      await authStore.signInWithEmail(email.value, password.value);
    }
    
    await recordStore.fetchCloudRecords();
    emit('login-success');
  } catch (err: any) {
    errorMessage.value = err.message || '驗證失敗，請檢查輸入帳密';
  } finally {
    isSubmitting.value = false;
  }
}

async function handleGoogleLogin() {
  errorMessage.value = '';
  try {
    await authStore.signInWithGoogle();
  } catch (err: any) {
    errorMessage.value = err.message || 'Google 登入失敗';
  }
}
</script>

<template>
  <div class="min-h-screen bg-table-900 flex flex-col justify-center items-center px-4 py-8 relative selection:bg-gold-500 selection:text-table-900">
    <!-- 背景裝飾暗紋 -->
    <div class="absolute inset-0 bg-[radial-gradient(#1f5540_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none"></div>

    <div class="w-full max-w-md relative z-10">
      <!-- 頂部品牌區 -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-table-800 border-2 border-gold-500/40 shadow-xl shadow-gold-500/10 mb-3">
          <span class="text-3xl">🀄</span>
        </div>
        <h1 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-amber-300">
          台灣麻將實戰助理
        </h1>
        <p class="text-xs text-gray-400 mt-1">十六張即時計分 · 個人雀歷帳本 · 雲端數據同步</p>
      </div>

      <!-- 主卡片 -->
      <div class="bg-table-800/95 border border-table-border rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur space-y-5">
        
        <!-- Google 快速登入 -->
        <div>
          <button
            type="button"
            @click="handleGoogleLogin"
            class="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.98]"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            使用 Google 帳號快速登入
          </button>
        </div>

        <!-- 分隔線 -->
        <div class="flex items-center gap-3">
          <div class="h-px bg-table-border flex-1"></div>
          <span class="text-[11px] text-gray-500 font-semibold tracking-wider">或使用電子信箱帳號</span>
          <div class="h-px bg-table-border flex-1"></div>
        </div>

        <!-- 模式切換 Tabs -->
        <div class="flex bg-table-900 border border-table-border p-1 rounded-xl text-xs">
          <button
            type="button"
            @click="mode = 'signin'; errorMessage = ''"
            class="flex-1 py-2 rounded-lg font-bold transition-all text-center"
            :class="mode === 'signin' ? 'bg-gold-500 text-table-900 shadow-md font-black' : 'text-gray-400 hover:text-white'"
          >
            登入現有帳號
          </button>
          <button
            type="button"
            @click="mode = 'signup'; errorMessage = ''"
            class="flex-1 py-2 rounded-lg font-bold transition-all text-center"
            :class="mode === 'signup' ? 'bg-gold-500 text-table-900 shadow-md font-black' : 'text-gray-400 hover:text-white'"
          >
            建立新雀士帳號
          </button>
        </div>

        <!-- 表單 -->
        <form @submit.prevent="handleEmailAuth" class="space-y-3.5">
          <!-- 暱稱（僅註冊顯示） -->
          <div v-if="mode === 'signup'">
            <label class="block text-xs font-semibold text-gray-300 mb-1">玩家稱號 / 暱稱</label>
            <div class="relative">
              <User class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="displayName"
                type="text"
                required
                placeholder="例如：西門大三元、信義賭神"
                class="w-full bg-table-900 border border-table-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
          </div>

          <!-- 電子郵件 -->
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">電子信箱</label>
            <div class="relative">
              <Mail class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="email"
                type="email"
                required
                placeholder="your@email.com"
                class="w-full bg-table-900 border border-table-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
          </div>

          <!-- 密碼 -->
          <div>
            <label class="block text-xs font-semibold text-gray-300 mb-1">密碼</label>
            <div class="relative">
              <Lock class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="password"
                type="password"
                required
                placeholder="至少 6 位字元"
                class="w-full bg-table-900 border border-table-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-gray-100 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
          </div>

          <!-- 錯誤提示 -->
          <div v-if="errorMessage" class="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl">
            {{ errorMessage }}
          </div>

          <!-- 送出按鈕 -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full py-3 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 text-table-900 font-black rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-gold-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <span>{{ mode === 'signin' ? '立即進入牌桌' : '確認建立帳號並登入' }}</span>
          </button>
        </form>

        <!-- 訪客/離線體驗捷徑 -->
        <div class="pt-3 border-t border-table-border/60 text-center">
          <button
            type="button"
            @click="$emit('skip-guest')"
            class="text-xs text-gray-400 hover:text-gold-400 inline-flex items-center gap-1 transition-colors underline decoration-dotted"
          >
            <span>暫不登入，先以訪客模式體驗</span>
            <ArrowLeft class="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </div>

      <!-- 底部安全隱私標籤 -->
      <div class="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-500">
        <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
        <span>端到端 RLS 多租戶個人戰績隱私隔離保護</span>
      </div>
    </div>
  </div>
</template>