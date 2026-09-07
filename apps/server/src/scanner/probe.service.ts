import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ProbeResult {
  container: string;
  duration: number; // seconds
  fileSize: string;
  videoCodec?: string;
  videoProfile?: string;
  videoBitrate?: number;
  width?: number;
  height?: number;
  framerate?: number;
  isHdr: boolean;
  hdrFormat?: string;
  audioStreams: Array<{
    index: number;
    codec: string;
    channels: number;
    language: string | null;
    title: string | null;
    isDefault: boolean;
  }>;
  subtitleStreams: Array<{
    index: number;
    codec: string;
    language: string | null;
    title: string | null;
    isForced: boolean;
    isDefault: boolean;
  }>;
  raw?: any;
}

@Injectable()
export class ProbeService {
  private readonly logger = new Logger(ProbeService.name);

  async probe(filePath: string): Promise<ProbeResult | null> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]);

      const data = JSON.parse(stdout);
      const format = data.format || {};
      const streams = data.streams || [];

      const videoStream = streams.find((s: any) => s.codec_type === 'video');
      const audioStreamsRaw = streams.filter((s: any) => s.codec_type === 'audio');
      const subtitleStreamsRaw = streams.filter((s: any) => s.codec_type === 'subtitle');

      // Check HDR
      let isHdr = false;
      let hdrFormat: string | undefined;
      if (videoStream) {
        const transfer = videoStream.color_transfer;
        const primaries = videoStream.color_primaries;
        if (transfer === 'smpte2084' || transfer === 'arib-std-b67' || primaries === 'bt2020') {
          isHdr = true;
          hdrFormat = transfer === 'smpte2084' ? 'HDR10' : 'HLG';
        }
        if (videoStream.side_data_list?.some((sd: any) => sd.side_data_type?.includes('DOVI'))) {
          isHdr = true;
          hdrFormat = 'Dolby Vision';
        }
      }

      // Framerate
      let framerate: number | undefined;
      if (videoStream?.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        if (den && den > 0) {
          framerate = Math.round((num / den) * 100) / 100;
        }
      }

      const audioStreams = audioStreamsRaw.map((a: any) => ({
        index: a.index,
        codec: a.codec_name || 'unknown',
        channels: a.channels || 2,
        language: a.tags?.language || null,
        title: a.tags?.title || null,
        isDefault: a.disposition?.default === 1,
      }));

      const subtitleStreams = subtitleStreamsRaw.map((s: any) => ({
        index: s.index,
        codec: s.codec_name || 'unknown',
        language: s.tags?.language || null,
        title: s.tags?.title || null,
        isForced: s.disposition?.forced === 1,
        isDefault: s.disposition?.default === 1,
      }));

      return {
        container: format.format_name?.split(',')[0] || 'mkv',
        duration: parseFloat(format.duration || '0'),
        fileSize: format.size || '0',
        videoCodec: videoStream?.codec_name,
        videoProfile: videoStream?.profile,
        videoBitrate: videoStream?.bit_rate ? parseInt(videoStream.bit_rate, 10) : undefined,
        width: videoStream?.width,
        height: videoStream?.height,
        framerate,
        isHdr,
        hdrFormat,
        audioStreams,
        subtitleStreams,
        raw: data,
      };
    } catch (err) {
      this.logger.error(`FFprobe failed for file: ${filePath}`, err);
      return null;
    }
  }
}
