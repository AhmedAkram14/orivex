import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Next.js's own ESLint rulesets (core-web-vitals, react, react-hooks,
// jsx-a11y) don't ship flat-config exports as of this Next version, so this
// uses the same FlatCompat bridge `create-next-app` itself generates --
// not a bespoke choice. This is a per-package config (not the root
// eslint.config.mjs) specifically because these rules are React/Next-
// specific and don't belong in the repo's shared, framework-agnostic base
// config (docs/13-engineering-bootstrap.md's packages/eslint-config
// description: "only genuinely universal rules").
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  { ignores: ['.next/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];
