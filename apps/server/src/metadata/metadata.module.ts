import { Module, Global } from '@nestjs/common';
import { MetadataService } from './metadata.service';

@Global()
@Module({
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
