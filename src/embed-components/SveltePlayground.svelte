<script>








  import { onMount } from 'svelte';
  import EmbedModule from '../EmbedModule.js';

  // Sample tagMap and propsMap
  const tagMap = {
    Tab: 'tab-component',
    Button: 'button-component',
    Card: 'card-component'
  };

  const propsMap = {
    'tab-component': { title: 'Tab 1', active: 'true' },
    'button-component': { label: 'Click me', disabled: 'false' },
    'card-component': { header: 'Card Header', content: 'Card content' }
  };

  let selectedTag = 'Tab';
  let selectedComponent = tagMap[selectedTag];
  let props = { ...propsMap[selectedComponent] };

  // Update selectedComponent and props when selectedTag changes
  $: if (selectedTag) {
    selectedComponent = tagMap[selectedTag];
    props = { ...propsMap[selectedComponent] };
  }

  function onPropChange(event, key) {
    props[key] = event.target.value;
    props = { ...props };
  }

import Tab from './Tab.svelte';

import Announcement from './Announcement.svelte';

import ThemeSelector from './ThemeSelector.svelte';

import Step from './Step.svelte';

import ChartToolbar from './ChartToolbar.svelte';

import Github from './Github.svelte';

import LinkedCard from './LinkedCard.svelte';

import Steps from './Steps.svelte';
</script>

<div>
  <label for="component-select">Select Component:</label>
  <select id="component-select" bind:value={selectedTag}>
    {#each Object.keys(tagMap) as tag}
      <option value={tag}>{tag}</option>
    {/each}
  </select>
</div>

<div style="margin-top: 1rem;">
  <form>
    {#each Object.entries(props) as [key, value]}
      <div style="margin-bottom: 0.5rem;">
        <label for={key}>{key}:</label>
        <input
          id={key}
          type="text"
          bind:value={props[key]}
          on:input={(e) => onPropChange(e, key)}
        />
      </div>
    {/each}
  </form>
</div>

<div style="margin-top: 2rem; border: 1px solid #ccc; padding: 1rem;">
  {@html EmbedModule.render(selectedComponent, props)}
</div>

<tab-component />

<announcement-component />

<theme-selector-component />

<step-component />

<chart-toolbar-component />

<github />

<linked-card />

<steps />
