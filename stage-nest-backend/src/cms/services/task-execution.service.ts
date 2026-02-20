import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';

import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';

import { ClipExtractorTaskMessage } from '../dtos/clip-extractor.dto';
import { VideoQcRequestedEvent } from '../dtos/kafka-events.dto';
import { IFrameExtraction } from '../dtos/poster-project.dto';
import { TrailerNarrativeTaskMessage } from '../dtos/trailer.dto';
import { FargateTaskConfig } from '../interfaces/task-execution.interface';
import { APP_CONFIGS } from '@app/common/configs/app.config';
import { S3Service } from '@app/storage';

@Injectable()
export class TaskExecutionService {
  private readonly ecsClient: ECSClient;
  private readonly logger = new Logger(TaskExecutionService.name);

  constructor(private readonly s3Service: S3Service) {
    const { ECS } = APP_CONFIGS.AWS;
    this.ecsClient = new ECSClient({
      credentials: {
        accessKeyId: APP_CONFIGS.AWS.ACCESS_KEY_ID,
        secretAccessKey: APP_CONFIGS.AWS.SECRET_ACCESS_KEY,
      },
      region: ECS.REGION,
    });
  }

  private async executeFargateTask<T, Config extends FargateTaskConfig>(
    message: T,
    config: Config,
  ): Promise<void> {
    const command = new RunTaskCommand({
      capacityProviderStrategy: [
        {
          capacityProvider: config.capacityProvider,
          weight: 1,
        },
      ],
      cluster: config.cluster,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: 'ENABLED',
          securityGroups: config.securityGroupIds,
          subnets: config.subnetIds,
        },
      },
      overrides: {
        containerOverrides: [
          {
            command: [JSON.stringify(message)],
            cpu: config.cpu,
            memory: config.memory,
            name: config.containerName,
          },
        ],
        cpu: config.cpu.toString(),
        ephemeralStorage: {
          sizeInGiB: config.ephemeralStorageSizeGiB,
        },
        memory: config.memory.toString(),
      },
      taskDefinition: config.taskDefinition,
    });

    try {
      const response = await this.ecsClient.send(command);
      const taskArn = response.tasks?.[0]?.taskArn;

      if (!taskArn) {
        throw new Error(`Failed to start  No task ARN returned`);
      }
    } catch (error) {
      this.logger.error(
        {
          config,
          error,
        },
        `Failed to execute Fargate task `,
      );
      throw error;
    }
  }

  private executeLocalPythonScript(message: TrailerNarrativeTaskMessage): void {
    const scriptDir = APP_CONFIGS.TRAILER.DEV_PYTHON_SCRIPT_PATH;
    const pythonPath = `${scriptDir}/venv/bin/python`;
    const scriptPath = `${scriptDir}/main.py`;
    const jsonPayload = JSON.stringify(message);

    this.logger.log(`[DEV] Executing local Python script: ${scriptPath}`);
    this.logger.log(`[DEV] Payload: ${jsonPayload}`);

    const pythonProcess = spawn(pythonPath, [scriptPath, jsonPayload], {
      cwd: scriptDir,
      detached: true,
      env: { ...process.env, AWS_PROFILE: 'default' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    pythonProcess.stdout?.on('data', (data) => {
      this.logger.log(`[trailer-narrative-ai] ${data.toString().trim()}`);
    });

    pythonProcess.stderr?.on('data', (data) => {
      this.logger.error(`[trailer-narrative-ai] ${data.toString().trim()}`);
    });

    pythonProcess.on('error', (error) => {
      this.logger.error(
        `[DEV] Failed to start Python script: ${error.message}`,
      );
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        this.logger.log(`[DEV] Python script completed successfully`);
      } else {
        this.logger.error(`[DEV] Python script exited with code ${code}`);
      }
    });

    // Unref to allow Node.js to exit independently
    pythonProcess.unref();
  }

  private pickFargateResources(fileSizeGB: number): {
    cpu: number;
    memory: number;
  } {
    const { CPU_CORES } = APP_CONFIGS.AWS.ECS;
    const { LARGE, MEDIUM } = CPU_CORES.FILE_SIZE_THRESHOLDS;

    if (fileSizeGB < MEDIUM) {
      return {
        cpu: CPU_CORES.SMALL.cpu,
        memory: CPU_CORES.SMALL.memory,
      };
    } else if (fileSizeGB < LARGE) {
      return {
        cpu: CPU_CORES.MEDIUM.cpu,
        memory: CPU_CORES.MEDIUM.memory,
      };
    } else {
      return {
        cpu: CPU_CORES.LARGE.cpu,
        memory: CPU_CORES.LARGE.memory,
      };
    }
  }

  async executeFrameExtractionTask(message: IFrameExtraction): Promise<void> {
    const fileSize = await this.s3Service.getS3ObjectSize({
      bucket: message.s3Bucket,
      key: message.s3FileKey,
    });

    const { cpu, memory } = this.pickFargateResources(fileSize.inGB);

    const ephemeralStorageSizeGiB =
      await this.s3Service.getDiskAllocationFromS3File({
        bucket: message.s3Bucket,
        key: message.s3FileKey,
        maxDiskMB: APP_CONFIGS.AWS.ECS.FRAME_EXTRACTION.MAX_DISK_MB,
      });

    await this.executeFargateTask<IFrameExtraction, FargateTaskConfig>(
      message,
      {
        capacityProvider: 'FARGATE_SPOT',
        cluster: APP_CONFIGS.AWS.ECS.CLUSTER,
        containerName: 'ai-poster',
        cpu,
        ephemeralStorageSizeGiB,
        memory,
        securityGroupIds:
          APP_CONFIGS.AWS.ECS.FRAME_EXTRACTION.SECURITY_GROUP_IDS.split(','),
        subnetIds: APP_CONFIGS.AWS.ECS.FRAME_EXTRACTION.SUBNET_IDS.split(','),
        taskDefinition: APP_CONFIGS.AWS.ECS.FRAME_EXTRACTION.TASK_DEFINITION,
      },
    );
  }

  async executeTrailerNarrativeTask(
    message: TrailerNarrativeTaskMessage,
  ): Promise<void> {
    // In dev environment with local Python script configured, run locally instead of Fargate
    if (APP_CONFIGS.TRAILER.IS_DEV_LOCAL_EXECUTION) {
      this.executeLocalPythonScript(message);
      return;
    }

    const fileSize = await this.s3Service.getS3ObjectSize({
      bucket: message.s3Bucket,
      key: message.s3FileKey,
    });

    const { cpu, memory } = this.pickFargateResources(fileSize.inGB);

    const ephemeralStorageSizeGiB =
      await this.s3Service.getDiskAllocationFromS3File({
        bucket: message.s3Bucket,
        key: message.s3FileKey,
        maxDiskMB: APP_CONFIGS.AWS.ECS.TRAILER_NARRATIVE.MAX_DISK_MB,
      });

    await this.executeFargateTask<
      TrailerNarrativeTaskMessage,
      FargateTaskConfig
    >(message, {
      capacityProvider: 'FARGATE_SPOT',
      cluster: APP_CONFIGS.AWS.ECS.CLUSTER,
      containerName:
        APP_CONFIGS.AWS.ECS.TRAILER_NARRATIVE.TASK_DEFINITION?.split(':')[0] ||
        'trailer-narrative-ai',
      cpu,
      ephemeralStorageSizeGiB,
      memory,
      securityGroupIds:
        APP_CONFIGS.AWS.ECS.TRAILER_NARRATIVE.SECURITY_GROUP_IDS.split(','),
      subnetIds: APP_CONFIGS.AWS.ECS.TRAILER_NARRATIVE.SUBNET_IDS.split(','),
      taskDefinition: APP_CONFIGS.AWS.ECS.TRAILER_NARRATIVE.TASK_DEFINITION,
    });
  }

  private executeLocalClipExtractorScript(
    message: ClipExtractorTaskMessage,
  ): void {
    const scriptDir = APP_CONFIGS.CLIP_EXTRACTOR.DEV_PYTHON_SCRIPT_PATH;
    const pythonPath = `${scriptDir}/venv/bin/python`;
    const scriptPath = `${scriptDir}/main.py`;
    const jsonPayload = JSON.stringify(message);

    this.logger.log(
      `[DEV] Executing local clip-extractor script: ${scriptPath}`,
    );
    this.logger.log(`[DEV] Payload: ${jsonPayload}`);

    const pythonProcess = spawn(pythonPath, [scriptPath, jsonPayload], {
      cwd: scriptDir,
      detached: true,
      env: { ...process.env, AWS_PROFILE: 'default' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    pythonProcess.stdout?.on('data', (data) => {
      this.logger.log(`[clip-extractor-ai] ${data.toString().trim()}`);
    });

    pythonProcess.stderr?.on('data', (data) => {
      this.logger.error(`[clip-extractor-ai] ${data.toString().trim()}`);
    });

    pythonProcess.on('error', (error) => {
      this.logger.error(
        `[DEV] Failed to start clip-extractor script: ${error.message}`,
      );
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        this.logger.log(
          `[DEV] Clip extractor script completed successfully`,
        );
      } else {
        this.logger.error(
          `[DEV] Clip extractor script exited with code ${code}`,
        );
      }
    });

    pythonProcess.unref();
  }

  async executeClipExtractorTask(
    message: ClipExtractorTaskMessage,
  ): Promise<void> {
    // In dev environment, run locally instead of Fargate
    if (APP_CONFIGS.CLIP_EXTRACTOR.IS_DEV_LOCAL_EXECUTION) {
      this.executeLocalClipExtractorScript(message);
      return;
    }

    // For production: use Fargate (similar to trailer)
    await this.executeFargateTask<ClipExtractorTaskMessage, FargateTaskConfig>(
      message,
      {
        capacityProvider: 'FARGATE_SPOT',
        cluster: APP_CONFIGS.AWS.ECS.CLUSTER,
        containerName: 'clip-extractor-ai',
        cpu: 2048,
        ephemeralStorageSizeGiB: 100,
        memory: 8192,
        securityGroupIds:
          APP_CONFIGS.AWS.ECS.TRAILER_NARRATIVE.SECURITY_GROUP_IDS.split(','),
        subnetIds:
          APP_CONFIGS.AWS.ECS.TRAILER_NARRATIVE.SUBNET_IDS.split(','),
        taskDefinition:
          APP_CONFIGS.AWS.ECS.TRAILER_NARRATIVE.TASK_DEFINITION,
      },
    );
  }

  async executeVideoQcTask(message: VideoQcRequestedEvent): Promise<void> {
    const fileSize = await this.s3Service.getS3ObjectSize({
      bucket: message.s3Bucket,
      key: message.s3FileKey,
    });

    const { cpu, memory } = this.pickFargateResources(fileSize.inGB);

    const ephemeralStorageSizeGiB =
      await this.s3Service.getDiskAllocationFromS3File({
        bucket: message.s3Bucket,
        key: message.s3FileKey,
        maxDiskMB: APP_CONFIGS.AWS.ECS.VIDEO_QC.MAX_DISK_MB,
      });

    await this.executeFargateTask<VideoQcRequestedEvent, FargateTaskConfig>(
      message,
      {
        capacityProvider: 'FARGATE_SPOT',
        cluster: APP_CONFIGS.AWS.ECS.CLUSTER,
        containerName:
          APP_CONFIGS.AWS.ECS.VIDEO_QC.TASK_DEFINITION?.split(':')[0] ||
          'video-qc',
        cpu,
        ephemeralStorageSizeGiB,
        memory,
        securityGroupIds:
          APP_CONFIGS.AWS.ECS.VIDEO_QC.SECURITY_GROUP_IDS.split(','),
        subnetIds: APP_CONFIGS.AWS.ECS.VIDEO_QC.SUBNET_IDS.split(','),
        taskDefinition: APP_CONFIGS.AWS.ECS.VIDEO_QC.TASK_DEFINITION,
      },
    );
  }
}
