import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WorkspaceController } from './workspace.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

import { EmailCodeService } from './email-code.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController, WorkspaceController],
  providers: [AuthService, JwtStrategy, EmailCodeService],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
