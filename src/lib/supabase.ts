import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase Environment Variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

/**
 * Local helper to upsert a profile row.
 * Defined here (instead of importing from profileService) to avoid a circular dependency.
 */
const upsertProfileLocal = async (userId: string, displayName: string) => {
    const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' });
    if (error) {
        console.error('Error upserting profile:', error);
    }
};

// ── Anonymous Auth (unchanged) ──────────────────────────────────────
export const signInAnonymously = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
        console.error('Error signing in anonymously:', error);
        return null;
    }
    return data.user?.id;
};

// ── Email/Password Auth (new) ───────────────────────────────────────

export const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<{ userId: string | null; error: string | null; needsEmailConfirmation?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: displayName,
            }
        }
    });

    if (error) {
        console.error('Error signing up:', error);
        return { userId: null, error: error.message };
    }

    // Supabase returns an empty identities array on signup if the email already exists
    // (This is a security feature to prevent email enumeration, but we want to tell the user)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { userId: null, error: 'User with this email already exists' };
    }

    const needsEmailConfirmation = !!data.user && !data.session;

    return { userId: data.user?.id || null, error: null, needsEmailConfirmation };
};

export const signInWithEmail = async (email: string, password: string): Promise<{ userId: string | null; error: string | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Error signing in:', error);
        return { userId: null, error: error.message };
    }

    return { userId: data.user?.id || null, error: null };
};

export const signOutUser = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
    }
};

/**
 * Upgrade an anonymous session to a permanent email/password account.
 * Supabase supports this natively via updateUser.
 */
export const linkAnonymousToEmail = async (email: string, password: string, displayName: string): Promise<{ success: boolean; error: string | null }> => {
    const { data, error } = await supabase.auth.updateUser({
        email,
        password,
    });

    if (error) {
        console.error('Error linking anonymous account:', error);
        return { success: false, error: error.message };
    }

    const userId = data.user?.id;
    if (userId) {
        await upsertProfileLocal(userId, displayName);
    }

    return { success: true, error: null };
};

/**
 * Check if the current user is anonymous (no email).
 */
export const isAnonymousUser = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;
    return user.is_anonymous === true;
};

// ── Google OAuth ────────────────────────────────────────────────────

export const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    // If running `npm run dev` locally, Vite flags `import.meta.env.DEV` as true.
    // In development we want to redirect to localhost, in production we use the predefined SITE_URL.
    const isLocal = import.meta.env.DEV;
    const siteUrl = isLocal ? window.location.origin : (import.meta.env.VITE_SITE_URL || window.location.origin);

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: siteUrl,
        },
    });

    if (error) {
        console.error('Error signing in with Google:', error);
        return { error: error.message };
    }

    return { error: null };
};
