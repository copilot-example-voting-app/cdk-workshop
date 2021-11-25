import * as cdk from '@aws-cdk/core';
import * as ecs from "@aws-cdk/aws-ecs";
import * as extensions from "@aws-cdk-containers/ecs-service-extensions";
import { CloudWatchLogsExtension } from './awslogs-extension';
import { ServiceDiscovery } from './service-discovery';
import { HttpLoadBalancer } from './load-balancer';

interface ResultsMicroserviceProps {
  ecsEnvironment: extensions.Environment,
  apiService: extensions.Service,
  serviceDiscoveryName: string
}

export class ResultsService extends cdk.Stack {
  public resultsService: extensions.Service;

  constructor(scope: cdk.Construct, id: string, props: ResultsMicroserviceProps) {
    super(scope, id);

    const resultsDescription = new extensions.ServiceDescription();
    resultsDescription.add(new extensions.Container({
      cpu: 256,
      memoryMiB: 512,
      trafficPort: 8080,
      image: ecs.ContainerImage.fromAsset('./services/results/', { file: 'Dockerfile' }),
      environment: {
        COPILOT_SERVICE_DISCOVERY_ENDPOINT: props.serviceDiscoveryName,
      },
    }));
    resultsDescription.add(new HttpLoadBalancer({
      healthCheck: {
        path: '/_healthcheck',
        interval: cdk.Duration.seconds(5),
        timeout: cdk.Duration.seconds(2)
      }
    }));
    resultsDescription.add(new CloudWatchLogsExtension());
    resultsDescription.add(new ServiceDiscovery());

    this.resultsService = new extensions.Service(this, 'results', {
      environment: props.ecsEnvironment,
      serviceDescription: resultsDescription,
    });

    // The results service needs to fetch from the API
    this.resultsService.connectTo(props.apiService);
  }
}