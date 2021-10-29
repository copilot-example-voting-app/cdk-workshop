import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";

export class SharedResourcesStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sharedVpc = new ec2.Vpc(this, "WorkshopVPC", {});

    const ecsCluster = new ecs.Cluster(this, "WorkshopCluster", {
      vpc: sharedVpc,
      enableFargateCapacityProviders: true,
      executeCommandConfiguration: {},
    });

    const sdNamespace = ecsCluster.addDefaultCloudMapNamespace({
      name: "dev.workshop.local",
      vpc: sharedVpc,
    });

    // CFN Outputs for shared resources to be imported with other stacks
    new cdk.CfnOutput(this, "WorkshopVPCOutput", {
      value: sharedVpc.vpcId,
      exportName: "WorkshopVPC",
    });
    new cdk.CfnOutput(this, "WorkshopClusterOutput", {
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
