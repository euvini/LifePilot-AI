export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  userMetadata?: Record<string, unknown>;
}
