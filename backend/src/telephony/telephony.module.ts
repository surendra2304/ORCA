import { Module } from '@nestjs/common';
import { TelephonyController } from './telephony.controller';
import { MediaBridgeGateway } from './media-bridge.gateway';
import { KbModule } from '../kb/kb.module';

@Module({
  imports: [KbModule],
  controllers: [TelephonyController],
  providers: [MediaBridgeGateway],
})
export class TelephonyModule {}
