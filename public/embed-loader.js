import Tab from '../src/embed-components/Tab.svelte';
import Announcement from '../src/embed-components/Announcement.svelte';
import ThemeSelector from '../src/embed-components/ThemeSelector.svelte';
import Step from '../src/embed-components/Step.svelte';
import ChartToolbar from '../src/embed-components/ChartToolbar.svelte';
import Github from '../src/embed-components/Github.svelte';
import LinkedCard from '../src/embed-components/LinkedCard.svelte';
import Steps from '../src/embed-components/Steps.svelte';
export const EmbedModule = {
  async render({ componentType, props, container }) {
    const module = await import(`/embed-components/${componentType}.js`);
    const tagName = props.tagName || componentType;

    const element = document.createElement(tagName);

    for (const [key, value] of Object.entries(props)) {
      if (key === 'tagName') continue;
      element.setAttribute(key, value);
    }

    container.appendChild(element);
  }
};
const embedComponents = {
  'tab-component': Tab
,
  'announcement-component': Announcement
,
  'theme-selector-component': ThemeSelector
,
  'step-component': Step
,
  'chart-toolbar-component': ChartToolbar
,
  'github': Github
,
  'linked-card': LinkedCard
,
  steps: Steps
};
