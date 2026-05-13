import { describe, it, expect } from 'vitest';
import {
  SEARCH_INPUT_ID,
  SEARCH_CLEAR_ID,
  FILTER_TOGGLE_ID,
  FILTER_PANEL_ID,
  TABLE_ID,
  EMPTY_STATE_ID,
  ERROR_STATE_ID,
  RETRY_BUTTON_ID,
  getFilterCheckboxId,
  getTableRowId,
  getSortColumnId,
  getStatCardTestId,
  TABLE_COL_ATTR,
  getTableRowCellSelector,
  getDrawerPanelTestId,
  getDetailFieldTestId,
  getFormFieldErrorTestId,
  FIELD_TYPE_DROPDOWN_LIST,
  FIELD_CONSTRAINT_ROW,
  OBJECT_MEMBER_SEARCH
} from '$lib/utils/testIds';

describe('testIds - Constants', () => {
  it('should define all constant test IDs', () => {
    expect(SEARCH_INPUT_ID).toBe('search-input');
    expect(SEARCH_CLEAR_ID).toBe('search-clear');
    expect(FILTER_TOGGLE_ID).toBe('filter-toggle');
    expect(FILTER_PANEL_ID).toBe('filter-panel');
    expect(TABLE_ID).toBe('data-table');
    expect(EMPTY_STATE_ID).toBe('empty-state');
    expect(ERROR_STATE_ID).toBe('error-state');
    expect(RETRY_BUTTON_ID).toBe('retry-button');
  });
});

describe('testIds - getFilterCheckboxId', () => {
  it('should generate correct format', () => {
    expect(getFilterCheckboxId('type', 'str')).toBe('filter-type-str');
  });

  it('should lowercase the output', () => {
    expect(getFilterCheckboxId('Type', 'STR')).toBe('filter-type-str');
  });

  it('should replace spaces with hyphens', () => {
    expect(getFilterCheckboxId('field type', 'long string')).toBe('filter-field-type-long-string');
  });
});

describe('testIds - getTableRowId', () => {
  it('should generate correct format', () => {
    expect(getTableRowId('field-1')).toBe('table-row-field-1');
  });
});

describe('testIds - getSortColumnId', () => {
  it('should generate correct format', () => {
    expect(getSortColumnId('name')).toBe('sort-name');
  });
});

describe('testIds - table column attr', () => {
  it('TABLE_COL_ATTR is stable', () => {
    expect(TABLE_COL_ATTR).toBe('data-col');
  });

  it('getTableRowCellSelector encodes attribute and value', () => {
    expect(getTableRowCellSelector('defaultValue')).toBe('td[data-col="defaultValue"]');
  });
});

describe('testIds - getStatCardTestId', () => {
  it('should generate correct format', () => {
    expect(getStatCardTestId('Total Fields')).toBe('stat-card-total-fields');
  });

  it('should lowercase and replace spaces', () => {
    expect(getStatCardTestId('Credits Available')).toBe('stat-card-credits-available');
  });
});

describe('testIds - drawer and form E2E helpers', () => {
  it('getDrawerPanelTestId prefixes panel id', () => {
    expect(getDrawerPanelTestId('field')).toBe('drawer-panel-field');
    expect(getDrawerPanelTestId('edit-api')).toBe('drawer-panel-edit-api');
  });

  it('getDetailFieldTestId slugifies labels', () => {
    expect(getDetailFieldTestId('Name')).toBe('detail-field-name');
    expect(getDetailFieldTestId('Parameter Types')).toBe('detail-field-parameter-types');
    expect(getDetailFieldTestId('Documentation')).toBe('detail-field-documentation');
  });

  it('getFormFieldErrorTestId pairs with FormField id', () => {
    expect(getFormFieldErrorTestId('fields-name')).toBe('field-error-fields-name');
    expect(getFormFieldErrorTestId('object-name')).toBe('field-error-object-name');
  });

  it('exposes stable string constants for Playwright', () => {
    expect(FIELD_TYPE_DROPDOWN_LIST).toBe('field-type-dropdown-list');
    expect(FIELD_CONSTRAINT_ROW).toBe('field-constraint-row');
    expect(OBJECT_MEMBER_SEARCH).toBe('object-member-search');
  });
});
