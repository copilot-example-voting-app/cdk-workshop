#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { VotingEnvironment } from '../lib/environment';
import { ResultsService } from "../lib/results";
import { VoteService } from '../lib/vote';
import { APIService } from '../lib/api';
import { ProcessorService } from '../lib/processor';

const app = new cdk.App();
const votingEnvironment = new VotingEnvironment(app, 'VotingEnvironmentWorkshop', {});
const sharedMicroservicesProps = {
  ecsEnvironment: votingEnvironment.ecsEnvironment,
  serviceDiscoveryName: votingEnvironment.serviceDiscoveryName
};

const apiServiceStack = new APIService(app, "APIServiceWorkshop", sharedMicroservicesProps);

const voteService = new VoteService(app, "VoteServiceWorkshop", {
  ecsEnvironment: votingEnvironment.ecsEnvironment,
  serviceDiscoveryName: votingEnvironment.serviceDiscoveryName,
  apiService: apiServiceStack.apiService
});

const processorService = new ProcessorService(app, "ProcessorServiceWorkshop", {
  ecsEnvironment: votingEnvironment.ecsEnvironment,
  serviceDiscoveryName: votingEnvironment.serviceDiscoveryName,
  apiService: apiServiceStack.apiService,
  topic: voteService.topic
});

const resultsServices = new ResultsService(app, "ResultsServiceWorkshop", {
  ecsEnvironment: votingEnvironment.ecsEnvironment,
  serviceDiscoveryName: votingEnvironment.serviceDiscoveryName,
  apiService: apiServiceStack.apiService
});