#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { VotingEnvironment } from '../lib/environment';
import { APIService } from '../lib/api';
import { VoteService } from '../lib/vote';
import { ProcessorService } from '../lib/processor';
import { ResultsService } from "../lib/results";

const app = new cdk.App();
const votingEnvironment = new VotingEnvironment(app, 'VotingEnvironmentWorkshop', {});

const apiServiceStack = new APIService(app, "APIServiceWorkshop", {
  ecsEnvironment: votingEnvironment.ecsEnvironment,
  serviceDiscoveryName: votingEnvironment.serviceDiscoveryName
});

const voteService = new VoteService(app, "VoteServiceWorkshop", {
  ecsEnvironment: votingEnvironment.ecsEnvironment,
  serviceDiscoveryName: votingEnvironment.serviceDiscoveryName,
  apiService: apiServiceStack.apiService,
});

const processorService = new ProcessorService(app, "ProcessorServiceWorkshop", {
  ecsEnvironment: votingEnvironment.ecsEnvironment,
  serviceDiscoveryName: votingEnvironment.serviceDiscoveryName,
  apiService: apiServiceStack.apiService,
  topic: voteService.topic
});

const resultsServiceStack = new ResultsService(app, "ResultsServiceWorkshop", {
  ecsEnvironment: votingEnvironment.ecsEnvironment,
  serviceDiscoveryName: votingEnvironment.serviceDiscoveryName,
  apiService: apiServiceStack.apiService
});