import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

/** Copy static assets to dist */
function copyStatic() {
  const dist = resolve(__dirname, 'dist');
  if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

  // Copy manifest
  cpSync(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'));

  // Copy popup HTML
  cpSync(resolve(__dirname, 'src/popup.html'), resolve(dist, 'popup.html'));

  // Copy CSS
  mkdirSync(resolve(dist, 'css'), { recursive: true });
  cpSync(resolve(__dirname, 'src/css'), resolve(dist, 'css'), { recursive: true });

  // Copy icons
  if (existsSync(resolve(__dirname, 'icons'))) {
    mkdirSync(resolve(dist, 'icons'), { recursive: true });
    cpSync(resolve(__dirname, 'icons'), resolve(dist, 'icons'), { recursive: true });
  }

  console.log('✓ Static assets copied');
}

/** @type {esbuild.BuildOptions} */
const buildJsOptions = {
  entryPoints: ['src/ts/app.ts'],
  bundle: true,
  outfile: 'dist/js/app.js',
  format: 'iife',
  target: 'es2020',
  minify: !isWatch,
  sourcemap: isWatch,
  logLevel: 'info',
};

/** @type {esbuild.BuildOptions} */
const buildCssOptions = {
  entryPoints: ['src/css/styles.css'],
  bundle: true,
  outfile: 'dist/css/styles.css',
  minify: !isWatch,
  sourcemap: isWatch,
  logLevel: 'info',
};

async function main() {
  copyStatic();

  if (isWatch) {
    const ctxJs = await esbuild.context(buildJsOptions);
    const ctxCss = await esbuild.context(buildCssOptions);
    await ctxJs.watch();
    await ctxCss.watch();
    console.log('👀 Watching for changes...');
  } else {
    await esbuild.build(buildJsOptions);
    await esbuild.build(buildCssOptions);
    console.log('✓ Build complete');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
