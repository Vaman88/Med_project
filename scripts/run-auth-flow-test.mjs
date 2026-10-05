import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

// Next generates these tracked files for whichever distDir starts last. Keep
// the normal development server's declarations after the isolated auth test.
const originalEnv = await readFile('next-env.d.ts', 'utf8');
const originalConfig = await readFile('tsconfig.json', 'utf8');

async function restoreNextDeclarations() {
  const envPath = 'next-env.d.ts';
  const env = await readFile(envPath, 'utf8');
  if (env.includes('./.next-auth-test/dev/types/')) {
    const normalized = env.replaceAll('./.next-auth-test/dev/types/', './.next/dev/types/');
    await writeFile(envPath, normalized === originalEnv ? originalEnv : normalized);
  }
  const configPath = 'tsconfig.json';
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const retained = config.include.filter(value => !value.startsWith('.next-auth-test/'));
  if (retained.length !== config.include.length) {
    config.include = retained;
    const original = JSON.parse(originalConfig);
    await writeFile(configPath, JSON.stringify(config) === JSON.stringify(original) ? originalConfig : `${JSON.stringify(config, null, 2)}\n`);
  }
}

const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.auth.config.ts'], {
  stdio: 'inherit', windowsHide: true,
});
const exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', code => resolve(code ?? 1));
});
try {
  await restoreNextDeclarations();
} catch (error) {
  console.error('Could not restore Next.js generated declarations:', error);
  process.exitCode = 1;
}
if (!process.exitCode) process.exitCode = exitCode;
