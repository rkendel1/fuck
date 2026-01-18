#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { parse } = require('svelte/compiler');
const prettier = require('prettier');
const babelParser = require('@babel/parser');

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

const ROOT_DIR = path.resolve(__dirname); // Project root: /Users/randy/Desktop/fuck

// Helper: kebab-case
function kebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function inferType(propName) {
  if (propName.includes('color')) return FIELD_TYPES.COLOR;
  if (propName.includes('width')) return FIELD_TYPES.SELECT;
  if (propName.includes('message') || propName.endsWith('s')) return FIELD_TYPES.ARRAY;
  return FIELD_TYPES.TEXT;
}

function quoteIfNeeded(str) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str) ? str : `'${str}'`;
}

// Parse top-level let declarations as props
function extractProps(scriptContent) {
  const ast = babelParser.parse(scriptContent, { sourceType: 'module', plugins: ['jsx'] });
  const props = [];
  for (const node of ast.program.body) {
    if (node.type === 'VariableDeclaration' && node.kind === 'let') {
      node.declarations.forEach((decl) => {
        if (decl.id.type === 'Identifier') {
          let defaultValue = null;
          if (decl.init) {
            if (decl.init.type === 'StringLiteral' || decl.init.type === 'Literal') {
              defaultValue = decl.init.value;
            } else if (decl.init.type === 'NumericLiteral') {
              defaultValue = decl.init.value;
            } else if (decl.init.type === 'BooleanLiteral') {
              defaultValue = decl.init.value;
            }
          }
          props.push({ name: decl.id.name, default: defaultValue });
        }
      });
    }
  }
  return props;
}

// Format code with Prettier if possible
function formatCode(code, parser) {
  try {
    const supportInfo = prettier.getSupportInfo();
    const languages = supportInfo.languages || [];
    if (languages.some(lang => Array.isArray(lang.parsers) && lang.parsers.includes(parser))) {
      return prettier.format(code, { parser });
    }
  } catch {
    // ignore
  }
  return code;
}

// Update rollup.config.js to add the component to input and exports
async function updateRollupConfig(componentName) {
  const rollupPath = path.join(ROOT_DIR, 'rollup.config.js');
  let content;
  let exists = await fs.pathExists(rollupPath);
  if (!exists) {
    // Create a minimal rollup.config.js with svelte() plugin import and a basic config
    await fs.ensureDir(path.dirname(rollupPath));
    content = `import svelte from 'rollup-plugin-svelte';

export default {
  input: {
    ${componentName}: 'src/embed-components/${componentName}.svelte'
  },
  output: {
    dir: 'public',
    format: 'esm'
  },
  plugins: [svelte()]
};
`;
    await fs.writeFile(rollupPath, content, 'utf-8');
    return rollupPath;
  }
  content = await fs.readFile(rollupPath, 'utf-8');

  // Add import statement if not present
  const importStatement = `import ${componentName} from './src/embed-components/${componentName}.svelte';`;
  if (!content.includes(importStatement)) {
    // Insert after last import
    const importRegex = /import .+ from .+;\n/g;
    const matches = content.match(importRegex);
    if (matches && matches.length > 0) {
      const lastImport = matches[matches.length - 1];
      content = content.replace(lastImport, lastImport + importStatement + '\n');
    } else {
      // No import found, add at top
      content = importStatement + '\n' + content;
    }
  }

  // Add to input object or export list
  // We assume rollup config has an export object or input object with components
  // Try to add to input object keys if present
  const inputRegex = /input:\s*{([^}]+)}/m;
  const match = content.match(inputRegex);
  if (match) {
    const inputs = match[1];
    const key = componentName;
    if (!inputs.includes(key)) {
      const newInputs = inputs.trim().endsWith(',') ? inputs + `\n    ${key}: 'src/embed-components/${componentName}.svelte',` : inputs + `,\n    ${key}: 'src/embed-components/${componentName}.svelte'`;
      content = content.replace(inputRegex, `input: {${newInputs}\n  }`);
    }
  } else {
    // fallback: try to add export default { input: { ... } }
    // Not implemented, leave as is
  }

  await fs.ensureDir(path.dirname(rollupPath));
  await fs.writeFile(rollupPath, content, 'utf-8');
  return rollupPath;
}

