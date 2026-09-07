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

  @Get(':fileId/hls/master.m3u8')
  async getMasterPlaylist(
    @Param('fileId') fileId: string,
    @Res() res: FastifyReply,
  ) {
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
    const transcodeDir = '/media/windows/omflix/transcodes';
    const segmentPath = path.join(transcodeDir, fileId, quality, segment);

    if (!fs.existsSync(segmentPath)) {
      throw new NotFoundException('Segment not ready');
    }

    res.header('Content-Type', 'video/mp2t');
    res.header('Access-Control-Allow-Origin', '*');
    return res.send(fs.createReadStream(segmentPath));
  }

  @Get(':fileId/subtitles/:streamIndex.vtt')
  async getSubtitleVtt(
    @Param('fileId') fileId: string,
    @Param('streamIndex') streamIndex: string,
    @Res() res: FastifyReply,
  ) {
    const idx = parseInt(streamIndex, 10);
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
