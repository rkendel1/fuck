
<svelte:options customElement={true} />

<script>
  import { onMount } from 'svelte';
  import { parseArrayProp } from './utils/propUtils.js';

  // Retain kebab-case tag name for runtime reference
  export let tagName = "chart-toolbar-component";

  export let brand_colors_primary = "#4f46e5";
  export let brand_colors_text_on_primary = "white";
  export let component_width = "auto";

  onMount(() => {
    // lazy load external dependencies here
  });
</script>

<slot></slot>

<style>
  :host {
    width: var(--component-width, auto);
  }
</style>
