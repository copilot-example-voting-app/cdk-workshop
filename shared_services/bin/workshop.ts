#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { SharedResourcesStack } from "../lib/workshop-stack";

const app = new cdk.App();
new SharedResourcesStack(app, "SharedResourcesWorkshop", {});
