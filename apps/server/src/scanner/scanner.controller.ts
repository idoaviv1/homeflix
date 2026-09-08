import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('scanner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get('status')
  getStatus() {
    return {
      success: true,
      data: this.scannerService.getStatus(),
    };
  }

  @Post('scan')
  @UseGuards(AdminGuard)
  async triggerScan() {
    // Run in background so request doesn't timeout
    this.scannerService.scanAll().catch(() => {});
    return {
      success: true,
      data: {
        message: 'Scan started',
        status: this.scannerService.getStatus(),
      },
    };
  }

  @Post('fix-match')
  @UseGuards(AdminGuard)
  async fixMatch(
    @Body() body: { mediaItemId: string; tmdbId: number; type: 'movie' | 'show'; customAlias?: string },
  ) {
    const result = await this.scannerService.fixMatch(
      body.mediaItemId,
      body.tmdbId,
      body.type,
      body.customAlias,
    );
    return {
      success: true,
      data: result,
    };
  }
}
