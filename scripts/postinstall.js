/**
 * Postinstall patch for react-native-css-interop
 * Fixes crash in printUpgradeWarning when stringify encounters
 * non-serializable React Navigation context getters in component props.
 */
const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-css-interop',
  'dist',
  'runtime',
  'native',
  'render-component.js'
);

if (!fs.existsSync(targetFile)) {
  console.log('[postinstall] react-native-css-interop render-component.js not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');

// Check if already patched
if (content.includes('Props could not be serialized')) {
  console.log('[postinstall] render-component.js already patched, skipping.');
  process.exit(0);
}

// Patch printUpgradeWarning to wrap in try/catch
const oldWarning = `function printUpgradeWarning(warning, originalProps) {
    console.log(\`CssInterop upgrade warning.\\n\\n\${warning}.\\n\\nThis warning was caused by a component with the props:\\n\${stringify(originalProps)}\\n\\nIf adding or removing sibling components caused this warning you should add a unique "key" prop to your components. https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key\\n\`);
}`;

const newWarning = `function printUpgradeWarning(warning, originalProps) {
    try {
        console.log(\`CssInterop upgrade warning.\\n\\n\${warning}.\\n\\nThis warning was caused by a component with the props:\\n\${stringify(originalProps)}\\n\\nIf adding or removing sibling components caused this warning you should add a unique "key" prop to your components. https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key\\n\`);
    } catch (e) {
        console.log(\`CssInterop upgrade warning.\\n\\n\${warning}.\\n\\n(Props could not be serialized: \${e.message})\\n\`);
    }
}`;

if (content.includes(oldWarning)) {
  content = content.replace(oldWarning, newWarning);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('[postinstall] Successfully patched printUpgradeWarning in render-component.js');
} else {
  console.log('[postinstall] Could not find exact printUpgradeWarning pattern, may already be patched or changed.');
}
