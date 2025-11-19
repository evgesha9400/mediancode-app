import { writable } from 'svelte/store';

export interface Validator {
	name: string;
	category: 'string' | 'numeric' | 'collection' | 'custom';
	description: string;
	type: 'inline' | 'custom';
	parameterType: string;
	exampleUsage: string;
	pydanticDocsUrl: string;
	usedInFields: number;
	fieldsUsingValidator: Array<{ name: string; model: string }>;
}

const inlineValidators: Validator[] = [
	{
		name: 'min_length',
		category: 'string',
		description: 'Validates minimum string length. This validator ensures that string fields meet a minimum character count requirement.',
		type: 'inline',
		parameterType: 'Integer',
		exampleUsage: 'Field(..., min_length=3)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 12,
		fieldsUsingValidator: [
			{ name: 'username', model: 'User' },
			{ name: 'first_name', model: 'User' },
			{ name: 'last_name', model: 'User' },
			{ name: 'product_name', model: 'Product' },
			{ name: 'category_name', model: 'Category' },
			{ name: 'title', model: 'Post' },
			{ name: 'street_address', model: 'Address' },
			{ name: 'city', model: 'Address' },
			{ name: 'state', model: 'Address' },
			{ name: 'company_name', model: 'Company' },
			{ name: 'department', model: 'Employee' },
			{ name: 'tag_name', model: 'Tag' }
		]
	},
	{
		name: 'max_length',
		category: 'string',
		description: 'Validates maximum string length. Prevents string fields from exceeding a specified character limit.',
		type: 'inline',
		parameterType: 'Integer',
		exampleUsage: 'Field(..., max_length=100)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 18,
		fieldsUsingValidator: [
			{ name: 'username', model: 'User' },
			{ name: 'email', model: 'User' },
			{ name: 'first_name', model: 'User' },
			{ name: 'last_name', model: 'User' },
			{ name: 'bio', model: 'User' },
			{ name: 'product_name', model: 'Product' },
			{ name: 'description', model: 'Product' },
			{ name: 'category_name', model: 'Category' },
			{ name: 'title', model: 'Post' },
			{ name: 'content', model: 'Post' },
			{ name: 'street_address', model: 'Address' },
			{ name: 'city', model: 'Address' },
			{ name: 'state', model: 'Address' },
			{ name: 'zip_code', model: 'Address' },
			{ name: 'company_name', model: 'Company' },
			{ name: 'department', model: 'Employee' },
			{ name: 'position', model: 'Employee' },
			{ name: 'tag_name', model: 'Tag' }
		]
	},
	{
		name: 'regex',
		category: 'string',
		description: 'Validates against regex pattern. Ensures string values match a specific regular expression pattern.',
		type: 'inline',
		parameterType: 'String (regex pattern)',
		exampleUsage: 'Field(..., pattern=r"^[A-Za-z0-9]+$")',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 8,
		fieldsUsingValidator: [
			{ name: 'username', model: 'User' },
			{ name: 'slug', model: 'Post' },
			{ name: 'sku', model: 'Product' },
			{ name: 'zip_code', model: 'Address' },
			{ name: 'license_plate', model: 'Vehicle' },
			{ name: 'account_number', model: 'BankAccount' },
			{ name: 'routing_number', model: 'BankAccount' },
			{ name: 'tax_id', model: 'Company' }
		]
	},
	{
		name: 'gt',
		category: 'numeric',
		description: 'Greater than validation. Ensures numeric values are strictly greater than a specified threshold.',
		type: 'inline',
		parameterType: 'Number',
		exampleUsage: 'Field(..., gt=0)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 15,
		fieldsUsingValidator: [
			{ name: 'price', model: 'Product' },
			{ name: 'quantity', model: 'OrderItem' },
			{ name: 'age', model: 'User' },
			{ name: 'rating', model: 'Review' },
			{ name: 'stock_quantity', model: 'Inventory' },
			{ name: 'discount_percentage', model: 'Promotion' },
			{ name: 'tax_rate', model: 'TaxBracket' },
			{ name: 'salary', model: 'Employee' },
			{ name: 'account_balance', model: 'BankAccount' },
			{ name: 'credit_limit', model: 'CreditCard' },
			{ name: 'interest_rate', model: 'Loan' },
			{ name: 'weight', model: 'Product' },
			{ name: 'height', model: 'Product' },
			{ name: 'width', model: 'Product' },
			{ name: 'depth', model: 'Product' }
		]
	},
	{
		name: 'ge',
		category: 'numeric',
		description: 'Greater than or equal validation. Ensures numeric values are greater than or equal to a specified minimum.',
		type: 'inline',
		parameterType: 'Number',
		exampleUsage: 'Field(..., ge=0)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 22,
		fieldsUsingValidator: [
			{ name: 'price', model: 'Product' },
			{ name: 'quantity', model: 'OrderItem' },
			{ name: 'age', model: 'User' },
			{ name: 'rating', model: 'Review' },
			{ name: 'stock_quantity', model: 'Inventory' },
			{ name: 'discount_percentage', model: 'Promotion' },
			{ name: 'tax_rate', model: 'TaxBracket' },
			{ name: 'salary', model: 'Employee' },
			{ name: 'account_balance', model: 'BankAccount' },
			{ name: 'credit_limit', model: 'CreditCard' },
			{ name: 'interest_rate', model: 'Loan' },
			{ name: 'weight', model: 'Product' },
			{ name: 'height', model: 'Product' },
			{ name: 'width', model: 'Product' },
			{ name: 'depth', model: 'Product' },
			{ name: 'commission_rate', model: 'Salesperson' },
			{ name: 'bonus', model: 'Employee' },
			{ name: 'overtime_hours', model: 'Timesheet' },
			{ name: 'total_amount', model: 'Invoice' },
			{ name: 'tax_amount', model: 'Invoice' },
			{ name: 'shipping_cost', model: 'Order' },
			{ name: 'distance', model: 'Shipment' }
		]
	},
	{
		name: 'lt',
		category: 'numeric',
		description: 'Less than validation. Ensures numeric values are strictly less than a specified maximum.',
		type: 'inline',
		parameterType: 'Number',
		exampleUsage: 'Field(..., lt=100)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 9,
		fieldsUsingValidator: [
			{ name: 'age', model: 'User' },
			{ name: 'rating', model: 'Review' },
			{ name: 'discount_percentage', model: 'Promotion' },
			{ name: 'tax_rate', model: 'TaxBracket' },
			{ name: 'commission_rate', model: 'Salesperson' },
			{ name: 'completion_percentage', model: 'Project' },
			{ name: 'battery_level', model: 'Device' },
			{ name: 'capacity_percentage', model: 'Storage' },
			{ name: 'humidity', model: 'WeatherData' }
		]
	},
	{
		name: 'le',
		category: 'numeric',
		description: 'Less than or equal validation. Ensures numeric values are less than or equal to a specified maximum.',
		type: 'inline',
		parameterType: 'Number',
		exampleUsage: 'Field(..., le=100)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 11,
		fieldsUsingValidator: [
			{ name: 'age', model: 'User' },
			{ name: 'rating', model: 'Review' },
			{ name: 'discount_percentage', model: 'Promotion' },
			{ name: 'tax_rate', model: 'TaxBracket' },
			{ name: 'commission_rate', model: 'Salesperson' },
			{ name: 'completion_percentage', model: 'Project' },
			{ name: 'battery_level', model: 'Device' },
			{ name: 'capacity_percentage', model: 'Storage' },
			{ name: 'humidity', model: 'WeatherData' },
			{ name: 'progress', model: 'Task' },
			{ name: 'score', model: 'Exam' }
		]
	},
	{
		name: 'multiple_of',
		category: 'numeric',
		description: 'Multiple of validation. Ensures numeric values are multiples of a specified number.',
		type: 'inline',
		parameterType: 'Number',
		exampleUsage: 'Field(..., multiple_of=5)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 3,
		fieldsUsingValidator: [
			{ name: 'quantity', model: 'OrderItem' },
			{ name: 'pack_size', model: 'Product' },
			{ name: 'increment', model: 'StockLevel' }
		]
	},
	{
		name: 'min_items',
		category: 'collection',
		description: 'Minimum items in collection. Ensures lists or arrays contain at least a specified number of items.',
		type: 'inline',
		parameterType: 'Integer',
		exampleUsage: 'Field(..., min_length=1)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 6,
		fieldsUsingValidator: [
			{ name: 'tags', model: 'Post' },
			{ name: 'categories', model: 'Product' },
			{ name: 'images', model: 'Product' },
			{ name: 'order_items', model: 'Order' },
			{ name: 'permissions', model: 'Role' },
			{ name: 'attachments', model: 'Email' }
		]
	},
	{
		name: 'max_items',
		category: 'collection',
		description: 'Maximum items in collection. Limits the number of items allowed in lists or arrays.',
		type: 'inline',
		parameterType: 'Integer',
		exampleUsage: 'Field(..., max_length=10)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 8,
		fieldsUsingValidator: [
			{ name: 'tags', model: 'Post' },
			{ name: 'categories', model: 'Product' },
			{ name: 'images', model: 'Product' },
			{ name: 'order_items', model: 'Order' },
			{ name: 'permissions', model: 'Role' },
			{ name: 'attachments', model: 'Email' },
			{ name: 'options', model: 'Poll' },
			{ name: 'favorites', model: 'User' }
		]
	},
	{
		name: 'unique_items',
		category: 'collection',
		description: 'Ensures unique items in collection. Validates that all items in a list or array are distinct.',
		type: 'inline',
		parameterType: 'Boolean',
		exampleUsage: 'Field(..., unique_items=True)',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/api/fields/#pydantic.fields.Field',
		usedInFields: 5,
		fieldsUsingValidator: [
			{ name: 'tags', model: 'Post' },
			{ name: 'categories', model: 'Product' },
			{ name: 'permissions', model: 'Role' },
			{ name: 'email_recipients', model: 'Campaign' },
			{ name: 'participant_ids', model: 'Meeting' }
		]
	}
];

