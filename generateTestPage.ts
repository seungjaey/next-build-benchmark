import { mkdir, readdir, writeFile, rm, stat } from 'node:fs/promises';
import ora from 'ora';
import { nanoid } from 'nanoid';
import { concurrent, each, fromEntries, map, pipe, range, toArray, toAsync } from '@fxts/core';
import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const createUUID = () => nanoid(20);

const cleanUpDir = async (path: string) => {
  try {
    await rm(path, {
      recursive: true,
    });
  } catch (error) {}
};

const BENCHMARK_PAGE_PATH = './src/pages/benchmark';

const TEST_PAGE_CONTENT = `export default function Page() {
  return (
    <div>
      <h1>데모 페이지</h1>
    </div>
  );
}
`;

const checkDirExist = async (): Promise<boolean> => {
  try {
    await stat(BENCHMARK_PAGE_PATH);
    return true;
  } catch (err) {
    return false;
  }
};

const createOutputDir = async () => {
  const isDirExist = await checkDirExist();
  if (isDirExist) {
    return;
  }
  await mkdir(BENCHMARK_PAGE_PATH);
};

const runWithProgress = async <T>(message: string, task: () => Promise<T>): Promise<T> => {
  const progress = ora(message).start();
  const result = await task();
  progress.stop();
  return result;
};

const run = async (count: number = 1) => {
  await cleanUpDir(BENCHMARK_PAGE_PATH);
  console.log(`${count}...`);
  await createOutputDir();

  await pipe(
    range(count),
    toAsync,
    map(createUUID),
    concurrent(30),
    each(async (fileName) => {
      await writeFile(`${BENCHMARK_PAGE_PATH}/${fileName}.tsx`, TEST_PAGE_CONTENT);
    }),
  );
  await cleanUpDir('./.next');
  const start = performance.now();
  execSync('pnpm run build');
  return start - performance.now();
};

const benchmark = async () => {
  const final = await pipe(
    [100, 1000, 2000, 3000],
    toAsync,
    map(async (count) => {
      const result = await pipe(
        range(5),
        toAsync,
        map(() => run(count)),
        toArray,
      );
      return [count, result] as const;
    }),
    fromEntries,
  );

  await writeFile('./final.json', JSON.stringify(final, null, 2));
};

benchmark();
