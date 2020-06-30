import { InjectionToken } from '@angular/core';
import { WorkerDefinition } from '../@types';

export const WORKER_DEFINITIONS = new InjectionToken<WorkerDefinition[]>('WORKER_DEFINITIONS');
