<script lang="ts">
  import { Pill } from '$lib/components';

  // ---------------------------------------------------------------------------
  // Validator & Constraint Templates (dummy data)
  // ---------------------------------------------------------------------------
  const fieldValidatorTemplates = [
    { id: 'fv1', name: 'regex_match', mode: 'before', description: 'Validate field matches regex pattern', compatibleTypes: ['str', 'email'], parameters: [{ name: 'pattern', type: 'text', required: true, placeholder: 'e.g. ^[a-z]+$' }] },
    { id: 'fv2', name: 'min_length', mode: 'before', description: 'Ensure minimum string length', compatibleTypes: ['str'], parameters: [{ name: 'min_length', type: 'number', required: true, placeholder: '1' }] },
    { id: 'fv3', name: 'range_check', mode: 'before', description: 'Validate number is within range', compatibleTypes: ['int', 'float'], parameters: [{ name: 'min_value', type: 'number', required: false, placeholder: '0' }, { name: 'max_value', type: 'number', required: false, placeholder: '100' }] },
    { id: 'fv4', name: 'email_format', mode: 'before', description: 'Validate email format', compatibleTypes: ['str', 'email'], parameters: [] },
  ];

  const modelValidatorTemplates = [
    { id: 'mv1', name: 'cross_field_check', mode: 'before', description: 'Validate relationship between two fields', fieldMappings: [{ label: 'field_a', required: true, compatibleTypes: ['str', 'int', 'float'] }, { label: 'field_b', required: true, compatibleTypes: ['str', 'int', 'float'] }] },
    { id: 'mv2', name: 'unique_fields', mode: 'before', description: 'Ensure field values are unique', fieldMappings: [{ label: 'target_field', required: true, compatibleTypes: ['str', 'int'] }] },
  ];

  const fieldConstraintTemplates = [
    { id: 'fc1', name: 'min_length', parameterTypes: ['int'], compatibleTypes: ['str'] },
    { id: 'fc2', name: 'max_length', parameterTypes: ['int'], compatibleTypes: ['str'] },
    { id: 'fc3', name: 'pattern', parameterTypes: ['str'], compatibleTypes: ['str'] },
    { id: 'fc4', name: 'minimum', parameterTypes: ['int', 'float'], compatibleTypes: ['int', 'float'] },
    { id: 'fc5', name: 'maximum', parameterTypes: ['int', 'float'], compatibleTypes: ['int', 'float'] },
  ];

  // ---------------------------------------------------------------------------
  // Hardcoded dummy data
  // ---------------------------------------------------------------------------
  type FieldValidator = { templateName: string; mode: string; params?: Record<string, string> };
  type FieldConstraint = { name: string; value: string };
  type ExistingField = { id: string; name: string; type: string; namespace: string; container: 'none' | 'list'; validators: FieldValidator[]; constraints: FieldConstraint[] };

  let existingFields = $state<ExistingField[]>([
    { id: 'f1', name: 'order_id', type: 'str', namespace: 'orders', container: 'none' as const, validators: [], constraints: [] },
    { id: 'f2', name: 'customer_id', type: 'str', namespace: 'orders', container: 'none' as const, validators: [], constraints: [] },
    { id: 'f3', name: 'amount', type: 'float', namespace: 'orders', container: 'none' as const, validators: [{ templateName: 'range_check', mode: 'before' }], constraints: [{ name: 'minimum', value: '0' }] },
    { id: 'f4', name: 'status', type: 'str', namespace: 'orders', container: 'none' as const, validators: [], constraints: [] },
    { id: 'f5', name: 'created_at', type: 'datetime', namespace: 'orders', container: 'none' as const, validators: [], constraints: [] },
    { id: 'f6', name: 'tags', type: 'str', namespace: 'orders', container: 'list' as const, validators: [], constraints: [] },
  ]);

  type ObjectField = { id: string; name: string; type: string; container: 'none' | 'list'; optional: boolean; validators: FieldValidator[]; constraints: FieldConstraint[] };
  type ModelValidator = { templateName: string; mode: string; fieldMappings: Record<string, string> };

  let existingObjects = $state([
    { id: 'o1', name: 'OrderSummary', namespace: 'orders', fields: ['order_id', 'status', 'amount'] },
    { id: 'o2', name: 'CustomerInfo', namespace: 'orders', fields: ['customer_id'] },
  ]);

  const fieldTypes = ['str', 'int', 'float', 'bool', 'datetime', 'date', 'uuid', 'email'];
  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  // ---------------------------------------------------------------------------
  // Wizard state
  // ---------------------------------------------------------------------------
  let currentStep = $state(1);

  // Step 1 — Basic Info
  let method = $state('GET');
  let path = $state('');
  let tag = $state('');
  let description = $state('');

  // Derived path parameters
  let pathParams = $derived(
    [...path.matchAll(/\{(\w+)\}/g)].map(m => m[1])
  );

  // Step definitions — dynamically skip Step 2 when no path params
  let steps = $derived([
    { number: 1, label: 'Basic Info' },
    ...(pathParams.length > 0 ? [{ number: 2, label: 'Path Params' }] : []),
    { number: 3, label: 'Query Params' },
    { number: 4, label: 'Request Body' },
    { number: 5, label: 'Response Body' },
    { number: 6, label: 'Review' },
  ]);

  // Map logical step index to step number for navigation
  let currentStepIndex = $derived(steps.findIndex(s => s.number === currentStep));
  let isFirstStep = $derived(currentStepIndex === 0);
  let isLastStep = $derived(currentStepIndex === steps.length - 1);

  function goNext() {
    if (isLastStep) return;
    currentStep = steps[currentStepIndex + 1].number;
  }

  function goBack() {
    if (isFirstStep) return;
    currentStep = steps[currentStepIndex - 1].number;
  }

  function isStepCompleted(stepNumber: number): boolean {
    const idx = steps.findIndex(s => s.number === stepNumber);
    return idx < currentStepIndex;
  }

  function isStepActive(stepNumber: number): boolean {
    return stepNumber === currentStep;
  }

  // ---------------------------------------------------------------------------
  // Step 2 — Path Parameters
  // ---------------------------------------------------------------------------
  type InlineFieldValidatorState = {
    galleryOpen: boolean;
    gallerySearch: string;
    formTemplate: typeof fieldValidatorTemplates[0] | null;
    formParams: Record<string, string>;
    applied: FieldValidator[];
  };

  type InlineFieldConstraintState = {
    dropdownOpen: boolean;
    search: string;
    applied: FieldConstraint[];
  };

  type ParamMapping = {
    fieldId: string | null;
    showCreate: boolean;
    newFieldName: string;
    newFieldType: string;
    newFieldContainer: 'none' | 'list';
    newFieldDescription: string;
    validators: InlineFieldValidatorState;
    constraints: InlineFieldConstraintState;
  };

  function freshValidatorState(): InlineFieldValidatorState {
    return { galleryOpen: false, gallerySearch: '', formTemplate: null, formParams: {}, applied: [] };
  }

  function freshConstraintState(): InlineFieldConstraintState {
    return { dropdownOpen: false, search: '', applied: [] };
  }

  let paramMappings = $state<Record<string, ParamMapping>>({});

  // Ensure mappings exist for every detected param
  $effect(() => {
    for (const param of pathParams) {
      if (!paramMappings[param]) {
        paramMappings[param] = {
          fieldId: null,
          showCreate: false,
          newFieldName: param,
          newFieldType: 'str',
          newFieldContainer: 'none',
          newFieldDescription: '',
          validators: freshValidatorState(),
          constraints: freshConstraintState(),
        };
      }
    }
  });

  function selectFieldForParam(param: string, fieldId: string) {
    paramMappings[param] = { ...paramMappings[param], fieldId, showCreate: false };
    paramSearches[param] = '';
  }

  function toggleCreateField(param: string) {
    paramMappings[param] = {
      ...paramMappings[param],
      showCreate: !paramMappings[param].showCreate,
      newFieldName: param,
      newFieldType: 'str',
      newFieldContainer: 'none',
      newFieldDescription: '',
      validators: freshValidatorState(),
      constraints: freshConstraintState(),
    };
  }

  function cancelCreateField(param: string) {
    paramMappings[param] = { ...paramMappings[param], showCreate: false };
  }

  function saveNewFieldForParam(param: string) {
    const mapping = paramMappings[param];
    const newId = `f${Date.now()}`;
    existingFields = [
      ...existingFields,
      {
        id: newId,
        name: mapping.newFieldName,
        type: mapping.newFieldType,
        namespace: 'orders',
        container: mapping.newFieldContainer,
        validators: mapping.validators.applied,
        constraints: mapping.constraints.applied,
      },
    ];
    paramMappings[param] = { ...paramMappings[param], fieldId: newId, showCreate: false };
  }

  // Search state for param field pickers
  let paramSearches = $state<Record<string, string>>({});
  let paramDropdownOpen = $state<Record<string, boolean>>({});

  function filteredFieldsForParam(param: string) {
    const query = (paramSearches[param] ?? '').toLowerCase();
    if (!query) return existingFields;
    return existingFields.filter(f => f.name.toLowerCase().includes(query));
  }

  // ---------------------------------------------------------------------------
  // Step 3 — Query Parameters (object selector)
  // ---------------------------------------------------------------------------
  let queryParamObjectId = $state<string | null>(null);
  let queryParamSearch = $state('');
  let queryParamDropdownOpen = $state(false);
  let queryParamShowCreate = $state(false);
  let queryParamNewName = $state('');
  let queryParamNewDescription = $state('');
  let queryParamNewFields = $state<ObjectField[]>([]);
  let queryModelValidators = $state<ModelValidator[]>([]);
  let queryModelValidatorGalleryOpen = $state(false);
  let queryModelValidatorGallerySearch = $state('');
  let queryModelValidatorFormTemplate = $state<typeof modelValidatorTemplates[0] | null>(null);
  let queryModelValidatorFieldMappings = $state<Record<string, string>>({});

  // Inline field adding for new object in step 3
  let queryFieldPickerOpen = $state(false);
  let queryFieldPickerSearch = $state('');
  let queryFieldShowCreate = $state(false);
  let queryNewFieldName = $state('');
  let queryNewFieldType = $state('str');
  let queryNewFieldContainer = $state<'none' | 'list'>('none');
  let queryNewFieldDescription = $state('');
  let queryNewFieldValidators = $state<InlineFieldValidatorState>(freshValidatorState());
  let queryNewFieldConstraints = $state<InlineFieldConstraintState>(freshConstraintState());

  let filteredObjectsForQuery = $derived(() => {
    const q = queryParamSearch.toLowerCase();
    if (!q) return existingObjects;
    return existingObjects.filter(o => o.name.toLowerCase().includes(q));
  });

  function selectQueryObject(objectId: string) {
    queryParamObjectId = objectId;
    queryParamDropdownOpen = false;
    queryParamSearch = '';
  }

  function startCreateQueryObject() {
    queryParamShowCreate = true;
    queryParamDropdownOpen = false;
    queryParamNewName = '';
    queryParamNewDescription = '';
    queryParamNewFields = [];
    queryModelValidators = [];
  }

  function cancelCreateQueryObject() {
    queryParamShowCreate = false;
  }

  function saveNewQueryObject() {
    const newId = `o${Date.now()}`;
    existingObjects = [
      ...existingObjects,
      {
        id: newId,
        name: queryParamNewName,
        namespace: 'orders',
        fields: queryParamNewFields.map(f => f.name),
      },
    ];
    queryParamObjectId = newId;
    queryParamShowCreate = false;
  }

  function addFieldToNewQueryObject(fieldId: string) {
    const field = existingFields.find(f => f.id === fieldId);
    if (!field || queryParamNewFields.some(f => f.id === fieldId)) return;
    queryParamNewFields = [...queryParamNewFields, { id: field.id, name: field.name, type: field.type, container: field.container, optional: false, validators: field.validators, constraints: field.constraints }];
    queryFieldPickerOpen = false;
    queryFieldPickerSearch = '';
  }

  function removeFieldFromNewQueryObject(fieldId: string) {
    queryParamNewFields = queryParamNewFields.filter(f => f.id !== fieldId);
  }

  function toggleQueryFieldOptional(fieldId: string) {
    queryParamNewFields = queryParamNewFields.map(f =>
      f.id === fieldId ? { ...f, optional: !f.optional } : f
    );
  }

  function saveInlineFieldForQuery() {
    const newId = `f${Date.now()}`;
    const newField: ExistingField = {
      id: newId, name: queryNewFieldName, type: queryNewFieldType, namespace: 'orders',
      container: queryNewFieldContainer, validators: queryNewFieldValidators.applied, constraints: queryNewFieldConstraints.applied,
    };
    existingFields = [...existingFields, newField];
    queryParamNewFields = [...queryParamNewFields, { id: newId, name: queryNewFieldName, type: queryNewFieldType, container: queryNewFieldContainer, optional: false, validators: queryNewFieldValidators.applied, constraints: queryNewFieldConstraints.applied }];
    queryFieldShowCreate = false;
    queryFieldPickerOpen = false;
    queryNewFieldName = '';
    queryNewFieldType = 'str';
    queryNewFieldContainer = 'none';
    queryNewFieldDescription = '';
    queryNewFieldValidators = freshValidatorState();
    queryNewFieldConstraints = freshConstraintState();
  }

  // ---------------------------------------------------------------------------
  // Step 4 — Request Body (same object selector pattern)
  // ---------------------------------------------------------------------------
  let requestBodyObjectId = $state<string | null>(null);
  let requestBodySearch = $state('');
  let requestBodyDropdownOpen = $state(false);
  let requestBodyShowCreate = $state(false);
  let requestBodyNewName = $state('');
  let requestBodyNewDescription = $state('');
  let requestBodyNewFields = $state<ObjectField[]>([]);
  let reqModelValidators = $state<ModelValidator[]>([]);
  let reqModelValidatorGalleryOpen = $state(false);
  let reqModelValidatorGallerySearch = $state('');
  let reqModelValidatorFormTemplate = $state<typeof modelValidatorTemplates[0] | null>(null);
  let reqModelValidatorFieldMappings = $state<Record<string, string>>({});
  let reqFieldPickerOpen = $state(false);
  let reqFieldPickerSearch = $state('');
  let reqFieldShowCreate = $state(false);
  let reqNewFieldName = $state('');
  let reqNewFieldType = $state('str');
  let reqNewFieldContainer = $state<'none' | 'list'>('none');
  let reqNewFieldDescription = $state('');
  let reqNewFieldValidators = $state<InlineFieldValidatorState>(freshValidatorState());
  let reqNewFieldConstraints = $state<InlineFieldConstraintState>(freshConstraintState());

  let filteredObjectsForRequest = $derived(() => {
    const q = requestBodySearch.toLowerCase();
    if (!q) return existingObjects;
    return existingObjects.filter(o => o.name.toLowerCase().includes(q));
  });

  function selectRequestObject(objectId: string) {
    requestBodyObjectId = objectId;
    requestBodyDropdownOpen = false;
    requestBodySearch = '';
  }

  function startCreateRequestObject() {
    requestBodyShowCreate = true;
    requestBodyDropdownOpen = false;
    requestBodyNewName = '';
    requestBodyNewDescription = '';
    requestBodyNewFields = [];
    reqModelValidators = [];
  }

  function cancelCreateRequestObject() {
    requestBodyShowCreate = false;
  }

  function saveNewRequestObject() {
    const newId = `o${Date.now()}`;
    existingObjects = [
      ...existingObjects,
      {
        id: newId,
        name: requestBodyNewName,
        namespace: 'orders',
        fields: requestBodyNewFields.map(f => f.name),
      },
    ];
    requestBodyObjectId = newId;
    requestBodyShowCreate = false;
  }

  function addFieldToNewRequestObject(fieldId: string) {
    const field = existingFields.find(f => f.id === fieldId);
    if (!field || requestBodyNewFields.some(f => f.id === fieldId)) return;
    requestBodyNewFields = [...requestBodyNewFields, { id: field.id, name: field.name, type: field.type, container: field.container, optional: false, validators: field.validators, constraints: field.constraints }];
    reqFieldPickerOpen = false;
    reqFieldPickerSearch = '';
  }

  function removeFieldFromNewRequestObject(fieldId: string) {
    requestBodyNewFields = requestBodyNewFields.filter(f => f.id !== fieldId);
  }

  function toggleRequestFieldOptional(fieldId: string) {
    requestBodyNewFields = requestBodyNewFields.map(f =>
      f.id === fieldId ? { ...f, optional: !f.optional } : f
    );
  }

  function saveInlineFieldForRequest() {
    const newId = `f${Date.now()}`;
    const newField: ExistingField = {
      id: newId, name: reqNewFieldName, type: reqNewFieldType, namespace: 'orders',
      container: reqNewFieldContainer, validators: reqNewFieldValidators.applied, constraints: reqNewFieldConstraints.applied,
    };
    existingFields = [...existingFields, newField];
    requestBodyNewFields = [...requestBodyNewFields, { id: newId, name: reqNewFieldName, type: reqNewFieldType, container: reqNewFieldContainer, optional: false, validators: reqNewFieldValidators.applied, constraints: reqNewFieldConstraints.applied }];
    reqFieldShowCreate = false;
    reqFieldPickerOpen = false;
    reqNewFieldName = '';
    reqNewFieldType = 'str';
    reqNewFieldContainer = 'none';
    reqNewFieldDescription = '';
    reqNewFieldValidators = freshValidatorState();
    reqNewFieldConstraints = freshConstraintState();
  }

  // ---------------------------------------------------------------------------
  // Step 5 — Response Body
  // ---------------------------------------------------------------------------
  let responseBodyObjectId = $state<string | null>(null);
  let responseBodySearch = $state('');
  let responseBodyDropdownOpen = $state(false);
  let responseBodyShowCreate = $state(false);
  let responseBodyNewName = $state('');
  let responseBodyNewDescription = $state('');
  let responseBodyNewFields = $state<ObjectField[]>([]);
  let respModelValidators = $state<ModelValidator[]>([]);
  let respModelValidatorGalleryOpen = $state(false);
  let respModelValidatorGallerySearch = $state('');
  let respModelValidatorFormTemplate = $state<typeof modelValidatorTemplates[0] | null>(null);
  let respModelValidatorFieldMappings = $state<Record<string, string>>({});
  let respFieldPickerOpen = $state(false);
  let respFieldPickerSearch = $state('');
  let respFieldShowCreate = $state(false);
  let respNewFieldName = $state('');
  let respNewFieldType = $state('str');
  let respNewFieldContainer = $state<'none' | 'list'>('none');
  let respNewFieldDescription = $state('');
  let respNewFieldValidators = $state<InlineFieldValidatorState>(freshValidatorState());
  let respNewFieldConstraints = $state<InlineFieldConstraintState>(freshConstraintState());

  let useEnvelope = $state(false);
  let responseShape = $state<'single' | 'list'>('single');

  let filteredObjectsForResponse = $derived(() => {
    const q = responseBodySearch.toLowerCase();
    if (!q) return existingObjects;
    return existingObjects.filter(o => o.name.toLowerCase().includes(q));
  });

  function selectResponseObject(objectId: string) {
    responseBodyObjectId = objectId;
    responseBodyDropdownOpen = false;
    responseBodySearch = '';
  }

  function startCreateResponseObject() {
    responseBodyShowCreate = true;
    responseBodyDropdownOpen = false;
    responseBodyNewName = '';
    responseBodyNewDescription = '';
    responseBodyNewFields = [];
    respModelValidators = [];
  }

  function cancelCreateResponseObject() {
    responseBodyShowCreate = false;
  }

  function saveNewResponseObject() {
    const newId = `o${Date.now()}`;
    existingObjects = [
      ...existingObjects,
      {
        id: newId,
        name: responseBodyNewName,
        namespace: 'orders',
        fields: responseBodyNewFields.map(f => f.name),
      },
    ];
    responseBodyObjectId = newId;
    responseBodyShowCreate = false;
  }

  function addFieldToNewResponseObject(fieldId: string) {
    const field = existingFields.find(f => f.id === fieldId);
    if (!field || responseBodyNewFields.some(f => f.id === fieldId)) return;
    responseBodyNewFields = [...responseBodyNewFields, { id: field.id, name: field.name, type: field.type, container: field.container, optional: false, validators: field.validators, constraints: field.constraints }];
    respFieldPickerOpen = false;
    respFieldPickerSearch = '';
  }

  function removeFieldFromNewResponseObject(fieldId: string) {
    responseBodyNewFields = responseBodyNewFields.filter(f => f.id !== fieldId);
  }

  function toggleResponseFieldOptional(fieldId: string) {
    responseBodyNewFields = responseBodyNewFields.map(f =>
      f.id === fieldId ? { ...f, optional: !f.optional } : f
    );
  }

  function saveInlineFieldForResponse() {
    const newId = `f${Date.now()}`;
    const newField: ExistingField = {
      id: newId, name: respNewFieldName, type: respNewFieldType, namespace: 'orders',
      container: respNewFieldContainer, validators: respNewFieldValidators.applied, constraints: respNewFieldConstraints.applied,
    };
    existingFields = [...existingFields, newField];
    responseBodyNewFields = [...responseBodyNewFields, { id: newId, name: respNewFieldName, type: respNewFieldType, container: respNewFieldContainer, optional: false, validators: respNewFieldValidators.applied, constraints: respNewFieldConstraints.applied }];
    respFieldShowCreate = false;
    respFieldPickerOpen = false;
    respNewFieldName = '';
    respNewFieldType = 'str';
    respNewFieldContainer = 'none';
    respNewFieldDescription = '';
    respNewFieldValidators = freshValidatorState();
    respNewFieldConstraints = freshConstraintState();
  }

  // ---------------------------------------------------------------------------
  // Review helpers
  // ---------------------------------------------------------------------------
  function getFieldName(fieldId: string | null): string {
    if (!fieldId) return 'Not selected';
    return existingFields.find(f => f.id === fieldId)?.name ?? 'Unknown';
  }

  function getObjectName(objectId: string | null): string {
    if (!objectId) return 'Not selected';
    return existingObjects.find(o => o.id === objectId)?.name ?? 'Unknown';
  }

  function getObjectFieldCount(objectId: string | null): number {
    if (!objectId) return 0;
    return existingObjects.find(o => o.id === objectId)?.fields.length ?? 0;
  }

  function getFieldByName(name: string): ExistingField | undefined {
    return existingFields.find(f => f.name === name);
  }

  let submitted = $state(false);

  function handleCreateEndpoint() {
    submitted = true;
  }

  // ---------------------------------------------------------------------------
  // Method badge color
  // ---------------------------------------------------------------------------
  function methodColor(m: string): string {
    switch (m) {
      case 'GET': return 'bg-emerald-100 text-emerald-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-amber-100 text-amber-800';
      case 'PATCH': return 'bg-orange-100 text-orange-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-mono-200 text-mono-700';
    }
  }

  // ---------------------------------------------------------------------------
  // Validator/Constraint helper functions
  // ---------------------------------------------------------------------------
  function getCompatibleValidators(fieldType: string) {
    return fieldValidatorTemplates.filter(t => t.compatibleTypes.includes(fieldType));
  }

  function getCompatibleConstraints(fieldType: string, appliedNames: string[]) {
    return fieldConstraintTemplates.filter(t =>
      t.compatibleTypes.includes(fieldType) && !appliedNames.includes(t.name)
    );
  }

  // ---------------------------------------------------------------------------
  // Context panel section highlight helper
  // ---------------------------------------------------------------------------
  function isSectionHighlighted(sectionStep: number): boolean {
    return currentStep === sectionStep;
  }

  function sectionClass(sectionStep: number): string {
    if (currentStep === sectionStep) return 'bg-white rounded p-2 border border-mono-300';
    return '';
  }
