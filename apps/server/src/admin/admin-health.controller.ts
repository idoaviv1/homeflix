import { Controller, Get } from '@nestjs/common';
import { execSync } from 'node:child_process';
import * as os from 'node:os';

@Controller('health')
export class AdminHealthController {
  @Get()
  getHealth() {
    const uptime = process.uptime();
    const cpuUsage = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    let gpu = null;
    try {
      const nvidiaSmi = execSync(
        'nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.encoder,utilization.decoder --format=csv,noheader,nounits',
        { timeout: 5000 },
      )
        .toString()
        .trim();

      const parts = nvidiaSmi.split(', ');
      if (parts.length >= 6) {
        gpu = {
          model: parts[0],
          vramTotalMB: parseInt(parts[1]!, 10),
          vramUsedMB: parseInt(parts[2]!, 10),
          vramFreeMB: parseInt(parts[3]!, 10),
          encoderUsage: parseInt(parts[4]!, 10),
          decoderUsage: parseInt(parts[5]!, 10),
        };
      }
    } catch {
      // GPU info unavailable
    }

    return {
      success: true,
      data: {
        status: 'healthy',
        version: '0.1.0',
        uptime: Math.floor(uptime),
        admin: true,
        system: {
          cpu: {
            model: os.cpus()[0]?.model || 'Unknown',
            cores: os.cpus().length,
            loadAvg: cpuUsage,
          },
          memory: {
            totalBytes: totalMem,
            usedBytes: totalMem - freeMem,
            freeBytes: freeMem,
          },
          gpu,
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
          nodeVersion: process.version,
        },
      },
    };
  }
}
