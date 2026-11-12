import { Injectable, computed, inject, resource } from '@angular/core';
import { type Category, type EntryType, sortCategories } from '../domain/category';
import { FinanceService } from './finance.service';

@Injectable({ providedIn: 'root' })
export class CategoriesStore {
  private readonly finance = inject(FinanceService);

  readonly resource = resource({
    params: () => ({ version: this.finance.version() }),
    loader: () => this.finance.categories(),
  });

  readonly all = computed<readonly Category[]>(() =>
    this.resource.hasValue() ? sortCategories(this.resource.value()) : [],
  );

  readonly byId = computed(() => new Map(this.all().map((category) => [category.id, category])));

  readonly loading = computed(() => this.resource.isLoading() && !this.resource.hasValue());

  active(type: EntryType): readonly Category[] {
    return this.all().filter((category) => category.type === type && !category.archived);
  }

  find(id: string | null | undefined): Category | undefined {
    return id ? this.byId().get(id) : undefined;
  }
}
