import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { ScannerController } from './scanner.controller';
import { ProbeService } from './probe.service';

@Module({
  providers: [ScannerService, ProbeService],
  controllers: [ScannerController],
  exports: [ScannerService, ProbeService],
})
export class ScannerModule {}
