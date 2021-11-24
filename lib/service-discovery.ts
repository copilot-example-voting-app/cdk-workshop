import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import { Service, ServiceBuild, Container, ContainerMutatingHook, ServiceExtension } from "@aws-cdk-containers/ecs-service-extensions";
import * as cdk from '@aws-cdk/core';
/**
 * This extension modifies a service to send its application logs to CloudWatch
 * logs
 */
export class ServiceDiscovery extends ServiceExtension {
  constructor() {
    super('service-discovery');
  }

  public prehook(service: Service, scope: cdk.Construct) {
    this.parentService = service;

    // Make sure that the parent cluster for this service has
    // a namespace attached.
    if (!this.parentService.cluster.defaultCloudMapNamespace) {
      this.parentService.environment.addDefaultCloudMapNamespace({
        // Name the namespace after the environment name.
        // Service DNS will be like <service id>.<environment id>
        name: this.parentService.environment.id,
      });
    }
  }

  // Enable CloudMap for the service.
  public modifyServiceProps(props: ServiceBuild): ServiceBuild {
    return {
      ...props,

      // Ensure that service tasks are registered into
      // CloudMap so that the App Mesh proxy can find them.
      cloudMapOptions: {
        dnsRecordType: 'A',
        dnsTtl: cdk.Duration.seconds(10),
        failureThreshold: 2,
        name: this.parentService.id,
      }
    } as ServiceBuild;
  }

  // Connect this service to another service so that they can receive traffic from each other
  public connectToService(otherService: Service) {
    const otherAppMesh = otherService.serviceDescription.get('service-discovery') as ServiceDiscovery;
    const otherContainer = otherService.serviceDescription.get('service-container') as Container;

    // Do a check to ensure that these services are in the same environment.
    // Currently this extension only supports connecting services within
    // the same VPC, same App Mesh service mesh, and same Cloud Map namespace
    if (otherAppMesh.parentService.environment.id !== this.parentService.environment.id) {
      throw new Error(`Unable to connect service '${this.parentService.id}' in environment '${this.parentService.environment.id}' to service '${otherService.id}' in environment '${otherAppMesh.parentService.environment.id}' because services can not be connected across environment boundaries`);
    }

    // Allow this service to talk to the other service
    // at a network level. This opens the security groups so that
    // the security groups of these two services to each other
    this.parentService.ecsService.connections.allowTo(
      otherService.ecsService,
      ec2.Port.tcp(otherContainer.trafficPort),
      `Accept inbound traffic from ${this.parentService.id}`,
    );
  }
}
