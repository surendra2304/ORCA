import { Module } from '@nestjs/common';
import { PublicDemoController } from './public-demo.controller';
import { PublicDemoService } from './public-demo.service';
import { PrismaModule } from '../prisma/prisma.module';
import { KbModule } from '../kb/kb.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [PrismaModule, KbModule, ConversationModule],
  controllers: [PublicDemoController],
  providers: [PublicDemoService],
  exports: [PublicDemoService],
})
export class PublicDemoModule {}
