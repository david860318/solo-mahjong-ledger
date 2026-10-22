import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '../utils/supabase';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../types/mahjong';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const profile = ref<UserProfile | null>(null);
  const loading = ref(true);

// 1. 取得頭像 URL（支援 Google OAuth 頭像）
  const avatarUrl = computed(() => {
    if (profile.value?.avatar_url) return profile.value.avatar_url;
    const meta = user.value?.user_metadata;
    return meta?.avatar_url || meta?.picture || '';
  });

  // 2. 健壯的使用者名稱萃取：自訂 profile -> Google full_name -> Google name -> Email 前綴 -> 雀友
  const currentDisplayName = computed(() => {
    if (profile.value?.display_name && profile.value.display_name.trim()) {
      return profile.value.display_name.trim();
    }
    const meta = user.value?.user_metadata;
    if (meta?.full_name?.trim()) return meta.full_name.trim();
    if (meta?.name?.trim()) return meta.name.trim();
    if (user.value?.email) return user.value.email.split('@')[0];
    return '麻將雀友';
  });

  // 3. 抓取或自動初始化 Profile
  async function fetchProfile() {
    if (!user.value) {
      profile.value = null;
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .maybeSingle();

      if (!error && data) {
        profile.value = {
          id: data.id,
          display_name: data.display_name || '',
          avatar_url: data.avatar_url || '',
          preferred_base: Number(data.preferred_base) || 100,
          preferred_point: Number(data.preferred_point) || 30
        };
      } else {
        // 若 profiles 還沒有這筆資料，自動初始化
        const initialName = currentDisplayName.value;
        const initialAvatar = avatarUrl.value;

        const newProfile = {
          id: user.value.id,
          display_name: initialName,
          avatar_url: initialAvatar,
          preferred_base: 100,
          preferred_point: 30
        };

        const { data: inserted } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (inserted) {
          profile.value = inserted;
        }
      }
    } catch (e) {
      console.error('Fetch profile error:', e);
    }
  }

  // 4. 更新基本資料
  async function updateProfile(displayName: string, preferredBase: number, preferredPoint: number) {
    if (!user.value) throw new Error('尚未登入');

    const cleanName = displayName.trim();
    const cleanBase = Number(preferredBase) || 100;
    const cleanPoint = Number(preferredPoint) || 30;

    const updates = {
      id: user.value.id,
      display_name: cleanName,
      preferred_base: cleanBase,
      preferred_point: cleanPoint,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('profiles').upsert(updates);
    if (error) throw error;

    profile.value = {
      id: user.value.id,
      display_name: cleanName,
      avatar_url: profile.value?.avatar_url || '',
      preferred_base: cleanBase,
      preferred_point: cleanPoint
    };

    await supabase.auth.updateUser({
      data: { full_name: cleanName }
    });
  }

  // 修改登入密碼
  async function updatePassword(newPassword: string) {
    if (!user.value) throw new Error('尚未登入');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  // 初始化與監聽 Auth 狀態
 async function init() {
    loading.value = true;
    try {
      const { data } = await supabase.auth.getUser();
      user.value = data?.user ?? null;
      if (user.value) {
        await fetchProfile();
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        user.value = session?.user ?? null;
        if (user.value) {
          await fetchProfile();
        } else {
          profile.value = null;
        }
      });
    } catch (e) {
      user.value = null;
      profile.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function signUpWithEmail(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName.trim() } }
    });
    if (error) throw error;
    if (data.user) {
      user.value = data.user;
      await fetchProfile();
    }
    return data;
  }

  async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    user.value = data.user;
    await fetchProfile();
    return data;
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    user.value = null;
    profile.value = null;
  }

  return {
    user,
    profile,
    loading,
    avatarUrl,
    currentDisplayName,
    init,
    fetchProfile,
    updateProfile,
    updatePassword,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut
  };
});