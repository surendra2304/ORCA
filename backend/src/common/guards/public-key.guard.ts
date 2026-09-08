import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const publicKey = request.query?.workspacePublicKey || request.body?.workspacePublicKey;

    if (!publicKey) {
      throw new BadRequestException('workspacePublicKey is required');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { publicKey },
      select: { id: true },
    });

    if (!workspace) {
      throw new BadRequestException('Invalid workspace public key');
    }

    request.workspaceId = workspace.id;
    return true;
  }
}
