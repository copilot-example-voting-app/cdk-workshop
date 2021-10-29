## Shared services stack

### Purpose

The purpose of this codebase is to deploy the shared resources for the voting application.
This project (via the AWS CDK) will create resources that are shared amongst the various services within the application.

### Getting started

Install dependencies

```
npm install
```

Synthesize the cloud assembly code

```
cdk synth
```

Deploy the environment

```
cdk deploy --require-approval never
```
