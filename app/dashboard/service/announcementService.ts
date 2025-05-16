import { supabase } from "@/lib/supabase";

export const getAnnouncements = async () => {
    const { data, error } = await supabase.from('announcements').select('*').eq('is_active', true).order('published_at', {ascending: false}).limit(3);
    if (error){
        console.log('Error fetching announcements', error);
        return [];
    }
    return data || [];
}