const customValidators: Validator[] = [
	{
		name: 'phone_number',
		category: 'custom',
		description: 'Validates phone number format. Custom validator that ensures phone numbers match standard international formats.',
		type: 'custom',
		parameterType: 'String',
		exampleUsage: '@field_validator("phone")\ndef validate_phone(cls, v):\n    if not re.match(r"^\\+?[1-9]\\d{1,14}$", v):\n        raise ValueError("Invalid phone number")\n    return v',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/concepts/validators/',
		usedInFields: 2,
		fieldsUsingValidator: [
			{ name: 'phone', model: 'User' },
			{ name: 'contact_number', model: 'Company' }
		]
	},
	{
		name: 'url_format',
		category: 'custom',
		description: 'Validates URL format. Custom validator that ensures URLs are properly formatted and valid.',
		type: 'custom',
		parameterType: 'String',
		exampleUsage: '@field_validator("website")\ndef validate_url(cls, v):\n    if not v.startswith(("http://", "https://")):\n        raise ValueError("Invalid URL format")\n    return v',
		pydanticDocsUrl: 'https://docs.pydantic.dev/latest/concepts/validators/',
		usedInFields: 4,
		fieldsUsingValidator: [
			{ name: 'website', model: 'Company' },
			{ name: 'blog_url', model: 'User' },
			{ name: 'source_url', model: 'Article' },
			{ name: 'redirect_url', model: 'Link' }
		]
	}
];

const allValidators = [...inlineValidators, ...customValidators];

export const validatorsStore = writable<Validator[]>(allValidators);

export function getValidatorsByType(type: 'inline' | 'custom'): Validator[] {
	return allValidators.filter(v => v.type === type);
}

export function getTotalValidatorCount(): number {
	return allValidators.length;
}

export function searchValidators(query: string): Validator[] {
	const lowerQuery = query.toLowerCase().trim();
	if (!lowerQuery) return allValidators;

	return allValidators.filter(validator =>
		validator.name.toLowerCase().includes(lowerQuery) ||
		validator.description.toLowerCase().includes(lowerQuery) ||
		validator.category.toLowerCase().includes(lowerQuery)
	);
}
