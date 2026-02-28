import { supabase } from './supabase';

export interface Profile {
    id: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
    games_played: number;
    games_won: number;
}

export interface MatchHistoryEntry {
    id: string;
    match_id: string;
    winner_name: string;
    players: { id: string; name: string; points: number; cards: number; isRegistered: boolean }[];
    total_turns: number;
    finished_at: string;
}

export const getProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data as Profile | null;
};

export const upsertProfile = async (userId: string, displayName: string): Promise<Profile | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting profile:', error);
        return null;
    }
    return data as Profile;
};

export const updateDisplayName = async (userId: string, displayName: string): Promise<Profile | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating display name:', error);
        return null;
    }
    return data as Profile;
};

export const getLeaderboard = async (limit: number = 20): Promise<Profile[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('games_won', { ascending: false })
        .order('games_played', { ascending: true })
        .limit(limit);

    if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
    return (data || []) as Profile[];
};

export const incrementStats = async (userId: string, won: boolean): Promise<void> => {
    // Fetch current stats first, then increment
    const profile = await getProfile(userId);
    if (!profile) return; // Not a registered user, skip

    const updates: Partial<Profile> = {
        games_played: profile.games_played + 1,
    };
    if (won) {
        updates.games_won = profile.games_won + 1;
    }

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

    if (error) {
        console.error('Error incrementing stats:', error);
    }
};

// ── Avatar ──────────────────────────────────────────────────────────

export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    // Upload (upsert to overwrite previous avatar)
    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return null;
    }

    // Get public URL
    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    // Bust the browser cache by appending a timestamp
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    // Save URL to profile
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

    if (updateError) {
        console.error('Error saving avatar URL:', updateError);
    }

    return avatarUrl;
};

export const getAvatarUrl = (profile: Profile | null): string | null => {
    return profile?.avatar_url || null;
};

// ── Match History ───────────────────────────────────────────────────

export const getMatchHistory = async (userId: string, limit: number = 20): Promise<MatchHistoryEntry[]> => {
    // match_results.players is a JSONB array; filter rows where any player.id matches
    const { data, error } = await supabase
        .from('match_results')
        .select('*')
        .order('finished_at', { ascending: false })
        .limit(100); // fetch more then filter client-side since JSONB containment is tricky

    if (error) {
        console.error('Error fetching match history:', error);
        return [];
    }

    // Client-side filter: keep matches where this user participated
    const filtered = (data || []).filter((m: MatchHistoryEntry) =>
        m.players.some(p => p.id === userId)
    );

    return filtered.slice(0, limit) as MatchHistoryEntry[];
};
