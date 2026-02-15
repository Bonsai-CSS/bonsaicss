import type { Framework, PruneMode } from '../engine/types';
import type { ReactElement } from 'react';

interface TopBarProps {
    mode: PruneMode;
    framework: Framework;
    benchmark: boolean;
    keepDynamicPatterns: boolean;
    running: boolean;
    onModeChange(mode: PruneMode): void;
    onFrameworkChange(framework: Framework): void;
    onBenchmarkChange(enabled: boolean): void;
    onKeepDynamicPatternsChange(enabled: boolean): void;
    onLoadPreset(): void;
    onRun(): void;
}

const frameworks: Array<{ value: Framework; label: string }> = [
    { value: 'vanilla', label: 'Vanilla' },
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'svelte', label: 'Svelte' },
    { value: 'angular', label: 'Angular' },
];

export function TopBar(props: TopBarProps): ReactElement {
    return (
        <header className="topbar">
            <div className="topbar__brand">BonsaiLab <span aria-hidden>🌳</span></div>

            <div className="topbar__controls">
                <div className="control-group">
                    <span className="control-label">Mode</span>
                    <button
                        className={props.mode === 'safe' ? 'toggle active' : 'toggle'}
                        onClick={() => props.onModeChange('safe')}
                        type="button"
                    >
                        Safe
                    </button>
                    <button
                        className={props.mode === 'aggressive' ? 'toggle active' : 'toggle'}
                        onClick={() => props.onModeChange('aggressive')}
                        type="button"
                    >
                        Aggressive
                    </button>
                </div>

                <div className="control-group">
                    <span className="control-label">Framework</span>
                    <select
                        className="select"
                        value={props.framework}
                        onChange={(event) => props.onFrameworkChange(event.target.value as Framework)}
                    >
                        {frameworks.map((framework) => (
                            <option key={framework.value} value={framework.value}>
                                {framework.label}
                            </option>
                        ))}
                    </select>
                    <button className="button ghost" type="button" onClick={props.onLoadPreset}>
                        Load Preset
                    </button>
                </div>

                <label className="switch" htmlFor="benchmark-toggle">
                    <input
                        id="benchmark-toggle"
                        type="checkbox"
                        checked={props.benchmark}
                        onChange={(event) => props.onBenchmarkChange(event.target.checked)}
                    />
                    <span>Benchmark</span>
                </label>

                <label className="switch" htmlFor="keep-dynamic-toggle">
                    <input
                        id="keep-dynamic-toggle"
                        type="checkbox"
                        checked={props.keepDynamicPatterns}
                        onChange={(event) =>
                            props.onKeepDynamicPatternsChange(event.target.checked)
                        }
                    />
                    <span>Keep Dynamic Patterns</span>
                </label>

                <button
                    className="button primary"
                    onClick={props.onRun}
                    disabled={props.running}
                    type="button"
                >
                    {props.running ? 'Running...' : 'Run Prune'}
                </button>
            </div>
        </header>
    );
}
