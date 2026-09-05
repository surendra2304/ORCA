import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { KbModule } from '../kb/kb.module';
import { VobizService } from './vobiz.service';
import { VobizController } from './vobiz.controller';
import { VobizGateway } from './vobiz.gateway';
import { OutboundService } from './outbound.service';
import { OutboundController } from './outbound.controller';

@Module({
  imports: [ConfigModule, PrismaModule, KbModule],
  controllers: [VobizController, OutboundController],
  providers: [VobizService, VobizGateway, OutboundService],
  exports: [VobizService, OutboundService],
})
export class VobizModule {}