// Update src/lib/embed-registry.js to register the component
async function updateEmbedRegistry(componentName, kebabTag) {
  const registryPath = path.join(ROOT_DIR, 'src/lib/embed-registry.js');
  let content;
  let exists = await fs.pathExists(registryPath);
  if (!exists) {
    // Create file with minimal export
    await fs.ensureDir(path.dirname(registryPath));
    content = `export const embedRegistry = {};\n`;
    await fs.writeFile(registryPath, content, 'utf-8');
  }
  content = await fs.readFile(registryPath, 'utf-8');

  // Add import if missing
  const importStatement = `import ${componentName} from '../embed-components/${componentName}.svelte';`;
  if (!content.includes(importStatement)) {
    const importRegex = /import .+ from .+;\n/g;
    const matches = content.match(importRegex);
    if (matches && matches.length > 0) {
      const lastImport = matches[matches.length - 1];
      content = content.replace(lastImport, lastImport + importStatement + '\n');
    } else {
      content = importStatement + '\n' + content;
    }
  }

  // Add to registry object
  // Find export const embedRegistry = { ... }
  const regRegex = /export const embedRegistry\s*=\s*{([^}]*)}/m;
  const match = content.match(regRegex);
  if (match) {
    const inside = match[1];
    const key = kebabTag;
    if (!inside.includes(key)) {
      const quotedKey = quoteIfNeeded(key);
      const newInside = inside.trim().endsWith(',') ? inside + `\n  ${quotedKey}: ${componentName},` : inside + `,\n  ${quotedKey}: ${componentName}`;
      content = content.replace(regRegex, `export const embedRegistry = {${newInside}\n}`);
    }
  } else {
    // fallback: append export const embedRegistry = { ... }
    const quotedKey = quoteIfNeeded(kebabTag);
    content += `\nexport const embedRegistry = {\n  ${quotedKey}: ${componentName}\n};\n`;
  }

  await fs.ensureDir(path.dirname(registryPath));
  await fs.writeFile(registryPath, content, 'utf-8');
  return registryPath;
}

