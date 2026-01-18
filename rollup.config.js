import svelte from 'rollup-plugin-svelte';
import Announcement from './src/embed-components/Announcement.svelte';
import ThemeSelector from './src/embed-components/ThemeSelector.svelte';
import Step from './src/embed-components/Step.svelte';
import ChartToolbar from './src/embed-components/ChartToolbar.svelte';
import Github from './src/embed-components/Github.svelte';
import LinkedCard from './src/embed-components/LinkedCard.svelte';
import Steps from './src/embed-components/Steps.svelte';
import Tab from './src/embed-components/Tab.svelte';

export default {
  input: {
    Tab: 'src/embed-components/Tab.svelte',
    Announcement: 'src/embed-components/Announcement.svelte',
    ThemeSelector: 'src/embed-components/ThemeSelector.svelte',
    Step: 'src/embed-components/Step.svelte',
    ChartToolbar: 'src/embed-components/ChartToolbar.svelte',
    Github: 'src/embed-components/Github.svelte',
    LinkedCard: 'src/embed-components/LinkedCard.svelte',
    Steps: 'src/embed-components/Steps.svelte'
  },
  output: {
    dir: 'public',
    format: 'esm'
  },
  plugins: [svelte()]
};