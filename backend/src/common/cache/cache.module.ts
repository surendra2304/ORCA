import { Global, Module } from '@nestjs/common';
import { AppCacheService } from './cache.service';

@Global()
@Module({
  providers: [AppCacheService],
  exports: [AppCacheService],
})
export class AppCacheModule {}
