import { parseArgs, printHelp } from './internal/args.js';
import { loadConfig, mergeConfigWithArgs } from './internal/config.js';
import { runOnce } from './internal/runner.js';
import { runWithWatch } from './internal/watcher.js';

function run(): void {
    const argv = process.argv.slice(2);
    const parsed = parseArgs(argv);

    if (parsed.help) {
        printHelp();
        process.exit(0);
    }

    const resolveOptions = () => {
        const config = parsed.configPath ? loadConfig(parsed.configPath) : {};
        return mergeConfigWithArgs(config, parsed);
    };

    const options = resolveOptions();

    if (!options.watch) {
        runOnce(options);
        return;
    }

    runWithWatch(resolveOptions);
}

try {
    run();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[bonsaicss] ${message}\n\n`);
    printHelp();
    process.exit(1);
}
