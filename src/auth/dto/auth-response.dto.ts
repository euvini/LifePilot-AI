export class UserResponseDto {
  id!: string;
  email!: string;
  userMetadata?: Record<string, unknown>;
  createdAt?: string;
}

export class AuthResponseDto {
  user!: UserResponseDto;
  accessToken!: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType!: string;
}

export class TokenResponseDto {
  accessToken!: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType!: string;
}