// Update src/lib/embed-config-registry.js to add config fields
async function updateEmbedConfigRegistry(componentName, kebabTag, props) {
  const configPath = path.join(ROOT_DIR, 'src/lib/embed-config-registry.js');
  let content;
  let exists = await fs.pathExists(configPath);
  if (!exists) {
    // Create file with minimal export
    await fs.ensureDir(path.dirname(configPath));
    content = `export const embedConfigRegistry = {};\n`;
    await fs.writeFile(configPath, content, 'utf-8');
  }
  content = await fs.readFile(configPath, 'utf-8');

  // Prepend constants if missing
  if (!content.includes('const COMMON_FIELDS')) {
    const constsStr = `const FIELD_TYPES = ${JSON.stringify(FIELD_TYPES)};

const COMMON_FIELDS = ${JSON.stringify(COMMON_FIELDS)};

const BRAND_COLOR_FIELDS = ${JSON.stringify(BRAND_COLOR_FIELDS)};`;
    content = constsStr + '\n\n' + content;
  }

  // No import needed for config registry

  // Add to embedConfigRegistry object
  const regRegex = /export const embedConfigRegistry\s*=\s*{([^}]*)}/m;
  const match = content.match(regRegex);
  if (match) {
    const inside = match[1];
    const key = kebabTag;

    // Build schema config object
    const commonProps = ['component_width', 'brand_colors_primary', 'brand_colors_text_on_primary'];
    const otherProps = props.filter(p => !commonProps.includes(p.name));
    const otherFieldEntries = otherProps.map(p => {
      const type = inferType(p.name);
      const labelWords = p.name.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const description = `Configure the ${labelWords.toLowerCase()}.`;
      let defaultVal = p.default;
      if (defaultVal === null || defaultVal === undefined) {
        if (type === FIELD_TYPES.ARRAY) defaultVal = [];
        else if (type === FIELD_TYPES.COLOR) defaultVal = '#000000';
        else defaultVal = '';
      }
      const field = {
        type,
        label: labelWords,
        description,
        default: defaultVal,
        category: 'general',
      };
      if (type === FIELD_TYPES.SELECT) {
        field.options = [];
      }
      return `    ${p.name}: ${JSON.stringify(field)}`;
    }).join(',\n');

    let fieldsContent = '...COMMON_FIELDS,\n    ...BRAND_COLOR_FIELDS';
    if (otherProps.length > 0) {
      fieldsContent += `,\n${otherFieldEntries}`;
    }
    const configObject = `{\n    fields: {\n${fieldsContent}\n    }\n  }`;

    // Update existing entry or add new
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const entryRegex = new RegExp(`['"\`]${escapedKey}['"\`]:\\s*\\{[^}]*\\}`, 'gs');
    if (entryRegex.test(content)) {
      const quotedKey = quoteIfNeeded(key);
      content = content.replace(entryRegex, `${quotedKey}: ${configObject}`);
    } else {
      const quotedKey = quoteIfNeeded(key);
      const newInside = inside.trim().endsWith(',') ? inside + `\n  ${quotedKey}: ${configObject},` : inside + `,\n  ${quotedKey}: ${configObject}`;
      content = content.replace(regRegex, `export const embedConfigRegistry = {${newInside}\n}`);
    }
  } else {
    // fallback: append with schema
    const commonProps = ['component_width', 'brand_colors_primary', 'brand_colors_text_on_primary'];
    const otherProps = props.filter(p => !commonProps.includes(p.name));
    const otherFieldEntries = otherProps.map(p => {
      const type = inferType(p.name);
      const labelWords = p.name.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const description = `Configure the ${labelWords.toLowerCase()}.`;
      let defaultVal = p.default;
      if (defaultVal === null || defaultVal === undefined) {
        if (type === FIELD_TYPES.ARRAY) defaultVal = [];
        else if (type === FIELD_TYPES.COLOR) defaultVal = '#000000';
        else defaultVal = '';
      }
      const field = {
        type,
        label: labelWords,
        description,
        default: defaultVal,
        category: 'general',
      };
      if (type === FIELD_TYPES.SELECT) {
        field.options = [];
      }
      return `    ${p.name}: ${JSON.stringify(field)}`;
    }).join(',\n');

    let fieldsContent = '...COMMON_FIELDS,\n    ...BRAND_COLOR_FIELDS';
    if (otherProps.length > 0) {
      fieldsContent += `,\n${otherFieldEntries}`;
    }
    const configObject = `{\n    fields: {\n${fieldsContent}\n    }\n  }`;
    const quotedKey = quoteIfNeeded(kebabTag);
    content += `\nexport const embedConfigRegistry = {\n  ${quotedKey}: ${configObject}\n};\n`;
  }

  await fs.ensureDir(path.dirname(configPath));
  await fs.writeFile(configPath, content, 'utf-8');
  return configPath;
}

// Update src/lib/component-props.js to list relevant props
async function updateComponentProps(componentName, kebabTag, props) {
  const propsPath = path.join(ROOT_DIR, 'src/lib/component-props.js');
  let content;
  let exists = await fs.pathExists(propsPath);
  if (!exists) {
    // Create file with minimal export
    await fs.ensureDir(path.dirname(propsPath));
    content = `export const componentProps = {};\n`;
    await fs.writeFile(propsPath, content, 'utf-8');
  }
  content = await fs.readFile(propsPath, 'utf-8');

  // Add import if missing
  const importStatement = `import ${componentName} from '../embed-components/${componentName}.svelte';`;
  if (!content.includes(importStatement)) {
    const importRegex = /import .+ from .+;\n/g;
    const matches = content.match(importRegex);
    if (matches && matches.length > 0) {
      const lastImport = matches[matches.length - 1];
      content = content.replace(lastImport, lastImport + importStatement + '\n');
    } else {
      content = importStatement + '\n' + content;
    }
  }

  // Add to componentProps object
  const regRegex = /export const componentProps\s*=\s*{([^}]*)}/m;
  const match = content.match(regRegex);
  if (match) {
    const inside = match[1];
    const key = kebabTag;
    if (!inside.includes(key)) {
      // List prop names as array of strings
      const propNames = props.map(p => p.name).join(', ');
      const quotedKey = quoteIfNeeded(key);
      const newInside = inside.trim().endsWith(',') ? inside + ` ${quotedKey}: [${propNames}],` : inside + `, ${quotedKey}: [${propNames}]`;
      content = content.replace(regRegex, `export const componentProps = {${newInside}}`);
    }
  } else {
    // fallback: append export const componentProps = { ... }
    const propNames = props.map(p => p.name).join(', ');
    const quotedKey = quoteIfNeeded(kebabTag);
    content += `\nexport const componentProps = {\n  ${quotedKey}: [${propNames}]\n};\n`;
  }

  await fs.ensureDir(path.dirname(propsPath));
  await fs.writeFile(propsPath, content, 'utf-8');
  return propsPath;
}

