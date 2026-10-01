import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Auth Guards (unit)', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;

    beforeEach(() => {
      guard = new JwtAuthGuard(reflector);
    });

    it('test 1: should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('test 2: should return true when route is public (handler level)', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('test 3: should return true when route is public (class level)', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
        if (key === IS_PUBLIC_KEY) return true;
        return undefined;
      });
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('test 4: should call super.canActivate when route is not public', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const superSpy = vi
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
      guard.canActivate(context);
      expect(superSpy).toHaveBeenCalled();
    });
  });

  describe('PermissionsGuard', () => {
    let guard: PermissionsGuard;

    beforeEach(() => {
      guard = new PermissionsGuard(reflector);
    });

    it('test 5: should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('test 6: should return true when no permissions required', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return undefined;
        return undefined;
      });
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { permissions: [] } }),
        }),
      } as unknown as ExecutionContext;
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('test 7: should throw ForbiddenException when user is missing permissions', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['booking:create'];
        return undefined;
      });
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ user: { permissions: [] } }),
        }),
      } as unknown as ExecutionContext;
      expect(() => guard.canActivate(context)).toThrow(/Missing required permissions/);
    });
  });
});
