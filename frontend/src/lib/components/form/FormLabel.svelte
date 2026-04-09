<script lang="ts">
	export interface FormLabelProps {
		label: string;
		forId?: string;
		required?: boolean;
	}

	let { label, forId, required = false }: FormLabelProps = $props();
</script>

<label for={forId} class="block text-sm text-fg-secondary mb-1 font-medium">
	{label} {#if required}<span class="text-red-500">*</span>{/if}
</label>
