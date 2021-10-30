import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as extensions from "@aws-cdk-containers/ecs-service-extensions";

export class VotingEnvironment extends cdk.Stack {
  public readonly ecsEnvironment: extensions.Environment;
  public readonly serviceDiscoveryName: string;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sharedVpc = new ec2.Vpc(this, "WorkshopVPC", {});

    const ecsCluster = new ecs.Cluster(this, "WorkshopCluster", {
      vpc: sharedVpc,
      enableFargateCapacityProviders: true,
      executeCommandConfiguration: {},
    });
 
    this.ecsEnvironment = new extensions.Environment(this, 'WorkshopEnvironment', {
      vpc: sharedVpc,
      cluster: ecsCluster,
    });

    const sdNamespace = ecsCluster.addDefaultCloudMapNamespace({
      name: "voting-app.local",
      vpc: sharedVpc,
    });
    
    this.serviceDiscoveryName = sdNamespace.namespaceName;
  }
}
