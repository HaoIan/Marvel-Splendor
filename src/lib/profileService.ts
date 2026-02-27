import { supabase } from './supabase';

export interface Profile {
    id: string;
    display_name: string;
    created_at: string;
    games_played: number;
    games_won: number;
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
