import { useEffect, useState } from 'react';
import { supabase } from '../context/AuthContext';

export function useCustomEmojis(serverId) {
  const [customEmojis, setCustomEmojis] = useState([]);

  useEffect(() => {
    if (!serverId) { setCustomEmojis([]); return; }

    async function load() {
      const { data } = await supabase
        .from('custom_emojis')
        .select('*')
        .eq('server_id', serverId);
      if (data) setCustomEmojis(data);
    }

    load();

    // Realtime updates when emojis are added/removed
    const channel = supabase
      .channel(`custom_emojis_${serverId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'custom_emojis',
        filter: `server_id=eq.${serverId}`
      }, () => load())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [serverId]);

  return customEmojis;
}
