import { useState, useEffect } from 'react';
import { fetchPixelsTeamMembers, PixelsMember } from '../utils/pixelsTeam';

export interface UsePixelsTeamResult {
  members: PixelsMember[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePixelsTeam(): UsePixelsTeamResult {
  const [members, setMembers] = useState<PixelsMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPixelsTeamMembers();
      setMembers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { members, loading, error, refresh: load };
}

export default usePixelsTeam;
