#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { VotingEnvironment } from '../lib/environment';
import { ResultsService } from "../lib/results";
import { VoteService } from '../lib/vote';
import { APIService } from '../lib/api';
import { ProcessorService } from '../lib/processor';
import { ProcessorMicroserviceProps } from '../lib/shared_props';

const app = new cdk.App();
const votingEnvironment = new VotingEnvironment(app, 'VotingEnvironmentWorkshop', {});
const sharedMicroservicesProps = {
  ecsEnvironment: votingEnvironment.ecsEnvironment,
  serviceDiscoveryName: votingEnvironment.serviceDiscoveryName
};

const apiService = new APIService(app, "APIServiceWorkshop", sharedMicroservicesProps);
/*const voteService = new VoteService(app, "VoteServiceWorkshop", sharedMicroservicesProps);
const processorMicroserviceProps = {
    ...sharedMicroservicesProps,
    topic: voteService.topic
}
const processorService = new ProcessorService(app, "ProcessorServiceWorkshop", processorMicroserviceProps);
const resultsServices = new ResultsService(app, "ResultsServiceWorkshop", sharedMicroservicesProps);*/