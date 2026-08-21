// Mirrors the shared Express API's user shapes (routes/auth.js, routes/users.js).
// Note: /login and /register respond with a slim `{id, name, email}`, while
// /me and /users/profile respond with the fuller stored record (`_id` plus
// dateOfBirth/gender/phone) — a pre-existing inconsistency in the backend,
// verified harmless (nothing here cross-references id vs _id in the same
// code path) and left as-is rather than "fixed" as part of this migration.
export interface AuthUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

export interface CurrentUserResponse {
  success: boolean;
  user: AuthUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  name: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
}
