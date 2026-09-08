import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

// Mock fastembed module virtual imports to bypass ONNX download during tests
jest.mock('fastembed', () => {
  return {
    FlagEmbedding: {
      init: jest.fn().mockResolvedValue({
        embed: jest.fn().mockImplementation((texts: string[]) => {
          const dummyBatch = texts.map(() => Array(384).fill(0.25));
          return (async function* () {
            yield dummyBatch;
          })();
        }),
        queryEmbed: jest.fn().mockResolvedValue(Array(384).fill(0.25)),
      }),
    },
    EmbeddingModel: {
      BGESmallENV15: 'bge-small-en-v1.5',
    },
  };
}, { virtual: true });

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const email = `test-${randomBytes(6).toString('hex')}@example.com`;
  const password = 'Password123!';
  const companyName = 'Test Startup Inc';

  let accessToken: string;
  let refreshToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.init();
  });

  afterAll(async () => {
    if (workspaceId) {
      await prisma.workspace.delete({
        where: { id: workspaceId },
      });
    }
    await app.close();
  });

  it('POST /auth/signup - should register workspace and owner', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ companyName, email, password })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.role).toBe('owner');
    expect(response.body.workspace.name).toBe(companyName);

    workspaceId = response.body.workspace.id;
  });

  it('POST /auth/signup - should reject duplicate email registrations', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ companyName, email, password })
      .expect(409);
  });

  it('POST /auth/login - should authenticate user and return tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it('POST /auth/login - should reject invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword' })
      .expect(401);
  });

  it('POST /auth/change-password - should enforce JWT protection (401 without token)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: password, newPassword: 'NewPassword123!' })
      .expect(401);
  });

  it('POST /auth/change-password - should successfully update password with valid token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword: 'NewPassword123!' })
      .expect(204);
  });

  it('POST /auth/login - should authenticate with the new password', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'NewPassword123!' })
      .expect(200);

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it('POST /auth/refresh - should rotate refresh token and reject old token reuse', async () => {
    const oldRefreshToken = refreshToken;

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(200);

    const newAccessToken = response.body.accessToken;
    const newRefreshToken = response.body.refreshToken;

    expect(newAccessToken).toBeDefined();
    expect(newRefreshToken).not.toBe(oldRefreshToken);

    // Reusing old rotated refresh token must fail
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(401);

    accessToken = newAccessToken;
    refreshToken = newRefreshToken;
  });

  it('GET /auth/me - should retrieve the profile of the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('workspace');
    expect(response.body.user.email).toBe(email);
    expect(response.body.workspace.id).toBe(workspaceId);
  });

  it('POST /auth/logout - should revoke refresh token and end session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(204);

    // Refreshing with logged out token must fail
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
