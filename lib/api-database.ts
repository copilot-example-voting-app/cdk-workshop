import * as ecs from '@aws-cdk/aws-ecs';
import * as rds from '@aws-cdk/aws-rds';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as secretsManager from '@aws-cdk/aws-secretsmanager';
import { Service, Container, ContainerMutatingHook, ServiceExtension } from "@aws-cdk-containers/ecs-service-extensions";
import { Construct } from '@aws-cdk/core';

interface DatabaseConnectionInjectorInterface {
  /**
   * The parent service that is being mutated
   */
  readonly parentService: Service;

  /**
   * The database secret that is being injected
   */
  readonly databaseSecret: rds.Credentials;

  /**
   * The database that the service should be connecting to
   */
  readonly databaseCluster: rds.ServerlessCluster;
}

/**
 * This hook injects the database connection details into the application container
 * definition
 */
export class DatabaseConnectionInjector extends ContainerMutatingHook {
  private parentService: Service;
  private databaseSecret: rds.Credentials;
  private databaseCluster: rds.ServerlessCluster;

  constructor(props: DatabaseConnectionInjectorInterface) {
    super();
    this.parentService = props.parentService;
    this.databaseSecret = props.databaseSecret;
    this.databaseCluster = props.databaseCluster;
  }

  public mutateContainerDefinition(props: ecs.ContainerDefinitionOptions) {
    if (!this.databaseSecret.secret) {
      throw new Error('Database secret not created yet!');
    }

    return {
      ...props,
      environment: {
        RDS_ENDPOINT: this.databaseCluster.clusterEndpoint.hostname,
      },
      secrets: {
        RDS_SECRET: ecs.Secret.fromSecretsManager(this.databaseSecret.secret)
      }
    } as ecs.ContainerDefinitionOptions;
  }
}

/**
 * This extension creates an Aurora serverless database and attaches
 * it to the application container
 */
export class ApiDatabase extends ServiceExtension {
  private databaseSecret?: rds.Credentials;
  private databaseCluster?: rds.ServerlessCluster;
  private secret: secretsManager.Secret;

  constructor() {
    super('aurora-database');
  }

  // Create the database secret and the database.
  public prehook(service: Service, scope: Construct) {
    this.parentService = service;

    // Create database secret
    this.secret = new secretsManager.Secret(scope, 'api-database-secret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'api' }),
        generateStringKey: 'password',
        excludeCharacters: '/@\"\ '
      },
    });

    this.databaseSecret = rds.Credentials.fromSecret(this.secret);

    // Create a database
    this.databaseCluster = new rds.ServerlessCluster(scope, 'api-database-cluster', {
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      defaultDatabaseName: 'api',
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(scope, 'ParameterGroup', 'default.aurora-postgresql10'),
      vpc: service.environment.vpc,
      credentials: this.databaseSecret
    });
  }

  // Add hooks to the main application extension so to inject the proper
  // environment variables for it to know how to connect to the DB
  public addHooks() {
    const container = this.parentService.serviceDescription.get('service-container') as Container;

    if (this.databaseCluster && this.databaseSecret) {
      container.addContainerMutatingHook(new DatabaseConnectionInjector({
        parentService: this.parentService,
        databaseSecret: this.databaseSecret,
        databaseCluster: this.databaseCluster
      }));
    }
  }

  // After the service is created allow connections from the service
  // to the database
  public useService(service: ecs.Ec2Service | ecs.FargateService) {
    if (!this.databaseCluster) {
      throw new Error('This service hook is not to be called before the database cluster has been created');
    }

    service.connections.allowTo(this.databaseCluster, ec2.Port.tcp(5432));
  }
}
