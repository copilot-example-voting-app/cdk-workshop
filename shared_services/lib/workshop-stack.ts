import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";

export class SharedResourcesStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "WorkshopVPC", {});
    const ecsCluster = new ecs.Cluster(this, "WorkshopCluster", {
      vpc: vpc,
      enableFargateCapacityProviders: true,
      executeCommandConfiguration: {},
    });
    const sdNamespace = ecsCluster.addDefaultCloudMapNamespace({
      name: "dev.workshop.local",
      vpc: vpc,
    });

    // CFN Outputs for shared resources to be imported with other stacks
    new cdk.CfnOutput(this, "WorkshopVPC", {
      value: vpc.vpcId,
      exportName: "WorkshopVPC",
    });
    new cdk.CfnOutput(this, "WorkshopCluster", {
      value: ecsCluster.clusterName,
      exportName: "WorkshopClusterName",
    });
    new cdk.CfnOutput(this, "WorkshopSDNamespaceArn", {
      value: sdNamespace.namespaceArn,
      exportName: "WorkshopSDArn",
    });
    new cdk.CfnOutput(this, "WorkshopSDNamespaceId", {
      value: sdNamespace.namespaceId,
      exportName: "WorkshopSDId",
    });
    new cdk.CfnOutput(this, "WorkshopSDNamespaceName", {
      value: sdNamespace.namespaceName,
      exportName: "WorkshopSDName",
    });
  }
}
