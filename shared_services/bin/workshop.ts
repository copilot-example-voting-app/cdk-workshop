#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { SharedResourcesStack } from "../lib/workshop-stack";

const app = new cdk.App();

new SharedResourcesStack(app, "SharedResourcesWorkshop", {});
