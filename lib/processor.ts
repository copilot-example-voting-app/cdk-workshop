import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as extensions from '@aws-cdk-containers/ecs-service-extensions';
import * as path from 'path';
import { ProcessorMicroserviceProps } from './shared_props';

export class ProcessorService extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ProcessorMicroserviceProps) {
    super(scope, id, props);

    const procecssorServiceDesc = new extensions.ServiceDescription();
    procecssorServiceDesc.add(new extensions.QueueExtension({
      subscriptions: [new extensions.TopicSubscription({
        topic: props.topic,
      })],
    }));

    procecssorServiceDesc.add(new extensions.Container({
      cpu: 1024,
      memoryMiB: 2048,
      trafficPort: 80,
      image: ecs.ContainerImage.fromAsset('./services/processor/', { file: 'Dockerfile' }),
    }));

    const service = new extensions.Service(this, 'processor-service', {
      environment: props.ecsEnvironment,
      serviceDescription: procecssorServiceDesc,
    });

    const cfnTaskDefinition = service.ecsService.taskDefinition.node.defaultChild as ecs.CfnTaskDefinition;
    const queueExtension = procecssorServiceDesc.extensions.queue as extensions.QueueExtension;
    cfnTaskDefinition.addPropertyOverride('ContainerDefinitions.0.Environment', [{
      Name: 'COPILOT_QUEUE_URI',
      Value: queueExtension.eventsQueue.queueUrl,
    }, {
      Name: 'COPILOT_SERVICE_DISCOVERY_ENDPOINT',
      Value: props.serviceDiscoveryName,
    }]);
  }
}