const hasSupabaseConfig = false;

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe() {} } },
    }),
    signInWithPassword: async () => ({
      data: { session: null, user: null },
      error: null,
    }),
    signUp: async () => ({
      data: { session: null, user: null },
      error: null,
    }),
    signOut: async () => ({ error: null }),
  },
};

export { hasSupabaseConfig };
