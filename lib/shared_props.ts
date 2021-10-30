import * as cdk from '@aws-cdk/core';
import * as extensions from "@aws-cdk-containers/ecs-service-extensions";

export interface VotingMicroserviceProps extends cdk.StackProps {
    ecsEnvironment: extensions.Environment,
    serviceDiscoveryName: string
}