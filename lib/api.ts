import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as extensions from "@aws-cdk-containers/ecs-service-extensions";
import { CloudWatchLogsExtension } from './awslogs-extension';
import { ApiDatabase } from './api-database';
import { ServiceDiscovery } from './service-discovery';

interface ApiMicroserviceProps {
  ecsEnvironment: extensions.Environment,
  serviceDiscoveryName: string
}

export class APIService extends cdk.Stack {
  public apiService: extensions.Service;

  constructor(scope: cdk.Construct, id: string, props: ApiMicroserviceProps) {
    super(scope, id);

    const apiDesc = new extensions.ServiceDescription();
    apiDesc.add(new extensions.Container({
      cpu: 256,
      memoryMiB: 512,
      trafficPort: 8080,
      image: ecs.ContainerImage.fromAsset('services/api', { file: 'Dockerfile' }),
    }));

    apiDesc.add(new CloudWatchLogsExtension());
    apiDesc.add(new ApiDatabase());
    apiDesc.add(new ServiceDiscovery());

    this.apiService = new extensions.Service(this, 'api', {
      environment: props.ecsEnvironment,
      serviceDescription: apiDesc,
    });
  }
}