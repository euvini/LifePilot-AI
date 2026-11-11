import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

// Mock do @supabase/supabase-js
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockRefreshSession = vi.fn();
const mockGetUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      refreshSession: mockRefreshSession,
      getUser: mockGetUser,
      signOut: mockSignOut,
      admin: {
        signOut: mockSignOut,
      },
    },
  }),
}));

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
    service = new AuthService();
  });

  describe('signUp', () => {
    it('deve cadastrar um novo usuário com sucesso e retornar tokens', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-uuid-1',
            email: 'novo@teste.com',
            user_metadata: { name: 'Teste' },
            created_at: '2026-11-11T12:00:00Z',
            identities: [{ id: 'identity-1' }],
          },
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
          },
        },
        error: null,
      });

      const result = await service.signUp({
        email: 'novo@teste.com',
        password: 'Password123!',
      });

      expect(result.user.id).toBe('user-uuid-1');
      expect(result.user.email).toBe('novo@teste.com');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'novo@teste.com',
        password: 'Password123!',
      });
    });

    it('deve lançar ConflictException se o e-mail já estiver cadastrado (erro do Supabase)', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered', code: 'user_already_exists' },
      });

      await expect(
        service.signUp({
          email: 'existente@teste.com',
          password: 'Password123!',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('deve lançar ConflictException se identities for vazio (proteção contra enumeração)', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: {
            id: 'existing-id',
            email: 'existente@teste.com',
            identities: [],
          },
          session: null,
        },
        error: null,
      });

      await expect(
        service.signUp({
          email: 'existente@teste.com',
          password: 'Password123!',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('deve lançar BadRequestException para erros genéricos do Supabase', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Password is too weak' },
      });

      await expect(
        service.signUp({
          email: 'fraco@teste.com',
          password: '123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('login', () => {
    it('deve autenticar usuário com credenciais corretas', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-uuid-1',
            email: 'user@teste.com',
          },
          session: {
            access_token: 'login-token',
            refresh_token: 'login-refresh',
            expires_in: 3600,
          },
        },
        error: null,
      });

      const result = await service.login({
        email: 'user@teste.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('login-token');
      expect(result.user.id).toBe('user-uuid-1');
    });

    it('deve lançar UnauthorizedException se credenciais forem inválidas', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: {
          code: 'invalid_credentials',
          message: 'Invalid login credentials',
        },
      });

      await expect(
        service.login({
          email: 'user@teste.com',
          password: 'WrongPassword',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('deve renovar sessão com sucesso', async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600,
          },
        },
        error: null,
      });

      const result = await service.refresh({ refreshToken: 'valid-refresh' });

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('deve lançar UnauthorizedException se o refresh token for inválido', async () => {
      mockRefreshSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Invalid refresh token' },
      });

      await expect(
        service.refresh({ refreshToken: 'bad-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('validateToken / getMe', () => {
    it('deve validar token com sucesso', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-uuid-1',
            email: 'user@teste.com',
            role: 'authenticated',
            user_metadata: { plan: 'pro' },
          },
        },
        error: null,
      });

      const user = await service.validateToken('valid-token');

      expect(user.id).toBe('user-uuid-1');
      expect(user.email).toBe('user@teste.com');
    });

    it('deve lançar UnauthorizedException se o token for inválido', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'JWT expired' },
      });

      await expect(service.validateToken('expired-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('getMe deve retornar o perfil do usuário', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-uuid-1',
            email: 'user@teste.com',
            user_metadata: { name: 'João' },
          },
        },
        error: null,
      });

      const profile = await service.getMe('valid-token');
      expect(profile.id).toBe('user-uuid-1');
      expect(profile.email).toBe('user@teste.com');
    });
  });

  describe('logout', () => {
    it('deve chamar signOut do Supabase com sucesso', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: 'user-uuid-1', email: 'user@teste.com' },
        },
        error: null,
      });
      mockSignOut.mockResolvedValueOnce({ error: null });

      await expect(service.logout('valid-token')).resolves.toBeUndefined();
      expect(mockSignOut).toHaveBeenCalledWith('valid-token');
    });

    it('deve lançar BadGatewayException se signOut retornar erro', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: 'user-uuid-1', email: 'user@teste.com' },
        },
        error: null,
      });
      mockSignOut.mockResolvedValueOnce({
        error: { message: 'Network error' },
      });

      await expect(service.logout('valid-token')).rejects.toThrow(
        'Falha ao encerrar a sessão no provedor de autenticação.',
      );
    });
  });
});
