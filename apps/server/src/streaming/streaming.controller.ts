import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { StreamingService } from './streaming.service';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@Controller('stream')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get(':fileId/direct')
  async streamDirect(
    @Param('fileId') fileId: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @CurrentUser() user: AuthUser | null,
  ) {
    const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
    if (!UUID_REGEX.test(fileId)) {
      throw new NotFoundException('Invalid file ID format');
    }

    const range = req.headers['range'];
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;

    const result = await this.streamingService.getDirectStream(
      fileId,
      range,
      ip,
      user ? { id: user.id, username: user.username } : undefined,
    );

    res.status(result.status);
    for (const [key, value] of Object.entries(result.headers)) {
      res.header(key, value);
    }

    return res.send(result.stream);
  }

  @Get(':fileId/download')
  async downloadDirect(
    @Param('fileId') fileId: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @CurrentUser() user: AuthUser | null,
  ) {
    const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
    if (!UUID_REGEX.test(fileId)) {
      throw new NotFoundException('Invalid file ID format');
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const result = await this.streamingService.getDirectStream(
      fileId,
      undefined,
      ip,
      user ? { id: user.id, username: user.username } : undefined,
    );

    const record = await this.streamingService.getMediaFile(fileId);
    const fileName = record.file.fileName || `${record.item.title}.mp4`;

    res.status(200);
    for (const [key, value] of Object.entries(result.headers)) {
      res.header(key, value);
    }
    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.header('Content-Type', 'application/octet-stream');

    return res.send(result.stream);
  }

  @Get(':fileId/hls/master.m3u8')
  async getMasterPlaylist(
    @Param('fileId') fileId: string,
    @Res() res: FastifyReply,
  ) {
    const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
    if (!UUID_REGEX.test(fileId)) {
      throw new NotFoundException('Invalid file ID format');
    }

    const playlist = await this.streamingService.getMasterPlaylist(fileId);
    res.header('Content-Type', 'application/vnd.apple.mpegurl');
    res.header('Access-Control-Allow-Origin', '*');
    return res.send(playlist);
  }

  @Get(':fileId/hls/variant/:quality/index.m3u8')
  async getVariantPlaylist(
    @Param('fileId') fileId: string,
    @Param('quality') quality: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @CurrentUser() user: AuthUser | null,
  ) {
    const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
    const ALLOWED_QUALITIES = new Set(['source', '1080p', '720p', '480p']);

    if (!UUID_REGEX.test(fileId)) {
      throw new NotFoundException('Invalid file ID format');
    }
    if (!ALLOWED_QUALITIES.has(quality)) {
      throw new NotFoundException('Invalid quality profile');
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const playlistFile = await this.streamingService.ensureVariantPlaylist(
      fileId,
      quality,
      ip,
      user ? { id: user.id, username: user.username } : undefined,
    );

    if (!fs.existsSync(playlistFile)) {
      throw new NotFoundException('HLS variant playlist generation failed');
    }

    const content = fs.readFileSync(playlistFile, 'utf8');
    res.header('Content-Type', 'application/vnd.apple.mpegurl');
    res.header('Access-Control-Allow-Origin', '*');
    return res.send(content);
  }

  @Get(':fileId/hls/variant/:quality/:segment')
  async getHlsSegment(
    @Param('fileId') fileId: string,
    @Param('quality') quality: string,
    @Param('segment') segment: string,
    @Res() res: FastifyReply,
  ) {
    const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
    const ALLOWED_QUALITIES = new Set(['source', '1080p', '720p', '480p']);
    const SEGMENT_REGEX = /^[a-zA-Z0-9_-]+\.(ts|m3u8)$/;

    if (!UUID_REGEX.test(fileId) || !ALLOWED_QUALITIES.has(quality) || !SEGMENT_REGEX.test(segment)) {
      throw new NotFoundException('Invalid segment parameters');
    }

    const transcodeDir = '/media/windows/omflix/transcodes';
    const segmentPath = path.join(transcodeDir, fileId, quality, segment);

    // Enforce path containment
    const resolvedTranscodeDir = path.resolve(transcodeDir);
    const resolvedSegmentPath = path.resolve(segmentPath);
    if (!resolvedSegmentPath.startsWith(resolvedTranscodeDir)) {
      throw new NotFoundException('Invalid segment path');
    }

    if (!fs.existsSync(resolvedSegmentPath)) {
      throw new NotFoundException('Segment not ready');
    }

    res.header('Content-Type', 'video/mp2t');
    res.header('Access-Control-Allow-Origin', '*');
    return res.send(fs.createReadStream(resolvedSegmentPath));
  }

  @Get(':fileId/subtitles/:streamIndex.vtt')
  async getSubtitleVtt(
    @Param('fileId') fileId: string,
    @Param('streamIndex') streamIndex: string,
    @Res() res: FastifyReply,
  ) {
    const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;
    if (!UUID_REGEX.test(fileId)) {
      throw new NotFoundException('Invalid file ID format');
    }

    const idx = parseInt(streamIndex, 10);
    if (isNaN(idx) || idx < 0 || idx > 100) {
      throw new NotFoundException('Invalid subtitle stream index');
    }

    const stream = await this.streamingService.extractSubtitleTrack(fileId, idx);

    res.header('Content-Type', 'text/vtt; charset=utf-8');
    res.header('Access-Control-Allow-Origin', '*');
    return res.send(stream);
  }

  @Post('ping/:streamId')
  pingStream(@Param('streamId') streamId: string) {
    this.streamingService.recordPing(streamId);
    return { success: true };
  }
}
