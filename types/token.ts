export type ParamObject = {
  code: string;
  state: string;
  scope: string;
};

export type TokenResponse = {
  token_type: "Bearer";
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: SummaryAthlete;
};

export type SummaryAthlete = {
  id: number;
  username: null | string;
  resource_state: 1 | 2 | 3;
  firstname: string | null;
  lastname: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  sex: "M" | "F" | null;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  badge_type_id: number;
  weight: number;
  profile_medium: string | null;
  profile: string | null;
  friend: null;
  follower: null;
};
