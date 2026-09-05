import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

type EmailCodePurpose = 'signup' | 'reset-password';

interface StoredEmailCode {
  id: string;
  email: string;
  purpose: EmailCodePurpose;
  codeHash: string;
  payload?: any;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class EmailCodeService {
  private readonly logger = new Logger(EmailCodeService.name);
  private memoryCodes: StoredEmailCode[] = [];

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private hash(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  private generateCode() {
    return String(randomInt(100000, 1000000));
  }

  private async getTransport() {
    const user = this.configService.get<string>('GMAIL_USER');
    const pass = this.configService.get<string>('GMAIL_APP_PASSWORD');
    if (!user || !pass) {
      return null;
    }
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  async issueCode(
    email: string,
    purpose: EmailCodePurpose,
    payload?: Record<string, unknown>,
  ) {
    const code = this.generateCode();
    const codeHash = this.hash(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const normalizedEmail = email.toLowerCase();

    // Expire previous active codes
    if ((this.prisma as any).emailCode) {
      try {
        await (this.prisma as any).emailCode.updateMany({
          where: { email: normalizedEmail, purpose, consumedAt: null },
          data: { consumedAt: new Date() },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma emailCode updateMany fallback: ${err.message}`);
      }
    }

    for (const item of this.memoryCodes) {
      if (
        item.email === normalizedEmail &&
        item.purpose === purpose &&
        !item.consumedAt
      ) {
        item.consumedAt = new Date();
      }
    }

    let transport = await this.getTransport();
    let from =
      this.configService.get<string>('GMAIL_FROM') ||
      this.configService.get<string>('GMAIL_USER');

    if (!transport || !from) {
      // Create automatic Ethereal test account if Gmail env vars are not set
      try {
        const testAccount = await nodemailer.createTestAccount();
        transport = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        from = `"KaliGanAI Security" <${testAccount.user}>`;
      } catch (e: any) {
        this.logger.warn(`Failed to initialize email transport: ${e.message}`);
      }
    }

    const newCodeRecord: StoredEmailCode = {
      id: String(Date.now()),
      email: normalizedEmail,
      purpose,
      codeHash,
      payload,
      expiresAt,
      consumedAt: null,
      createdAt: new Date(),
    };

    if ((this.prisma as any).emailCode) {
      try {
        await (this.prisma as any).emailCode.create({
          data: {
            email: normalizedEmail,
            purpose,
            codeHash,
            payload: (payload ?? undefined) as any,
            expiresAt,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma emailCode create fallback: ${err.message}`);
      }
    }

    this.memoryCodes.push(newCodeRecord);

    const subject =
      purpose === 'signup'
        ? 'Your KaliGanAI verification code'
        : 'Your KaliGanAI password reset code';
    const text = `Your KaliGanAI verification code is: ${code}\n\nThis code will expire in 10 minutes. If you did not request this code, please ignore this email.`;

    if (transport) {
      try {
        const info = await transport.sendMail({
          from: from || 'noreply@kaligan.ai',
          to: email,
          subject,
          text,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`[Ethereal Test Email Sent] Preview URL: ${previewUrl}`);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to send email: ${err.message}`);
      }
    }

    return { expiresAt };
  }

  async verifyCode(email: string, purpose: EmailCodePurpose, code: string) {
    const normalizedEmail = email.toLowerCase();
    const targetHash = this.hash(code);

    if ((this.prisma as any).emailCode) {
      try {
        const record = await (this.prisma as any).emailCode.findFirst({
          where: {
            email: normalizedEmail,
            purpose,
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (record && record.codeHash === targetHash) {
          return record;
        }
      } catch (err: any) {
        this.logger.warn(`Prisma emailCode findFirst fallback: ${err.message}`);
      }
    }

    const memRecord = this.memoryCodes
      .filter(
        (c) =>
          c.email === normalizedEmail &&
          c.purpose === purpose &&
          !c.consumedAt &&
          c.expiresAt > new Date(),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    if (!memRecord || memRecord.codeHash !== targetHash) {
      return null;
    }
    return memRecord;
  }

  async consumeCode(id: string) {
    if ((this.prisma as any).emailCode) {
      try {
        await (this.prisma as any).emailCode.update({
          where: { id },
          data: { consumedAt: new Date() },
        });
      } catch (err: any) {
        this.logger.warn(`Prisma emailCode update fallback: ${err.message}`);
      }
    }

    const mem = this.memoryCodes.find((c) => c.id === id);
    if (mem) {
      mem.consumedAt = new Date();
    }
  }
}
