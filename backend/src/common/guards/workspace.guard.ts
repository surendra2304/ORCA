import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppCacheService } from '../cache/cache.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private cacheService: AppCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.user?.workspaceId) throw new ForbiddenException('User context missing workspace context');

    const exists = await this.cacheService.getOrSet(`auth:ws_exists:${request.user.workspaceId}`, 300, async () => {
      return !!(await this.prisma.workspace.findUnique({ where: { id: request.user.workspaceId }, select: { id: true } }));
    });

    if (!exists) throw new ForbiddenException('Invalid workspace configuration');
    
    request.workspaceId = request.user.workspaceId;
    return true;
  }
}