// Update mock data in getMockPropertiesForEmbed()
async function updateMockData(componentName, kebabTag, props) {
  const mockPath = path.join(ROOT_DIR, 'src/lib/embed-config-registry.js');
  let content = await fs.readFile(mockPath, 'utf-8');

  // Find getMockPropertiesForEmbed function
  const fnRegex = /function getMockPropertiesForEmbed\s*\(\s*embedName\s*\)\s*{([\s\S]*?)^}/m;
  const match = content.match(fnRegex);
  if (!match) {
    // fallback: do nothing
    return null;
  }
  let fnBody = match[1];

  // Check if kebabTag case exists inside fnBody
  const caseRegex = new RegExp(`case ['"\`]${kebabTag}['"\`]:`);
  if (caseRegex.test(fnBody)) {
    // already has mock data for this embed, skip
    return mockPath;
  }

  // Build mock object from props (use default or example values)
  const mockEntries = props.map(p => {
    let val = p.default;
    if (val === null || val === undefined) {
      // Provide example mock values by type guess
      if (p.name.includes('color')) val = '#cccccc';
      else if (p.name.includes('width')) val = 'auto';
      else val = 'example';
    }
    return `      ${p.name}: ${JSON.stringify(val)}`;
  }).join(',\n');

  const caseEntry = `    case '${kebabTag}':\n      return {\n${mockEntries}\n      };`;

  // Insert caseEntry before default or at end of switch
  const switchRegex = /switch\s*\(\s*embedName\s*\)\s*{([\s\S]*?)^}/m;
  const switchMatch = content.match(switchRegex);
  if (!switchMatch) return mockPath;

  const switchBody = switchMatch[1];
  // Insert before default case if exists, else before closing }
  const defaultIndex = switchBody.indexOf('default:');
  let newSwitchBody;
  if (defaultIndex !== -1) {
    newSwitchBody = switchBody.slice(0, defaultIndex) + caseEntry + '\n\n' + switchBody.slice(defaultIndex);
  } else {
    newSwitchBody = switchBody + '\n' + caseEntry + '\n';
  }

  content = content.replace(switchRegex, `switch(embedName) {${newSwitchBody}\n}`);

  await fs.ensureDir(path.dirname(mockPath));
  await fs.writeFile(mockPath, content, 'utf-8');
  return mockPath;
}

// Update public/embed-loader.js to add runtime mapping, or create if missing
async function updateEmbedLoader(kebabTag, componentName) {
  const loaderPath = path.join(ROOT_DIR, 'public/embed-loader.js');
  let exists = await fs.pathExists(loaderPath);
  let content;
  if (!exists) {
    // Create the file with the specified content
    await fs.ensureDir(path.dirname(loaderPath));
    const loaderContent =
`export const EmbedModule = {
  async render({ componentType, props, container }) {
    const module = await import(\`/embed-components/\${componentType}.js\`);
    const tagName = props.tagName || componentType;

    const element = document.createElement(tagName);

    for (const [key, value] of Object.entries(props)) {
      if (key === 'tagName') continue;
      element.setAttribute(key, value);
    }

    container.appendChild(element);
  }
};
`;
    await fs.writeFile(loaderPath, loaderContent, 'utf-8');
    return loaderPath;
  }
  content = await fs.readFile(loaderPath, 'utf-8');

  // Add import if missing
  const importStatement = `import ${componentName} from '../src/embed-components/${componentName}.svelte';`;
  if (!content.includes(importStatement)) {
    const importRegex = /import .+ from .+;\n/g;
    const matches = content.match(importRegex);
    if (matches && matches.length > 0) {
      const lastImport = matches[matches.length - 1];
      content = content.replace(lastImport, lastImport + importStatement + '\n');
    } else {
      content = importStatement + '\n' + content;
    }
  }

  // Add to embedComponents mapping object
  const regRegex = /const embedComponents\s*=\s*{([^}]*)}/m;
  const match = content.match(regRegex);
  if (match) {
    const inside = match[1];
    const key = kebabTag;
    if (!inside.includes(key)) {
      const quotedKey = quoteIfNeeded(key);
      const newInside = inside.trim().endsWith(',') ? inside + `\n  ${quotedKey}: ${componentName},` : inside + `,\n  ${quotedKey}: ${componentName}`;
      content = content.replace(regRegex, `const embedComponents = {${newInside}\n}`);
    }
  } else {
    // fallback: append const embedComponents = { ... }
    const quotedKey = quoteIfNeeded(kebabTag);
    content += `\nconst embedComponents = {\n  ${quotedKey}: ${componentName}\n};\n`;
  }

  await fs.ensureDir(path.dirname(loaderPath));
  await fs.writeFile(loaderPath, content, 'utf-8');
  return loaderPath;
}

