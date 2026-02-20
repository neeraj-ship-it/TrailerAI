export interface FargateTaskConfig {
  capacityProvider: string;
  cluster: string;
  containerName: string;
  cpu: number; // CPU units (1024 = 1 vCPU)
  ephemeralStorageSizeGiB: number;
  memory: number; // Memory in MB
  securityGroupIds: string[];
  subnetIds: string[];
  taskDefinition: string;
}
