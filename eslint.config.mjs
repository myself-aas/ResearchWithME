import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import { defineConfig, globalIgnores } from 'eslint/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default defineConfig([
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'ResearchWith.me-main/**',
    'data/**',
    'coverage/**',
    '.open-next/**',
    '.wrangler/**',
    'cloudflare-env.d.ts',
    // Vendored third-party bundles inside the video project
    'video/**',
  ]),
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['next-env.d.ts'],
    rules: { '@typescript-eslint/triple-slash-reference': 'off' },
  },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/jsx-no-target-blank': 'error',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/label-has-associated-control': [
        'error',
        { assert: 'either', depth: 3 },
      ],
    },
  },
]);
