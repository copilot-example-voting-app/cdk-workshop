import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as extensions from '@aws-cdk-containers/ecs-service-extensions';
import * as path from 'path';
import { ProcessorMicroserviceProps } from './shared_props';
import { CloudWatchLogsExtension } from './awslogs-extension';
import { ServiceDiscovery } from './service-discovery';

export class ProcessorService extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ProcessorMicroserviceProps) {
    super(scope, id, props);

    const processorServiceDesc = new extensions.ServiceDescription();
    processorServiceDesc.add(new extensions.QueueExtension({
      subscriptions: [new extensions.TopicSubscription({
        topic: props.topic,
      })],
    }));

    processorServiceDesc.add(new extensions.Container({
      cpu: 1024,
      memoryMiB: 2048,
      trafficPort: 80,
      image: ecs.ContainerImage.fromAsset('./services/processor/', { file: 'Dockerfile' }),
    }));

    processorServiceDesc.add(new CloudWatchLogsExtension());
    processorServiceDesc.add(new ServiceDiscovery());

    const service = new extensions.Service(this, 'processor-service', {
      environment: props.ecsEnvironment,
      serviceDescription: processorServiceDesc,
    });

    const cfnTaskDefinition = service.ecsService.taskDefinition.node.defaultChild as ecs.CfnTaskDefinition;
    const queueExtension = processorServiceDesc.extensions.queue as extensions.QueueExtension;
    cfnTaskDefinition.addPropertyOverride('ContainerDefinitions.0.Environment', [{
      Name: 'COPILOT_QUEUE_URI',
      Value: queueExtension.eventsQueue.queueUrl,
    }, {
      Name: 'COPILOT_SERVICE_DISCOVERY_ENDPOINT',
      Value: props.serviceDiscoveryName,
    }]);
  }
}