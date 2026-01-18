import Tab from '../embed-components/Tab.svelte';
import Announcement from '../embed-components/Announcement.svelte';
import ThemeSelector from '../embed-components/ThemeSelector.svelte';
import Step from '../embed-components/Step.svelte';

const FIELD_TYPES = {
  TEXT: 'text',
  ARRAY: 'array',
  COLOR: 'color',
  SELECT: 'select',
};

const COMMON_FIELDS = {
  component_width: {
    type: FIELD_TYPES.SELECT,
    label: 'Component Width',
    description: 'Width of the embedded component',
    options: ['auto', '300px', 'full'],
    default: 'auto',
    category: 'layout',
  },
};

const BRAND_COLOR_FIELDS = {
  brand_colors_primary: {
    type: FIELD_TYPES.COLOR,
    label: 'Primary Brand Color',
    description: 'Primary color for branding',
    default: '#4f46e5',
    category: 'branding',
  },
  brand_colors_text_on_primary: {
    type: FIELD_TYPES.COLOR,
    label: 'Text on Primary Color',
    description: 'Text color when on primary background',
    default: 'white',
    category: 'branding',
  },
};

export const embedConfigRegistry = {
  'tab-component': {
    fields: {
      ...COMMON_FIELDS,
      ...BRAND_COLOR_FIELDS,
    
  'step-component': {
    fields: {
...COMMON_FIELDS,
    ...BRAND_COLOR_FIELDS
    ,
  'chart-toolbar-component': {
    fields: {
...COMMON_FIELDS,
    ...BRAND_COLOR_FIELDS
    ,
  'github': {
    fields: {
...COMMON_FIELDS,
    ...BRAND_COLOR_FIELDS
    ,
  'linked-card': {
    fields: {
...COMMON_FIELDS,
    ...BRAND_COLOR_FIELDS
    ,
  steps: {
    fields: {
...COMMON_FIELDS,
    ...BRAND_COLOR_FIELDS
    }
  }
}
  }
}
  }
}
  }
}
  },
},
  },
  'announcement-component': {
    fields: {
      ...COMMON_FIELDS,
      ...BRAND_COLOR_FIELDS,
    },
  },
  'theme-selector-component': {
    fields: {
      ...COMMON_FIELDS,
      ...BRAND_COLOR_FIELDS,
    },
  },
  chatbot: {
    fields: {
      ...COMMON_FIELDS,
      welcome_message: {
        type: FIELD_TYPES.TEXT,
        label: 'Welcome Message',
        description: 'Initial greeting shown to users',
        placeholder: 'Hi! How can I help you today?',
        category: 'content',
      },
      initial_questions: {
        type: FIELD_TYPES.ARRAY,
        label: 'Suggested Questions',
        description: 'Pre-defined questions users can click (one per line)',
        placeholder: 'What are your hours?\nHow do I get started?',
        rows: 4,
        category: 'content',
      },
      ...BRAND_COLOR_FIELDS,
    },
  },
};