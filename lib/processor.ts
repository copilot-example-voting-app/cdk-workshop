import * as cdk from '@aws-cdk/core';
import { VotingMicroserviceProps } from './shared_props';

export class ProcessorService extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: VotingMicroserviceProps) {
      super(scope, id, props);
  
    }
}