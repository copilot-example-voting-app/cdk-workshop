import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import * as extensions from "@aws-cdk-containers/ecs-service-extensions";

export interface VotingMicroserviceProps extends cdk.StackProps {
    ecsEnvironment: extensions.Environment,
    serviceDiscoveryName: string
}

export interface ProcessorMicroserviceProps extends VotingMicroserviceProps {
    topic: sns.ITopic
}