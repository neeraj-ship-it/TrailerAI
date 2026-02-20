import { Injectable, Logger } from '@nestjs/common';

import { ObjectId, Reference } from '@mikro-orm/mongodb';

import path from 'path';

import {
  CreateTranscodingTaskRequestDTO,
  CreateTranscodingTaskResponseDTO,
  GetTranscodingTaskDetailsResponseDTO,
} from '../dtos/visionular.dto';
import { TranscodingTaskStatusEnum } from '../entities/visionular-transcoding.entity';
import { VisionularTaskRepository } from '../repositories/visionular.repository';
import { VisionularURLBuilder } from '../utils/urlBuilder.visionular';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { ErrorHandlerService, Errors } from '@app/error-handler';
import { RawMedia } from 'common/entities/raw-media.entity';

import {
  VisionularContentType,
  VisionularTranscodingTemplate,
} from 'common/interfaces/visionular.interface';
import { HttpService } from 'libs/http/src';
@Injectable()
export class VisionularService {
  private readonly logger = new Logger(VisionularService.name);
  private readonly outputConfig = APP_CONFIGS.VISIONULAR.OUTPUT;
  private readonly visionularHTTPClient: HttpService;

  constructor(
    private readonly visionularRepository: VisionularTaskRepository,
    private errorHandler: ErrorHandlerService,
  ) {
    this.visionularHTTPClient = new HttpService({
      baseURL: APP_CONFIGS.VISIONULAR.BASE_URL,
      headers: {
        'auth-type': 'use-basic',
        Authorization: `Basic ${Buffer.from(
          `${APP_CONFIGS.VISIONULAR.API_KEY}:${APP_CONFIGS.VISIONULAR.API_SECRET}`,
        ).toString('base64')}`,
      },
    });
  }

  async createTranscodingForRawMedia({
    contentType,
    outputPath,
    rawMedia,
    sourceLink,
    template,
  }: {
    contentType: VisionularContentType;
    rawMedia: RawMedia;
    template: VisionularTranscodingTemplate;
    sourceLink: string;
    outputPath: string;
  }) {
    const { id } = APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[template];

    this.errorHandler.raiseErrorIfNull(
      sourceLink.split('.mp4')[0],
      Errors.FILE.INVALID_SOURCE_LINK(
        'Transcoding input link is invalid. It should end with .mp4',
      ),
    );

    const response = await this.visionularHTTPClient.post<
      CreateTranscodingTaskResponseDTO,
      CreateTranscodingTaskRequestDTO
    >(VisionularURLBuilder.createTranscodingTask(), {
      json: {
        // extra_options: {
        // inputs: {
        //   audio_selector: [
        //     {
        //       selector_name: 'audio_selector_1',
        //       source_type: 'track',
        //       tracks: [1],
        //     },
        //   ],
        // },
        // output_groups: [
        //   {
        //     outputs: {
        //       audio_description: [
        //         {
        //           bitrate: 128000,
        //           channels: 2,
        //           codec: 'aac',
        //           group_id: 'audio',
        //           language_code_control: 'follow_input',
        //           sample_rate: '48k',
        //           selector_name: 'audio_selector_1',
        //         },
        //       ],
        //     },
        //   },
        // ],
        // },
        input: sourceLink,
        output: outputPath,
        storage_id: this.outputConfig.storageId,
        template_name: id,
      },
    });

    // Capture the API response data
    const responseData = response.json();

    // Get template name used in the request
    const templateName =
      APP_CONFIGS.VISIONULAR.TRANSCODING_TEMPLATES[template].id;

    const visionularTranscodingTask = this.visionularRepository.create({
      code: responseData.code,
      data: { task_id: responseData.data.task_id },
      msg: responseData.msg,
      rawMedia: Reference.create(rawMedia),
      request_id: responseData.request_id,
      sourceLink: this.getFilenameFromUrl(sourceLink),
      task_id: responseData.data.task_id,
      taskStatus: TranscodingTaskStatusEnum.CREATED,
      templateName: templateName,
      type: contentType,
    });

    await this.visionularRepository.save(visionularTranscodingTask);

    return {
      outputPath,
      visionularTranscodingTask: visionularTranscodingTask,
    };
  }

  getFilenameFromUrl(urlString: string) {
    const parsedUrl = new URL(urlString);
    const pathname = parsedUrl.pathname;
    const filename = path.basename(pathname);

    return filename;
  }

  async getTranscodingTaskDetails(taskId: string) {
    const response =
      await this.visionularHTTPClient.get<GetTranscodingTaskDetailsResponseDTO>(
        VisionularURLBuilder.getTranscodingTaskStatus(taskId),
      );
    return response.json();
  }

  async getVisionularTranscodingTask(taskId: string) {
    const task = await this.visionularRepository.findOneOrFail({
      _id: new ObjectId(taskId),
    });
    return task;
  }
  async listTemplates() {
    const response = await this.visionularHTTPClient.get(
      VisionularURLBuilder.listTemplates(),
    );
    return response;
  }
}
