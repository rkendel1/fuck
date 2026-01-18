#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { parse } = require('svelte/compiler');
const prettier = require('prettier');
const babelParser = require('@babel/parser');
const { pushFileToGitHub } = require('./gitPush');

const ROOT_DIR = path.resolve(__dirname);

// Helper functions
function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
}

function quoteIfNeeded(str) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str) ? str : `'${str}'`;
}

function extractProps(scriptContent) {
  const ast = babelParser.parse(scriptContent, { sourceType: 'module', plugins: ['jsx'] });
  const props = [];
  for (const node of ast.program.body) {
    if (node.type === 'VariableDeclaration' && node.kind === 'let') {
      node.declarations.forEach((decl) => {
        if (decl.id.type === 'Identifier') {
          let defaultValue = null;
          if (decl.init) {
            if (decl.init.type === 'StringLiteral' || decl.init.type === 'Literal') defaultValue = decl.init.value;
            else if (decl.init.type === 'NumericLiteral') defaultValue = decl.init.value;
            else if (decl.init.type === 'BooleanLiteral') defaultValue = decl.init.value;
          }
          props.push({ name: decl.id.name, default: defaultValue });
        }
      });
    }
  }
  return props;
}

function formatCode(code, parser) {
  try {
    return prettier.format(code, { parser });
  } catch {
    return code;
  }
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
    svelteSource = svelteSource.replace(/^\s*<svelte:options[^>]*\/>\s*$/gm, '');
  }

  let script = '';
  if (svelteSource) {
    const ast = parse(svelteSource);
    script = ast.instance ? svelteSource.slice(ast.instance.content.start, ast.instance.content.end) : '';
  }

  const props = extractProps(script);
  const existingPropNames = new Set(props.map(p => p.name));
  if (!existingPropNames.has('brand_colors_primary')) props.push({ name: 'brand_colors_primary', default: '#4f46e5' });
  if (!existingPropNames.has('brand_colors_text_on_primary')) props.push({ name: 'brand_colors_text_on_primary', default: 'white' });
  if (!existingPropNames.has('component_width')) props.push({ name: 'component_width', default: 'auto' });

  const propExports = props.map((p) => `export let ${p.name} = ${JSON.stringify(p.default)};`).join('\n  ');

  const newSvelte = `
<svelte:options customElement={true} />

<script>
  import { onMount } from 'svelte';
  export let tagName = "${kebabTag}";
  ${propExports}
  onMount(() => {});
</script>

<slot></slot>

<style>
  :host {
    width: var(--component-width, ${props.find(p => p.name === 'component_width').default});
  }
</style>
`;

  const formatted = formatCode(newSvelte, 'svelte');
  await fs.writeFile(svelteFilePath, formatted, 'utf-8');
  return { componentName, kebabTag, props, svelteFilePath };
}

// --- Main ---
async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node embedify.js <ComponentName>');
    process.exit(1);
  }

  const componentName = arg.trim();
  console.log(`Generating embed component for: ${componentName}`);

  try {
    const { svelteFilePath } = await generateEmbed(componentName);

    console.log(`✅ Generated Svelte component: ${svelteFilePath}`);

    // Push to GitHub
    await pushFileToGitHub(svelteFilePath, 'rkendel1', 'fuck', 'main');
    console.log('✅ Pushed to GitHub successfully!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();