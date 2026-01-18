import Tab from '../embed-components/Tab.svelte';
import Announcement from '../embed-components/Announcement.svelte';
import ThemeSelector from '../embed-components/ThemeSelector.svelte';
import Step from '../embed-components/Step.svelte';
import ChartToolbar from '../embed-components/ChartToolbar.svelte';
import Github from '../embed-components/Github.svelte';
import LinkedCard from '../embed-components/LinkedCard.svelte';
import Steps from '../embed-components/Steps.svelte';
export const EMBED_REGISTRY = {};

export const embedRegistry = {
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