// Update public/embed-*.js files to add export mapping
async function updatePublicEmbedFiles(kebabTag, componentName) {
  // Find files matching public/embed-*.js
  const publicDir = path.join(ROOT_DIR, 'public');
  const files = await fs.readdir(publicDir);
  const embedFiles = files.filter(f => /^embed-.*\.js$/.test(f));
  const updatedFiles = [];
  for (const file of embedFiles) {
    const filePath = path.join(publicDir, file);
    let content = await fs.readFile(filePath, 'utf-8');

    // Add import if missing
    const importStatement = `import ${componentName} from '../src/embed-components/${componentName}.svelte';`;
    if (!content.includes(importStatement)) {
      const importRegex = /import .+ from .+;\n/g;
      const matches = content.match(importRegex);
      if (matches && matches.length > 0) {
        const lastImport = matches[matches.length - 1];
        content = content.replace(lastImport, lastImport + importStatement + '\n');
      } else {
        content = importStatement + '\n' + content;
      }
    }

    // Add to embedComponents mapping object
    const regRegex = /const embedComponents\s*=\s*{([^}]*)}/m;
    const match = content.match(regRegex);
    if (match) {
      const inside = match[1];
      const key = kebabTag;
      if (!inside.includes(key)) {
        const newInside = inside.trim().endsWith(',') ? inside + `\n  '${key}': ${componentName},` : inside + `,\n  '${key}': ${componentName}`;
        content = content.replace(regRegex, `const embedComponents = {${newInside}\n}`);
      }
    } else {
      // fallback: append const embedComponents = { ... }
      content += `\nconst embedComponents = {\n  '${kebabTag}': ${componentName}\n};\n`;
    }

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
    updatedFiles.push(filePath);
  }
  return updatedFiles;
}

// Update src/embed-components/SveltePlayground.svelte to add import and usage
async function updateSveltePlayground(kebabTag, componentName) {
  const playgroundPath = path.join(ROOT_DIR, 'src/embed-components/SveltePlayground.svelte');
  let content = await fs.readFile(playgroundPath, 'utf-8');

  // Add import if missing
  const importStatement = `import ${componentName} from './${componentName}.svelte';`;
  if (!content.includes(importStatement)) {
    const importRegex = /<script[^>]*>([\s\S]*?)<\/script>/m;
    const match = content.match(importRegex);
    if (match) {
      const scriptContent = match[1];
      const newScriptContent = scriptContent.trim().endsWith('\n') ? scriptContent + importStatement + '\n' : scriptContent + '\n' + importStatement + '\n';
      content = content.replace(importRegex, `<script>\n${newScriptContent}</script>`);
    } else {
      // No script tag, add one
      content = `<script>\n${importStatement}\n</script>\n` + content;
    }
  }

  // Add example usage block if not present
  const usageTag = `<${kebabTag} />`;
  if (!content.includes(usageTag)) {
    // Insert usage before closing main or at end
    const mainCloseIndex = content.lastIndexOf('</main>');
    if (mainCloseIndex !== -1) {
      content = content.slice(0, mainCloseIndex) + `  ${usageTag}\n` + content.slice(mainCloseIndex);
    } else {
      content += `\n${usageTag}\n`;
    }
  }

  await fs.ensureDir(path.dirname(playgroundPath));
  await fs.writeFile(playgroundPath, content, 'utf-8');
  return playgroundPath;
}

