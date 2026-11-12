import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  FINANCE_GATEWAY_LOADER,
  type FinanceGateway,
} from '@features/finances/application/finance-gateway';
import { createDemoFinanceGateway } from '@features/finances/infrastructure/demo/demo-finance.gateway';
import {
  type FinanceData,
  createFinanceSeed,
} from '@features/finances/infrastructure/demo/demo-finance.seed';

export const TEST_TODAY = new Date();

export function createTestFinanceGateway(
  seed: () => FinanceData = () => createFinanceSeed(TEST_TODAY, 'es'),
): FinanceGateway {
  let id = 0;
  return createDemoFinanceGateway({
    storage: null,
    seed,
    latency: [0, 0],
    newId: () => `test-${++id}`,
  });
}

export function provideTestFinances(
  gateway: FinanceGateway = createTestFinanceGateway(),
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FINANCE_GATEWAY_LOADER, useValue: () => Promise.resolve(gateway) },
  ]);
}
