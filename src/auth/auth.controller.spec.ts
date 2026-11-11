import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  const mockSignUp = vi.fn();
  const mockLogin = vi.fn();
  const mockRefresh = vi.fn();
  const mockLogout = vi.fn();

  const authService = {
    signUp: (...args: unknown[]) => mockSignUp(...args),
    login: (...args: unknown[]) => mockLogin(...args),
    refresh: (...args: unknown[]) => mockRefresh(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
  } as unknown as AuthService;

  const controller = new AuthController(authService);

  it('signUp deve delegar ao serviço', async () => {
    const mockResponse = {
      user: { id: 'user-1', email: 'test@teste.com' },
      accessToken: 'access-token',
      tokenType: 'bearer',
    };
    mockSignUp.mockResolvedValueOnce(mockResponse);

    const result = await controller.signUp({
      email: 'test@teste.com',
      password: 'Password123!',
    });

    expect(result).toEqual(mockResponse);
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@teste.com',
      password: 'Password123!',
    });
  });

  it('login deve delegar ao serviço', async () => {
    const mockResponse = {
      user: { id: 'user-1', email: 'test@teste.com' },
      accessToken: 'access-token',
      tokenType: 'bearer',
    };
    mockLogin.mockResolvedValueOnce(mockResponse);

    const result = await controller.login({
      email: 'test@teste.com',
      password: 'Password123!',
    });

    expect(result).toEqual(mockResponse);
    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@teste.com',
      password: 'Password123!',
    });
  });

  it('refresh deve delegar ao serviço', async () => {
    const mockResponse = {
      accessToken: 'new-token',
      tokenType: 'bearer',
    };
    mockRefresh.mockResolvedValueOnce(mockResponse);

    const result = await controller.refresh({ refreshToken: 'ref-token' });

    expect(result).toEqual(mockResponse);
    expect(mockRefresh).toHaveBeenCalledWith({ refreshToken: 'ref-token' });
  });

  it('getMe deve retornar os dados do usuário autenticado', () => {
    const user = { id: 'user-1', email: 'user@teste.com', userMetadata: { name: 'Teste' } };
    const result = controller.getMe(user);

    expect(result).toEqual({
      id: 'user-1',
      email: 'user@teste.com',
      userMetadata: { name: 'Teste' },
    });
  });

  it('logout deve extrair o token do cabeçalho e delegar ao serviço', async () => {
    mockLogout.mockResolvedValueOnce(undefined);

    await controller.logout('Bearer token-123');

    expect(mockLogout).toHaveBeenCalledWith('token-123');
  });
});
