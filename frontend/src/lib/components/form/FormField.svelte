<script lang="ts">
	export interface FormFieldProps {
		label: string;
		value: string;
		error?: string;
		required?: boolean;
		disabled?: boolean;
		placeholder?: string;
		type?: 'text' | 'number';
		id?: string;
	}

	let {
		label,
		value = $bindable(''),
		error,
		required = false,
		disabled = false,
		placeholder = '',
		type = 'text',
		id
	}: FormFieldProps = $props();

	let computedId = $derived(id ?? label.toLowerCase().replace(/\s+/g, '-'));
</script>

<div>
	<label for={computedId} class="block text-sm text-mono-300 mb-1 font-medium">
		{label} {#if required}<span class="text-red-500">*</span>{/if}
	</label>
	<input
		id={computedId}
		{type}
		bind:value
		{placeholder}
		{disabled}
		class="w-full px-3 py-1.5 text-sm border border-mono-600 rounded-md bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent {error ? 'border-red-500' : ''} {disabled ? 'bg-mono-800 cursor-not-allowed' : ''}"
	/>
	{#if error}
		<p class="text-xs text-red-500 mt-1">{error}</p>
	{/if}
</div>