</script>

<!-- Breadcrumb + Subtitle -->
<div class="bg-white border-b border-mono-200 py-4 px-6">
  <a href="/prototype/wizard" class="text-sm text-mono-500 hover:text-mono-700 transition-colors">
    <i class="fa-solid fa-arrow-left mr-1"></i> Back to Orders API
  </a>
  <h1 class="text-xl text-mono-800 font-semibold mt-1">Create Endpoint</h1>
  <p class="text-sm text-mono-500 mt-0.5">Creating endpoint for Orders API v1.0</p>
</div>

{#if submitted}
  <!-- Success state -->
  <div class="flex-1 flex items-center justify-center">
    <div class="text-center max-w-md">
      <div class="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
        <i class="fa-solid fa-check text-emerald-600 text-2xl"></i>
      </div>
      <h2 class="text-lg font-semibold text-mono-800 mb-2">Endpoint Created</h2>
      <p class="text-sm text-mono-500 mb-6">
        <span class="font-mono font-medium text-mono-700">{method} /{path}</span> has been added to Orders API v1.0.
      </p>
      <button
        type="button"
        onclick={() => { submitted = false; currentStep = 1; }}
        class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors"
      >
        Create Another Endpoint
      </button>
    </div>
  </div>
{:else}
  <!-- Main wizard content -->
  <div class="flex-1 flex flex-col overflow-auto">
    <!-- Step Indicator -->
    <div class="py-6 px-6 bg-white border-b border-mono-200">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center">
          {#each steps as step, i}
            <!-- Step circle -->
            <div class="flex items-center">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                  {isStepActive(step.number)
                    ? 'bg-mono-900 text-white'
                    : isStepCompleted(step.number)
                      ? 'bg-mono-900 text-white'
                      : 'bg-mono-200 text-mono-500'}"
              >
                {#if isStepCompleted(step.number)}
                  <i class="fa-solid fa-check text-xs"></i>
                {:else}
                  {i + 1}
                {/if}
              </div>
              <span
                class="ml-2 text-sm hidden sm:inline
                  {isStepActive(step.number)
                    ? 'text-mono-800 font-medium'
                    : isStepCompleted(step.number)
                      ? 'text-mono-600'
                      : 'text-mono-400'}"
              >
                {step.label}
              </span>
            </div>

            <!-- Connector line -->
            {#if i < steps.length - 1}
              <div
                class="flex-1 h-px mx-3
                  {isStepCompleted(steps[i + 1].number) || isStepActive(steps[i + 1].number)
                    ? 'bg-mono-900'
                    : 'bg-mono-200'}"
              ></div>
            {/if}
          {/each}
        </div>
      </div>
    </div>

    <!-- Two-column layout: Step Content + Context Panel -->
    <div class="flex-1 py-8 px-6">
      <div class="max-w-5xl mx-auto flex gap-8">

        <!-- Left column: Step form -->
        <div class="flex-1 max-w-2xl">

        <!-- ================================================================= -->
        <!-- Step 1: Basic Info -->
        <!-- ================================================================= -->
        {#if currentStep === 1}
          <div class="space-y-6">
            <div>
              <h2 class="text-lg font-semibold text-mono-800">Basic Information</h2>
              <p class="text-sm text-mono-500 mt-1">Define the HTTP method, path, and metadata for this endpoint.</p>
            </div>

            <!-- HTTP Method -->
            <div>
              <label for="http-method" class="block text-sm text-mono-700 mb-1 font-medium">
                HTTP Method <span class="text-red-500">*</span>
              </label>
              <select
                id="http-method"
                bind:value={method}
                class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent bg-white"
              >
                {#each httpMethods as m}
                  <option value={m}>{m}</option>
                {/each}
              </select>
            </div>

            <!-- Path -->
            <div>
              <label for="endpoint-path" class="block text-sm text-mono-700 mb-1 font-medium">
                Path <span class="text-red-500">*</span>
              </label>
              <div class="flex items-center">
                <span class="px-3 py-1.5 text-sm bg-mono-100 border border-r-0 border-mono-300 rounded-l-md text-mono-500 select-none">/</span>
                <input
                  id="endpoint-path"
                  type="text"
                  bind:value={path}
                  placeholder={'orders/{order_id}'}
                  class="flex-1 px-3 py-1.5 text-sm font-mono border border-mono-300 rounded-r-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                />
              </div>
              {#if pathParams.length > 0}
                <div class="mt-2 flex flex-wrap gap-1.5">
                  {#each pathParams as param}
                    <Pill>
                      <i class="fa-solid fa-brackets-curly mr-1 text-[10px]"></i>{param}
                    </Pill>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Tag -->
            <div>
              <label for="endpoint-tag" class="block text-sm text-mono-700 mb-1 font-medium">Tag</label>
              <input
                id="endpoint-tag"
                type="text"
                bind:value={tag}
                placeholder="orders"
                class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
              />
            </div>

            <!-- Description -->
            <div>
              <label for="endpoint-description" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
              <textarea
                id="endpoint-description"
                bind:value={description}
                rows="3"
                placeholder="Describe what this endpoint does..."
                class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
              ></textarea>
            </div>
          </div>

        <!-- ================================================================= -->
        <!-- Step 2: Path Parameters -->
        <!-- ================================================================= -->
        {:else if currentStep === 2}
          <div class="space-y-6">
            <div>
              <h2 class="text-lg font-semibold text-mono-800">Path Parameters</h2>
              <p class="text-sm text-mono-500 mt-1">Map each path parameter to an existing field or create a new one.</p>
            </div>

            {#each pathParams as param}
              {@const mapping = paramMappings[param]}
              {#if mapping}
                <div class="border border-mono-200 rounded-lg p-4">
                  <!-- Param name -->
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-2">
                      <span class="text-sm font-mono font-medium text-mono-800">{`{${param}}`}</span>
                      {#if mapping.fieldId}
                        {@const selectedField = existingFields.find(f => f.id === mapping.fieldId)}
                        {#if selectedField}
                          <i class="fa-solid fa-arrow-right text-mono-400 text-xs"></i>
                          <span class="text-sm text-mono-700">{selectedField.name}</span>
                          <Pill size="sm">{selectedField.type}</Pill>
                          {#if selectedField.container === 'list'}
                            <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">list</span>
                          {/if}
                        {/if}
                      {/if}
                    </div>
                    {#if mapping.fieldId}
                      <button
                        type="button"
                        onclick={() => { paramMappings[param] = { ...paramMappings[param], fieldId: null }; }}
                        class="text-xs text-mono-500 hover:text-mono-700 transition-colors cursor-pointer"
                      >
                        Change
                      </button>
                    {/if}
                  </div>

                  <!-- Field selector (when no field selected) -->
                  {#if !mapping.fieldId && !mapping.showCreate}
                    <div class="relative">
                      <input
                        type="text"
                        placeholder="Search fields..."
                        value={paramSearches[param] ?? ''}
                        oninput={(e) => {
                          paramSearches[param] = (e.target as HTMLInputElement).value;
                          paramDropdownOpen[param] = true;
                        }}
                        onfocus={() => { paramDropdownOpen[param] = true; }}
                        class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                      />
                      {#if paramDropdownOpen[param]}
                        <div class="absolute z-10 mt-1 w-full bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                          {#each filteredFieldsForParam(param) as field}
                            <button
                              type="button"
                              onclick={() => selectFieldForParam(param, field.id)}
                              class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 transition-colors cursor-pointer flex items-center justify-between"
                            >
                              <div class="flex items-center space-x-2">
                                <span class="text-mono-800">{field.name}</span>
                                {#if field.container === 'list'}
                                  <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">list</span>
                                {/if}
                              </div>
                              <Pill size="sm">{field.type}</Pill>
                            </button>
                          {/each}
                          {#if filteredFieldsForParam(param).length === 0}
                            <div class="px-3 py-2 text-sm text-mono-400">No fields found</div>
                          {/if}
                          <button
                            type="button"
                            onclick={() => { toggleCreateField(param); paramDropdownOpen[param] = false; }}
                            class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-200 transition-colors cursor-pointer"
                          >
                            <i class="fa-solid fa-plus mr-1 text-xs"></i> Create new field
                          </button>
                        </div>
                      {/if}
                    </div>
                  {/if}

                  <!-- Inline create field form -->
                  {#if mapping.showCreate}
                    <div class="border border-mono-200 rounded-lg p-4 bg-mono-50 mt-2 space-y-4">
                      <h4 class="text-sm font-medium text-mono-700">Create New Field</h4>

                      <div>
                        <label for="new-field-name-{param}" class="block text-sm text-mono-700 mb-1 font-medium">
                          Field Name <span class="text-red-500">*</span>
                        </label>
                        <input
                          id="new-field-name-{param}"
                          type="text"
                          bind:value={mapping.newFieldName}
                          class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                        />
                      </div>

                      <!-- Container toggle -->
                      <div>
                        <span class="block text-sm text-mono-700 mb-1 font-medium">Container</span>
                        <div class="flex space-x-0">
                          <button type="button" onclick={() => { mapping.newFieldContainer = 'none'; }}
                            class="px-3 py-1.5 text-sm border rounded-l-md transition-colors cursor-pointer {mapping.newFieldContainer === 'none' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}">
                            None
                          </button>
                          <button type="button" onclick={() => { mapping.newFieldContainer = 'list'; }}
                            class="px-3 py-1.5 text-sm border-t border-b border-r rounded-r-md transition-colors cursor-pointer {mapping.newFieldContainer === 'list' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}">
                            List
                          </button>
                        </div>
                      </div>

                      <div>
                        <label for="new-field-type-{param}" class="block text-sm text-mono-700 mb-1 font-medium">
                          Type <span class="text-red-500">*</span>
                        </label>
                        <select
                          id="new-field-type-{param}"
                          bind:value={mapping.newFieldType}
                          class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent bg-white"
                        >
                          {#each fieldTypes as ft}
                            <option value={ft}>{ft}</option>
                          {/each}
                        </select>
                      </div>

                      <div>
                        <label for="new-field-desc-{param}" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
                        <input
                          id="new-field-desc-{param}"
                          type="text"
                          bind:value={mapping.newFieldDescription}
                          placeholder="Optional description"
                          class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                        />
                      </div>

                      <!-- Validators section -->
                      <div>
                        <h5 class="text-sm text-mono-600 mb-2">Validators ({mapping.validators.applied.length})</h5>
                        {#if mapping.validators.applied.length > 0}
                          <div class="space-y-1.5 mb-2">
                            {#each mapping.validators.applied as v, vi}
                              <div class="flex items-center justify-between px-3 py-1.5 bg-white border border-mono-200 rounded-md">
                                <div class="flex items-center space-x-2">
                                  <span class="text-sm text-mono-800">{v.templateName}</span>
                                  <Pill size="sm">{v.mode}</Pill>
                                </div>
                                <button type="button" onclick={() => { mapping.validators.applied = mapping.validators.applied.filter((_, i) => i !== vi); }}
                                  class="text-mono-400 hover:text-red-600 transition-colors cursor-pointer">
                                  <i class="fa-solid fa-xmark text-xs"></i>
                                </button>
                              </div>
                            {/each}
                          </div>
                        {/if}
                        {#if !mapping.validators.galleryOpen && !mapping.validators.formTemplate}
                          <button type="button" onclick={() => { mapping.validators.galleryOpen = true; mapping.validators.gallerySearch = ''; }}
                            class="w-full px-3 py-2 border border-dashed border-mono-300 rounded-md text-sm text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                            <i class="fa-solid fa-plus mr-1"></i> Add Validator
                          </button>
                        {:else if mapping.validators.galleryOpen && !mapping.validators.formTemplate}
                          <div class="p-3 bg-mono-50 rounded border border-mono-200 space-y-2">
                            <input type="text" placeholder="Search validators..." bind:value={mapping.validators.gallerySearch}
                              class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                            <div class="max-h-64 overflow-auto space-y-1.5">
                              {#each getCompatibleValidators(mapping.newFieldType).filter(t => !mapping.validators.gallerySearch || t.name.toLowerCase().includes(mapping.validators.gallerySearch.toLowerCase())) as tmpl}
                                <button type="button" onclick={() => { mapping.validators.formTemplate = tmpl; mapping.validators.formParams = {}; }}
                                  class="w-full text-left p-2 bg-white border border-mono-200 rounded-md hover:border-mono-400 transition-colors cursor-pointer">
                                  <div class="flex items-center justify-between">
                                    <span class="text-sm text-mono-900 font-medium">{tmpl.name}</span>
                                    <Pill size="sm">{tmpl.mode}</Pill>
                                  </div>
                                  <p class="text-xs text-mono-500 mt-0.5">{tmpl.description}</p>
                                  <div class="flex flex-wrap gap-1 mt-1">
                                    {#each tmpl.compatibleTypes as ct}
                                      <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-200 text-mono-600">{ct}</span>
                                    {/each}
                                  </div>
                                </button>
                              {/each}
                              {#if getCompatibleValidators(mapping.newFieldType).filter(t => !mapping.validators.gallerySearch || t.name.toLowerCase().includes(mapping.validators.gallerySearch.toLowerCase())).length === 0}
                                <p class="text-sm text-mono-400 py-2 text-center">No compatible validators</p>
                              {/if}
                            </div>
                            <button type="button" onclick={() => { mapping.validators.galleryOpen = false; }}
                              class="text-xs text-mono-500 hover:text-mono-700 transition-colors cursor-pointer">Cancel</button>
                          </div>
                        {:else if mapping.validators.formTemplate}
                          {@const tmpl = mapping.validators.formTemplate}
                          <div class="p-3 bg-mono-50 rounded border border-mono-200 space-y-3">
                            <div class="flex items-center space-x-2">
                              <button type="button" onclick={() => { mapping.validators.formTemplate = null; }}
                                class="text-mono-500 hover:text-mono-700 transition-colors cursor-pointer">
                                <i class="fa-solid fa-arrow-left text-xs"></i>
                              </button>
                              <span class="text-sm font-medium text-mono-800">{tmpl.name}</span>
                            </div>
                            <p class="text-xs text-mono-500">{tmpl.description}</p>
                            {#each tmpl.parameters as p}
                              <div>
                                <label class="block text-xs text-mono-600 mb-1">{p.name} {#if p.required}<span class="text-red-500">*</span>{/if}</label>
                                <input type={p.type === 'number' ? 'number' : 'text'} placeholder={p.placeholder}
                                  value={mapping.validators.formParams[p.name] ?? ''}
                                  oninput={(e) => { mapping.validators.formParams[p.name] = (e.target as HTMLInputElement).value; }}
                                  class="w-full px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                              </div>
                            {/each}
                            <button type="button" onclick={() => {
                              mapping.validators.applied = [...mapping.validators.applied, { templateName: tmpl.name, mode: tmpl.mode, params: { ...mapping.validators.formParams } }];
                              mapping.validators.formTemplate = null;
                              mapping.validators.galleryOpen = false;
                            }}
                              class="px-3 py-1 text-xs bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors">
                              Add Validator
                            </button>
                          </div>
                        {/if}
                      </div>

                      <!-- Constraints section -->
                      <div>
                        <h5 class="text-sm text-mono-600 mb-2">Field Constraints ({mapping.constraints.applied.length})</h5>
                        {#if mapping.constraints.applied.length > 0}
                          <div class="space-y-1.5 mb-2">
                            {#each mapping.constraints.applied as c, ci}
                              <div class="flex items-center justify-between px-3 py-1.5 bg-white border border-mono-200 rounded-md">
                                <div class="flex items-center space-x-2">
                                  <span class="font-mono text-sm text-mono-700">{c.name}</span>
                                  <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">{fieldConstraintTemplates.find(t => t.name === c.name)?.parameterTypes.join(', ') ?? ''}</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                  <input type="text" value={c.value} oninput={(e) => { mapping.constraints.applied[ci].value = (e.target as HTMLInputElement).value; }}
                                    class="w-24 px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                                  <button type="button" onclick={() => { mapping.constraints.applied = mapping.constraints.applied.filter((_, i) => i !== ci); }}
                                    class="text-mono-400 hover:text-red-600 transition-colors cursor-pointer">
                                    <i class="fa-solid fa-xmark text-xs"></i>
                                  </button>
                                </div>
                              </div>
                            {/each}
                          </div>
                        {/if}
                        {#if !mapping.constraints.dropdownOpen}
                          {@const available = getCompatibleConstraints(mapping.newFieldType, mapping.constraints.applied.map(c => c.name))}
                          {#if available.length > 0}
                            <button type="button" onclick={() => { mapping.constraints.dropdownOpen = true; mapping.constraints.search = ''; }}
                              class="w-full px-3 py-2 border border-dashed border-mono-300 rounded-md text-sm text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                              <i class="fa-solid fa-plus mr-1"></i> Add Constraint
                            </button>
                          {/if}
                        {:else}
                          <div class="relative">
                            <input type="text" placeholder="Search constraints..." bind:value={mapping.constraints.search}
                              class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                            <div class="mt-1 w-full bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                              {#each getCompatibleConstraints(mapping.newFieldType, mapping.constraints.applied.map(c => c.name)).filter(t => !mapping.constraints.search || t.name.toLowerCase().includes(mapping.constraints.search.toLowerCase())) as ct}
                                <button type="button" onclick={() => {
                                  mapping.constraints.applied = [...mapping.constraints.applied, { name: ct.name, value: '' }];
                                  mapping.constraints.dropdownOpen = false;
                                }}
                                  class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 transition-colors cursor-pointer flex items-center justify-between">
                                  <span class="font-mono text-mono-700">{ct.name}</span>
                                  <span class="text-xs text-mono-500">{ct.parameterTypes.join(', ')}</span>
                                </button>
                              {/each}
                            </div>
                            <button type="button" onclick={() => { mapping.constraints.dropdownOpen = false; }}
                              class="mt-2 text-xs text-mono-500 hover:text-mono-700 transition-colors cursor-pointer">Cancel</button>
                          </div>
                        {/if}
                      </div>

                      <!-- Actions -->
                      <div class="flex items-center space-x-3 pt-2">
                        <button
                          type="button"
                          onclick={() => saveNewFieldForParam(param)}
                          disabled={!mapping.newFieldName.trim()}
                          class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors text-sm {!mapping.newFieldName.trim() ? 'opacity-50 cursor-not-allowed' : ''}"
                        >
                          Save Field
                        </button>
                        <button
                          type="button"
                          onclick={() => cancelCreateField(param)}
                          class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>

        <!-- ================================================================= -->
        <!-- Step 3: Query Parameters -->
        <!-- ================================================================= -->
        {:else if currentStep === 3}
          <div class="space-y-6">
            <div>
              <h2 class="text-lg font-semibold text-mono-800">Query Parameters</h2>
              <p class="text-sm text-mono-500 mt-1">Select or create an object to define the query parameter schema.</p>
            </div>

            <!-- Object selector -->
            {#if !queryParamShowCreate}
              <div>
                <label for="query-object" class="block text-sm text-mono-700 mb-1 font-medium">Query Parameters Object</label>
                <div class="relative">
                  {#if queryParamObjectId}
                    <div class="flex items-center justify-between px-3 py-1.5 text-sm border border-mono-300 rounded-md">
                      <div class="flex items-center space-x-2">
                        <span class="text-mono-800 font-medium">{getObjectName(queryParamObjectId)}</span>
                        <Pill size="sm">{getObjectFieldCount(queryParamObjectId)} fields</Pill>
                      </div>
                      <button type="button" onclick={() => { queryParamObjectId = null; }}
                        class="text-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  {:else}
                    <input id="query-object" type="text" placeholder="Search objects..."
                      bind:value={queryParamSearch}
                      onfocus={() => { queryParamDropdownOpen = true; }}
                      oninput={() => { queryParamDropdownOpen = true; }}
                      class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                    {#if queryParamDropdownOpen}
                      <div class="absolute z-10 mt-1 w-full bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {#each filteredObjectsForQuery() as obj}
                          <button type="button" onclick={() => selectQueryObject(obj.id)}
                            class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 transition-colors cursor-pointer flex items-center justify-between">
                            <span class="text-mono-800">{obj.name}</span>
                            <Pill size="sm">{obj.fields.length} fields</Pill>
                          </button>
                        {/each}
                        {#if filteredObjectsForQuery().length === 0}
                          <div class="px-3 py-2 text-sm text-mono-400">No objects found</div>
                        {/if}
                        <button type="button" onclick={startCreateQueryObject}
                          class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-200 transition-colors cursor-pointer">
                          <i class="fa-solid fa-plus mr-1 text-xs"></i> Create new object
                        </button>
                      </div>
                    {/if}
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Inline create object form -->
            {#if queryParamShowCreate}
              <div class="border border-mono-200 rounded-lg p-4 bg-mono-50 space-y-4">
                <h4 class="text-sm font-medium text-mono-700">Create New Object</h4>

                <div>
                  <label for="query-obj-name" class="block text-sm text-mono-700 mb-1 font-medium">
                    Object Name <span class="text-red-500">*</span>
                  </label>
                  <input id="query-obj-name" type="text" bind:value={queryParamNewName} placeholder="e.g. OrderFilters"
                    class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                </div>

                <div>
                  <label for="query-obj-desc" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
                  <input id="query-obj-desc" type="text" bind:value={queryParamNewDescription} placeholder="Optional description"
                    class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                </div>

                <!-- Fields list -->
                <div>
                  <h5 class="text-sm text-mono-600 mb-2">Fields ({queryParamNewFields.length})</h5>
                  {#if queryParamNewFields.length > 0}
                    <div class="space-y-2 mb-3">
                      {#each queryParamNewFields as field}
                        <div class="flex items-center justify-between px-3 py-2 bg-white border border-mono-200 rounded-md">
                          <div class="flex items-center space-x-2">
                            <span class="font-mono text-sm text-mono-700">{field.name}</span>
                            <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">{field.type}</span>
                            {#if field.container === 'list'}
                              <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">list</span>
                            {/if}
                          </div>
                          <div class="flex items-center space-x-3">
                            <label class="flex items-center space-x-1.5 cursor-pointer">
                              <input type="checkbox" checked={field.optional}
                                onchange={() => toggleQueryFieldOptional(field.id)}
                                class="rounded border-mono-300" />
                              <span class="text-xs text-mono-500">Optional</span>
                            </label>
                            <button type="button" onclick={() => removeFieldFromNewQueryObject(field.id)}
                              class="text-mono-400 hover:text-red-600 transition-colors cursor-pointer">
                              <i class="fa-solid fa-xmark text-xs"></i>
                            </button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}

                  <!-- Field picker -->
                  {#if !queryFieldPickerOpen && !queryFieldShowCreate}
                    <button type="button" onclick={() => { queryFieldPickerOpen = true; }}
                      class="w-full px-3 py-2 border border-dashed border-mono-300 rounded-md text-sm text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                      <i class="fa-solid fa-plus mr-1"></i> Add Field
                    </button>
                  {:else if queryFieldPickerOpen && !queryFieldShowCreate}
                    <div class="relative">
                      <input type="text" placeholder="Search fields..." bind:value={queryFieldPickerSearch}
                        class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                      <div class="mt-1 w-full bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {#each existingFields.filter(f => {
                          const q = queryFieldPickerSearch.toLowerCase();
                          const alreadyAdded = queryParamNewFields.some(nf => nf.id === f.id);
                          return !alreadyAdded && (!q || f.name.toLowerCase().includes(q));
                        }) as field}
                          <button type="button" onclick={() => addFieldToNewQueryObject(field.id)}
                            class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 transition-colors cursor-pointer flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                              <span class="text-mono-800">{field.name}</span>
                              {#if field.container === 'list'}
                                <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">list</span>
                              {/if}
                            </div>
                            <Pill size="sm">{field.type}</Pill>
                          </button>
                        {/each}
                        <button type="button" onclick={() => { queryFieldShowCreate = true; queryNewFieldName = ''; queryNewFieldType = 'str'; queryNewFieldContainer = 'none'; queryNewFieldDescription = ''; queryNewFieldValidators = freshValidatorState(); queryNewFieldConstraints = freshConstraintState(); }}
                          class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-200 transition-colors cursor-pointer">
                          <i class="fa-solid fa-plus mr-1 text-xs"></i> Create new field
                        </button>
                      </div>
                      <button type="button" onclick={() => { queryFieldPickerOpen = false; queryFieldPickerSearch = ''; }}
                        class="mt-2 text-xs text-mono-500 hover:text-mono-700 transition-colors cursor-pointer">Cancel</button>
                    </div>
                  {:else if queryFieldShowCreate}
                    <!-- Inline field creation with validators + constraints -->
                    <div class="border border-mono-200 rounded-lg p-3 bg-white space-y-3">
                      <h6 class="text-xs font-medium text-mono-600 uppercase tracking-wide">New Field</h6>
                      <div>
                        <label for="q-inline-field-name" class="block text-xs text-mono-600 mb-1">Name</label>
                        <input id="q-inline-field-name" type="text" bind:value={queryNewFieldName}
                          class="w-full px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                      </div>
                      <div class="flex items-end gap-3">
                        <div>
                          <span class="block text-xs text-mono-600 mb-1">Container</span>
                          <div class="flex space-x-0">
                            <button type="button" onclick={() => { queryNewFieldContainer = 'none'; }}
                              class="px-2 py-1 text-xs border rounded-l-md transition-colors cursor-pointer {queryNewFieldContainer === 'none' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}">None</button>
                            <button type="button" onclick={() => { queryNewFieldContainer = 'list'; }}
                              class="px-2 py-1 text-xs border-t border-b border-r rounded-r-md transition-colors cursor-pointer {queryNewFieldContainer === 'list' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}">List</button>
                          </div>
                        </div>
                        <div class="flex-1">
                          <label for="q-inline-field-type" class="block text-xs text-mono-600 mb-1">Type</label>
                          <select id="q-inline-field-type" bind:value={queryNewFieldType}
                            class="w-full px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent bg-white">
                            {#each fieldTypes as ft}
                              <option value={ft}>{ft}</option>
                            {/each}
                          </select>
                        </div>
                      </div>

                      <!-- Inline field validators -->
                      <div>
                        <span class="text-xs text-mono-600 mb-1 block">Validators ({queryNewFieldValidators.applied.length})</span>
                        {#if queryNewFieldValidators.applied.length > 0}
                          <div class="space-y-1 mb-1.5">
                            {#each queryNewFieldValidators.applied as v, vi}
                              <div class="flex items-center justify-between px-2 py-1 bg-mono-50 border border-mono-200 rounded text-xs">
                                <div class="flex items-center space-x-1.5">
                                  <span class="text-mono-800">{v.templateName}</span>
                                  <Pill size="sm">{v.mode}</Pill>
                                </div>
                                <button type="button" onclick={() => { queryNewFieldValidators.applied = queryNewFieldValidators.applied.filter((_, i) => i !== vi); }}
                                  class="text-mono-400 hover:text-red-600 cursor-pointer"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                              </div>
                            {/each}
                          </div>
                        {/if}
                        {#if !queryNewFieldValidators.galleryOpen && !queryNewFieldValidators.formTemplate}
                          <button type="button" onclick={() => { queryNewFieldValidators.galleryOpen = true; queryNewFieldValidators.gallerySearch = ''; }}
                            class="w-full px-2 py-1.5 border border-dashed border-mono-300 rounded text-xs text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                            <i class="fa-solid fa-plus mr-1"></i> Add Validator
                          </button>
                        {:else if queryNewFieldValidators.galleryOpen && !queryNewFieldValidators.formTemplate}
                          <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-1.5">
                            <input type="text" placeholder="Search..." bind:value={queryNewFieldValidators.gallerySearch}
                              class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                            <div class="max-h-48 overflow-auto space-y-1">
                              {#each getCompatibleValidators(queryNewFieldType).filter(t => !queryNewFieldValidators.gallerySearch || t.name.toLowerCase().includes(queryNewFieldValidators.gallerySearch.toLowerCase())) as tmpl}
                                <button type="button" onclick={() => { queryNewFieldValidators.formTemplate = tmpl; queryNewFieldValidators.formParams = {}; }}
                                  class="w-full text-left p-1.5 bg-white border border-mono-200 rounded hover:border-mono-400 transition-colors cursor-pointer">
                                  <div class="flex items-center justify-between">
                                    <span class="text-xs text-mono-900 font-medium">{tmpl.name}</span>
                                    <Pill size="sm">{tmpl.mode}</Pill>
                                  </div>
                                  <p class="text-[10px] text-mono-500 mt-0.5">{tmpl.description}</p>
                                </button>
                              {/each}
                            </div>
                            <button type="button" onclick={() => { queryNewFieldValidators.galleryOpen = false; }}
                              class="text-[10px] text-mono-500 hover:text-mono-700 cursor-pointer">Cancel</button>
                          </div>
                        {:else if queryNewFieldValidators.formTemplate}
                          {@const tmpl = queryNewFieldValidators.formTemplate}
                          <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-2">
                            <div class="flex items-center space-x-1.5">
                              <button type="button" onclick={() => { queryNewFieldValidators.formTemplate = null; }}
                                class="text-mono-500 hover:text-mono-700 cursor-pointer"><i class="fa-solid fa-arrow-left text-[10px]"></i></button>
                              <span class="text-xs font-medium text-mono-800">{tmpl.name}</span>
                            </div>
                            {#each tmpl.parameters as p}
                              <div>
                                <label class="block text-[10px] text-mono-600 mb-0.5">{p.name}</label>
                                <input type={p.type === 'number' ? 'number' : 'text'} placeholder={p.placeholder}
                                  value={queryNewFieldValidators.formParams[p.name] ?? ''}
                                  oninput={(e) => { queryNewFieldValidators.formParams[p.name] = (e.target as HTMLInputElement).value; }}
                                  class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                              </div>
                            {/each}
                            <button type="button" onclick={() => {
                              queryNewFieldValidators.applied = [...queryNewFieldValidators.applied, { templateName: tmpl.name, mode: tmpl.mode, params: { ...queryNewFieldValidators.formParams } }];
                              queryNewFieldValidators.formTemplate = null; queryNewFieldValidators.galleryOpen = false;
                            }}
                              class="px-2 py-1 text-[10px] bg-mono-900 text-white rounded hover:bg-mono-800 cursor-pointer transition-colors">Add Validator</button>
                          </div>
                        {/if}
                      </div>

                      <!-- Inline field constraints -->
                      <div>
                        <span class="text-xs text-mono-600 mb-1 block">Constraints ({queryNewFieldConstraints.applied.length})</span>
                        {#if queryNewFieldConstraints.applied.length > 0}
                          <div class="space-y-1 mb-1.5">
                            {#each queryNewFieldConstraints.applied as c, ci}
                              <div class="flex items-center justify-between px-2 py-1 bg-mono-50 border border-mono-200 rounded text-xs">
                                <span class="font-mono text-mono-700">{c.name}</span>
                                <div class="flex items-center space-x-1.5">
                                  <input type="text" value={c.value} oninput={(e) => { queryNewFieldConstraints.applied[ci].value = (e.target as HTMLInputElement).value; }}
                                    class="w-16 px-1.5 py-0.5 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                                  <button type="button" onclick={() => { queryNewFieldConstraints.applied = queryNewFieldConstraints.applied.filter((_, i) => i !== ci); }}
                                    class="text-mono-400 hover:text-red-600 cursor-pointer"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                                </div>
                              </div>
                            {/each}
                          </div>
                        {/if}
                        {#if !queryNewFieldConstraints.dropdownOpen}
                          {@const avail = getCompatibleConstraints(queryNewFieldType, queryNewFieldConstraints.applied.map(c => c.name))}
                          {#if avail.length > 0}
                            <button type="button" onclick={() => { queryNewFieldConstraints.dropdownOpen = true; queryNewFieldConstraints.search = ''; }}
                              class="w-full px-2 py-1.5 border border-dashed border-mono-300 rounded text-xs text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                              <i class="fa-solid fa-plus mr-1"></i> Add Constraint
                            </button>
                          {/if}
                        {:else}
                          <div class="relative">
                            <input type="text" placeholder="Search..." bind:value={queryNewFieldConstraints.search}
                              class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                            <div class="mt-1 w-full bg-white border border-mono-300 rounded shadow-lg max-h-32 overflow-auto">
                              {#each getCompatibleConstraints(queryNewFieldType, queryNewFieldConstraints.applied.map(c => c.name)).filter(t => !queryNewFieldConstraints.search || t.name.includes(queryNewFieldConstraints.search)) as ct}
                                <button type="button" onclick={() => { queryNewFieldConstraints.applied = [...queryNewFieldConstraints.applied, { name: ct.name, value: '' }]; queryNewFieldConstraints.dropdownOpen = false; }}
                                  class="w-full text-left px-2 py-1.5 text-xs hover:bg-mono-50 transition-colors cursor-pointer">
                                  <span class="font-mono text-mono-700">{ct.name}</span>
                                </button>
                              {/each}
                            </div>
                            <button type="button" onclick={() => { queryNewFieldConstraints.dropdownOpen = false; }}
                              class="mt-1 text-[10px] text-mono-500 hover:text-mono-700 cursor-pointer">Cancel</button>
                          </div>
                        {/if}
                      </div>

                      <div class="flex items-center space-x-2">
                        <button type="button" onclick={saveInlineFieldForQuery} disabled={!queryNewFieldName.trim()}
                          class="px-3 py-1 text-xs bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors {!queryNewFieldName.trim() ? 'opacity-50 cursor-not-allowed' : ''}">Save Field</button>
                        <button type="button" onclick={() => { queryFieldShowCreate = false; }}
                          class="px-3 py-1 text-xs border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer transition-colors">Cancel</button>
                      </div>
                    </div>
                  {/if}
                </div>

                <!-- Model Validators for query object -->
                <div>
                  <h5 class="text-sm text-mono-600 mb-2">Model Validators ({queryModelValidators.length})</h5>
                  {#if queryModelValidators.length > 0}
                    <div class="space-y-1.5 mb-2">
                      {#each queryModelValidators as mv, mvi}
                        <div class="flex items-center justify-between px-3 py-1.5 bg-white border border-mono-200 rounded-md">
                          <div class="flex items-center space-x-2">
                            <span class="text-sm text-mono-800">{mv.templateName}</span>
                            <Pill size="sm">{mv.mode}</Pill>
                          </div>
                          <button type="button" onclick={() => { queryModelValidators = queryModelValidators.filter((_, i) => i !== mvi); }}
                            class="text-mono-400 hover:text-red-600 transition-colors cursor-pointer">
                            <i class="fa-solid fa-xmark text-xs"></i>
                          </button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  {#if !queryModelValidatorGalleryOpen && !queryModelValidatorFormTemplate}
                    <button type="button" onclick={() => { queryModelValidatorGalleryOpen = true; queryModelValidatorGallerySearch = ''; }}
                      class="w-full px-3 py-2 border border-dashed border-mono-300 rounded-md text-sm text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                      <i class="fa-solid fa-plus mr-1"></i> Add Model Validator
                    </button>
                  {:else if queryModelValidatorGalleryOpen && !queryModelValidatorFormTemplate}
                    <div class="p-3 bg-mono-50 rounded border border-mono-200 space-y-2">
                      <input type="text" placeholder="Search model validators..." bind:value={queryModelValidatorGallerySearch}
                        class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                      <div class="max-h-64 overflow-auto space-y-1.5">
                        {#each modelValidatorTemplates.filter(t => !queryModelValidatorGallerySearch || t.name.toLowerCase().includes(queryModelValidatorGallerySearch.toLowerCase())) as tmpl}
                          <button type="button" onclick={() => { queryModelValidatorFormTemplate = tmpl; queryModelValidatorFieldMappings = {}; }}
                            class="w-full text-left p-2 bg-white border border-mono-200 rounded-md hover:border-mono-400 transition-colors cursor-pointer">
                            <div class="flex items-center justify-between">
                              <span class="text-sm text-mono-900 font-medium">{tmpl.name}</span>
                              <Pill size="sm">{tmpl.mode}</Pill>
                            </div>
                            <p class="text-xs text-mono-500 mt-0.5">{tmpl.description}</p>
                            <div class="flex flex-wrap gap-1 mt-1">
                              {#each tmpl.fieldMappings as fm}
                                <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-200 text-mono-600">{fm.label}</span>
                              {/each}
                            </div>
                          </button>
                        {/each}
                      </div>
                      <button type="button" onclick={() => { queryModelValidatorGalleryOpen = false; }}
                        class="text-xs text-mono-500 hover:text-mono-700 cursor-pointer">Cancel</button>
                    </div>
                  {:else if queryModelValidatorFormTemplate}
                    {@const tmpl = queryModelValidatorFormTemplate}
                    <div class="p-3 bg-mono-50 rounded border border-mono-200 space-y-3">
                      <div class="flex items-center space-x-2">
                        <button type="button" onclick={() => { queryModelValidatorFormTemplate = null; }}
                          class="text-mono-500 hover:text-mono-700 transition-colors cursor-pointer">
                          <i class="fa-solid fa-arrow-left text-xs"></i>
                        </button>
                        <span class="text-sm font-medium text-mono-800">{tmpl.name}</span>
                      </div>
                      <p class="text-xs text-mono-500">{tmpl.description}</p>
                      {#each tmpl.fieldMappings as fm}
                        <div>
                          <label class="block text-xs text-mono-600 mb-1">{fm.label} {#if fm.required}<span class="text-red-500">*</span>{/if}</label>
                          <select value={queryModelValidatorFieldMappings[fm.label] ?? ''}
                            onchange={(e) => { queryModelValidatorFieldMappings[fm.label] = (e.target as HTMLSelectElement).value; }}
                            class="w-full px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent bg-white">
                            <option value="">Select field...</option>
                            {#each queryParamNewFields.filter(f => fm.compatibleTypes.includes(f.type)) as f}
                              <option value={f.name}>{f.name} ({f.type})</option>
                            {/each}
                          </select>
                        </div>
                      {/each}
                      <button type="button" onclick={() => {
                        queryModelValidators = [...queryModelValidators, { templateName: tmpl.name, mode: tmpl.mode, fieldMappings: { ...queryModelValidatorFieldMappings } }];
                        queryModelValidatorFormTemplate = null; queryModelValidatorGalleryOpen = false;
                      }}
                        class="px-3 py-1 text-xs bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors">Add Model Validator</button>
                    </div>
                  {/if}
                </div>

                <!-- Object actions -->
                <div class="flex items-center space-x-3 pt-2">
                  <button type="button" onclick={saveNewQueryObject} disabled={!queryParamNewName.trim()}
                    class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors text-sm {!queryParamNewName.trim() ? 'opacity-50 cursor-not-allowed' : ''}">Save Object</button>
                  <button type="button" onclick={cancelCreateQueryObject}
                    class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer transition-colors text-sm">Cancel</button>
                </div>
              </div>
            {/if}
          </div>

        <!-- ================================================================= -->
        <!-- Step 4: Request Body -->
        <!-- ================================================================= -->
        {:else if currentStep === 4}
          <div class="space-y-6">
            <div>
              <h2 class="text-lg font-semibold text-mono-800">Request Body</h2>
              <p class="text-sm text-mono-500 mt-1">Select or create an object to define the request body schema.</p>
            </div>

            {#if !requestBodyShowCreate}
              <div>
                <label for="request-object" class="block text-sm text-mono-700 mb-1 font-medium">Request Body Schema</label>
                <div class="relative">
                  {#if requestBodyObjectId}
                    <div class="flex items-center justify-between px-3 py-1.5 text-sm border border-mono-300 rounded-md">
                      <div class="flex items-center space-x-2">
                        <span class="text-mono-800 font-medium">{getObjectName(requestBodyObjectId)}</span>
                        <Pill size="sm">{getObjectFieldCount(requestBodyObjectId)} fields</Pill>
                      </div>
                      <button type="button" onclick={() => { requestBodyObjectId = null; }}
                        class="text-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  {:else}
                    <input id="request-object" type="text" placeholder="Search objects..."
                      bind:value={requestBodySearch}
                      onfocus={() => { requestBodyDropdownOpen = true; }}
                      oninput={() => { requestBodyDropdownOpen = true; }}
                      class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                    {#if requestBodyDropdownOpen}
                      <div class="absolute z-10 mt-1 w-full bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {#each filteredObjectsForRequest() as obj}
                          <button type="button" onclick={() => selectRequestObject(obj.id)}
                            class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 transition-colors cursor-pointer flex items-center justify-between">
                            <span class="text-mono-800">{obj.name}</span>
                            <Pill size="sm">{obj.fields.length} fields</Pill>
                          </button>
                        {/each}
                        {#if filteredObjectsForRequest().length === 0}
                          <div class="px-3 py-2 text-sm text-mono-400">No objects found</div>
                        {/if}
                        <button type="button" onclick={startCreateRequestObject}
                          class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-200 transition-colors cursor-pointer">
                          <i class="fa-solid fa-plus mr-1 text-xs"></i> Create new object
                        </button>
                      </div>
                    {/if}
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Inline create object form -->
            {#if requestBodyShowCreate}
              <div class="border border-mono-200 rounded-lg p-4 bg-mono-50 space-y-4">
                <h4 class="text-sm font-medium text-mono-700">Create New Object</h4>

                <div>
                  <label for="req-obj-name" class="block text-sm text-mono-700 mb-1 font-medium">
                    Object Name <span class="text-red-500">*</span>
                  </label>
                  <input id="req-obj-name" type="text" bind:value={requestBodyNewName} placeholder="e.g. CreateOrderRequest"
                    class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                </div>

                <div>
                  <label for="req-obj-desc" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
                  <input id="req-obj-desc" type="text" bind:value={requestBodyNewDescription} placeholder="Optional description"
                    class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                </div>

                <!-- Fields list -->
                <div>
                  <h5 class="text-sm text-mono-600 mb-2">Fields ({requestBodyNewFields.length})</h5>
                  {#if requestBodyNewFields.length > 0}
                    <div class="space-y-2 mb-3">
                      {#each requestBodyNewFields as field}
                        <div class="flex items-center justify-between px-3 py-2 bg-white border border-mono-200 rounded-md">
                          <div class="flex items-center space-x-2">
                            <span class="font-mono text-sm text-mono-700">{field.name}</span>
                            <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">{field.type}</span>
                            {#if field.container === 'list'}
                              <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">list</span>
                            {/if}
                          </div>
                          <div class="flex items-center space-x-3">
                            <label class="flex items-center space-x-1.5 cursor-pointer">
                              <input type="checkbox" checked={field.optional}
                                onchange={() => toggleRequestFieldOptional(field.id)}
                                class="rounded border-mono-300" />
                              <span class="text-xs text-mono-500">Optional</span>
                            </label>
                            <button type="button" onclick={() => removeFieldFromNewRequestObject(field.id)}
                              class="text-mono-400 hover:text-red-600 transition-colors cursor-pointer">
                              <i class="fa-solid fa-xmark text-xs"></i>
                            </button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}

                  {#if !reqFieldPickerOpen && !reqFieldShowCreate}
                    <button type="button" onclick={() => { reqFieldPickerOpen = true; }}
                      class="w-full px-3 py-2 border border-dashed border-mono-300 rounded-md text-sm text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                      <i class="fa-solid fa-plus mr-1"></i> Add Field
                    </button>
                  {:else if reqFieldPickerOpen && !reqFieldShowCreate}
                    <div class="relative">
                      <input type="text" placeholder="Search fields..." bind:value={reqFieldPickerSearch}
                        class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                      <div class="mt-1 w-full bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {#each existingFields.filter(f => {
                          const q = reqFieldPickerSearch.toLowerCase();
                          const alreadyAdded = requestBodyNewFields.some(nf => nf.id === f.id);
                          return !alreadyAdded && (!q || f.name.toLowerCase().includes(q));
                        }) as field}
                          <button type="button" onclick={() => addFieldToNewRequestObject(field.id)}
                            class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 transition-colors cursor-pointer flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                              <span class="text-mono-800">{field.name}</span>
                              {#if field.container === 'list'}
                                <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">list</span>
                              {/if}
                            </div>
                            <Pill size="sm">{field.type}</Pill>
                          </button>
                        {/each}
                        <button type="button" onclick={() => { reqFieldShowCreate = true; reqNewFieldName = ''; reqNewFieldType = 'str'; reqNewFieldContainer = 'none'; reqNewFieldDescription = ''; reqNewFieldValidators = freshValidatorState(); reqNewFieldConstraints = freshConstraintState(); }}
                          class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-200 transition-colors cursor-pointer">
                          <i class="fa-solid fa-plus mr-1 text-xs"></i> Create new field
                        </button>
                      </div>
                      <button type="button" onclick={() => { reqFieldPickerOpen = false; reqFieldPickerSearch = ''; }}
                        class="mt-2 text-xs text-mono-500 hover:text-mono-700 transition-colors cursor-pointer">Cancel</button>
                    </div>
                  {:else if reqFieldShowCreate}
                    <div class="border border-mono-200 rounded-lg p-3 bg-white space-y-3">
                      <h6 class="text-xs font-medium text-mono-600 uppercase tracking-wide">New Field</h6>
                      <div>
                        <label for="r-inline-field-name" class="block text-xs text-mono-600 mb-1">Name</label>
                        <input id="r-inline-field-name" type="text" bind:value={reqNewFieldName}
                          class="w-full px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                      </div>
                      <div class="flex items-end gap-3">
                        <div>
                          <span class="block text-xs text-mono-600 mb-1">Container</span>
                          <div class="flex space-x-0">
                            <button type="button" onclick={() => { reqNewFieldContainer = 'none'; }}
                              class="px-2 py-1 text-xs border rounded-l-md transition-colors cursor-pointer {reqNewFieldContainer === 'none' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}">None</button>
                            <button type="button" onclick={() => { reqNewFieldContainer = 'list'; }}
                              class="px-2 py-1 text-xs border-t border-b border-r rounded-r-md transition-colors cursor-pointer {reqNewFieldContainer === 'list' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}">List</button>
                          </div>
                        </div>
                        <div class="flex-1">
                          <label for="r-inline-field-type" class="block text-xs text-mono-600 mb-1">Type</label>
                          <select id="r-inline-field-type" bind:value={reqNewFieldType}
                            class="w-full px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent bg-white">
                            {#each fieldTypes as ft}
                              <option value={ft}>{ft}</option>
                            {/each}
                          </select>
                        </div>
                      </div>

                      <!-- Validators -->
                      <div>
                        <span class="text-xs text-mono-600 mb-1 block">Validators ({reqNewFieldValidators.applied.length})</span>
                        {#if reqNewFieldValidators.applied.length > 0}
                          <div class="space-y-1 mb-1.5">
                            {#each reqNewFieldValidators.applied as v, vi}
                              <div class="flex items-center justify-between px-2 py-1 bg-mono-50 border border-mono-200 rounded text-xs">
                                <div class="flex items-center space-x-1.5"><span class="text-mono-800">{v.templateName}</span><Pill size="sm">{v.mode}</Pill></div>
                                <button type="button" onclick={() => { reqNewFieldValidators.applied = reqNewFieldValidators.applied.filter((_, i) => i !== vi); }}
                                  class="text-mono-400 hover:text-red-600 cursor-pointer"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                              </div>
                            {/each}
                          </div>
                        {/if}
                        {#if !reqNewFieldValidators.galleryOpen && !reqNewFieldValidators.formTemplate}
                          <button type="button" onclick={() => { reqNewFieldValidators.galleryOpen = true; reqNewFieldValidators.gallerySearch = ''; }}
                            class="w-full px-2 py-1.5 border border-dashed border-mono-300 rounded text-xs text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                            <i class="fa-solid fa-plus mr-1"></i> Add Validator
                          </button>
                        {:else if reqNewFieldValidators.galleryOpen && !reqNewFieldValidators.formTemplate}
                          <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-1.5">
                            <input type="text" placeholder="Search..." bind:value={reqNewFieldValidators.gallerySearch}
                              class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                            <div class="max-h-48 overflow-auto space-y-1">
                              {#each getCompatibleValidators(reqNewFieldType).filter(t => !reqNewFieldValidators.gallerySearch || t.name.toLowerCase().includes(reqNewFieldValidators.gallerySearch.toLowerCase())) as tmpl}
                                <button type="button" onclick={() => { reqNewFieldValidators.formTemplate = tmpl; reqNewFieldValidators.formParams = {}; }}
                                  class="w-full text-left p-1.5 bg-white border border-mono-200 rounded hover:border-mono-400 transition-colors cursor-pointer">
                                  <div class="flex items-center justify-between"><span class="text-xs text-mono-900 font-medium">{tmpl.name}</span><Pill size="sm">{tmpl.mode}</Pill></div>
                                  <p class="text-[10px] text-mono-500 mt-0.5">{tmpl.description}</p>
                                </button>
                              {/each}
                            </div>
                            <button type="button" onclick={() => { reqNewFieldValidators.galleryOpen = false; }}
                              class="text-[10px] text-mono-500 hover:text-mono-700 cursor-pointer">Cancel</button>
                          </div>
                        {:else if reqNewFieldValidators.formTemplate}
                          {@const tmpl = reqNewFieldValidators.formTemplate}
                          <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-2">
                            <div class="flex items-center space-x-1.5">
                              <button type="button" onclick={() => { reqNewFieldValidators.formTemplate = null; }}
                                class="text-mono-500 hover:text-mono-700 cursor-pointer"><i class="fa-solid fa-arrow-left text-[10px]"></i></button>
                              <span class="text-xs font-medium text-mono-800">{tmpl.name}</span>
                            </div>
                            {#each tmpl.parameters as p}
                              <div>
                                <label class="block text-[10px] text-mono-600 mb-0.5">{p.name}</label>
                                <input type={p.type === 'number' ? 'number' : 'text'} placeholder={p.placeholder}
                                  value={reqNewFieldValidators.formParams[p.name] ?? ''}
                                  oninput={(e) => { reqNewFieldValidators.formParams[p.name] = (e.target as HTMLInputElement).value; }}
                                  class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                              </div>
                            {/each}
                            <button type="button" onclick={() => {
                              reqNewFieldValidators.applied = [...reqNewFieldValidators.applied, { templateName: tmpl.name, mode: tmpl.mode, params: { ...reqNewFieldValidators.formParams } }];
                              reqNewFieldValidators.formTemplate = null; reqNewFieldValidators.galleryOpen = false;
                            }}
                              class="px-2 py-1 text-[10px] bg-mono-900 text-white rounded hover:bg-mono-800 cursor-pointer transition-colors">Add Validator</button>
                          </div>
                        {/if}
                      </div>

                      <!-- Constraints -->
                      <div>
                        <span class="text-xs text-mono-600 mb-1 block">Constraints ({reqNewFieldConstraints.applied.length})</span>
                        {#if reqNewFieldConstraints.applied.length > 0}
                          <div class="space-y-1 mb-1.5">
                            {#each reqNewFieldConstraints.applied as c, ci}
                              <div class="flex items-center justify-between px-2 py-1 bg-mono-50 border border-mono-200 rounded text-xs">
                                <span class="font-mono text-mono-700">{c.name}</span>
                                <div class="flex items-center space-x-1.5">
                                  <input type="text" value={c.value} oninput={(e) => { reqNewFieldConstraints.applied[ci].value = (e.target as HTMLInputElement).value; }}
                                    class="w-16 px-1.5 py-0.5 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                                  <button type="button" onclick={() => { reqNewFieldConstraints.applied = reqNewFieldConstraints.applied.filter((_, i) => i !== ci); }}
                                    class="text-mono-400 hover:text-red-600 cursor-pointer"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                                </div>
                              </div>
                            {/each}
                          </div>
                        {/if}
                        {#if !reqNewFieldConstraints.dropdownOpen}
                          {@const avail = getCompatibleConstraints(reqNewFieldType, reqNewFieldConstraints.applied.map(c => c.name))}
                          {#if avail.length > 0}
                            <button type="button" onclick={() => { reqNewFieldConstraints.dropdownOpen = true; reqNewFieldConstraints.search = ''; }}
                              class="w-full px-2 py-1.5 border border-dashed border-mono-300 rounded text-xs text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                              <i class="fa-solid fa-plus mr-1"></i> Add Constraint
                            </button>
                          {/if}
                        {:else}
                          <div class="relative">
                            <input type="text" placeholder="Search..." bind:value={reqNewFieldConstraints.search}
                              class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                            <div class="mt-1 w-full bg-white border border-mono-300 rounded shadow-lg max-h-32 overflow-auto">
                              {#each getCompatibleConstraints(reqNewFieldType, reqNewFieldConstraints.applied.map(c => c.name)).filter(t => !reqNewFieldConstraints.search || t.name.includes(reqNewFieldConstraints.search)) as ct}
                                <button type="button" onclick={() => { reqNewFieldConstraints.applied = [...reqNewFieldConstraints.applied, { name: ct.name, value: '' }]; reqNewFieldConstraints.dropdownOpen = false; }}
                                  class="w-full text-left px-2 py-1.5 text-xs hover:bg-mono-50 transition-colors cursor-pointer">
                                  <span class="font-mono text-mono-700">{ct.name}</span>
                                </button>
                              {/each}
                            </div>
                            <button type="button" onclick={() => { reqNewFieldConstraints.dropdownOpen = false; }}
                              class="mt-1 text-[10px] text-mono-500 hover:text-mono-700 cursor-pointer">Cancel</button>
                          </div>
                        {/if}
                      </div>

                      <div class="flex items-center space-x-2">
                        <button type="button" onclick={saveInlineFieldForRequest} disabled={!reqNewFieldName.trim()}
                          class="px-3 py-1 text-xs bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors {!reqNewFieldName.trim() ? 'opacity-50 cursor-not-allowed' : ''}">Save Field</button>
                        <button type="button" onclick={() => { reqFieldShowCreate = false; }}
                          class="px-3 py-1 text-xs border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer transition-colors">Cancel</button>
                      </div>
                    </div>
                  {/if}
                </div>

                <!-- Model Validators for request body object -->
                <div>
                  <h5 class="text-sm text-mono-600 mb-2">Model Validators ({reqModelValidators.length})</h5>
                  {#if reqModelValidators.length > 0}
                    <div class="space-y-1.5 mb-2">
                      {#each reqModelValidators as mv, mvi}
                        <div class="flex items-center justify-between px-3 py-1.5 bg-white border border-mono-200 rounded-md">
                          <div class="flex items-center space-x-2"><span class="text-sm text-mono-800">{mv.templateName}</span><Pill size="sm">{mv.mode}</Pill></div>
                          <button type="button" onclick={() => { reqModelValidators = reqModelValidators.filter((_, i) => i !== mvi); }}
                            class="text-mono-400 hover:text-red-600 transition-colors cursor-pointer"><i class="fa-solid fa-xmark text-xs"></i></button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  {#if !reqModelValidatorGalleryOpen && !reqModelValidatorFormTemplate}
                    <button type="button" onclick={() => { reqModelValidatorGalleryOpen = true; reqModelValidatorGallerySearch = ''; }}
                      class="w-full px-3 py-2 border border-dashed border-mono-300 rounded-md text-sm text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                      <i class="fa-solid fa-plus mr-1"></i> Add Model Validator
                    </button>
                  {:else if reqModelValidatorGalleryOpen && !reqModelValidatorFormTemplate}
                    <div class="p-3 bg-mono-50 rounded border border-mono-200 space-y-2">
                      <input type="text" placeholder="Search model validators..." bind:value={reqModelValidatorGallerySearch}
                        class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                      <div class="max-h-64 overflow-auto space-y-1.5">
                        {#each modelValidatorTemplates.filter(t => !reqModelValidatorGallerySearch || t.name.toLowerCase().includes(reqModelValidatorGallerySearch.toLowerCase())) as tmpl}
                          <button type="button" onclick={() => { reqModelValidatorFormTemplate = tmpl; reqModelValidatorFieldMappings = {}; }}
                            class="w-full text-left p-2 bg-white border border-mono-200 rounded-md hover:border-mono-400 transition-colors cursor-pointer">
                            <div class="flex items-center justify-between"><span class="text-sm text-mono-900 font-medium">{tmpl.name}</span><Pill size="sm">{tmpl.mode}</Pill></div>
                            <p class="text-xs text-mono-500 mt-0.5">{tmpl.description}</p>
                            <div class="flex flex-wrap gap-1 mt-1">
                              {#each tmpl.fieldMappings as fm}
                                <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-200 text-mono-600">{fm.label}</span>
                              {/each}
                            </div>
                          </button>
                        {/each}
                      </div>
                      <button type="button" onclick={() => { reqModelValidatorGalleryOpen = false; }}
                        class="text-xs text-mono-500 hover:text-mono-700 cursor-pointer">Cancel</button>
                    </div>
                  {:else if reqModelValidatorFormTemplate}
                    {@const tmpl = reqModelValidatorFormTemplate}
                    <div class="p-3 bg-mono-50 rounded border border-mono-200 space-y-3">
                      <div class="flex items-center space-x-2">
                        <button type="button" onclick={() => { reqModelValidatorFormTemplate = null; }}
                          class="text-mono-500 hover:text-mono-700 transition-colors cursor-pointer"><i class="fa-solid fa-arrow-left text-xs"></i></button>
                        <span class="text-sm font-medium text-mono-800">{tmpl.name}</span>
                      </div>
                      <p class="text-xs text-mono-500">{tmpl.description}</p>
                      {#each tmpl.fieldMappings as fm}
                        <div>
                          <label class="block text-xs text-mono-600 mb-1">{fm.label} {#if fm.required}<span class="text-red-500">*</span>{/if}</label>
                          <select value={reqModelValidatorFieldMappings[fm.label] ?? ''}
                            onchange={(e) => { reqModelValidatorFieldMappings[fm.label] = (e.target as HTMLSelectElement).value; }}
                            class="w-full px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent bg-white">
                            <option value="">Select field...</option>
                            {#each requestBodyNewFields.filter(f => fm.compatibleTypes.includes(f.type)) as f}
                              <option value={f.name}>{f.name} ({f.type})</option>
                            {/each}
                          </select>
                        </div>
                      {/each}
                      <button type="button" onclick={() => {
                        reqModelValidators = [...reqModelValidators, { templateName: tmpl.name, mode: tmpl.mode, fieldMappings: { ...reqModelValidatorFieldMappings } }];
                        reqModelValidatorFormTemplate = null; reqModelValidatorGalleryOpen = false;
                      }}
                        class="px-3 py-1 text-xs bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors">Add Model Validator</button>
                    </div>
                  {/if}
                </div>

                <div class="flex items-center space-x-3 pt-2">
                  <button type="button" onclick={saveNewRequestObject} disabled={!requestBodyNewName.trim()}
                    class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors text-sm {!requestBodyNewName.trim() ? 'opacity-50 cursor-not-allowed' : ''}">Save Object</button>
                  <button type="button" onclick={cancelCreateRequestObject}
                    class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer transition-colors text-sm">Cancel</button>
                </div>
              </div>
            {/if}
          </div>

        <!-- ================================================================= -->
        <!-- Step 5: Response Body -->
        <!-- ================================================================= -->
        {:else if currentStep === 5}
          <div class="space-y-6">
            <div>
              <h2 class="text-lg font-semibold text-mono-800">Response Body</h2>
              <p class="text-sm text-mono-500 mt-1">Define the response schema, shape, and envelope options.</p>
            </div>

            <!-- Object selector -->
            {#if !responseBodyShowCreate}
              <div>
                <label for="response-object" class="block text-sm text-mono-700 mb-1 font-medium">Response Body Schema</label>
                <div class="relative">
                  {#if responseBodyObjectId}
                    <div class="flex items-center justify-between px-3 py-1.5 text-sm border border-mono-300 rounded-md">
                      <div class="flex items-center space-x-2">
                        <span class="text-mono-800 font-medium">{getObjectName(responseBodyObjectId)}</span>
                        <Pill size="sm">{getObjectFieldCount(responseBodyObjectId)} fields</Pill>
                      </div>
                      <button type="button" onclick={() => { responseBodyObjectId = null; }}
                        class="text-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  {:else}
                    <input id="response-object" type="text" placeholder="Search objects..."
                      bind:value={responseBodySearch}
                      onfocus={() => { responseBodyDropdownOpen = true; }}
                      oninput={() => { responseBodyDropdownOpen = true; }}
                      class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                    {#if responseBodyDropdownOpen}
                      <div class="absolute z-10 mt-1 w-full bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {#each filteredObjectsForResponse() as obj}
                          <button type="button" onclick={() => selectResponseObject(obj.id)}
                            class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 transition-colors cursor-pointer flex items-center justify-between">
                            <span class="text-mono-800">{obj.name}</span>
                            <Pill size="sm">{obj.fields.length} fields</Pill>
                          </button>
                        {/each}
                        {#if filteredObjectsForResponse().length === 0}
                          <div class="px-3 py-2 text-sm text-mono-400">No objects found</div>
                        {/if}
                        <button type="button" onclick={startCreateResponseObject}
                          class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-200 transition-colors cursor-pointer">
                          <i class="fa-solid fa-plus mr-1 text-xs"></i> Create new object
                        </button>
                      </div>
                    {/if}
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Inline create object form -->
            {#if responseBodyShowCreate}
              <div class="border border-mono-200 rounded-lg p-4 bg-mono-50 space-y-4">
                <h4 class="text-sm font-medium text-mono-700">Create New Object</h4>

                <div>
                  <label for="resp-obj-name" class="block text-sm text-mono-700 mb-1 font-medium">
                    Object Name <span class="text-red-500">*</span>
                  </label>
                  <input id="resp-obj-name" type="text" bind:value={responseBodyNewName} placeholder="e.g. OrderResponse"
                    class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                </div>

                <div>
                  <label for="resp-obj-desc" class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
                  <input id="resp-obj-desc" type="text" bind:value={responseBodyNewDescription} placeholder="Optional description"
                    class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                </div>

                <!-- Fields list -->
                <div>
                  <h5 class="text-sm text-mono-600 mb-2">Fields ({responseBodyNewFields.length})</h5>
                  {#if responseBodyNewFields.length > 0}
                    <div class="space-y-2 mb-3">
                      {#each responseBodyNewFields as field}
                        <div class="flex items-center justify-between px-3 py-2 bg-white border border-mono-200 rounded-md">
                          <div class="flex items-center space-x-2">
                            <span class="font-mono text-sm text-mono-700">{field.name}</span>
                            <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">{field.type}</span>
                            {#if field.container === 'list'}
                              <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">list</span>
                            {/if}
                          </div>
                          <div class="flex items-center space-x-3">
                            <label class="flex items-center space-x-1.5 cursor-pointer">
                              <input type="checkbox" checked={field.optional}
                                onchange={() => toggleResponseFieldOptional(field.id)}
                                class="rounded border-mono-300" />
                              <span class="text-xs text-mono-500">Optional</span>
                            </label>
                            <button type="button" onclick={() => removeFieldFromNewResponseObject(field.id)}
                              class="text-mono-400 hover:text-red-600 transition-colors cursor-pointer">
                              <i class="fa-solid fa-xmark text-xs"></i>
                            </button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}

                  {#if !respFieldPickerOpen && !respFieldShowCreate}
                    <button type="button" onclick={() => { respFieldPickerOpen = true; }}
                      class="w-full px-3 py-2 border border-dashed border-mono-300 rounded-md text-sm text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                      <i class="fa-solid fa-plus mr-1"></i> Add Field
                    </button>
                  {:else if respFieldPickerOpen && !respFieldShowCreate}
                    <div class="relative">
                      <input type="text" placeholder="Search fields..." bind:value={respFieldPickerSearch}
                        class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                      <div class="mt-1 w-full bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {#each existingFields.filter(f => {
                          const q = respFieldPickerSearch.toLowerCase();
                          const alreadyAdded = responseBodyNewFields.some(nf => nf.id === f.id);
                          return !alreadyAdded && (!q || f.name.toLowerCase().includes(q));
                        }) as field}
                          <button type="button" onclick={() => addFieldToNewResponseObject(field.id)}
                            class="w-full text-left px-3 py-2 text-sm hover:bg-mono-50 transition-colors cursor-pointer flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                              <span class="text-mono-800">{field.name}</span>
                              {#if field.container === 'list'}
                                <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">list</span>
                              {/if}
                            </div>
                            <Pill size="sm">{field.type}</Pill>
                          </button>
                        {/each}
                        <button type="button" onclick={() => { respFieldShowCreate = true; respNewFieldName = ''; respNewFieldType = 'str'; respNewFieldContainer = 'none'; respNewFieldDescription = ''; respNewFieldValidators = freshValidatorState(); respNewFieldConstraints = freshConstraintState(); }}
                          class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 border-t border-mono-200 transition-colors cursor-pointer">
                          <i class="fa-solid fa-plus mr-1 text-xs"></i> Create new field
                        </button>
                      </div>
                      <button type="button" onclick={() => { respFieldPickerOpen = false; respFieldPickerSearch = ''; }}
                        class="mt-2 text-xs text-mono-500 hover:text-mono-700 transition-colors cursor-pointer">Cancel</button>
                    </div>
                  {:else if respFieldShowCreate}
                    <div class="border border-mono-200 rounded-lg p-3 bg-white space-y-3">
                      <h6 class="text-xs font-medium text-mono-600 uppercase tracking-wide">New Field</h6>
                      <div>
                        <label for="resp-inline-field-name" class="block text-xs text-mono-600 mb-1">Name</label>
                        <input id="resp-inline-field-name" type="text" bind:value={respNewFieldName}
                          class="w-full px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                      </div>
                      <div class="flex items-end gap-3">
                        <div>
                          <span class="block text-xs text-mono-600 mb-1">Container</span>
                          <div class="flex space-x-0">
                            <button type="button" onclick={() => { respNewFieldContainer = 'none'; }}
                              class="px-2 py-1 text-xs border rounded-l-md transition-colors cursor-pointer {respNewFieldContainer === 'none' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}">None</button>
                            <button type="button" onclick={() => { respNewFieldContainer = 'list'; }}
                              class="px-2 py-1 text-xs border-t border-b border-r rounded-r-md transition-colors cursor-pointer {respNewFieldContainer === 'list' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}">List</button>
                          </div>
                        </div>
                        <div class="flex-1">
                          <label for="resp-inline-field-type" class="block text-xs text-mono-600 mb-1">Type</label>
                          <select id="resp-inline-field-type" bind:value={respNewFieldType}
                            class="w-full px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent bg-white">
                            {#each fieldTypes as ft}
                              <option value={ft}>{ft}</option>
                            {/each}
                          </select>
                        </div>
                      </div>

                      <!-- Validators -->
                      <div>
                        <span class="text-xs text-mono-600 mb-1 block">Validators ({respNewFieldValidators.applied.length})</span>
                        {#if respNewFieldValidators.applied.length > 0}
                          <div class="space-y-1 mb-1.5">
                            {#each respNewFieldValidators.applied as v, vi}
                              <div class="flex items-center justify-between px-2 py-1 bg-mono-50 border border-mono-200 rounded text-xs">
                                <div class="flex items-center space-x-1.5"><span class="text-mono-800">{v.templateName}</span><Pill size="sm">{v.mode}</Pill></div>
                                <button type="button" onclick={() => { respNewFieldValidators.applied = respNewFieldValidators.applied.filter((_, i) => i !== vi); }}
                                  class="text-mono-400 hover:text-red-600 cursor-pointer"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                              </div>
                            {/each}
                          </div>
                        {/if}
                        {#if !respNewFieldValidators.galleryOpen && !respNewFieldValidators.formTemplate}
                          <button type="button" onclick={() => { respNewFieldValidators.galleryOpen = true; respNewFieldValidators.gallerySearch = ''; }}
                            class="w-full px-2 py-1.5 border border-dashed border-mono-300 rounded text-xs text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                            <i class="fa-solid fa-plus mr-1"></i> Add Validator
                          </button>
                        {:else if respNewFieldValidators.galleryOpen && !respNewFieldValidators.formTemplate}
                          <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-1.5">
                            <input type="text" placeholder="Search..." bind:value={respNewFieldValidators.gallerySearch}
                              class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                            <div class="max-h-48 overflow-auto space-y-1">
                              {#each getCompatibleValidators(respNewFieldType).filter(t => !respNewFieldValidators.gallerySearch || t.name.toLowerCase().includes(respNewFieldValidators.gallerySearch.toLowerCase())) as tmpl}
                                <button type="button" onclick={() => { respNewFieldValidators.formTemplate = tmpl; respNewFieldValidators.formParams = {}; }}
                                  class="w-full text-left p-1.5 bg-white border border-mono-200 rounded hover:border-mono-400 transition-colors cursor-pointer">
                                  <div class="flex items-center justify-between"><span class="text-xs text-mono-900 font-medium">{tmpl.name}</span><Pill size="sm">{tmpl.mode}</Pill></div>
                                  <p class="text-[10px] text-mono-500 mt-0.5">{tmpl.description}</p>
                                </button>
                              {/each}
                            </div>
                            <button type="button" onclick={() => { respNewFieldValidators.galleryOpen = false; }}
                              class="text-[10px] text-mono-500 hover:text-mono-700 cursor-pointer">Cancel</button>
                          </div>
                        {:else if respNewFieldValidators.formTemplate}
                          {@const tmpl = respNewFieldValidators.formTemplate}
                          <div class="p-2 bg-mono-50 rounded border border-mono-200 space-y-2">
                            <div class="flex items-center space-x-1.5">
                              <button type="button" onclick={() => { respNewFieldValidators.formTemplate = null; }}
                                class="text-mono-500 hover:text-mono-700 cursor-pointer"><i class="fa-solid fa-arrow-left text-[10px]"></i></button>
                              <span class="text-xs font-medium text-mono-800">{tmpl.name}</span>
                            </div>
                            {#each tmpl.parameters as p}
                              <div>
                                <label class="block text-[10px] text-mono-600 mb-0.5">{p.name}</label>
                                <input type={p.type === 'number' ? 'number' : 'text'} placeholder={p.placeholder}
                                  value={respNewFieldValidators.formParams[p.name] ?? ''}
                                  oninput={(e) => { respNewFieldValidators.formParams[p.name] = (e.target as HTMLInputElement).value; }}
                                  class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                              </div>
                            {/each}
                            <button type="button" onclick={() => {
                              respNewFieldValidators.applied = [...respNewFieldValidators.applied, { templateName: tmpl.name, mode: tmpl.mode, params: { ...respNewFieldValidators.formParams } }];
                              respNewFieldValidators.formTemplate = null; respNewFieldValidators.galleryOpen = false;
                            }}
                              class="px-2 py-1 text-[10px] bg-mono-900 text-white rounded hover:bg-mono-800 cursor-pointer transition-colors">Add Validator</button>
                          </div>
                        {/if}
                      </div>

                      <!-- Constraints -->
                      <div>
                        <span class="text-xs text-mono-600 mb-1 block">Constraints ({respNewFieldConstraints.applied.length})</span>
                        {#if respNewFieldConstraints.applied.length > 0}
                          <div class="space-y-1 mb-1.5">
                            {#each respNewFieldConstraints.applied as c, ci}
                              <div class="flex items-center justify-between px-2 py-1 bg-mono-50 border border-mono-200 rounded text-xs">
                                <span class="font-mono text-mono-700">{c.name}</span>
                                <div class="flex items-center space-x-1.5">
                                  <input type="text" value={c.value} oninput={(e) => { respNewFieldConstraints.applied[ci].value = (e.target as HTMLInputElement).value; }}
                                    class="w-16 px-1.5 py-0.5 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                                  <button type="button" onclick={() => { respNewFieldConstraints.applied = respNewFieldConstraints.applied.filter((_, i) => i !== ci); }}
                                    class="text-mono-400 hover:text-red-600 cursor-pointer"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                                </div>
                              </div>
                            {/each}
                          </div>
                        {/if}
                        {#if !respNewFieldConstraints.dropdownOpen}
                          {@const avail = getCompatibleConstraints(respNewFieldType, respNewFieldConstraints.applied.map(c => c.name))}
                          {#if avail.length > 0}
                            <button type="button" onclick={() => { respNewFieldConstraints.dropdownOpen = true; respNewFieldConstraints.search = ''; }}
                              class="w-full px-2 py-1.5 border border-dashed border-mono-300 rounded text-xs text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                              <i class="fa-solid fa-plus mr-1"></i> Add Constraint
                            </button>
                          {/if}
                        {:else}
                          <div class="relative">
                            <input type="text" placeholder="Search..." bind:value={respNewFieldConstraints.search}
                              class="w-full px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                            <div class="mt-1 w-full bg-white border border-mono-300 rounded shadow-lg max-h-32 overflow-auto">
                              {#each getCompatibleConstraints(respNewFieldType, respNewFieldConstraints.applied.map(c => c.name)).filter(t => !respNewFieldConstraints.search || t.name.includes(respNewFieldConstraints.search)) as ct}
                                <button type="button" onclick={() => { respNewFieldConstraints.applied = [...respNewFieldConstraints.applied, { name: ct.name, value: '' }]; respNewFieldConstraints.dropdownOpen = false; }}
                                  class="w-full text-left px-2 py-1.5 text-xs hover:bg-mono-50 transition-colors cursor-pointer">
                                  <span class="font-mono text-mono-700">{ct.name}</span>
                                </button>
                              {/each}
                            </div>
                            <button type="button" onclick={() => { respNewFieldConstraints.dropdownOpen = false; }}
                              class="mt-1 text-[10px] text-mono-500 hover:text-mono-700 cursor-pointer">Cancel</button>
                          </div>
                        {/if}
                      </div>

                      <div class="flex items-center space-x-2">
                        <button type="button" onclick={saveInlineFieldForResponse} disabled={!respNewFieldName.trim()}
                          class="px-3 py-1 text-xs bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors {!respNewFieldName.trim() ? 'opacity-50 cursor-not-allowed' : ''}">Save Field</button>
                        <button type="button" onclick={() => { respFieldShowCreate = false; }}
                          class="px-3 py-1 text-xs border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer transition-colors">Cancel</button>
                      </div>
                    </div>
                  {/if}
                </div>

                <!-- Model Validators -->
                <div>
                  <h5 class="text-sm text-mono-600 mb-2">Model Validators ({respModelValidators.length})</h5>
                  {#if respModelValidators.length > 0}
                    <div class="space-y-1.5 mb-2">
                      {#each respModelValidators as mv, mvi}
                        <div class="flex items-center justify-between px-3 py-1.5 bg-white border border-mono-200 rounded-md">
                          <div class="flex items-center space-x-2"><span class="text-sm text-mono-800">{mv.templateName}</span><Pill size="sm">{mv.mode}</Pill></div>
                          <button type="button" onclick={() => { respModelValidators = respModelValidators.filter((_, i) => i !== mvi); }}
                            class="text-mono-400 hover:text-red-600 transition-colors cursor-pointer"><i class="fa-solid fa-xmark text-xs"></i></button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  {#if !respModelValidatorGalleryOpen && !respModelValidatorFormTemplate}
                    <button type="button" onclick={() => { respModelValidatorGalleryOpen = true; respModelValidatorGallerySearch = ''; }}
                      class="w-full px-3 py-2 border border-dashed border-mono-300 rounded-md text-sm text-mono-500 hover:border-mono-400 hover:text-mono-700 transition-colors cursor-pointer">
                      <i class="fa-solid fa-plus mr-1"></i> Add Model Validator
                    </button>
                  {:else if respModelValidatorGalleryOpen && !respModelValidatorFormTemplate}
                    <div class="p-3 bg-mono-50 rounded border border-mono-200 space-y-2">
                      <input type="text" placeholder="Search model validators..." bind:value={respModelValidatorGallerySearch}
                        class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent" />
                      <div class="max-h-64 overflow-auto space-y-1.5">
                        {#each modelValidatorTemplates.filter(t => !respModelValidatorGallerySearch || t.name.toLowerCase().includes(respModelValidatorGallerySearch.toLowerCase())) as tmpl}
                          <button type="button" onclick={() => { respModelValidatorFormTemplate = tmpl; respModelValidatorFieldMappings = {}; }}
                            class="w-full text-left p-2 bg-white border border-mono-200 rounded-md hover:border-mono-400 transition-colors cursor-pointer">
                            <div class="flex items-center justify-between"><span class="text-sm text-mono-900 font-medium">{tmpl.name}</span><Pill size="sm">{tmpl.mode}</Pill></div>
                            <p class="text-xs text-mono-500 mt-0.5">{tmpl.description}</p>
                            <div class="flex flex-wrap gap-1 mt-1">
                              {#each tmpl.fieldMappings as fm}
                                <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-200 text-mono-600">{fm.label}</span>
                              {/each}
                            </div>
                          </button>
                        {/each}
                      </div>
                      <button type="button" onclick={() => { respModelValidatorGalleryOpen = false; }}
                        class="text-xs text-mono-500 hover:text-mono-700 cursor-pointer">Cancel</button>
                    </div>
                  {:else if respModelValidatorFormTemplate}
                    {@const tmpl = respModelValidatorFormTemplate}
                    <div class="p-3 bg-mono-50 rounded border border-mono-200 space-y-3">
                      <div class="flex items-center space-x-2">
                        <button type="button" onclick={() => { respModelValidatorFormTemplate = null; }}
                          class="text-mono-500 hover:text-mono-700 transition-colors cursor-pointer"><i class="fa-solid fa-arrow-left text-xs"></i></button>
                        <span class="text-sm font-medium text-mono-800">{tmpl.name}</span>
                      </div>
                      <p class="text-xs text-mono-500">{tmpl.description}</p>
                      {#each tmpl.fieldMappings as fm}
                        <div>
                          <label class="block text-xs text-mono-600 mb-1">{fm.label} {#if fm.required}<span class="text-red-500">*</span>{/if}</label>
                          <select value={respModelValidatorFieldMappings[fm.label] ?? ''}
                            onchange={(e) => { respModelValidatorFieldMappings[fm.label] = (e.target as HTMLSelectElement).value; }}
                            class="w-full px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent bg-white">
                            <option value="">Select field...</option>
                            {#each responseBodyNewFields.filter(f => fm.compatibleTypes.includes(f.type)) as f}
                              <option value={f.name}>{f.name} ({f.type})</option>
                            {/each}
                          </select>
                        </div>
                      {/each}
                      <button type="button" onclick={() => {
                        respModelValidators = [...respModelValidators, { templateName: tmpl.name, mode: tmpl.mode, fieldMappings: { ...respModelValidatorFieldMappings } }];
                        respModelValidatorFormTemplate = null; respModelValidatorGalleryOpen = false;
                      }}
                        class="px-3 py-1 text-xs bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors">Add Model Validator</button>
                    </div>
                  {/if}
                </div>

                <div class="flex items-center space-x-3 pt-2">
                  <button type="button" onclick={saveNewResponseObject} disabled={!responseBodyNewName.trim()}
                    class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors text-sm {!responseBodyNewName.trim() ? 'opacity-50 cursor-not-allowed' : ''}">Save Object</button>
                  <button type="button" onclick={cancelCreateResponseObject}
                    class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer transition-colors text-sm">Cancel</button>
                </div>
              </div>
            {/if}

            <!-- Envelope toggle -->
            <div class="border-t border-mono-200 pt-6">
              <label class="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" bind:checked={useEnvelope} class="rounded border-mono-300" />
                <div>
                  <span class="text-sm text-mono-700 font-medium">Use envelope</span>
                  <p class="text-xs text-mono-500 mt-0.5">Wraps the response in a standard envelope with status, message, and data fields.</p>
                </div>
              </label>
            </div>

            <!-- Response shape -->
            <div>
              <span class="block text-sm text-mono-700 mb-2 font-medium">Response Shape</span>
              <div class="flex space-x-4">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="response-shape" value="single" bind:group={responseShape} class="border-mono-300" />
                  <span class="text-sm text-mono-700">Single Object</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="response-shape" value="list" bind:group={responseShape} class="border-mono-300" />
                  <span class="text-sm text-mono-700">List</span>
                </label>
              </div>
            </div>
          </div>

        <!-- ================================================================= -->
        <!-- Step 6: Review -->
        <!-- ================================================================= -->
        {:else if currentStep === 6}
          <div class="space-y-6">
            <div>
              <h2 class="text-lg font-semibold text-mono-800">Review Endpoint</h2>
              <p class="text-sm text-mono-500 mt-1">Verify the endpoint configuration before creating it.</p>
            </div>

            <!-- Method + Path prominently -->
            <div class="border border-mono-200 rounded-lg p-5 bg-white">
              <div class="flex items-center space-x-3">
                <span class="px-3 py-1 text-sm font-semibold rounded-md {methodColor(method)}">{method}</span>
                <span class="text-lg font-mono font-medium text-mono-800">/{path || '...'}</span>
              </div>
              {#if tag}
                <div class="mt-2"><Pill>{tag}</Pill></div>
              {/if}
              {#if description}
                <p class="mt-2 text-sm text-mono-600">{description}</p>
              {/if}
            </div>

            <!-- Summary sections -->
            <div class="space-y-4">
              <!-- Path Parameters -->
              {#if pathParams.length > 0}
                <div class="border border-mono-200 rounded-lg p-4">
                  <h3 class="text-sm font-medium text-mono-700 mb-3">
                    <i class="fa-solid fa-brackets-curly mr-1.5 text-mono-400"></i> Path Parameters
                  </h3>
                  <div class="space-y-2">
                    {#each pathParams as param}
                      {@const mapping = paramMappings[param]}
                      <div class="flex items-center space-x-2 text-sm">
                        <span class="font-mono text-mono-600">{`{${param}}`}</span>
                        <i class="fa-solid fa-arrow-right text-mono-300 text-xs"></i>
                        {#if mapping?.fieldId}
                          {@const field = existingFields.find(f => f.id === mapping.fieldId)}
                          <span class="text-mono-800">{field?.name ?? 'Unknown'}</span>
                          <Pill size="sm">{field?.type ?? '?'}</Pill>
                          {#if field?.container === 'list'}
                            <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">list</span>
                          {/if}
                          {#if field && field.validators.length > 0}
                            <span class="text-xs text-mono-500">{field.validators.length} validator{field.validators.length > 1 ? 's' : ''}</span>
                          {/if}
                          {#if field && field.constraints.length > 0}
                            <span class="text-xs text-mono-500">{field.constraints.length} constraint{field.constraints.length > 1 ? 's' : ''}</span>
                          {/if}
                        {:else}
                          <span class="text-mono-400 italic">Not mapped</span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Query Parameters -->
              <div class="border border-mono-200 rounded-lg p-4">
                <h3 class="text-sm font-medium text-mono-700 mb-3">
                  <i class="fa-solid fa-filter mr-1.5 text-mono-400"></i> Query Parameters
                </h3>
                {#if queryParamObjectId}
                  {@const obj = existingObjects.find(o => o.id === queryParamObjectId)}
                  <div class="flex items-center space-x-2 text-sm mb-2">
                    <span class="text-mono-800 font-medium">{obj?.name ?? 'Unknown'}</span>
                    <Pill size="sm">{obj?.fields.length ?? 0} fields</Pill>
                  </div>
                  {#if obj}
                    <div class="space-y-1 ml-4">
                      {#each obj.fields as fieldName}
                        {@const field = getFieldByName(fieldName)}
                        <div class="flex items-center space-x-2 text-xs text-mono-600">
                          <span class="font-mono">{fieldName}</span>
                          {#if field}
                            <Pill size="sm">{field.type}</Pill>
                            {#if field.container === 'list'}
                              <span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">list</span>
                            {/if}
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                {:else}
                  <span class="text-sm text-mono-400 italic">None selected</span>
                {/if}
              </div>

              <!-- Request Body -->
              <div class="border border-mono-200 rounded-lg p-4">
                <h3 class="text-sm font-medium text-mono-700 mb-3">
                  <i class="fa-solid fa-arrow-up-from-bracket mr-1.5 text-mono-400"></i> Request Body
                </h3>
                {#if requestBodyObjectId}
                  {@const obj = existingObjects.find(o => o.id === requestBodyObjectId)}
                  <div class="flex items-center space-x-2 text-sm mb-2">
                    <span class="text-mono-800 font-medium">{obj?.name ?? 'Unknown'}</span>
                    <Pill size="sm">{obj?.fields.length ?? 0} fields</Pill>
                  </div>
                  {#if obj}
                    <div class="space-y-1 ml-4">
                      {#each obj.fields as fieldName}
                        {@const field = getFieldByName(fieldName)}
                        <div class="flex items-center space-x-2 text-xs text-mono-600">
                          <span class="font-mono">{fieldName}</span>
                          {#if field}
                            <Pill size="sm">{field.type}</Pill>
                            {#if field.container === 'list'}
                              <span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">list</span>
                            {/if}
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                {:else}
                  <span class="text-sm text-mono-400 italic">None selected</span>
                {/if}
              </div>

              <!-- Response Body -->
              <div class="border border-mono-200 rounded-lg p-4">
                <h3 class="text-sm font-medium text-mono-700 mb-3">
                  <i class="fa-solid fa-arrow-down-to-bracket mr-1.5 text-mono-400"></i> Response Body
                </h3>
                {#if responseBodyObjectId}
                  {@const obj = existingObjects.find(o => o.id === responseBodyObjectId)}
                  <div class="flex items-center space-x-2 text-sm mb-2">
                    <span class="text-mono-800 font-medium">{obj?.name ?? 'Unknown'}</span>
                    <Pill size="sm">{obj?.fields.length ?? 0} fields</Pill>
                  </div>
                  {#if obj}
                    <div class="space-y-1 ml-4">
                      {#each obj.fields as fieldName}
                        {@const field = getFieldByName(fieldName)}
                        <div class="flex items-center space-x-2 text-xs text-mono-600">
                          <span class="font-mono">{fieldName}</span>
                          {#if field}
                            <Pill size="sm">{field.type}</Pill>
                            {#if field.container === 'list'}
                              <span class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">list</span>
                            {/if}
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                {:else}
                  <span class="text-sm text-mono-400 italic">None selected</span>
                {/if}
                <div class="mt-3 flex items-center space-x-4 text-sm">
                  <div class="flex items-center space-x-1.5">
                    <span class="text-mono-500">Envelope:</span>
                    <span class="text-mono-800 font-medium">{useEnvelope ? 'Yes' : 'No'}</span>
                  </div>
                  <div class="flex items-center space-x-1.5">
                    <span class="text-mono-500">Shape:</span>
                    <span class="text-mono-800 font-medium">{responseShape === 'single' ? 'Single Object' : 'List'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}

        </div>

        <!-- Right column: Context Panel -->
        <div class="w-80 flex-shrink-0 hidden lg:block">
          <div class="sticky top-8 bg-mono-50 border border-mono-200 rounded-lg p-4 space-y-0">
            <h3 class="text-xs uppercase text-mono-400 font-medium tracking-wider mb-3">Endpoint Summary</h3>

            <!-- Method + Path -->
            <div class="{sectionClass(1)} border-b border-mono-200 pb-3 mb-3">
              <div class="flex items-center space-x-2">
                {#if method && path}
                  <span class="px-2 py-0.5 text-xs font-semibold rounded {methodColor(method)}">{method}</span>
                  <span class="text-sm font-mono text-mono-800 truncate">/{path || '...'}</span>
                {:else}
                  <span class="text-sm text-mono-400">Not configured</span>
                {/if}
              </div>
              {#if tag}
                <div class="mt-1.5">
                  <span class="text-xs text-mono-500">Tag:</span>
                  <span class="text-xs text-mono-700 ml-1">{tag}</span>
                </div>
              {/if}
            </div>

            <!-- Path Parameters -->
            <div class="{sectionClass(2)} border-b border-mono-200 pb-3 mb-3">
              <h4 class="text-xs uppercase text-mono-400 font-medium tracking-wider mb-1.5">Path Parameters</h4>
              {#if pathParams.length > 0}
                <div class="space-y-1">
                  {#each pathParams as param}
                    {@const mapping = paramMappings[param]}
                    <div class="flex items-center space-x-1.5 text-xs">
                      <span class="font-mono text-mono-600">{`{${param}}`}</span>
                      <i class="fa-solid fa-arrow-right text-mono-300 text-[10px]"></i>
                      {#if mapping?.fieldId}
                        {@const field = existingFields.find(f => f.id === mapping.fieldId)}
                        <span class="text-mono-700">{field?.name ?? '?'}</span>
                      {:else}
                        <span class="text-mono-400">Not mapped</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else}
                <span class="text-xs text-mono-400">No path parameters</span>
              {/if}
            </div>

            <!-- Query Parameters -->
            <div class="{sectionClass(3)} border-b border-mono-200 pb-3 mb-3">
              <h4 class="text-xs uppercase text-mono-400 font-medium tracking-wider mb-1.5">Query Parameters</h4>
              {#if queryParamObjectId}
                <div class="flex items-center space-x-1.5 text-xs">
                  <span class="text-mono-700 font-medium">{getObjectName(queryParamObjectId)}</span>
                  <span class="text-mono-500">{getObjectFieldCount(queryParamObjectId)} fields</span>
                </div>
              {:else}
                <span class="text-xs text-mono-400">Not set</span>
              {/if}
            </div>

            <!-- Request Body -->
            <div class="{sectionClass(4)} border-b border-mono-200 pb-3 mb-3">
              <h4 class="text-xs uppercase text-mono-400 font-medium tracking-wider mb-1.5">Request Body</h4>
              {#if requestBodyObjectId}
                <div class="flex items-center space-x-1.5 text-xs">
                  <span class="text-mono-700 font-medium">{getObjectName(requestBodyObjectId)}</span>
                  <span class="text-mono-500">{getObjectFieldCount(requestBodyObjectId)} fields</span>
                </div>
              {:else}
                <span class="text-xs text-mono-400">Not set</span>
              {/if}
            </div>

            <!-- Response Body -->
            <div class="{sectionClass(5)}">
              <h4 class="text-xs uppercase text-mono-400 font-medium tracking-wider mb-1.5">Response Body</h4>
              {#if responseBodyObjectId}
                <div class="flex items-center space-x-1.5 text-xs">
                  <span class="text-mono-700 font-medium">{getObjectName(responseBodyObjectId)}</span>
                  <span class="text-mono-500">{getObjectFieldCount(responseBodyObjectId)} fields</span>
                </div>
                <div class="flex items-center space-x-3 text-xs text-mono-500 mt-1">
                  <span>Envelope: {useEnvelope ? 'Yes' : 'No'}</span>
                  <span>Shape: {responseShape === 'single' ? 'Single' : 'List'}</span>
                </div>
              {:else}
                <span class="text-xs text-mono-400">Not set</span>
              {/if}
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Bottom Navigation Bar -->
    <div class="sticky bottom-0 bg-white border-t border-mono-200 py-3 px-6">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <div>
          {#if !isFirstStep}
            <button type="button" onclick={goBack}
              class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer transition-colors">
              <i class="fa-solid fa-arrow-left mr-1.5"></i> Back
            </button>
          {/if}
        </div>
        <div>
          {#if isLastStep}
            <button type="button" onclick={handleCreateEndpoint}
              class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors">
              <i class="fa-solid fa-check mr-1.5"></i> Create Endpoint
            </button>
          {:else}
            <button type="button" onclick={goNext}
              class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 cursor-pointer transition-colors">
              Next <i class="fa-solid fa-arrow-right ml-1.5"></i>
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
