import path from 'path';

import { parseArgs, parseInitArgs, printHelp, printInitHelp } from './internal/args.js';
import { findDefaultConfigPath, loadConfig, mergeConfigWithArgs } from './internal/config.js';
import { runInit } from './internal/init.js';
import { writeError } from './internal/output.js';
import { runOnce } from './internal/runner.js';
import { runWithWatch } from './internal/watcher.js';

async function run(): Promise<void> {
    const argv = process.argv.slice(2);

    if (argv[0] === 'init') {
        const initArgs = parseInitArgs(argv.slice(1));
        if (initArgs.help) {
            printInitHelp();
            process.exit(0);
        }
        await runInit(initArgs);
        return;
    }

    const parsed = parseArgs(argv);

    if (parsed.help) {
        printHelp();
        process.exit(0);
    }

    const resolveOptions = () => {
        const cwd = path.resolve(parsed.cwd ?? process.cwd());
        const configPath = parsed.configPath
            ? path.resolve(cwd, parsed.configPath)
            : findDefaultConfigPath(cwd);
        const config = configPath ? loadConfig(configPath, cwd) : {};
        return mergeConfigWithArgs(config, {
            ...parsed,
            configPath,
        });
    };

    const options = resolveOptions();

    if (!options.watch) {
        runOnce(options);
        return;
    }

    runWithWatch(resolveOptions);
}

run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    writeError(message);
    if ((process.argv[2] ?? '') === 'init') {
        printInitHelp();
    } else {
        printHelp();
    }
    process.exit(1);
});
