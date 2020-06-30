import { InjectionToken } from '@angular/core';

import { Instantiable } from 'angular-web-worker/common';

export const TESTING_WORKERS = new InjectionToken<Instantiable<any>[]>('TESTING_WORKERS');
