import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as extensions from "@aws-cdk-containers/ecs-service-extensions";
import * as path from 'path';
import { VotingMicroserviceProps } from './shared_props';

export class ResultsService extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: VotingMicroserviceProps) {
    super(scope, id, props);

    const resultsDescription = new extensions.ServiceDescription();
    resultsDescription.add(new extensions.Container({
      cpu: 256,
      memoryMiB: 512,
      trafficPort: 8080,
      image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, '../../'), {file: 'results/Dockerfile'}),
      environment: {
        COPILOT_SERVICE_DISCOVERY_ENDPOINT: props.serviceDiscoveryName,
      },
    }));
    resultsDescription.add(new extensions.HttpLoadBalancerExtension());

    const resultsService = new extensions.Service(this, 'ResultsService', {
      environment: props.ecsEnvironment,
      serviceDescription: resultsDescription,
    });

  }
}