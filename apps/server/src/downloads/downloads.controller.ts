import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { DownloadsService } from './downloads.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller('downloads')
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Get('search')
  async searchReleases(
    @Query('title') title: string,
    @Query('tmdbId') tmdbId?: string,
    @Query('imdbId') imdbId?: string,
    @Query('year') year?: string,
  ) {
    if (!title) {
      throw new BadRequestException('Query parameter "title" is required');
    }

    const releases = await this.downloadsService.searchReleases({
      title,
      tmdbId: tmdbId ? parseInt(tmdbId, 10) : undefined,
      imdbId,
      year: year ? parseInt(year, 10) : undefined,
    });

    return {
      success: true,
      data: releases,
    };
  }

  @Post()
  @UseGuards(AuthGuard)
  async startDownload(
    @Body()
    body: {
      tmdbId?: number;
      imdbId?: string;
      title: string;
      year?: number;
      quality?: string;
      magnetUrl: string;
      infoHash?: string;
    },
  ) {
    if (!body.title || !body.magnetUrl) {
      throw new BadRequestException('"title" and "magnetUrl" are required');
    }

    const job = await this.downloadsService.startDownload(body);
    return {
      success: true,
      data: job,
    };
  }

  @Get()
  async getDownloads() {
    const downloads = this.downloadsService.getDownloads();
    return {
      success: true,
      data: downloads,
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async cancelDownload(@Param('id') id: string) {
    const cancelled = this.downloadsService.cancelDownload(id);
    if (!cancelled) {
      throw new NotFoundException(`Download job with id ${id} not found`);
    }
    return {
      success: true,
      message: 'Download cancelled successfully',
    };
  }

  @Get('settings')
  @UseGuards(AdminGuard)
  async getSettings() {
    const rdKey = await this.downloadsService.getRealDebridApiKey();
    return {
      success: true,
      data: {
        hasRealDebrid: !!rdKey,
        maskedKey: rdKey
          ? rdKey.length > 8
            ? `${rdKey.substring(0, 4)}••••••••${rdKey.substring(rdKey.length - 4)}`
            : '••••••••'
          : null,
      },
    };
  }

  @Post('settings')
  @UseGuards(AdminGuard)
  async updateSettings(@Body() body: { realDebridApiKey?: string }) {
    if (body.realDebridApiKey !== undefined) {
      await this.downloadsService.setRealDebridApiKey(body.realDebridApiKey);
    }
    return {
      success: true,
      message: 'Settings updated successfully',
    };
  }
}
