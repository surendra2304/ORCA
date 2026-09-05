import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('workspace')
@UseGuards(WorkspaceGuard)
export class WorkspaceController {
  constructor(private prisma: PrismaService) {}

  @Patch()
  async updateWorkspace(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { name?: string; websiteUrl?: string; brandColor?: string },
  ) {
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.websiteUrl !== undefined ? { websiteUrl: body.websiteUrl } : {}),
        ...(body.brandColor !== undefined ? { brandColor: body.brandColor } : {}),
      },
    });
  }
}
