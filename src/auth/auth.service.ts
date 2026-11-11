import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  AuthResponseDto,
  TokenResponseDto,
  UserResponseDto,
} from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RefreshTokenDto } from './dto/refresh-token.dto.js';
import type { SignUpDto } from './dto/signup.dto.js';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface.js';

@Injectable()
export class AuthService {
  private readonly supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new InternalServerErrorException(
        'SUPABASE_URL e SUPABASE_ANON_KEY devem estar configurados.',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async signUp(dto: SignUpDto): Promise<AuthResponseDto> {
    const { data, error } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      if (
        error.message?.toLowerCase().includes('already registered') ||
        error.code === 'user_already_exists'
      ) {
        throw new ConflictException('E-mail já cadastrado.');
      }
      throw new BadRequestException(error.message);
    }

    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    if (!data.user) {
      throw new BadGatewayException('Não foi possível criar o usuário.');
    }

    // Se a confirmação automática gerou sessão, devolvemos os tokens
    const session = data.session;
    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? dto.email,
        userMetadata: data.user.user_metadata,
        createdAt: data.user.created_at,
      },
      accessToken: session?.access_token ?? '',
      refreshToken: session?.refresh_token,
      expiresIn: session?.expires_in,
      tokenType: 'bearer',
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      if (
        error.code === 'invalid_credentials' ||
        error.message?.toLowerCase().includes('invalid login credentials')
      ) {
        throw new UnauthorizedException('Credenciais inválidas.');
      }
      throw new BadRequestException(error.message);
    }

    if (!data.user || !data.session) {
      throw new UnauthorizedException('Falha na autenticação do usuário.');
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? dto.email,
        userMetadata: data.user.user_metadata,
        createdAt: data.user.created_at,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      tokenType: 'bearer',
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenResponseDto> {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: dto.refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      tokenType: 'bearer',
    };
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    return {
      id: data.user.id,
      email: data.user.email ?? '',
      role: data.user.role,
      userMetadata: data.user.user_metadata,
    };
  }

  async getMe(token: string): Promise<UserResponseDto> {
    const user = await this.validateToken(token);
    return {
      id: user.id,
      email: user.email,
      userMetadata: user.userMetadata,
    };
  }

  async logout(token: string): Promise<void> {
    await this.validateToken(token);
    const { error } = await this.supabase.auth.admin.signOut(token);
    if (error) {
      throw new BadGatewayException(
        'Falha ao encerrar a sessão no provedor de autenticação.',
      );
    }
  }
}
