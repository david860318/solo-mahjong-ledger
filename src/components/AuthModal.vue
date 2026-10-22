<script setup lang="ts">
import { ref } from 'vue';
import { X, Mail, Lock, User, Loader2 } from 'lucide-vue-next';
import { useAuthStore } from '../stores/useAuthStore';
import { useRecordStore } from '../stores/useRecordStore';

const emit = defineEmits(['close', 'success']);
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
        throw new Error('請輸入玩家暱稱');
      }
      if (password.value.length < 6) {
        throw new Error('密碼長度至少需要 6 個字元');
      }
      await authStore.signUpWithEmail(email.value, password.value, displayName.value.trim());
      alert('帳號建立成功！若有啟用信箱確認，請查看驗證信件。');
    } else {
      await authStore.signInWithEmail(email.value, password.value);
    }
    await recordStore.fetchCloudRecords();
    emit('success');
    emit('close');
  } catch (err: any) {
    errorMessage.value = err.message || '認證失敗，請檢查輸入資訊';
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
  <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-table-800 border border-table-border w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 relative">
      <button 
        @click="$emit('close')" 
        class="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg bg-table-900/50 transition-colors"
      >
        <X class="w-5 h-5" />
      </button>

      <div class="text-center pt-2">
        <h2 class="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-amber-300">
          🀄 登入雲端帳號
        </h2>
        <p class="text-xs text-gray-400 mt-1">同步雀歷戰績、台數設定與牌桌對戰數據</p>
      </div>

      <div>
        <button
          type="button"
          @click="handleGoogleLogin"
          class="w-full py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95"
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

      <div class="flex items-center gap-2">
        <div class="h-px bg-table-border flex-1"></div>
        <span class="text-[10px] text-gray-500 font-semibold tracking-wider">或使用電子信箱</span>
        <div class="h-px bg-table-border flex-1"></div>
      </div>

      <div class="flex bg-table-900 border border-table-border p-1 rounded-xl text-xs">
        <button
          type="button"
          @click="mode = 'signin'; errorMessage = ''"
          class="flex-1 py-1.5 rounded-lg font-bold transition-all"
          :class="mode === 'signin' ? 'bg-gold-500 text-table-900 shadow-sm' : 'text-gray-400 hover:text-white'"
        >
          登入
        </button>
        <button
          type="button"
          @click="mode = 'signup'; errorMessage = ''"
          class="flex-1 py-1.5 rounded-lg font-bold transition-all"
          :class="mode === 'signup' ? 'bg-gold-500 text-table-900 shadow-sm' : 'text-gray-400 hover:text-white'"
        >
          註冊新帳號
        </button>
      </div>

      <form @submit.prevent="handleEmailAuth" class="space-y-3">
        <div v-if="mode === 'signup'">
          <label class="block text-[11px] font-semibold text-gray-300 mb-1">玩家暱稱</label>
          <div class="relative">
            <User class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="displayName"
              type="text"
              required
              placeholder="例：信義雀神"
              class="w-full bg-table-900 border border-table-border rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 outline-none focus:border-gold-500"
            />
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-gray-300 mb-1">電子信箱</label>
          <div class="relative">
            <Mail class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="email"
              type="email"
              required
              placeholder="your@email.com"
              class="w-full bg-table-900 border border-table-border rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 outline-none focus:border-gold-500"
            />
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-gray-300 mb-1">密碼</label>
          <div class="relative">
            <Lock class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="password"
              type="password"
              required
              placeholder="至少 6 位字元"
              class="w-full bg-table-900 border border-table-border rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 outline-none focus:border-gold-500"
            />
          </div>
        </div>

        <div v-if="errorMessage" class="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl">
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full py-2.5 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 text-table-900 font-black rounded-xl text-xs transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
          <span>{{ mode === 'signin' ? '立即登入' : '建立帳號' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>