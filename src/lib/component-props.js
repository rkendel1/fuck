import Step from '../embed-components/Step.svelte';
import ChartToolbar from '../embed-components/ChartToolbar.svelte';
import Github from '../embed-components/Github.svelte';
import LinkedCard from '../embed-components/LinkedCard.svelte';
// Interactive
export const componentProps = {
  spinner: ['spinner_segments'],
  confetti: ['confetti_button_text'],
  timer: ['timer_duration', 'timer_label', 'timer_auto_start'],
  upvote_button: ['upvote_label', 'upvote_initial_count', 'upvote_style'],
  fireworks: ['fireworks_button_text'],
  emoji_rain: ['emoji_rain_emojis', 'emoji_rain_button_text', 'emoji_rain_duration'],
  share_button: ['share_title', 'share_text', 'share_url', 'share_platforms']
,
  'step-component': [
    'brand_colors_primary',
    'brand_colors_text_on_primary',
    'component_width'
  ]
, chart-toolbar-component: ['brand_colors_primary', 'brand_colors_text_on_primary', 'component_width'], 
github: ['brand_colors_primary', 'brand_colors_text_on_primary', 'component_width'], 'linked-card': [brand_colors_primary, brand_colors_text_on_primary, component_width]};