export type LeaderRow = { rank: number; user: string; score: number };
export type Leaderboard = { season: number; top: LeaderRow[]; me: { rank: number; score: number } | null };
export type TeamStanding = { team: number; tiles: number; players: number };
export type BoardTile = { x: number; y: number; team: number; owner: string };
export type BattlefieldMeta = { bf: number; status: number; endTime: number; winningTeam: number; seasonId: number };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const getLeaderboard = (season?: number, me?: string) =>
  get<Leaderboard>(`/api/leaderboard?${new URLSearchParams({
    ...(season ? { season: String(season) } : {}),
    ...(me ? { me } : {}),
  })}`);

export const getTeams = (bf: number) =>
  get<{ bf: number; teams: TeamStanding[] }>(`/api/teams/${bf}`);

export const getBattlefield = (bf: number) =>
  get<{ bf: number; meta: BattlefieldMeta | null; tiles: BoardTile[] }>(`/api/battlefield/${bf}`);
