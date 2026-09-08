import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import Redis from 'ioredis';
import { eq, and, gt, sql } from 'drizzle-orm';
import { users, sessions, watchProgress, watchlist, favorites, type Database } from '@omflix/database';
import { DATABASE_TOKEN } from '../database/database.module';
import { REDIS_TOKEN } from '../redis/redis.module';
import { AuthUser } from './current-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_TTL = 900; // 15 minutes in seconds

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
    if (trimmedUsername === 'admin') {
      throw new ConflictException('The admin username is reserved.');
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
    const ip = ipAddress || 'unknown';
    const rateLimitKeyIp = `omflix:ratelimit:login:ip:${ip}`;
    const rateLimitKeyUser = `omflix:ratelimit:login:user:${trimmedUsername}`;

    // 1. Check if IP or username is temporarily locked out
    try {
      const [ipAttempts, userAttempts] = await Promise.all([
        this.redis.get(rateLimitKeyIp),
        this.redis.get(rateLimitKeyUser),
      ]);

      const ipCount = ipAttempts ? parseInt(ipAttempts, 10) : 0;
      const userCount = userAttempts ? parseInt(userAttempts, 10) : 0;

      if (ipCount >= this.MAX_LOGIN_ATTEMPTS || userCount >= this.MAX_LOGIN_ATTEMPTS) {
        this.logger.warn(`Rate limit triggered for user "${trimmedUsername}" from IP ${ip}`);
        throw new HttpException(
          'Too many failed login attempts. Account temporarily locked for 15 minutes to protect against brute force.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      this.logger.warn(`Rate limit check redis error: ${err}`);
    }

    const recordFailedAttempt = async () => {
      try {
        await Promise.all([
          this.redis.incr(rateLimitKeyIp),
          this.redis.incr(rateLimitKeyUser),
        ]);
        await Promise.all([
          this.redis.expire(rateLimitKeyIp, this.LOCKOUT_TTL),
          this.redis.expire(rateLimitKeyUser, this.LOCKOUT_TTL),
        ]);
      } catch (err) {
        this.logger.warn(`Rate limit record redis error: ${err}`);
      }
    };

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, trimmedUsername))
      .limit(1);

    if (!user || !user.isActive) {
      await recordFailedAttempt();
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      await recordFailedAttempt();
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login counter on successful authentication
    try {
      await this.redis.del(rateLimitKeyIp, rateLimitKeyUser);
    } catch {}

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

  async mergeGuestDeviceData(deviceId: string, targetUserId: string) {
    if (!deviceId || !targetUserId) return;
    try {
      const cleanDeviceId = deviceId.toLowerCase().trim();
      const guestUsername = `guest_${cleanDeviceId.replace(/[^a-z0-9_-]/g, '').substring(0, 50)}`;
      const [guest] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, guestUsername))
        .limit(1);

      if (!guest || guest.id === targetUserId) return;
      const guestUserId = guest.id;

      // Migrate watch progress
      const guestProgress = await this.db
        .select()
        .from(watchProgress)
        .where(eq(watchProgress.userId, guestUserId));

      for (const gp of guestProgress) {
        const [existing] = await this.db
          .select()
          .from(watchProgress)
          .where(and(eq(watchProgress.userId, targetUserId), eq(watchProgress.mediaItemId, gp.mediaItemId)))
          .limit(1);

        if (!existing) {
          await this.db
            .insert(watchProgress)
            .values({
              userId: targetUserId,
              mediaItemId: gp.mediaItemId,
              episodeId: gp.episodeId,
              currentTime: gp.currentTime,
              duration: gp.duration,
              percentage: gp.percentage,
              finished: gp.finished,
            })
            .catch(() => {});
        }
      }

      // Migrate watchlist
      const guestWatchlist = await this.db
        .select()
        .from(watchlist)
        .where(eq(watchlist.userId, guestUserId));

      for (const gw of guestWatchlist) {
        const [existing] = await this.db
          .select()
          .from(watchlist)
          .where(and(eq(watchlist.userId, targetUserId), eq(watchlist.mediaItemId, gw.mediaItemId)))
          .limit(1);

        if (!existing) {
          await this.db
            .insert(watchlist)
            .values({
              userId: targetUserId,
              mediaItemId: gw.mediaItemId,
            })
            .catch(() => {});
        }
      }

      // Migrate favorites
      const guestFavorites = await this.db
        .select()
        .from(favorites)
        .where(eq(favorites.userId, guestUserId));

      for (const gf of guestFavorites) {
        const [existing] = await this.db
          .select()
          .from(favorites)
          .where(and(eq(favorites.userId, targetUserId), eq(favorites.mediaItemId, gf.mediaItemId)))
          .limit(1);

        if (!existing) {
          await this.db
            .insert(favorites)
            .values({
              userId: targetUserId,
              mediaItemId: gf.mediaItemId,
            })
            .catch(() => {});
        }
      }

      this.logger.log(`Merged guest device data from ${guestUsername} into user ${targetUserId}`);
    } catch (err) {
      this.logger.warn(`Failed to merge guest device data: ${err}`);
    }
  }
}
