import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as ecs from '@aws-cdk/aws-ecs';
import * as extensions from "@aws-cdk-containers/ecs-service-extensions";
import * as path from 'path';
import { CloudWatchLogsExtension } from './awslogs-extension';

export interface VotingMicroserviceProps extends cdk.StackProps {
  ecsEnvironment: extensions.Environment,
  serviceDiscoveryName: string
}

export class APIService extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: VotingMicroserviceProps) {
    super(scope, id, props);

    // Create a database

    const apiDesc = new extensions.ServiceDescription();
    apiDesc.add(new extensions.Container({
      cpu: 256,
      memoryMiB: 512,
      trafficPort: 8080,
      image: ecs.ContainerImage.fromAsset('services/api', { file: 'Dockerfile' }),
    }));

    apiDesc.add(new extensions.HttpLoadBalancerExtension());
    apiDesc.add(new CloudWatchLogsExtension());

    const resultsService = new extensions.Service(this, 'ResultsService', {
      environment: props.ecsEnvironment,
      serviceDescription: apiDesc,
    });
  }
}