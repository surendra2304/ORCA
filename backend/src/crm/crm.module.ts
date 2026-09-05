import { Module } from '@nestjs/common';
import { ComposioClientService } from './composio-client.service';
import { ZohoCrmAdapter } from './adapters/zoho.adapter';

@Module({
  providers: [
    ComposioClientService,
    ZohoCrmAdapter,
  ],
  exports: [
    ComposioClientService,
    ZohoCrmAdapter,
  ],
})
export class CrmModule {}
