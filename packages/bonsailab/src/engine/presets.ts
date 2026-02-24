import type { Framework } from './types';

export interface FrameworkPreset {
    files: Record<string, string>;
    css: string;
}

const baseCss = `.btn { padding: 8px 12px; border-radius: 8px; }
.btn-primary { background: #2ecc71; color: #08130d; }
.card { border: 1px solid #2b3f36; padding: 16px; }
.nav-link { color: #b8d8c7; }
.unused-shadow { box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
.alert-success { color: #4ade80; }
.alert-error { color: #f87171; }
`;

export const frameworkPresets: Record<Framework, FrameworkPreset> = {
    vanilla: {
        files: {
            'index.html': `<main class="card">
  <button class="btn btn-primary">Run</button>
  <a class="nav-link">Docs</a>
</main>`,
            'app.js': `document.body.classList.add('alert-success');`,
        },
        css: baseCss,
    },
    react: {
        files: {
            'App.tsx': `export function App() {
  const variant = 'primary';
  return (
    <div className="card">
      <button className={\`btn btn-\${variant}\`}>Run</button>
      <a className="nav-link">Docs</a>
    </div>
  );
}`,
            'Navbar.tsx': `export const Navbar = () => <nav className="nav-link" />;`,
        },
        css: baseCss,
    },
    vue: {
        files: {
            'App.vue': `<template>
  <section class="card">
    <button :class="['btn', 'btn-' + variant]">Run</button>
    <a class="nav-link">Docs</a>
  </section>
</template>
<script setup lang="ts">
const variant = 'primary';
</script>`,
        },
        css: baseCss,
    },
    svelte: {
        files: {
            'App.svelte': `<script>
  let variant = 'primary';
</script>
<div class="card">
  <button class={\`btn btn-\${variant}\`}>Run</button>
  <a class="nav-link">Docs</a>
</div>`,
        },
        css: baseCss,
    },
    angular: {
        files: {
            'app.component.html': `<section class="card">
  <button class="btn" [class.btn-primary]="isPrimary">Run</button>
  <a class="nav-link">Docs</a>
</section>`,
            'app.component.ts': `export class AppComponent { isPrimary = true; }`,
        },
        css: baseCss,
    },
    astro: {
        files: {
            'src/pages/index.astro': `---
const variant = 'primary';
const isActive = true;
---
<main class:list={["card", isActive && "card--active"]}>
  <button class:list={["btn", "btn-" + variant]}>Run</button>
  <a class="nav-link">Docs</a>
</main>`,
        },
        css: baseCss,
    },
    solid: {
        files: {
            'App.tsx': `export default function App() {
  const isPrimary = true;
  return (
    <main class="card">
      <button classList={{ btn: true, "btn-primary": isPrimary }}>Run</button>
      <a class="nav-link">Docs</a>
    </main>
  );
}`,
        },
        css: baseCss,
    },
};
