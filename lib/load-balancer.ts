import * as ecs from '@aws-cdk/aws-ecs';
import * as alb from '@aws-cdk/aws-elasticloadbalancingv2';
import * as cdk from '@aws-cdk/core';
import { Service, ServiceExtension, ServiceBuild } from "@aws-cdk-containers/ecs-service-extensions";

// keep this import separate from other imports to reduce chance for merge conflicts with v2-main
// eslint-disable-next-line no-duplicate-imports, import/order
import { Construct } from '@aws-cdk/core';

export interface HttpLoadBalancerProps {
  /**
   * The path to send healthcheck requests to
   */
  readonly healthCheck?: alb.HealthCheck;
}
/**
 * This extension add a public facing load balancer for sending traffic
 * to one or more replicas of the application container.
 */
export class HttpLoadBalancer extends ServiceExtension {
  private loadBalancer!: alb.IApplicationLoadBalancer;
  private listener!: alb.IApplicationListener;
  readonly healthCheck?: alb.HealthCheck;

  constructor(props: HttpLoadBalancerProps = {}) {
    super('load-balancer');

    if (!props.healthCheck) {
      this.healthCheck = {
        path: '/',
        interval: cdk.Duration.seconds(5),
        timeout: cdk.Duration.seconds(2)
      }
    } else {
      this.healthCheck = props.healthCheck;
    }
  }

  // Before the service is created, go ahead and create the load balancer itself.
  public prehook(service: Service, scope: Construct) {
    this.parentService = service;

    this.loadBalancer = new alb.ApplicationLoadBalancer(scope, `${this.parentService.id}-load-balancer`, {
      vpc: this.parentService.vpc,
      internetFacing: true,
    });

    this.listener = this.loadBalancer.addListener(`${this.parentService.id}-listener`, {
      port: 80,
      open: true,
    });

    // Automatically create an output
    new cdk.CfnOutput(scope, `${this.parentService.id}-load-balancer-dns-output`, {
      value: this.loadBalancer.loadBalancerDnsName,
    });
  }

  // Minor service configuration tweaks to work better with a load balancer
  public modifyServiceProps(props: ServiceBuild): ServiceBuild {
    return {
      ...props,

      // Give the task a little bit of grace time to start passing
      // healthchecks. Without this it is possible for a slow starting task
      // to cause the ALB to consider the task unhealthy, causing ECS to stop
      // the task before it actually has a chance to finish starting up
      healthCheckGracePeriod: cdk.Duration.minutes(1),
    } as ServiceBuild;
  }

  // After the service is created add the service to the load balancer's listener
  public useService(service: ecs.Ec2Service | ecs.FargateService) {
    const targetGroup = this.listener.addTargets(this.parentService.id, {
      deregistrationDelay: cdk.Duration.seconds(10),
      port: 80,
      healthCheck: this.healthCheck,
      targets: [service],
    });
  }
}