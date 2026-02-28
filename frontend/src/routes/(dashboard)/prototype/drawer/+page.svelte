<!--
  Prototype: Stacked Drawer Endpoint Creation Flow

  Throwaway prototype — hardcoded data, no real API calls, no stores.
  Demonstrates a "drawer on drawer" stacking UX for inline entity creation
  during endpoint configuration. Includes full validator and constraint support.
-->
<script lang="ts">
  import {
    PageHeader,
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    Pill,
    FormField,
    FormLabel
  } from '$lib/components';

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  type FieldValidatorTemplate = {
    id: string;
    name: string;
    mode: 'before' | 'after';
    description: string;
    compatibleTypes: string[];
    parameters: Array<{ name: string; type: 'text' | 'number'; required: boolean; placeholder: string }>;
  };

  type FieldConstraintDef = {
    id: string;
    name: string;
    parameterTypes: string[];
    compatibleTypes: string[];
  };

  type ModelValidatorTemplate = {
    id: string;
    name: string;
    mode: 'before' | 'after';
    description: string;
    fieldMappings: Array<{ label: string; required: boolean; compatibleTypes: string[] }>;
  };

  type AppliedValidator = {
    templateId: string;
    templateName: string;
    mode: 'before' | 'after';
    params: Record<string, string>;
  };

  type AppliedConstraint = {
    constraintId: string;
    name: string;
    value: string;
  };

  type AppliedModelValidator = {
    templateId: string;
    templateName: string;
    mode: 'before' | 'after';
    fieldMappings: Record<string, string>;
  };

  type ObjectField = {
    name: string;
    type: string;
    container: 'none' | 'list';
    optional: boolean;
    defaultValue: string;
    validators: AppliedValidator[];
    constraints: AppliedConstraint[];
  };

  // Gallery UI states
  type ValidatorGalleryState = 'closed' | 'browsing' | 'configuring';
  type ConstraintGalleryState = 'closed' | 'browsing';

  // ---------------------------------------------------------------------------
  // Dummy data — templates and constraints
  // ---------------------------------------------------------------------------

  const fieldValidatorTemplates: FieldValidatorTemplate[] = [
    { id: 'fv1', name: 'regex_match', mode: 'before', description: 'Validate field matches regex pattern', compatibleTypes: ['str', 'email'], parameters: [{ name: 'pattern', type: 'text', required: true, placeholder: 'e.g. ^[a-z]+$' }] },
    { id: 'fv2', name: 'min_length', mode: 'before', description: 'Ensure minimum string length', compatibleTypes: ['str'], parameters: [{ name: 'min_length', type: 'number', required: true, placeholder: '1' }] },
    { id: 'fv3', name: 'range_check', mode: 'before', description: 'Validate number is within range', compatibleTypes: ['int', 'float'], parameters: [{ name: 'min_value', type: 'number', required: false, placeholder: '0' }, { name: 'max_value', type: 'number', required: false, placeholder: '100' }] },
    { id: 'fv4', name: 'email_format', mode: 'before', description: 'Validate email format', compatibleTypes: ['str', 'email'], parameters: [] },
  ];

  const fieldConstraints: FieldConstraintDef[] = [
    { id: 'fc1', name: 'min_length', parameterTypes: ['int'], compatibleTypes: ['str'] },
    { id: 'fc2', name: 'max_length', parameterTypes: ['int'], compatibleTypes: ['str'] },
    { id: 'fc3', name: 'pattern', parameterTypes: ['str'], compatibleTypes: ['str'] },
    { id: 'fc4', name: 'minimum', parameterTypes: ['int', 'float'], compatibleTypes: ['int', 'float'] },
    { id: 'fc5', name: 'maximum', parameterTypes: ['int', 'float'], compatibleTypes: ['int', 'float'] },
  ];

  const modelValidatorTemplates: ModelValidatorTemplate[] = [
    { id: 'mv1', name: 'cross_field_check', mode: 'before', description: 'Validate relationship between two fields', fieldMappings: [{ label: 'field_a', required: true, compatibleTypes: ['str', 'int', 'float'] }, { label: 'field_b', required: true, compatibleTypes: ['str', 'int', 'float'] }] },
    { id: 'mv2', name: 'unique_fields', mode: 'before', description: 'Ensure field values are unique', fieldMappings: [{ label: 'target_field', required: true, compatibleTypes: ['str', 'int'] }] },
  ];

  // ---------------------------------------------------------------------------
  // Dummy data — existing entities
  // ---------------------------------------------------------------------------

  let existingFields = $state([
    { id: 'f1', name: 'order_id', type: 'str', namespace: 'orders', container: 'none' as const, validators: [] as AppliedValidator[], constraints: [] as AppliedConstraint[] },
    { id: 'f2', name: 'customer_id', type: 'str', namespace: 'orders', container: 'none' as const, validators: [] as AppliedValidator[], constraints: [] as AppliedConstraint[] },
    { id: 'f3', name: 'amount', type: 'float', namespace: 'orders', container: 'none' as const, validators: [{ templateId: 'fv3', templateName: 'range_check', mode: 'before' as const, params: { min_value: '0' } }], constraints: [{ constraintId: 'fc4', name: 'minimum', value: '0' }] },
    { id: 'f4', name: 'status', type: 'str', namespace: 'orders', container: 'none' as const, validators: [] as AppliedValidator[], constraints: [] as AppliedConstraint[] },
    { id: 'f5', name: 'created_at', type: 'datetime', namespace: 'orders', container: 'none' as const, validators: [] as AppliedValidator[], constraints: [] as AppliedConstraint[] },
    { id: 'f6', name: 'tags', type: 'str', namespace: 'orders', container: 'list' as const, validators: [] as AppliedValidator[], constraints: [] as AppliedConstraint[] },
  ]);

  let existingObjects = $state([
    { id: 'o1', name: 'OrderSummary', namespace: 'orders', fields: ['order_id', 'status', 'amount'] },
    { id: 'o2', name: 'CustomerInfo', namespace: 'orders', fields: ['customer_id'] }
  ]);

  const fieldTypes = ['str', 'int', 'float', 'bool', 'datetime', 'date', 'uuid', 'email'];
  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  const dummyEndpoints = [
    { method: 'GET', path: '/orders', description: 'List all orders' },
    { method: 'GET', path: '/orders/{id}', description: 'Get order by ID' }
  ];

  // ---------------------------------------------------------------------------
  // Main endpoint drawer state
  // ---------------------------------------------------------------------------

  let endpointDrawerOpen = $state(false);

  let endpointTag = $state('');
  let endpointDescription = $state('');
  let endpointMethod = $state('GET');
  let endpointPath = $state('');

  let pathParamSelections: Record<string, string> = $state({});

  let queryParamsObject = $state('');
  let requestBodyObject = $state('');
  let responseBodyObject = $state('');
  let responseUseEnvelope = $state(false);
  let responseShape: 'single' | 'list' = $state('single');

  let pathParams = $derived(
    [...endpointPath.matchAll(/\{(\w+)\}/g)].map(m => m[1])
  );

  let fieldSearches: Record<string, string> = $state({});
  let queryObjectSearch = $state('');
  let requestObjectSearch = $state('');
  let responseObjectSearch = $state('');

  let fieldDropdowns: Record<string, boolean> = $state({});
  let queryObjectDropdownOpen = $state(false);
  let requestObjectDropdownOpen = $state(false);
  let responseObjectDropdownOpen = $state(false);

  function resetEndpointForm() {
    endpointTag = '';
    endpointDescription = '';
    endpointMethod = 'GET';
    endpointPath = '';
    pathParamSelections = {};
    queryParamsObject = '';
    requestBodyObject = '';
    responseBodyObject = '';
    responseUseEnvelope = false;
    responseShape = 'single';
    fieldSearches = {};
    queryObjectSearch = '';
    requestObjectSearch = '';
    responseObjectSearch = '';
    fieldDropdowns = {};
    queryObjectDropdownOpen = false;
    requestObjectDropdownOpen = false;
    responseObjectDropdownOpen = false;
  }

  function openEndpointDrawer() {
    resetEndpointForm();
    endpointDrawerOpen = true;
  }

  function closeEndpointDrawer() {
    endpointDrawerOpen = false;
  }

  function filteredFields(search: string) {
    const q = search.toLowerCase();
    if (!q) return existingFields;
    return existingFields.filter(f => f.name.toLowerCase().includes(q));
  }

  function filteredObjects(search: string) {
    const q = search.toLowerCase();
    if (!q) return existingObjects;
    return existingObjects.filter(o => o.name.toLowerCase().includes(q));
  }

  function getFieldName(id: string) {
    return existingFields.find(f => f.id === id)?.name ?? '';
  }

  function getObjectName(id: string) {
    return existingObjects.find(o => o.id === id)?.name ?? '';
  }

  function closeAllDropdowns() {
    fieldDropdowns = {};
    queryObjectDropdownOpen = false;
    requestObjectDropdownOpen = false;
    responseObjectDropdownOpen = false;
  }

  // ---------------------------------------------------------------------------
  // Second (stacked) drawer state
  // ---------------------------------------------------------------------------

  type SecondDrawerMode = 'create-field' | 'create-object' | null;

  let secondDrawerMode: SecondDrawerMode = $state(null);
  let secondDrawerOpen = $derived(secondDrawerMode !== null);
  let secondDrawerOrigin = $state('');

  // -- Create Field form --
  let newFieldName = $state('');
  let newFieldType = $state('str');
  let newFieldContainer: 'none' | 'list' = $state('none');
  let newFieldDescription = $state('');
  let newFieldDefaultValue = $state('');
  let newFieldValidators: AppliedValidator[] = $state([]);
  let newFieldConstraints: AppliedConstraint[] = $state([]);

  // Field validator gallery state
  let fieldValGalleryState: ValidatorGalleryState = $state('closed');
  let fieldValGallerySearch = $state('');
  let fieldValSelectedTemplate: FieldValidatorTemplate | null = $state(null);
  let fieldValParamValues: Record<string, string> = $state({});

  // Field constraint state
  let fieldConstraintSearch = $state('');
  let fieldConstraintDropdownOpen = $state(false);

  let compatibleFieldValidators = $derived(
    fieldValidatorTemplates.filter(t => t.compatibleTypes.includes(newFieldType))
  );

  let filteredFieldValidators = $derived(() => {
    const q = fieldValGallerySearch.toLowerCase();
    if (!q) return compatibleFieldValidators;
    return compatibleFieldValidators.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  });

  let compatibleFieldConstraints = $derived(
    fieldConstraints.filter(c =>
      c.compatibleTypes.includes(newFieldType) &&
      !newFieldConstraints.some(ac => ac.constraintId === c.id)
    )
  );

  let filteredFieldConstraints = $derived(() => {
    const q = fieldConstraintSearch.toLowerCase();
    if (!q) return compatibleFieldConstraints;
    return compatibleFieldConstraints.filter(c => c.name.toLowerCase().includes(q));
  });

  let fieldValTemplateReady = $derived(() => {
    if (!fieldValSelectedTemplate) return false;
    return fieldValSelectedTemplate.parameters
      .filter(p => p.required)
      .every(p => (fieldValParamValues[p.name] ?? '').trim() !== '');
  });

  function resetFieldForm() {
    newFieldName = '';
    newFieldType = 'str';
    newFieldContainer = 'none';
    newFieldDescription = '';
    newFieldDefaultValue = '';
    newFieldValidators = [];
    newFieldConstraints = [];
    fieldValGalleryState = 'closed';
    fieldValGallerySearch = '';
    fieldValSelectedTemplate = null;
    fieldValParamValues = {};
    fieldConstraintSearch = '';
    fieldConstraintDropdownOpen = false;
  }

  function openCreateField(origin: string) {
    resetFieldForm();
    secondDrawerOrigin = origin;
    secondDrawerMode = 'create-field';
    closeAllDropdowns();
  }

  function addFieldValidator() {
    if (!fieldValSelectedTemplate) return;
    newFieldValidators = [...newFieldValidators, {
      templateId: fieldValSelectedTemplate.id,
      templateName: fieldValSelectedTemplate.name,
      mode: fieldValSelectedTemplate.mode,
      params: { ...fieldValParamValues }
    }];
    fieldValSelectedTemplate = null;
    fieldValParamValues = {};
    fieldValGalleryState = 'closed';
  }

  function removeFieldValidator(index: number) {
    newFieldValidators = newFieldValidators.filter((_, i) => i !== index);
  }

  function addFieldConstraint(constraint: FieldConstraintDef) {
    newFieldConstraints = [...newFieldConstraints, {
      constraintId: constraint.id,
      name: constraint.name,
      value: ''
    }];
    fieldConstraintDropdownOpen = false;
    fieldConstraintSearch = '';
  }

  function removeFieldConstraint(index: number) {
    newFieldConstraints = newFieldConstraints.filter((_, i) => i !== index);
  }

  function updateConstraintValue(index: number, value: string) {
    newFieldConstraints = newFieldConstraints.map((c, i) =>
      i === index ? { ...c, value } : c
    );
  }

  function createField() {
    if (!newFieldName.trim()) return;
    const id = `f${Date.now()}`;
    existingFields = [...existingFields, {
      id,
      name: newFieldName.trim(),
      type: newFieldType,
      namespace: 'orders',
      container: newFieldContainer,
      validators: [...newFieldValidators],
      constraints: [...newFieldConstraints]
    }];
    if (secondDrawerOrigin.startsWith('pathParam:')) {
      const paramName = secondDrawerOrigin.replace('pathParam:', '');
      pathParamSelections[paramName] = id;
    }
    secondDrawerMode = null;
  }

  // -- Create Object form --
  let newObjectName = $state('');
  let newObjectDescription = $state('');
  let newObjectFields: ObjectField[] = $state([]);
  let addingFieldToObject = $state(false);

  // Inline field form state (inside object drawer)
  let inlineFieldName = $state('');
  let inlineFieldType = $state('str');
  let inlineFieldContainer: 'none' | 'list' = $state('none');
  let inlineFieldDescription = $state('');
  let inlineFieldDefaultValue = $state('');
  let inlineFieldValidators: AppliedValidator[] = $state([]);
  let inlineFieldConstraints: AppliedConstraint[] = $state([]);

  // Inline field validator gallery
  let inlineValGalleryState: ValidatorGalleryState = $state('closed');
  let inlineValGallerySearch = $state('');
  let inlineValSelectedTemplate: FieldValidatorTemplate | null = $state(null);
  let inlineValParamValues: Record<string, string> = $state({});

  // Inline field constraint
  let inlineConstraintSearch = $state('');
  let inlineConstraintDropdownOpen = $state(false);

  let compatibleInlineValidators = $derived(
    fieldValidatorTemplates.filter(t => t.compatibleTypes.includes(inlineFieldType))
  );

  let filteredInlineValidators = $derived(() => {
    const q = inlineValGallerySearch.toLowerCase();
    if (!q) return compatibleInlineValidators;
    return compatibleInlineValidators.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  });

  let compatibleInlineConstraints = $derived(
    fieldConstraints.filter(c =>
      c.compatibleTypes.includes(inlineFieldType) &&
      !inlineFieldConstraints.some(ac => ac.constraintId === c.id)
    )
  );

  let filteredInlineConstraints = $derived(() => {
    const q = inlineConstraintSearch.toLowerCase();
    if (!q) return compatibleInlineConstraints;
    return compatibleInlineConstraints.filter(c => c.name.toLowerCase().includes(q));
  });

  let inlineValTemplateReady = $derived(() => {
    if (!inlineValSelectedTemplate) return false;
    return inlineValSelectedTemplate.parameters
      .filter(p => p.required)
      .every(p => (inlineValParamValues[p.name] ?? '').trim() !== '');
  });

  // Model validators state
  let objectModelValidators: AppliedModelValidator[] = $state([]);
  let modelValGalleryState: ValidatorGalleryState = $state('closed');
  let modelValGallerySearch = $state('');
  let modelValSelectedTemplate: ModelValidatorTemplate | null = $state(null);
  let modelValFieldMappings: Record<string, string> = $state({});

  let filteredModelValidators = $derived(() => {
    const q = modelValGallerySearch.toLowerCase();
    if (!q) return modelValidatorTemplates;
    return modelValidatorTemplates.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  });

  let modelValTemplateReady = $derived(() => {
    if (!modelValSelectedTemplate) return false;
    return modelValSelectedTemplate.fieldMappings
      .filter(m => m.required)
      .every(m => (modelValFieldMappings[m.label] ?? '').trim() !== '');
  });

  // Fields available for model validator field mappings (from the object being created)
  function objectFieldsForMapping(compatibleTypes: string[]) {
    return newObjectFields.filter(f => compatibleTypes.includes(f.type));
  }

  function resetInlineFieldForm() {
    inlineFieldName = '';
    inlineFieldType = 'str';
    inlineFieldContainer = 'none';
    inlineFieldDescription = '';
    inlineFieldDefaultValue = '';
    inlineFieldValidators = [];
    inlineFieldConstraints = [];
    inlineValGalleryState = 'closed';
    inlineValGallerySearch = '';
    inlineValSelectedTemplate = null;
    inlineValParamValues = {};
    inlineConstraintSearch = '';
    inlineConstraintDropdownOpen = false;
  }

  function resetObjectForm() {
    newObjectName = '';
    newObjectDescription = '';
    newObjectFields = [];
    addingFieldToObject = false;
    resetInlineFieldForm();
    objectModelValidators = [];
    modelValGalleryState = 'closed';
    modelValGallerySearch = '';
    modelValSelectedTemplate = null;
    modelValFieldMappings = {};
  }

  function openCreateObject(origin: string) {
    resetObjectForm();
    secondDrawerOrigin = origin;
    secondDrawerMode = 'create-object';
    closeAllDropdowns();
  }

  function addInlineFieldValidator() {
    if (!inlineValSelectedTemplate) return;
    inlineFieldValidators = [...inlineFieldValidators, {
      templateId: inlineValSelectedTemplate.id,
      templateName: inlineValSelectedTemplate.name,
      mode: inlineValSelectedTemplate.mode,
      params: { ...inlineValParamValues }
    }];
    inlineValSelectedTemplate = null;
    inlineValParamValues = {};
    inlineValGalleryState = 'closed';
  }

  function removeInlineFieldValidator(index: number) {
    inlineFieldValidators = inlineFieldValidators.filter((_, i) => i !== index);
  }

  function addInlineFieldConstraint(constraint: FieldConstraintDef) {
    inlineFieldConstraints = [...inlineFieldConstraints, {
      constraintId: constraint.id,
      name: constraint.name,
      value: ''
    }];
    inlineConstraintDropdownOpen = false;
    inlineConstraintSearch = '';
  }

  function removeInlineFieldConstraint(index: number) {
    inlineFieldConstraints = inlineFieldConstraints.filter((_, i) => i !== index);
  }

  function updateInlineConstraintValue(index: number, value: string) {
    inlineFieldConstraints = inlineFieldConstraints.map((c, i) =>
      i === index ? { ...c, value } : c
    );
  }

  function addFieldToObject() {
    if (!inlineFieldName.trim()) return;
    newObjectFields = [...newObjectFields, {
      name: inlineFieldName.trim(),
      type: inlineFieldType,
      container: inlineFieldContainer,
      optional: false,
      defaultValue: inlineFieldDefaultValue,
      validators: [...inlineFieldValidators],
      constraints: [...inlineFieldConstraints]
    }];
    resetInlineFieldForm();
    addingFieldToObject = false;
  }

  function removeFieldFromObject(index: number) {
    newObjectFields = newObjectFields.filter((_, i) => i !== index);
  }

  function toggleFieldOptional(index: number) {
    newObjectFields = newObjectFields.map((f, i) =>
      i === index ? { ...f, optional: !f.optional } : f
    );
  }

  function addModelValidator() {
    if (!modelValSelectedTemplate) return;
    objectModelValidators = [...objectModelValidators, {
      templateId: modelValSelectedTemplate.id,
      templateName: modelValSelectedTemplate.name,
      mode: modelValSelectedTemplate.mode,
      fieldMappings: { ...modelValFieldMappings }
    }];
    modelValSelectedTemplate = null;
    modelValFieldMappings = {};
    modelValGalleryState = 'closed';
  }

  function removeModelValidator(index: number) {
    objectModelValidators = objectModelValidators.filter((_, i) => i !== index);
  }

  function createObject() {
    if (!newObjectName.trim()) return;
    const id = `o${Date.now()}`;
    existingObjects = [...existingObjects, {
      id,
      name: newObjectName.trim(),
      namespace: 'orders',
      fields: newObjectFields.map(f => f.name)
    }];
    if (secondDrawerOrigin === 'queryParams') queryParamsObject = id;
    if (secondDrawerOrigin === 'requestBody') requestBodyObject = id;
    if (secondDrawerOrigin === 'responseBody') responseBodyObject = id;
    secondDrawerMode = null;
  }

  function closeSecondDrawer() {
    secondDrawerMode = null;
  }

  // Constraint parameter type helper
  function constraintParamInputType(constraintName: string): string {
    const def = fieldConstraints.find(c => c.name === constraintName);
    if (!def) return 'text';
    return def.parameterTypes.includes('str') ? 'text' : 'number';
  }

  function constraintParamBadge(constraintName: string): string {
    const def = fieldConstraints.find(c => c.name === constraintName);
    if (!def) return 'str';
    return def.parameterTypes.join(' | ');
  }

  // Method color helper
  function methodColor(method: string): string {
    switch (method) {
      case 'GET': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'POST': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'PUT': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'PATCH': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'DELETE': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-mono-700 bg-mono-50 border-mono-200';
    }
  }
