import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth.service.js';
import { AuthGuard } from './auth.guard.js';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: { validateToken: ReturnType<typeof vi.fn> };
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { validateToken: vi.fn() };
    reflector = { getAllAndOverride: vi.fn() };
    guard = new AuthGuard(
      authService as unknown as AuthService,
      reflector as unknown as Reflector,
    );
  });

  const createMockContext = (authHeader?: string): ExecutionContext => {
    const request = {
      headers: {
        authorization: authHeader,
      },
      user: undefined,
    };

    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('deve permitir acesso se a rota for pública', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    const context = createMockContext();

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('deve lançar UnauthorizedException se o cabeçalho Authorization estiver ausente', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const context = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('deve lançar UnauthorizedException se o esquema não for Bearer', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const context = createMockContext('Basic 123456');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('deve validar o token e anexar o usuário ao request', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const context = createMockContext('Bearer token-valido');
    const mockUser = { id: 'user-1', email: 'user@teste.com' };
    authService.validateToken.mockResolvedValueOnce(mockUser);

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
    expect(authService.validateToken).toHaveBeenCalledWith('token-valido');
    expect(context.switchToHttp().getRequest().user).toEqual(mockUser);
  });

  it('deve propagar erro se a validação do token falhar', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const context = createMockContext('Bearer token-invalido');
    authService.validateToken.mockRejectedValueOnce(
      new UnauthorizedException('Token inválido'),
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
