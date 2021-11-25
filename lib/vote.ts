import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as extensions from '@aws-cdk-containers/ecs-service-extensions';
import * as path from 'path';
import * as sns from '@aws-cdk/aws-sns';
import { CloudWatchLogsExtension } from './awslogs-extension';
import { ServiceDiscovery } from './service-discovery';
import { HttpLoadBalancer } from './load-balancer';

interface VotingMicroserviceProps {
  ecsEnvironment: extensions.Environment,
  apiService: extensions.Service,
  serviceDiscoveryName: string
}

export class VoteService extends cdk.Stack {
  public voteService: extensions.Service;
  public readonly topic: sns.ITopic;

  constructor(scope: cdk.Construct, id: string, props: VotingMicroserviceProps) {
    super(scope, id);

    this.topic = new sns.Topic(this, 'WorkshopTopic');
    const voteServiceDesc = new extensions.ServiceDescription();
    voteServiceDesc.add(new extensions.Container({
      cpu: 256,
      memoryMiB: 512,
      trafficPort: 8080,
      image: ecs.ContainerImage.fromAsset('./services/vote/', { file: 'Dockerfile' }),
    }));

    voteServiceDesc.add(new extensions.InjecterExtension({
      injectables: [new extensions.InjectableTopic({
        topic: this.topic,
      })],
    }));

    voteServiceDesc.add(new HttpLoadBalancer());
    voteServiceDesc.add(new CloudWatchLogsExtension());
    voteServiceDesc.add(new ServiceDiscovery());

    this.voteService = new extensions.Service(this, 'vote', {
      environment: props.ecsEnvironment,
      serviceDescription: voteServiceDesc,
    });

    this.voteService.connectTo(props.apiService);

    const cfnTaskDefinition = this.voteService.ecsService.taskDefinition.node.defaultChild as ecs.CfnTaskDefinition;
    cfnTaskDefinition.addPropertyOverride('ContainerDefinitions.0.Environment', [{
      Name: 'COPILOT_SNS_TOPIC_ARNS',
      Value: `{"events": "${this.topic.topicArn}"}`,
    }, {
      Name: 'COPILOT_SERVICE_DISCOVERY_ENDPOINT',
      Value: props.serviceDiscoveryName,
    }]);
  }
}