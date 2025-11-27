<script lang="ts">
  export interface ResponsePreviewProps {
    responseBody: string;
  }

  interface Props extends ResponsePreviewProps {}

  let { responseBody }: Props = $props();

  // Format JSON string for display
  const formattedResponse = $derived(() => {
    try {
      return JSON.stringify(JSON.parse(responseBody), null, 2);
    } catch {
      return responseBody;
    }
  });
</script>

<div>
  <h3 class="text-sm text-mono-700 mb-2 flex items-center">
    <i class="fa-solid fa-arrow-down mr-2"></i>
    Response (200)
  </h3>
  <div class="p-3 bg-mono-900 rounded text-white text-xs overflow-x-auto">
    <pre>{formattedResponse()}</pre>
  </div>
</div>
