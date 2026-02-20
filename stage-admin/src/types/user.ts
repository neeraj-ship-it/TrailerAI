import { z } from "zod";
import { JwtPayload } from "jwt-decode";

/*
 * Schemas
 */
const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  avatar: z.string(),
});

/*
 * Types
 */

export type User = z.infer<typeof UserSchema>;

export type AuthContextType = {
  user: User | null;
  signOut: () => Promise<void>;
  error: Error | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
};

// You might also want to define a type for the authentication response
export type AuthResponse = {
  accessToken: string;
  privileges: Array<string>;
};

export interface DecodedAccessToken extends JwtPayload {
  privileges?: string[];
}