// Generate Svelte Embed component
async function generateEmbed(componentName) {
  const kebabTag = kebabCase(componentName);

  const svelteFilePath = path.join(ROOT_DIR, 'src/embed-components', `${componentName}.svelte`);
  await fs.ensureDir(path.dirname(svelteFilePath));
  const svelteSourceExists = await fs.pathExists(svelteFilePath);
  let svelteSource = '';
  if (svelteSourceExists) {
    svelteSource = await fs.readFile(svelteFilePath, 'utf-8');
    // Remove any <svelte:options ... /> lines (deprecated tag="..." usage)
    svelteSource = svelteSource.replace(/^\s*<svelte:options[^>]*\/>\s*$/gm, '');
  }

  // Parse existing script or empty
  let script = '';
  if (svelteSource) {
    const ast = parse(svelteSource);
    script = ast.instance ? svelteSource.slice(ast.instance.content.start, ast.instance.content.end) : '';
  }

  const props = extractProps(script);

  // Add brand props & component_width if missing
  const brandProps = [
    { name: 'brand_colors_primary', default: '#4f46e5' },
    { name: 'brand_colors_text_on_primary', default: 'white' },
  ];
  const existingPropNames = new Set(props.map(p => p.name));
  for (const bp of brandProps) {
    if (!existingPropNames.has(bp.name)) props.push(bp);
  }
  if (!existingPropNames.has('component_width')) props.push({ name: 'component_width', default: 'auto' });

  // Generate new Svelte content
  const propExports = props
    .map((p) => `export let ${p.name} = ${JSON.stringify(p.default)};`)
    .join('\n  ');

  const newSvelte = `
<svelte:options customElement={true} />

<script>
  import { onMount } from 'svelte';
  import { parseArrayProp } from './utils/propUtils.js';

  // Retain kebab-case tag name for runtime reference
  export let tagName = "${kebabTag}";

  ${propExports}

  onMount(() => {
    // lazy load external dependencies here
  });
</script>

<slot></slot>

<style>
  :host {
    width: var(--component-width, ${props.find(p => p.name === 'component_width').default});
  }
</style>
`;

  const formatted = formatCode(newSvelte, 'svelte');

  await fs.ensureDir(path.dirname(svelteFilePath));
  await fs.writeFile(svelteFilePath, formatted, 'utf-8');

  return { componentName, kebabTag, props, svelteFilePath };
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: embedify <ComponentName>');
    process.exit(1);
  }

  const componentName = arg.trim();
  if (!/^[A-Z][A-Za-z0-9]*$/.test(componentName)) {
    console.error('Component name should be PascalCase, e.g. MyComponent');
    process.exit(1);
  }

  console.log(`Generating embed component for: ${componentName}`);

  try {
    const { kebabTag, props, svelteFilePath } = await generateEmbed(componentName);

    const rollupPath = await updateRollupConfig(componentName);
    const embedRegPath = await updateEmbedRegistry(componentName, kebabTag);
    const embedConfigPath = await updateEmbedConfigRegistry(componentName, kebabTag, props);
    const componentPropsPath = await updateComponentProps(componentName, kebabTag, props);
    const mockDataPath = await updateMockData(componentName, kebabTag, props);
    const loaderPath = await updateEmbedLoader(kebabTag, componentName);
    const updatedPublicFiles = await updatePublicEmbedFiles(kebabTag, componentName);
    const playgroundPath = await updateSveltePlayground(kebabTag, componentName);

    console.log('✅ Embed component created:', svelteFilePath);
    console.log('✅ Updated rollup config:', rollupPath);
    console.log('✅ Updated embed registry:', embedRegPath);
    console.log('✅ Updated embed config registry:', embedConfigPath);
    console.log('✅ Updated component props:', componentPropsPath);
    if (mockDataPath) {
      console.log('✅ Updated mock data in:', mockDataPath);
    } else {
      console.log('ℹ️ Could not update mock data (function not found)');
    }
    console.log('✅ Updated embed loader:', loaderPath);
    if (updatedPublicFiles.length > 0) {
      console.log('✅ Updated public embed files:', updatedPublicFiles.join(', '));
    } else {
      console.log('ℹ️ No public embed files updated');
    }
    console.log('✅ Updated SveltePlayground:', playgroundPath);

    console.log(`\nSummary:
- Component: ${componentName} (${kebabTag})
- Props: ${props.map(p => p.name).join(', ')}
- Images Support: <has_images>true</has_images>
- All relevant files updated/created.
`);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();