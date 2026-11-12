import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  ORGANIZATION_GATEWAY_LOADER,
  type OrganizationGateway,
} from '@features/organization/application/organization-gateway';
import { createDemoOrganizationGateway } from '@features/organization/infrastructure/demo/demo-organization.gateway';
import {
  type OrganizationData,
  createOrganizationSeed,
} from '@features/organization/infrastructure/demo/demo-organization.seed';
import { provideOrganization } from '@features/organization/infrastructure/provide-organization';

export type { OrganizationData };

export function testOrganizationSeed(today = new Date()): OrganizationData {
  return createOrganizationSeed(today, 'es');
}

export function createTestOrganizationGateway(
  seed: () => OrganizationData = () => testOrganizationSeed(),
): OrganizationGateway {
  let id = 0;
  return createDemoOrganizationGateway({
    storage: null,
    seed,
    latency: [0, 0],
    newId: () => `test-${++id}`,
  });
}

export function provideTestOrganization(
  gateway: OrganizationGateway = createTestOrganizationGateway(),
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideOrganization(),
    { provide: ORGANIZATION_GATEWAY_LOADER, useValue: () => Promise.resolve(gateway) },
  ]);
}
