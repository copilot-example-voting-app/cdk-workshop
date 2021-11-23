# CDK Workshop

Hello and thank you for joining us! Today, we are going to deploy an application with 4 microservices using AWS CDK, Amazon ECS, and AWS Fargate.

The Pets Voting Application comprises of
* ["vote"](https://github.com/copilot-example-voting-app/vote), a frontend service that renders an HTML page to vote on cats vs. dogs. This publishes the vote request to a SNS topic, and is fronted by an Application Load Balancer.
* ["processor"](https://github.com/copilot-example-voting-app/processor) microservice is subscribed to that SNS topic using a SQS queue. This asynchronously batches the votes and forwards requests to the "api" service.
* ["api"](https://github.com/copilot-example-voting-app/api) microservice stores and retrieve results on whether a voter prefers cats or dogs. This is a REST API microservice orchestrated by Amazon ECS on AWS Fargate, and is backed up an Amazon Aurora PostgreSQL database for storage.
* ["results"](https://github.com/copilot-example-voting-app/results), a frontend service to visualize the results of the votes. This makes a request to the api service to query the votes. Both the results and vote microservices communicate to api through service discovery.

// TODO: Insert architecture diagram

## 1. Access your AWS account

First let's access the temporary AWS account that you will be given for this workshop.

Open up the AWS Event Engine portal: [https://dashboard.eventengine.run/](https://dashboard.eventengine.run/)

![images/event-engine-welcome.png](images/event-engine-welcome.png)

You need to enter the hash that you were provided. This will open up the
Event Engine dashboard:

![images/event-engine-dashboard.png](images/event-engine-dashboard.png)

Click on the "AWS Console" button.

![images/event-engine-open-console.png](images/event-engine-dashboard.png)

Then click on "Open AWS Console".

You will be logged in to the AWS Console of a temporary AWS account that you
can use for the duration of this workshop:

![images/aws-console.png](images/aws-console.png)

## 2. Load up the cloud development environment

In the search bar at the top type "Cloud9" and click on the "Cloud9" service
when it appears. This will open up the service console for accessing
a cloud development environment. You will see a preprepared development
environment that you can use:

![images/cloud9.png](images/cloud9.png)

Click on the "Open IDE" button to access your development environment. You may see an
interstitial screen similar to this one for a minute or two:

![images/wait-for-environment.png](images/wait-for-environment.png)

Once the development environment opens up click on the settings button in the upper right corner:

![images/settings.png](images/settings.png)

Then select "AWS Settings" and ensure that the "AWS managed temporary credentials" settings is off (red).

![images/aws-settings.png](images/aws-settings.png)

This workshop will be using an automatically created IAM role that is attached to the Cloud9 development
environment, rather than the default Cloud9 temporary credentials.

Now the development environment is ready to go, so we just need to open up a terminal to run commands in.

<details>
  <summary>Press the green plus button and select "New Terminal":</summary>

  ![images/new-terminal.png](images/new-terminal.png)
</details>

Next let's run a quick script to customize the AWS config inside of the development environment:

```sh
# Install prerequisites
sudo yum install -y jq

# Setting environment variables required to communicate with AWS API's via the cli tools
echo "export AWS_DEFAULT_REGION=$(curl -s 169.254.169.254/latest/dynamic/instance-identity/document | jq -r .region)" >> ~/.bashrc
source ~/.bashrc

mkdir -p ~/.aws

cat << EOF > ~/.aws/config
[default]
region = ${AWS_DEFAULT_REGION}
output = json
role_arn = $(aws iam get-role --role-name ecsworkshop-admin | jq -r .Role.Arn)
credential_source = Ec2InstanceMetadata
EOF
```

Now we need to make sure that the latest version of AWS Cloud Development Kit inside of the Cloud9 development environment.

Run `cdk` to ensure that AWS Cloud Development Kit is preinstalled in this environment. If not try following the [official getting started docs on how to install AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html).

<details>
  <summary>First hint</summary>

  * Install the AWS CDK command line tool from NPM (note that the Cloud9 development environment already has CDK installed, but it may not be the latest version)
  * Verify that the CDK command line tool is available
  * Run a CDK Bootstrap command to setup CDK on the AWS account
</details>
<details>
  <summary>The answer</summary>

  ```
    npm install -g aws-cdk
    cdk --version
    cdk bootstrap aws://{ACCOUNT}/us-west-2
  ```

  You can get your account ID from the AWS console by clicking the dropdown in the upper right:

  ![images/account-id.png](images/account-id.png)
</details>

## 3. Create your empty Cloud Development Kit project

Once CDK is installed and setup in the development environment it is time to clone the workshop repo.

```
git clone https://github.com/copilot-example-voting-app/cdk-workshop.git sample-workshop
```

This repo will serve as working example code that you can refer to if you get stuck, or copy from in building your own CDK code.

Next we need to create an brand new blank project to use as the starting point for your own CDK application.

```
mkdir cdk-workshop
cd cdk-workshop
cdk init --language typescript
```

For this workshop we will be working in TypeScript. You can find detailed information about using CDK with Typescript in the docs: https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html

There are 2 autogenerated files that we will look into and tweak as the first step. Your app’s entry point is at `bin/cdk-workshop.ts` and `lib/cdk-workshop-stack.ts` is the main infrastructure file. Let's make updates.

First, the `package.json` file is very important because it lists the packages that will be used. Modify the `dependencies` section of this file to look like this:

```
"dependencies": {
  "@aws-cdk-containers/ecs-service-extensions": "1.130.0",
  "@aws-cdk/aws-ec2": "1.130.0",
  "@aws-cdk/aws-ecs": "1.130.0",
  "@aws-cdk/core": "1.130.0",
  "source-map-support": "^0.5.16"
}
```

This will add the dependencies needed to deploy to ECS. You can refer to `sample-workshop/package.json` for a reference of what the dependencies should look like.

Make sure you run `npm install` to install these dependencies.

## 4. Build and deploy the environment stack

Let's get setup with an environment stack. This is the top level stack that will hold shared resources like the VPC, ECS Cluster, and Service Discovery resources.

First we need to create a new stack. You can use the pre-existing sample file at `lib/cdk-workshop-stack.ts` as a starting point. Rename it to `lib/environment.ts` and change the class name to `VotingEnvironment`.

Next we need to add some imports to the top of the file:

```ts
import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as extensions from "@aws-cdk-containers/ecs-service-extensions";
```

And within the body of the stack class you can add statements to create CDK resources for the VPC, ECS Cluster, and service discovery namespace:

```ts
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
```

Refer to the `sample-workshop\lib\environment.ts` to see what your `environment.ts` file should look like.

Next we need to modify the application entry point to import this stack and use it.

Open up `bin/cdk-workshop.ts`.

You will see this line:

```ts
import { CdkWorkshopStack } from '../lib/cdk-workshop-stack';
```

You need to update it to import the environment stack you just created:

```ts
import { VotingEnvironment } from '../lib/environment';
```

Last but not least you will see these sample lines:

```ts
new CdkWorkshopStack(app, 'CdkWorkshopStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
```

You can delete these lines and replace them with this:

```ts
const votingEnvironment = new VotingEnvironment(app, 'VotingEnvironmentWorkshop', {});
```

With these code changes made the CDK entry point is importing the environment stack and will use it to create resources on your AWS account.

Run the following command to make sure that everything is setup correctly:

```sh
cdk synth
```

This command compiles the TypeScript, and executes it to generate the intermediary product of Cloud Development Kit, which in this case is a CloudFormation template for creating the resources that were defined in your environment stack. You can also find a copy of this file stored at `cdk.out/VotingEnvironmentWorkshop.json` to refer to later.

This JSON is hundreds of lines of low level API definitions for every property of the AWS resources. But CDK allows you to create all of these resources with just a few lines of TypeScript.

The next command to see is a preview of what CDK will do on your account. Run the following command:

```sh
cdk diff
```

You should see something like this:

![images/cdk-diff.png](images/cdk-diff.png)

This is a preview of the list of changes that will happen when this CDK app is deployed. All these resources with a green plus will be added to your AWS account.

Let's do that now:

```sh
cdk deploy
```

### API Stack
* Create a new `lib/api.ts` for APIService
* Checkout api locally. `git clone https://github.com/copilot-example-voting-app/api`
* Use CDKExtensions to create a new ServiceDescription for `api` microservice
* Add Aurora storage and inject the right secrets and environment variables to api service
* npm install
* cdk synth
* cdk deploy --all

### Vote Stack
* Create a new `lib/vote.ts` for VoteService
* Checkout vote locally. `git clone https://github.com/copilot-example-voting-app/vote`
* Use CDKExtensions to create a new ServiceDescription for `vote` microservice
* Add SNS Topic and make an accessor for it to be used in `processor` service
* npm install
* cdk synth
* cdk deploy --all

### Processor Stack
* Create a new `lib/processor.ts` for VoteService
* Checkout processor locally. `git clone https://github.com/copilot-example-voting-app/processor`
* Use CDKExtensions to create a new Queue based ServiceDescription for `processor` microservice
* Use the sns topic from vote as input
* npm install
* cdk synth
* cdk deploy --all

### Results Stack
* Create a new `lib/results.ts` for ResultsService
* Checkout results locally. `git clone https://github.com/copilot-example-voting-app/results`
* Use CDKExtensions to create a new ServiceDescription for `results` microservice and attached a Load Balancer Extension
* npm install
* cdk synth
* cdk deploy --all
