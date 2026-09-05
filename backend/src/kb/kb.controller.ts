import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Sse,
  MessageEvent,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KbService } from './kb.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceGuard } from '../common/guards/workspace.guard';
import { PublicKeyGuard } from '../common/guards/public-key.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentWorkspace } from '../common/decorators/current-workspace.decorator';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { classifyFileType } from './document-parser.util';

@Controller('kb')
export class KbController {
  constructor(
    private kbService: KbService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @Get('documents')
  @UseGuards(WorkspaceGuard)
  async getDocuments(@CurrentWorkspace() workspaceId: string) {
    return this.kbService.getDocuments(workspaceId);
  }

  @Post('documents')
  @UseGuards(WorkspaceGuard)
  @UseInterceptors(FileInterceptor('file'))
  async createDocument(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: any,
    @UploadedFile() file?: any,
  ) {
    if (file) {
      const type = classifyFileType(file.originalname);
      if (type === 'UNSUPPORTED' || type === 'UNSUPPORTED_LEGACY') {
        const ext = file.originalname.split('.').pop() || 'unknown';
        throw new BadRequestException(
          type === 'UNSUPPORTED_LEGACY'
            ? `Legacy format ".${ext}" is not supported. Please convert to .pptx and re-upload.`
            : `Unsupported file format ".${ext}". Supported: .pdf, .doc, .docx, .pptx, .xlsx, .xls, .txt, .csv, .md`,
        );
      }
      return this.kbService.createDocument(
        workspaceId,
        file.originalname,
        type,
        {
          fileBuffer: file.buffer,
          fileName: file.originalname,
        },
      );
    }

    const { type, name, url, items } = body;
    if (type === 'url') {
      if (!url) throw new BadRequestException('URL is required for type url.');
      return this.kbService.createDocument(workspaceId, name || url, 'URL', {
        url,
      });
    }

    if (type === 'faq') {
      let parsedItems = items;
      if (typeof items === 'string') {
        try {
          parsedItems = JSON.parse(items);
        } catch (err) {
          throw new BadRequestException('Invalid JSON for FAQ items.');
        }
      }
      if (!Array.isArray(parsedItems)) {
        throw new BadRequestException('FAQ items must be an array of {q, a}.');
      }
      return this.kbService.createDocument(
        workspaceId,
        name || 'FAQ Source',
        'FAQ',
        { faqItems: parsedItems },
      );
    }

    throw new BadRequestException(
      'Unsupported document type or upload payload.',
    );
  }

  @Get('documents/:id')
  @UseGuards(WorkspaceGuard)
  async getDocument(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') docId: string,
  ) {
    return this.kbService.getDocument(workspaceId, docId);
  }

  @Delete('documents/:id')
  @UseGuards(WorkspaceGuard)
  async deleteDocument(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') docId: string,
  ) {
    return this.kbService.deleteDocument(workspaceId, docId);
  }

  @Post('documents/:id/retry')
  @UseGuards(WorkspaceGuard)
  async retryDocument(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') docId: string,
  ) {
    return this.kbService.retryDocument(workspaceId, docId);
  }

  @Get('status')
  @UseGuards(WorkspaceGuard)
  async getStatus(@CurrentWorkspace() workspaceId: string) {
    return this.kbService.getStatus(workspaceId);
  }

  @Post('query')
  @UseGuards(WorkspaceGuard)
  async queryKb(
    @CurrentWorkspace() workspaceId: string,
    @Body()
    body: {
      q: string;
      topK?: number;
      agentId?: string;
      documentIds?: string[];
    },
  ) {
    if (!body.q)
      throw new BadRequestException('Query parameter q is required.');
    const docIds = await this.resolveDocumentIds(
      workspaceId,
      body.agentId,
      body.documentIds,
    );
    return this.kbService.queryKb(
      workspaceId,
      body.q,
      body.topK,
      undefined,
      docIds,
    );
  }

  @Post('public/query')
  @Public()
  @UseGuards(PublicKeyGuard)
  async publicQueryKb(
    @CurrentWorkspace() workspaceId: string,
    @Body()
    body: {
      q: string;
      topK?: number;
      agentId?: string;
      documentIds?: string[];
    },
  ) {
    if (!body.q)
      throw new BadRequestException('Query parameter q is required.');
    const docIds = await this.resolveDocumentIds(
      workspaceId,
      body.agentId,
      body.documentIds,
    );
    return this.kbService.queryKb(
      workspaceId,
      body.q,
      body.topK,
      undefined,
      docIds,
    );
  }

  @Sse('events')
  @Public()
  sseEvents(@Query('token') token?: string): Observable<MessageEvent> {
    let workspaceId = '';
    try {
      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get('JWT_ACCESS_SECRET'),
        });
        workspaceId = payload.workspaceId;
      }
    } catch (err) {}

    return this.kbService.getProgressStream().pipe(
      filter((event) => !workspaceId || event.workspaceId === workspaceId),
      map(
        (event) =>
          ({
            data: {
              docId: event.docId,
              pct: event.pct,
              status: event.status,
            },
          }) as MessageEvent,
      ),
    );
  }

  /**
   * Resolve document IDs for KB query filtering.
   * Priority: explicit documentIds > agent's connectedKbDocumentIds > undefined (all docs).
   */
  private async resolveDocumentIds(
    workspaceId: string,
    agentId?: string,
    documentIds?: string[],
  ): Promise<string[] | undefined> {
    if (documentIds && documentIds.length > 0) {
      return documentIds;
    }
    if (agentId) {
      const agent = await this.prisma.agent.findFirst({
        where: { id: agentId, workspaceId },
        select: { connectedKbDocumentIds: true },
      });
      if (
        agent &&
        Array.isArray(agent.connectedKbDocumentIds) &&
        (agent.connectedKbDocumentIds as string[]).length > 0
      ) {
        return agent.connectedKbDocumentIds as string[];
      }
    }
    return undefined;
  }
}
