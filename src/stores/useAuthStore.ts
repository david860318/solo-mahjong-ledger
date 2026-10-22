import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase } from '../utils/supabase';
import type { User } from '@supabase/supabase-js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(true);

  async function init() {
    loading.value = true;
    try {
      const { data } = await supabase.auth.getUser();
      user.value = data?.user ?? null;

      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null;
      });
    } catch (e) {
      console.error('Auth init error:', e);
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function signUpWithEmail(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName }
      }
    });
    if (error) throw error;
    return data;
  }

  async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    user.value = null;
  }

  return {
    user,
    loading,
    init,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut
  };
});