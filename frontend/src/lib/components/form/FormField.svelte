<script lang="ts">
	import { dashboardTextPrimary } from '$lib/ui/classes';
	import { getFormFieldErrorTestId } from '$lib/utils/testIds';

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
	<label for={computedId} class="block text-sm font-inter text-mono-300 mb-1.5 font-medium">
		{label} {#if required}<span class="text-red-500 ml-0.5">*</span>{/if}
	</label>
	<input
		id={computedId}
		{type}
		bind:value
		{placeholder}
		{disabled}
		class="w-full px-4 py-2 text-sm font-inter border rounded-xl shadow-inner focus:ring-2 focus:ring-green-400/50 outline-none focus:outline-none focus:border-transparent transition-colors {error ? 'border-red-500/50 bg-red-950/10' : 'border-mono-700/80 bg-mono-900/80'} {disabled ? 'bg-mono-800/40 cursor-not-allowed opacity-75' : dashboardTextPrimary}"
	/>
	{#if error}
		<p class="text-xs text-red-500 mt-1" data-testid={getFormFieldErrorTestId(computedId)}>{error}</p>
	{/if}
</div>
