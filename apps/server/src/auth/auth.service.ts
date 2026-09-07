import { Injectable, Inject, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import Redis from 'ioredis';
import { eq, and, gt, sql } from 'drizzle-orm';
import { users, sessions, type Database } from '@omflix/database';
import { DATABASE_TOKEN } from '../database/database.module';
import { REDIS_TOKEN } from '../redis/redis.module';
import { AuthUser } from './current-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

  constructor(
    @Inject(DATABASE_TOKEN) private readonly dbContext: { db: Database },
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  private get db() {
    return this.dbContext.db;
  }

  async register(data: {
    username: string;
    password: string;
    displayName?: string;
    preferredLanguage?: string;
  }) {
    const trimmedUsername = data.username.trim().toLowerCase();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      throw new ConflictException('Username must be at least 3 characters long');
    }
    if (!data.password || data.password.length < 6) {
      throw new ConflictException('Password must be at least 6 characters long');
    }

    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.username, trimmedUsername))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Username already taken');
    }

    // Check if this is the first user; if so, assign admin role
    const totalUsersResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    const totalCount = totalUsersResult[0]?.count ?? 0;
    const role: 'admin' | 'user' = totalCount === 0 ? 'admin' : 'user';

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    const [newUser] = await this.db
      .insert(users)
      .values({
        username: trimmedUsername,
        displayName: data.displayName || trimmedUsername,
        passwordHash,
        role,
        preferredLanguage: data.preferredLanguage || 'en',
      })
      .returning();

    if (!newUser) {
      throw new Error('Failed to register user');
    }

    this.logger.log(`Registered user: ${newUser.username} (${newUser.role})`);

    return {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      role: newUser.role,
      preferredLanguage: newUser.preferredLanguage,
    };
  }

  async login(
    username: string,
    password: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const trimmedUsername = username.trim().toLowerCase();
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, trimmedUsername))
      .limit(1);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.SESSION_TTL * 1000);

    // Save session in DB
    await this.db.insert(sessions).values({
      userId: user.id,
      token,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    });

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
    };

    // Cache session in Redis
    try {
      await this.redis.setex(
        `omflix:session:${token}`,
        this.SESSION_TTL,
        JSON.stringify(authUser),
      );
    } catch (err) {
      this.logger.warn(`Redis session cache error: ${err}`);
    }

    return {
      user: authUser,
      token,
      expiresAt,
    };
  }

  async validateSession(token: string): Promise<AuthUser | null> {
    if (!token) return null;

    // Check Redis cache first
    try {
      const cached = await this.redis.get(`omflix:session:${token}`);
      if (cached) {
        return JSON.parse(cached) as AuthUser;
      }
    } catch (err) {
      this.logger.warn(`Redis get error: ${err}`);
    }

    // Check database
    const now = new Date();
    const result = await this.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        preferredLanguage: users.preferredLanguage,
        isActive: users.isActive,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
      .limit(1);

    const user = result[0];
    if (!user || !user.isActive) {
      return null;
    }

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
    };

    // Re-populate Redis cache
    try {
      await this.redis.setex(
        `omflix:session:${token}`,
        this.SESSION_TTL,
        JSON.stringify(authUser),
      );
    } catch (err) {
      this.logger.warn(`Redis set error: ${err}`);
    }

    return authUser;
  }

  async logout(token: string) {
    if (!token) return;

    try {
      await this.redis.del(`omflix:session:${token}`);
    } catch (err) {
      this.logger.warn(`Redis del error: ${err}`);
    }

    await this.db.delete(sessions).where(eq(sessions.token, token));
  }

  async updateProfile(
    userId: string,
    data: { displayName?: string; preferredLanguage?: string; avatarUrl?: string },
  ) {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.displayName !== undefined) updateData['displayName'] = data.displayName;
    if (data.preferredLanguage !== undefined) updateData['preferredLanguage'] = data.preferredLanguage;
    if (data.avatarUrl !== undefined) updateData['avatarUrl'] = data.avatarUrl;

    const [updated] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      role: updated.role,
      preferredLanguage: updated.preferredLanguage,
    };
  }
}
