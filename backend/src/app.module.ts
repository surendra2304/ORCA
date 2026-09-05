import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AppCacheModule } from './common/cache/cache.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PublicRateLimiterGuard } from './common/guards/public-rate-limiter.guard';
import { RagModule } from './rag/rag.module';
import { KbModule } from './kb/kb.module';
import { LlmModule } from './llm/llm.module';
import { AgentModule } from './agent/agent.module';
import { ConversationModule } from './conversation/conversation.module';
import { LeadModule } from './lead/lead.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { VoiceModule } from './voice/voice.module';
import { WidgetModule } from './widget/widget.module';
import { BillingModule } from './billing/billing.module';
import { TelephonyModule } from './telephony/telephony.module';
import { PublicDemoModule } from './public-demo/public-demo.module';
// import { VapiModule } from './vapi/vapi.module'; // Retained for future use (Legacy Vapi Architecture)
import { VobizModule } from './vobiz/vobiz.module';
import { WebsiteIngestionModule } from './website-ingestion/website-ingestion.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AppCacheModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    RagModule,
    KbModule,
    LlmModule,
    AgentModule,
    ConversationModule,
    LeadModule,
    DashboardModule,
    VoiceModule,
    WidgetModule,
    BillingModule,
    TelephonyModule,
    PublicDemoModule,
    // VapiModule, // Retained for future use
    VobizModule,
    WebsiteIngestionModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PublicRateLimiterGuard,
    },
  ],
})
export class AppModule {}
