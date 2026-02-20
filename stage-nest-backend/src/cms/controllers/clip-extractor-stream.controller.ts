import { Controller, Get, Logger, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { S3Service } from '@app/storage/s3.service';
import { SkipGlobalAuth } from '@app/auth';
import { APP_CONFIGS } from '@app/common/configs/app.config';

@Controller('clip-extractor')
@SkipGlobalAuth()
export class ClipExtractorStreamController {
  private readonly logger = new Logger(ClipExtractorStreamController.name);

  constructor(private readonly s3Service: S3Service) {}

  @Get('stream/:projectId/:fileName')
  async streamClip(
    @Param('projectId') projectId: string,
    @Param('fileName') fileName: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    try {
      const s3Key = `clip-extractor/${projectId}/clips/${fileName}`;
      const bucket = APP_CONFIGS.AWS.S3.BUCKETS.QC_VIDEO;
      const s3Url = `https://${bucket}.s3.${APP_CONFIGS.AWS.S3.REGION}.amazonaws.com/${s3Key}`;

      const stream = await this.s3Service.getObjectAsStream(s3Url);

      reply.header('Content-Type', 'video/mp4');
      reply.header('Content-Disposition', `inline; filename="${fileName}"`);
      reply.header('Access-Control-Allow-Origin', '*');
      reply.send(stream);
    } catch (error) {
      this.logger.error(`Failed to stream clip ${fileName}: ${error}`);
      reply.status(404).send({ error: 'Clip not found' });
    }
  }
}