</script>

<!-- Page content -->
<PageHeader title="Orders API">
  {#snippet actions()}
    <button
      class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer text-sm"
      onclick={openEndpointDrawer}
    >
      <i class="fa-solid fa-plus mr-2"></i>Add Endpoint
    </button>
  {/snippet}
</PageHeader>

<div class="p-6">
  <div class="mb-4">
    <a href="/apis" class="text-sm text-mono-500 hover:text-mono-700 transition-colors">
      <i class="fa-solid fa-arrow-left mr-1"></i> Back to APIs
    </a>
  </div>

  <div class="mb-8">
    <div class="flex items-center gap-3 mb-2">
      <h2 class="text-2xl font-semibold text-mono-900">Orders API</h2>
      <Pill>v1.0</Pill>
    </div>
    <p class="text-sm text-mono-500">Order management endpoints</p>
  </div>

  <div>
    <h3 class="text-sm font-medium text-mono-700 mb-3">Endpoints</h3>
    <div class="space-y-2">
      {#each dummyEndpoints as ep}
        <div class="flex items-center gap-3 p-3 bg-white border border-mono-200 rounded-md">
          <span class="px-2 py-0.5 text-xs font-mono font-medium rounded border {methodColor(ep.method)}">
            {ep.method}
          </span>
          <span class="text-sm font-mono text-mono-800">{ep.path}</span>
          <span class="text-sm text-mono-500">{ep.description}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- ========================================================================= -->
<!-- MAIN ENDPOINT DRAWER (Layer 1)                                            -->
<!-- ========================================================================= -->
<Drawer open={endpointDrawerOpen} maxWidth={1200}>
  <DrawerHeader title="Add Endpoint" onClose={closeEndpointDrawer} />
  <DrawerContent>
    <div class="space-y-8">

      <!-- Section: Basic Info -->
      <section>
        <h3 class="text-sm font-semibold text-mono-800 mb-4 pb-2 border-b border-mono-200">
          Basic Info
        </h3>
        <div class="space-y-4">
          <div class="flex gap-4">
            <div class="w-56">
              <FormField label="Tag" bind:value={endpointTag} placeholder="e.g. orders" />
            </div>
            <div class="flex-1">
              <FormField label="Description" bind:value={endpointDescription} placeholder="What does this endpoint do?" />
            </div>
          </div>

          <div class="flex gap-4">
            <div class="w-32">
              <FormLabel label="Method" />
              <select
                bind:value={endpointMethod}
                class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
              >
                {#each httpMethods as method}
                  <option value={method}>{method}</option>
                {/each}
              </select>
            </div>
            <div class="flex-1">
              <FormLabel label="Path" required />
              <div class="flex items-center">
                <span class="px-3 py-1.5 text-sm bg-mono-100 border border-r-0 border-mono-300 rounded-l-md text-mono-500 font-mono">/</span>
                <input
                  type="text"
                  bind:value={endpointPath}
                  placeholder={'orders/{id}'}
                  class="flex-1 px-3 py-1.5 text-sm font-mono border border-mono-300 rounded-r-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Path Parameters (auto-detected) -->
      {#if pathParams.length > 0}
        <section>
          <h3 class="text-sm font-semibold text-mono-800 mb-4 pb-2 border-b border-mono-200">
            Path Parameters
            <span class="ml-2 text-xs font-normal text-mono-500">Auto-detected from path</span>
          </h3>
          <div class="space-y-3">
            {#each pathParams as param}
              <div class="flex items-end gap-4">
                <div class="w-40">
                  <FormLabel label="Parameter" />
                  <div class="px-3 py-1.5 text-sm font-mono bg-mono-50 border border-mono-200 rounded-md text-mono-700">
                    {`{${param}}`}
                  </div>
                </div>
                <div class="flex-1 relative">
                  <FormLabel label="Mapped Field" />
                  <div class="relative">
                    <input
                      type="text"
                      placeholder="Search or select field..."
                      value={fieldDropdowns[param] ? (fieldSearches[param] ?? '') : getFieldName(pathParamSelections[param] ?? '')}
                      oninput={(e) => {
                        fieldSearches[param] = (e.target as HTMLInputElement).value;
                        fieldDropdowns[param] = true;
                      }}
                      onfocus={() => { fieldDropdowns[param] = true; }}
                      class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                    />
                    {#if pathParamSelections[param] && !fieldDropdowns[param]}
                      <button
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-mono-400 hover:text-mono-600"
                        onclick={() => { pathParamSelections[param] = ''; }}
                        aria-label="Clear field selection"
                      >
                        <i class="fa-solid fa-xmark text-xs"></i>
                      </button>
                    {/if}
                  </div>
                  {#if fieldDropdowns[param]}
                    <div class="absolute z-10 mt-1 w-full bg-white border border-mono-200 rounded-md shadow-lg max-h-48 overflow-auto">
                      {#each filteredFields(fieldSearches[param] ?? '') as field}
                        <button
                          class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 flex items-center justify-between cursor-pointer"
                          onclick={() => {
                            pathParamSelections[param] = field.id;
                            fieldDropdowns[param] = false;
                            fieldSearches[param] = '';
                          }}
                        >
                          <span class="text-mono-800">{field.name}</span>
                          <div class="flex items-center gap-1">
                            {#if field.container === 'list'}
                              <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">List</span>
                            {/if}
                            <Pill size="sm">{field.type}</Pill>
                          </div>
                        </button>
                      {/each}
                      <button
                        class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-100 cursor-pointer"
                        onclick={() => openCreateField(`pathParam:${param}`)}
                      >
                        <i class="fa-solid fa-plus mr-2 text-mono-400"></i>Create new field
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Section: Query Parameters -->
      <section>
        <h3 class="text-sm font-semibold text-mono-800 mb-4 pb-2 border-b border-mono-200">
          Query Parameters
        </h3>
        <div class="relative">
          <FormLabel label="Query Parameters Object" />
          <div class="relative">
            <input
              type="text"
              placeholder="Search or select object..."
              value={queryObjectDropdownOpen ? queryObjectSearch : getObjectName(queryParamsObject)}
              oninput={(e) => {
                queryObjectSearch = (e.target as HTMLInputElement).value;
                queryObjectDropdownOpen = true;
              }}
              onfocus={() => { queryObjectDropdownOpen = true; }}
              class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
            />
            {#if queryParamsObject && !queryObjectDropdownOpen}
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 text-mono-400 hover:text-mono-600"
                onclick={() => { queryParamsObject = ''; }}
                aria-label="Clear object selection"
              >
                <i class="fa-solid fa-xmark text-xs"></i>
              </button>
            {/if}
          </div>
          {#if queryObjectDropdownOpen}
            <div class="absolute z-10 mt-1 w-full bg-white border border-mono-200 rounded-md shadow-lg max-h-48 overflow-auto">
              {#each filteredObjects(queryObjectSearch) as obj}
                <button
                  class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 flex items-center justify-between cursor-pointer"
                  onclick={() => {
                    queryParamsObject = obj.id;
                    queryObjectDropdownOpen = false;
                    queryObjectSearch = '';
                  }}
                >
                  <span class="text-mono-800">{obj.name}</span>
                  <span class="text-xs text-mono-400">{obj.fields.length} fields</span>
                </button>
              {/each}
              <button
                class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-100 cursor-pointer"
                onclick={() => openCreateObject('queryParams')}
              >
                <i class="fa-solid fa-plus mr-2 text-mono-400"></i>Create new object
              </button>
            </div>
          {/if}
        </div>
      </section>

      <!-- Section: Request Body -->
      <section>
        <h3 class="text-sm font-semibold text-mono-800 mb-4 pb-2 border-b border-mono-200">
          Request Body
        </h3>
        <div class="relative">
          <FormLabel label="Request Body Object" />
          <div class="relative">
            <input
              type="text"
              placeholder="Search or select object..."
              value={requestObjectDropdownOpen ? requestObjectSearch : getObjectName(requestBodyObject)}
              oninput={(e) => {
                requestObjectSearch = (e.target as HTMLInputElement).value;
                requestObjectDropdownOpen = true;
              }}
              onfocus={() => { requestObjectDropdownOpen = true; }}
              class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
            />
            {#if requestBodyObject && !requestObjectDropdownOpen}
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 text-mono-400 hover:text-mono-600"
                onclick={() => { requestBodyObject = ''; }}
                aria-label="Clear object selection"
              >
                <i class="fa-solid fa-xmark text-xs"></i>
              </button>
            {/if}
          </div>
          {#if requestObjectDropdownOpen}
            <div class="absolute z-10 mt-1 w-full bg-white border border-mono-200 rounded-md shadow-lg max-h-48 overflow-auto">
              {#each filteredObjects(requestObjectSearch) as obj}
                <button
                  class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 flex items-center justify-between cursor-pointer"
                  onclick={() => {
                    requestBodyObject = obj.id;
                    requestObjectDropdownOpen = false;
                    requestObjectSearch = '';
                  }}
                >
                  <span class="text-mono-800">{obj.name}</span>
                  <span class="text-xs text-mono-400">{obj.fields.length} fields</span>
                </button>
              {/each}
              <button
                class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-100 cursor-pointer"
                onclick={() => openCreateObject('requestBody')}
              >
                <i class="fa-solid fa-plus mr-2 text-mono-400"></i>Create new object
              </button>
            </div>
          {/if}
        </div>
      </section>

      <!-- Section: Response Body -->
      <section>
        <h3 class="text-sm font-semibold text-mono-800 mb-4 pb-2 border-b border-mono-200">
          Response Body
        </h3>
        <div class="space-y-4">
          <div class="relative">
            <FormLabel label="Response Object" />
            <div class="relative">
              <input
                type="text"
                placeholder="Search or select object..."
                value={responseObjectDropdownOpen ? responseObjectSearch : getObjectName(responseBodyObject)}
                oninput={(e) => {
                  responseObjectSearch = (e.target as HTMLInputElement).value;
                  responseObjectDropdownOpen = true;
                }}
                onfocus={() => { responseObjectDropdownOpen = true; }}
                class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
              />
              {#if responseBodyObject && !responseObjectDropdownOpen}
                <button
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-mono-400 hover:text-mono-600"
                  onclick={() => { responseBodyObject = ''; }}
                  aria-label="Clear object selection"
                >
                  <i class="fa-solid fa-xmark text-xs"></i>
                </button>
              {/if}
            </div>
            {#if responseObjectDropdownOpen}
              <div class="absolute z-10 mt-1 w-full bg-white border border-mono-200 rounded-md shadow-lg max-h-48 overflow-auto">
                {#each filteredObjects(responseObjectSearch) as obj}
                  <button
                    class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 flex items-center justify-between cursor-pointer"
                    onclick={() => {
                      responseBodyObject = obj.id;
                      responseObjectDropdownOpen = false;
                      responseObjectSearch = '';
                    }}
                  >
                    <span class="text-mono-800">{obj.name}</span>
                    <span class="text-xs text-mono-400">{obj.fields.length} fields</span>
                  </button>
                {/each}
                <button
                  class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-100 cursor-pointer"
                  onclick={() => openCreateObject('responseBody')}
                >
                  <i class="fa-solid fa-plus mr-2 text-mono-400"></i>Create new object
                </button>
              </div>
            {/if}
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={responseUseEnvelope}
              class="rounded border-mono-300 text-mono-900 focus:ring-mono-400"
            />
            <span class="text-sm text-mono-700">Use envelope</span>
          </label>

          <div>
            <FormLabel label="Response Shape" />
            <div class="flex gap-4 mt-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="responseShape"
                  value="single"
                  bind:group={responseShape}
                  class="text-mono-900 focus:ring-mono-400"
                />
                <span class="text-sm text-mono-700">Single Object</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="responseShape"
                  value="list"
                  bind:group={responseShape}
                  class="text-mono-900 focus:ring-mono-400"
                />
                <span class="text-sm text-mono-700">List</span>
              </label>
            </div>
          </div>
        </div>
      </section>

    </div>
  </DrawerContent>
  <DrawerFooter>
    <div class="flex justify-end gap-3">
      <button
        class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer text-sm"
        onclick={closeEndpointDrawer}
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer text-sm"
        onclick={closeEndpointDrawer}
      >
        Create
      </button>
    </div>
  </DrawerFooter>
</Drawer>

<!-- ========================================================================= -->
<!-- STACKED DRAWER (Layer 2) -- Create Field or Create Object                 -->
<!-- ========================================================================= -->
{#if secondDrawerOpen}
  <!-- Overlay between the two drawers -->
  <button
    class="fixed inset-0 z-[55] bg-black/20 cursor-default"
    onclick={closeSecondDrawer}
    aria-label="Close drawer overlay"
  ></button>

  <div class="fixed inset-0 z-[60] pointer-events-none">
    <div class="pointer-events-auto h-full">

      {#if secondDrawerMode === 'create-field'}
        <!-- ================================================================= -->
        <!-- CREATE FIELD DRAWER                                                -->
        <!-- ================================================================= -->
        <Drawer open={true} maxWidth={600}>
          <DrawerHeader title="Create Field" onClose={closeSecondDrawer} />
          <DrawerContent>
            <div class="space-y-4">
              <!-- Field Name -->
              <FormField label="Field Name" bind:value={newFieldName} required placeholder="e.g. order_id" />

              <!-- Container toggle + Type selector -->
              <div class="flex gap-4 items-end">
                <div>
                  <FormLabel label="Container" />
                  <div class="flex rounded-md overflow-hidden border border-mono-300">
                    <button
                      class="px-3 py-1.5 text-sm cursor-pointer transition-colors {newFieldContainer === 'none' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}"
                      onclick={() => { newFieldContainer = 'none'; }}
                    >
                      None
                    </button>
                    <button
                      class="px-3 py-1.5 text-sm cursor-pointer transition-colors border-l {newFieldContainer === 'list' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}"
                      onclick={() => { newFieldContainer = 'list'; }}
                    >
                      List
                    </button>
                  </div>
                </div>
                <div class="flex-1">
                  <FormLabel label="Type" required />
                  <select
                    bind:value={newFieldType}
                    class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                  >
                    {#each fieldTypes as ft}
                      <option value={ft}>{ft}</option>
                    {/each}
                  </select>
                </div>
              </div>

              <!-- Description -->
              <div>
                <FormLabel label="Description" />
                <textarea
                  bind:value={newFieldDescription}
                  placeholder="Describe this field..."
                  rows="3"
                  class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent resize-none"
                ></textarea>
              </div>

              <!-- Default Value -->
              <FormField label="Default Value" bind:value={newFieldDefaultValue} placeholder="Optional default value" />

              <!-- ----------------------------------------------------------- -->
              <!-- Validators Section                                           -->
              <!-- ----------------------------------------------------------- -->
              <div>
                <h4 class="text-sm font-medium text-mono-700 mb-2">
                  Validators ({newFieldValidators.length})
                </h4>

                <!-- Applied validators list -->
                {#if newFieldValidators.length > 0}
                  <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-2 mb-3">
                    {#each newFieldValidators as v, i}
                      <div class="flex items-center justify-between px-2 py-1.5 bg-white rounded border border-mono-200">
                        <div class="flex items-center gap-2">
                          <span class="font-mono text-sm text-mono-700">{v.templateName}</span>
                          <Pill size="sm">{v.mode}</Pill>
                        </div>
                        <button
                          class="text-red-400 hover:text-red-600 cursor-pointer"
                          onclick={() => removeFieldValidator(i)}
                          aria-label="Remove validator"
                        >
                          <i class="fa-solid fa-xmark text-xs"></i>
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}

                <!-- Validator gallery -->
                {#if fieldValGalleryState === 'closed'}
                  <button
                    class="w-full py-3 border-2 border-dashed border-mono-300 rounded-md text-sm text-mono-500 hover:border-mono-400 hover:text-mono-700 cursor-pointer transition-colors"
                    onclick={() => { fieldValGalleryState = 'browsing'; fieldValGallerySearch = ''; }}
                  >
                    <i class="fa-solid fa-plus mr-2"></i>Add Validator
                  </button>
                {:else if fieldValGalleryState === 'browsing'}
                  <div class="p-3 bg-mono-50 rounded border border-mono-200">
                    <input
                      type="text"
                      bind:value={fieldValGallerySearch}
                      placeholder="Search validators..."
                      class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent mb-2"
                    />
                    <div class="max-h-64 overflow-auto space-y-1">
                      {#each filteredFieldValidators() as template}
                        <button
                          class="w-full text-left p-2 rounded hover:bg-white border border-transparent hover:border-mono-200 cursor-pointer transition-colors"
                          onclick={() => {
                            fieldValSelectedTemplate = template;
                            fieldValParamValues = {};
                            fieldValGalleryState = 'configuring';
                          }}
                        >
                          <div class="flex items-center justify-between mb-0.5">
                            <span class="text-sm text-mono-900 font-medium">{template.name}</span>
                            <Pill size="sm">{template.mode}</Pill>
                          </div>
                          <p class="text-xs text-mono-500 mb-1">{template.description}</p>
                          <div class="flex gap-1 flex-wrap">
                            {#each template.compatibleTypes as ct}
                              <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-200 text-mono-600">{ct}</span>
                            {/each}
                          </div>
                        </button>
                      {:else}
                        <p class="text-xs text-mono-400 text-center py-2">No compatible validators for type "{newFieldType}"</p>
                      {/each}
                    </div>
                    <button
                      class="mt-2 text-xs text-mono-500 hover:text-mono-700 cursor-pointer"
                      onclick={() => { fieldValGalleryState = 'closed'; }}
                    >
                      Cancel
                    </button>
                  </div>
                {:else if fieldValGalleryState === 'configuring' && fieldValSelectedTemplate}
                  <div class="p-3 bg-mono-50 rounded border border-mono-200">
                    <div class="flex items-center gap-2 mb-3">
                      <button
                        class="text-mono-500 hover:text-mono-700 cursor-pointer"
                        onclick={() => { fieldValGalleryState = 'browsing'; fieldValSelectedTemplate = null; fieldValParamValues = {}; }}
                        aria-label="Back to gallery"
                      >
                        <i class="fa-solid fa-arrow-left text-sm"></i>
                      </button>
                      <span class="text-sm font-medium text-mono-900">{fieldValSelectedTemplate.name}</span>
                      <Pill size="sm">{fieldValSelectedTemplate.mode}</Pill>
                    </div>
                    <p class="text-xs text-mono-500 mb-3">{fieldValSelectedTemplate.description}</p>

                    {#if fieldValSelectedTemplate.parameters.length > 0}
                      <div class="space-y-2 mb-3">
                        {#each fieldValSelectedTemplate.parameters as param}
                          <div>
                            <FormLabel label="{param.name}{param.required ? ' *' : ''}" />
                            <input
                              type={param.type === 'number' ? 'number' : 'text'}
                              placeholder={param.placeholder}
                              value={fieldValParamValues[param.name] ?? ''}
                              oninput={(e) => { fieldValParamValues[param.name] = (e.target as HTMLInputElement).value; }}
                              class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                            />
                          </div>
                        {/each}
                      </div>
                    {/if}

                    <div class="flex justify-end gap-2">
                      <button
                        class="px-3 py-1.5 text-xs border border-mono-300 text-mono-700 rounded-md hover:bg-white cursor-pointer"
                        onclick={() => { fieldValGalleryState = 'closed'; fieldValSelectedTemplate = null; fieldValParamValues = {}; }}
                      >
                        Cancel
                      </button>
                      <button
                        class="px-3 py-1.5 text-xs bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        onclick={addFieldValidator}
                        disabled={!fieldValTemplateReady()}
                      >
                        Add Validator
                      </button>
                    </div>
                  </div>
                {/if}
              </div>

              <!-- ----------------------------------------------------------- -->
              <!-- Field Constraints Section                                    -->
              <!-- ----------------------------------------------------------- -->
              <div>
                <h4 class="text-sm font-medium text-mono-700 mb-2">
                  Field Constraints ({newFieldConstraints.length})
                </h4>

                <!-- Applied constraints -->
                {#if newFieldConstraints.length > 0}
                  <div class="space-y-2 mb-3">
                    {#each newFieldConstraints as c, i}
                      <div class="flex items-center gap-2 px-3 py-2 bg-mono-50 border border-mono-200 rounded-md">
                        <span class="font-mono text-sm text-mono-700 shrink-0">{c.name}</span>
                        <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded shrink-0">{constraintParamBadge(c.name)}</span>
                        <input
                          type={constraintParamInputType(c.name)}
                          value={c.value}
                          oninput={(e) => updateConstraintValue(i, (e.target as HTMLInputElement).value)}
                          placeholder="Value"
                          class="flex-1 px-2 py-1 text-sm border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                        />
                        <button
                          class="text-red-400 hover:text-red-600 cursor-pointer shrink-0"
                          onclick={() => removeFieldConstraint(i)}
                          aria-label="Remove constraint"
                        >
                          <i class="fa-solid fa-xmark text-xs"></i>
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}

                <!-- Constraint dropdown -->
                <div class="relative">
                  <input
                    type="text"
                    placeholder="Search and add constraint..."
                    bind:value={fieldConstraintSearch}
                    onfocus={() => { fieldConstraintDropdownOpen = true; }}
                    class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                  />
                  {#if fieldConstraintDropdownOpen}
                    <div class="absolute z-10 mt-1 w-full bg-white border border-mono-200 rounded-md shadow-lg max-h-48 overflow-auto">
                      {#each filteredFieldConstraints() as constraint}
                        <button
                          class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 flex items-center justify-between cursor-pointer"
                          onclick={() => addFieldConstraint(constraint)}
                        >
                          <span class="font-mono text-mono-700">{constraint.name}</span>
                          <span class="text-xs text-mono-400">{constraint.parameterTypes.join(', ')}</span>
                        </button>
                      {:else}
                        <p class="px-3 py-2 text-xs text-mono-400">No compatible constraints available</p>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </DrawerContent>
          <DrawerFooter>
            <div class="flex justify-end gap-3">
              <button
                class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer text-sm"
                onclick={closeSecondDrawer}
              >
                Cancel
              </button>
              <button
                class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onclick={createField}
                disabled={!newFieldName.trim()}
              >
                Create Field
              </button>
            </div>
          </DrawerFooter>
        </Drawer>

      {:else if secondDrawerMode === 'create-object'}
        <!-- ================================================================= -->
        <!-- CREATE OBJECT DRAWER                                               -->
        <!-- ================================================================= -->
        <Drawer open={true} maxWidth={600}>
          <DrawerHeader title="Create Object" onClose={closeSecondDrawer} />
          <DrawerContent>
            <div class="space-y-4">
              <FormField label="Object Name" bind:value={newObjectName} required placeholder="e.g. OrderRequest" />

              <div>
                <FormLabel label="Description" />
                <textarea
                  bind:value={newObjectDescription}
                  placeholder="Describe this object..."
                  rows="3"
                  class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent resize-none"
                ></textarea>
              </div>

              <!-- ------------------------------------------------------------- -->
              <!-- Fields section                                                 -->
              <!-- ------------------------------------------------------------- -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-sm font-medium text-mono-700">Fields ({newObjectFields.length})</h4>
                  {#if !addingFieldToObject}
                    <button
                      class="text-xs text-mono-600 hover:text-mono-800 cursor-pointer"
                      onclick={() => { addingFieldToObject = true; resetInlineFieldForm(); }}
                    >
                      <i class="fa-solid fa-plus mr-1"></i>Add Field
                    </button>
                  {/if}
                </div>

                <!-- Existing fields list -->
                {#if newObjectFields.length > 0}
                  <div class="space-y-1 mb-3">
                    {#each newObjectFields as field, i}
                      <div class="flex items-center justify-between px-3 py-2 bg-mono-50 border border-mono-200 rounded-md">
                        <div class="flex items-center gap-2">
                          <span class="font-mono text-sm text-mono-700">{field.name}</span>
                          <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">{field.type}</span>
                          {#if field.container === 'list'}
                            <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">List</span>
                          {/if}
                        </div>
                        <div class="flex items-center gap-3">
                          <label class="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.optional}
                              onchange={() => toggleFieldOptional(i)}
                              class="rounded border-mono-300 text-mono-900 focus:ring-mono-400"
                            />
                            <span class="text-sm text-mono-600">Optional</span>
                          </label>
                          <button
                            class="text-red-400 hover:text-red-600 cursor-pointer"
                            onclick={() => removeFieldFromObject(i)}
                            aria-label="Remove field"
                          >
                            <i class="fa-solid fa-xmark text-xs"></i>
                          </button>
                        </div>
                      </div>
                    {/each}
                  </div>
                {:else if !addingFieldToObject}
                  <p class="text-xs text-mono-400 mb-3">No fields added yet.</p>
                {/if}

                <!-- Inline add field form (full field creation) -->
                {#if addingFieldToObject}
                  <div class="p-3 border border-mono-200 rounded-md bg-mono-50 space-y-3">
                    <!-- Field Name -->
                    <FormField label="Field Name" bind:value={inlineFieldName} required placeholder="e.g. email" />

                    <!-- Container toggle + Type selector -->
                    <div class="flex gap-3 items-end">
                      <div>
                        <FormLabel label="Container" />
                        <div class="flex rounded-md overflow-hidden border border-mono-300">
                          <button
                            class="px-3 py-1.5 text-sm cursor-pointer transition-colors {inlineFieldContainer === 'none' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}"
                            onclick={() => { inlineFieldContainer = 'none'; }}
                          >
                            None
                          </button>
                          <button
                            class="px-3 py-1.5 text-sm cursor-pointer transition-colors border-l {inlineFieldContainer === 'list' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}"
                            onclick={() => { inlineFieldContainer = 'list'; }}
                          >
                            List
                          </button>
                        </div>
                      </div>
                      <div class="flex-1">
                        <FormLabel label="Type" required />
                        <select
                          bind:value={inlineFieldType}
                          class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                        >
                          {#each fieldTypes as ft}
                            <option value={ft}>{ft}</option>
                          {/each}
                        </select>
                      </div>
                    </div>

                    <!-- Description -->
                    <div>
                      <FormLabel label="Description" />
                      <input
                        type="text"
                        bind:value={inlineFieldDescription}
                        placeholder="Optional description"
                        class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                      />
                    </div>

                    <!-- Default Value -->
                    <FormField label="Default Value" bind:value={inlineFieldDefaultValue} placeholder="Optional default value" />

                    <!-- Inline Validators -->
                    <div>
                      <h5 class="text-xs font-medium text-mono-600 mb-1.5">
                        Validators ({inlineFieldValidators.length})
                      </h5>

                      {#if inlineFieldValidators.length > 0}
                        <div class="p-2 bg-white rounded border border-mono-200 space-y-2 mb-2">
                          {#each inlineFieldValidators as v, i}
                            <div class="flex items-center justify-between px-2 py-1.5 bg-mono-50 rounded border border-mono-200">
                              <div class="flex items-center gap-2">
                                <span class="font-mono text-sm text-mono-700">{v.templateName}</span>
                                <Pill size="sm">{v.mode}</Pill>
                              </div>
                              <button
                                class="text-red-400 hover:text-red-600 cursor-pointer"
                                onclick={() => removeInlineFieldValidator(i)}
                                aria-label="Remove validator"
                              >
                                <i class="fa-solid fa-xmark text-xs"></i>
                              </button>
                            </div>
                          {/each}
                        </div>
                      {/if}

                      {#if inlineValGalleryState === 'closed'}
                        <button
                          class="w-full py-2 border-2 border-dashed border-mono-300 rounded-md text-xs text-mono-500 hover:border-mono-400 hover:text-mono-700 cursor-pointer transition-colors"
                          onclick={() => { inlineValGalleryState = 'browsing'; inlineValGallerySearch = ''; }}
                        >
                          <i class="fa-solid fa-plus mr-1"></i>Add Validator
                        </button>
                      {:else if inlineValGalleryState === 'browsing'}
                        <div class="p-2 bg-white rounded border border-mono-200">
                          <input
                            type="text"
                            bind:value={inlineValGallerySearch}
                            placeholder="Search validators..."
                            class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent mb-1.5"
                          />
                          <div class="max-h-48 overflow-auto space-y-1">
                            {#each filteredInlineValidators() as template}
                              <button
                                class="w-full text-left p-2 rounded hover:bg-mono-50 border border-transparent hover:border-mono-200 cursor-pointer transition-colors"
                                onclick={() => {
                                  inlineValSelectedTemplate = template;
                                  inlineValParamValues = {};
                                  inlineValGalleryState = 'configuring';
                                }}
                              >
                                <div class="flex items-center justify-between mb-0.5">
                                  <span class="text-xs text-mono-900 font-medium">{template.name}</span>
                                  <Pill size="sm">{template.mode}</Pill>
                                </div>
                                <p class="text-[10px] text-mono-500">{template.description}</p>
                                <div class="flex gap-1 flex-wrap mt-0.5">
                                  {#each template.compatibleTypes as ct}
                                    <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-200 text-mono-600">{ct}</span>
                                  {/each}
                                </div>
                              </button>
                            {:else}
                              <p class="text-[10px] text-mono-400 text-center py-1">No compatible validators</p>
                            {/each}
                          </div>
                          <button
                            class="mt-1.5 text-[10px] text-mono-500 hover:text-mono-700 cursor-pointer"
                            onclick={() => { inlineValGalleryState = 'closed'; }}
                          >
                            Cancel
                          </button>
                        </div>
                      {:else if inlineValGalleryState === 'configuring' && inlineValSelectedTemplate}
                        <div class="p-2 bg-white rounded border border-mono-200">
                          <div class="flex items-center gap-2 mb-2">
                            <button
                              class="text-mono-500 hover:text-mono-700 cursor-pointer"
                              onclick={() => { inlineValGalleryState = 'browsing'; inlineValSelectedTemplate = null; inlineValParamValues = {}; }}
                              aria-label="Back to gallery"
                            >
                              <i class="fa-solid fa-arrow-left text-xs"></i>
                            </button>
                            <span class="text-xs font-medium text-mono-900">{inlineValSelectedTemplate.name}</span>
                            <Pill size="sm">{inlineValSelectedTemplate.mode}</Pill>
                          </div>
                          <p class="text-[10px] text-mono-500 mb-2">{inlineValSelectedTemplate.description}</p>

                          {#if inlineValSelectedTemplate.parameters.length > 0}
                            <div class="space-y-1.5 mb-2">
                              {#each inlineValSelectedTemplate.parameters as param}
                                <div>
                                  <label class="block text-[10px] text-mono-600 mb-0.5">
                                    {param.name}{param.required ? ' *' : ''}
                                  </label>
                                  <input
                                    type={param.type === 'number' ? 'number' : 'text'}
                                    placeholder={param.placeholder}
                                    value={inlineValParamValues[param.name] ?? ''}
                                    oninput={(e) => { inlineValParamValues[param.name] = (e.target as HTMLInputElement).value; }}
                                    class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                                  />
                                </div>
                              {/each}
                            </div>
                          {/if}

                          <div class="flex justify-end gap-1.5">
                            <button
                              class="px-2 py-1 text-[10px] border border-mono-300 text-mono-700 rounded hover:bg-mono-50 cursor-pointer"
                              onclick={() => { inlineValGalleryState = 'closed'; inlineValSelectedTemplate = null; inlineValParamValues = {}; }}
                            >
                              Cancel
                            </button>
                            <button
                              class="px-2 py-1 text-[10px] bg-mono-900 text-white rounded hover:bg-mono-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              onclick={addInlineFieldValidator}
                              disabled={!inlineValTemplateReady()}
                            >
                              Add Validator
                            </button>
                          </div>
                        </div>
                      {/if}
                    </div>

                    <!-- Inline Field Constraints -->
                    <div>
                      <h5 class="text-xs font-medium text-mono-600 mb-1.5">
                        Field Constraints ({inlineFieldConstraints.length})
                      </h5>

                      {#if inlineFieldConstraints.length > 0}
                        <div class="space-y-1.5 mb-2">
                          {#each inlineFieldConstraints as c, i}
                            <div class="flex items-center gap-2 px-2 py-1.5 bg-white border border-mono-200 rounded">
                              <span class="font-mono text-xs text-mono-700 shrink-0">{c.name}</span>
                              <span class="text-[10px] text-mono-500 bg-mono-100 px-1.5 py-0.5 rounded shrink-0">{constraintParamBadge(c.name)}</span>
                              <input
                                type={constraintParamInputType(c.name)}
                                value={c.value}
                                oninput={(e) => updateInlineConstraintValue(i, (e.target as HTMLInputElement).value)}
                                placeholder="Value"
                                class="flex-1 px-2 py-0.5 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                              />
                              <button
                                class="text-red-400 hover:text-red-600 cursor-pointer shrink-0"
                                onclick={() => removeInlineFieldConstraint(i)}
                                aria-label="Remove constraint"
                              >
                                <i class="fa-solid fa-xmark text-xs"></i>
                              </button>
                            </div>
                          {/each}
                        </div>
                      {/if}

                      <div class="relative">
                        <input
                          type="text"
                          placeholder="Search and add constraint..."
                          bind:value={inlineConstraintSearch}
                          onfocus={() => { inlineConstraintDropdownOpen = true; }}
                          class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                        />
                        {#if inlineConstraintDropdownOpen}
                          <div class="absolute z-10 mt-1 w-full bg-white border border-mono-200 rounded-md shadow-lg max-h-36 overflow-auto">
                            {#each filteredInlineConstraints() as constraint}
                              <button
                                class="w-full text-left px-2 py-1.5 text-xs hover:bg-mono-50 flex items-center justify-between cursor-pointer"
                                onclick={() => addInlineFieldConstraint(constraint)}
                              >
                                <span class="font-mono text-mono-700">{constraint.name}</span>
                                <span class="text-[10px] text-mono-400">{constraint.parameterTypes.join(', ')}</span>
                              </button>
                            {:else}
                              <p class="px-2 py-1.5 text-[10px] text-mono-400">No compatible constraints</p>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>

                    <!-- Inline form buttons -->
                    <div class="flex justify-end gap-2 pt-1">
                      <button
                        class="px-3 py-1.5 text-xs border border-mono-300 text-mono-700 rounded-md hover:bg-white cursor-pointer"
                        onclick={() => { addingFieldToObject = false; resetInlineFieldForm(); }}
                      >
                        Cancel
                      </button>
                      <button
                        class="px-3 py-1.5 text-xs bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        onclick={addFieldToObject}
                        disabled={!inlineFieldName.trim()}
                      >
                        Add Field
                      </button>
                    </div>
                  </div>
                {/if}
              </div>

              <!-- ------------------------------------------------------------- -->
              <!-- Model Validators section                                       -->
              <!-- ------------------------------------------------------------- -->
              <div>
                <h4 class="text-sm font-medium text-mono-700 mb-2">
                  Model Validators ({objectModelValidators.length})
                </h4>

                <!-- Applied model validators -->
                {#if objectModelValidators.length > 0}
                  <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-2 mb-3">
                    {#each objectModelValidators as v, i}
                      <div class="flex items-center justify-between px-2 py-1.5 bg-white rounded border border-mono-200">
                        <div class="flex items-center gap-2">
                          <span class="font-mono text-sm text-mono-700">{v.templateName}</span>
                          <Pill size="sm">{v.mode}</Pill>
                        </div>
                        <button
                          class="text-red-400 hover:text-red-600 cursor-pointer"
                          onclick={() => removeModelValidator(i)}
                          aria-label="Remove model validator"
                        >
                          <i class="fa-solid fa-xmark text-xs"></i>
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}

                <!-- Model validator gallery -->
                {#if modelValGalleryState === 'closed'}
                  <button
                    class="w-full py-3 border-2 border-dashed border-mono-300 rounded-md text-sm text-mono-500 hover:border-mono-400 hover:text-mono-700 cursor-pointer transition-colors"
                    onclick={() => { modelValGalleryState = 'browsing'; modelValGallerySearch = ''; }}
                  >
                    <i class="fa-solid fa-plus mr-2"></i>Add Model Validator
                  </button>
                {:else if modelValGalleryState === 'browsing'}
                  <div class="p-3 bg-mono-50 rounded border border-mono-200">
                    <input
                      type="text"
                      bind:value={modelValGallerySearch}
                      placeholder="Search model validators..."
                      class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent mb-2"
                    />
                    <div class="max-h-64 overflow-auto space-y-1">
                      {#each filteredModelValidators() as template}
                        <button
                          class="w-full text-left p-2 rounded hover:bg-white border border-transparent hover:border-mono-200 cursor-pointer transition-colors"
                          onclick={() => {
                            modelValSelectedTemplate = template;
                            modelValFieldMappings = {};
                            modelValGalleryState = 'configuring';
                          }}
                        >
                          <div class="flex items-center justify-between mb-0.5">
                            <span class="text-sm text-mono-900 font-medium">{template.name}</span>
                            <Pill size="sm">{template.mode}</Pill>
                          </div>
                          <p class="text-xs text-mono-500 mb-1">{template.description}</p>
                          <div class="flex gap-1 flex-wrap">
                            {#each template.fieldMappings as mapping}
                              <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-200 text-mono-600">{mapping.label}</span>
                            {/each}
                          </div>
                        </button>
                      {:else}
                        <p class="text-xs text-mono-400 text-center py-2">No model validators available</p>
                      {/each}
                    </div>
                    <button
                      class="mt-2 text-xs text-mono-500 hover:text-mono-700 cursor-pointer"
                      onclick={() => { modelValGalleryState = 'closed'; }}
                    >
                      Cancel
                    </button>
                  </div>
                {:else if modelValGalleryState === 'configuring' && modelValSelectedTemplate}
                  <div class="p-3 bg-mono-50 rounded border border-mono-200">
                    <div class="flex items-center gap-2 mb-3">
                      <button
                        class="text-mono-500 hover:text-mono-700 cursor-pointer"
                        onclick={() => { modelValGalleryState = 'browsing'; modelValSelectedTemplate = null; modelValFieldMappings = {}; }}
                        aria-label="Back to gallery"
                      >
                        <i class="fa-solid fa-arrow-left text-sm"></i>
                      </button>
                      <span class="text-sm font-medium text-mono-900">{modelValSelectedTemplate.name}</span>
                      <Pill size="sm">{modelValSelectedTemplate.mode}</Pill>
                    </div>
                    <p class="text-xs text-mono-500 mb-3">{modelValSelectedTemplate.description}</p>

                    <!-- Field mapping dropdowns -->
                    <div class="space-y-2 mb-3">
                      {#each modelValSelectedTemplate.fieldMappings as mapping}
                        <div>
                          <FormLabel label="{mapping.label}{mapping.required ? ' *' : ''}" />
                          <select
                            value={modelValFieldMappings[mapping.label] ?? ''}
                            onchange={(e) => { modelValFieldMappings[mapping.label] = (e.target as HTMLSelectElement).value; }}
                            class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                          >
                            <option value="">Select a field...</option>
                            {#each objectFieldsForMapping(mapping.compatibleTypes) as field}
                              <option value={field.name}>{field.name} ({field.type})</option>
                            {/each}
                          </select>
                          {#if objectFieldsForMapping(mapping.compatibleTypes).length === 0}
                            <p class="text-[10px] text-mono-400 mt-0.5">No compatible fields. Add fields with types: {mapping.compatibleTypes.join(', ')}</p>
                          {/if}
                        </div>
                      {/each}
                    </div>

                    <div class="flex justify-end gap-2">
                      <button
                        class="px-3 py-1.5 text-xs border border-mono-300 text-mono-700 rounded-md hover:bg-white cursor-pointer"
                        onclick={() => { modelValGalleryState = 'closed'; modelValSelectedTemplate = null; modelValFieldMappings = {}; }}
                      >
                        Cancel
                      </button>
                      <button
                        class="px-3 py-1.5 text-xs bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        onclick={addModelValidator}
                        disabled={!modelValTemplateReady()}
                      >
                        Add Model Validator
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          </DrawerContent>
          <DrawerFooter>
            <div class="flex justify-end gap-3">
              <button
                class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer text-sm"
                onclick={closeSecondDrawer}
              >
                Cancel
              </button>
              <button
                class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onclick={createObject}
                disabled={!newObjectName.trim()}
              >
                Create Object
              </button>
            </div>
          </DrawerFooter>
        </Drawer>
      {/if}

    </div>
  </div>
{/if}

<!-- Click-away handler to close dropdowns when clicking outside -->
<svelte:window onclick={(e) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.relative')) {
    closeAllDropdowns();
    fieldConstraintDropdownOpen = false;
    inlineConstraintDropdownOpen = false;
  }
}} />
