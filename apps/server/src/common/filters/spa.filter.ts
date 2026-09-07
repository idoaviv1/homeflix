import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

@Catch(NotFoundException)
export class SpaFallbackFilter implements ExceptionFilter {
  private readonly indexPath: string;

  constructor(distPath: string) {
    this.indexPath = path.join(distPath, 'index.html');
  }

  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const url = request.raw?.url || request.url || '';

    // If it's an API request, return standard 404 JSON
    if (url.startsWith('/api')) {
      response.status(404).send({
        statusCode: 404,
        message: `Cannot ${request.method} ${url}`,
        error: 'Not Found',
      });
      return;
    }

    // Otherwise, serve SPA index.html for client-side routing
    if (fs.existsSync(this.indexPath)) {
      response.type('text/html').send(fs.readFileSync(this.indexPath, 'utf8'));
    } else {
      response.status(404).send({
        statusCode: 404,
        message: 'Frontend not found',
        error: 'Not Found',
      });
    }
  }
}
