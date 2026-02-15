import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';

import { createPruneBridge } from '../bridge/pruneBridge';
import { FileExplorer } from '../components/FileExplorer';
import { MonacoPane } from '../components/MonacoPane';
import { ResultsPanels } from '../components/ResultsPanels';
import { TopBar } from '../components/TopBar';
import { computeCssRuleDiff } from '../engine/diff';
import { parseSafelistEntries } from '../engine/safelist';
import { frameworkPresets } from '../engine/presets';
import type { PruneBridge } from '../bridge/pruneBridge';
import { parseSafelistInput, useLabStore } from '../state/labStore';

function detectLanguageFromFile(file: string): string {
    if (file.endsWith('.tsx') || file.endsWith('.jsx')) return 'typescript';
    if (file.endsWith('.ts')) return 'typescript';
    if (file.endsWith('.js')) return 'javascript';
    if (file.endsWith('.vue')) return 'html';
    if (file.endsWith('.svelte')) return 'html';
    if (file.endsWith('.html')) return 'html';
    return 'plaintext';
}

export function App(): ReactElement {
    const { state, dispatch } = useLabStore();
    const bridgeRef = useRef<PruneBridge | null>(null);

    if (!bridgeRef.current) {
        bridgeRef.current = createPruneBridge();
    }

    useEffect(() => {
        const bridge = bridgeRef.current;
        return () => {
            bridge?.dispose();
            bridgeRef.current = null;
        };
    }, []);

    const activeContent = state.files[state.activeFile] ?? '';
    const language = detectLanguageFromFile(state.activeFile);

    const safelistEntries = useMemo(
        () => parseSafelistInput(state.safelistInput),
        [state.safelistInput],
    );

    const safelistPreview = useMemo(() => {
        if (!state.result) return [];

        const parsed = parseSafelistEntries(safelistEntries);
        const detected = new Set(state.result.detectedClasses.map((entry) => entry.name));

        const byExact = parsed.safelist.filter((entry) => detected.has(entry));
        const byRegex = state.result.detectedClasses
            .map((entry) => entry.name)
            .filter((className) => parsed.safelistPatterns.some((regex) => regex.test(className)));

        return Array.from(new Set([...byExact, ...byRegex])).sort();
    }, [safelistEntries, state.result]);

    const diffLines = useMemo(() => {
        if (!state.result) return [];
        return computeCssRuleDiff(state.css, state.result.cssFinal);
    }, [state.css, state.result]);

    const run = useCallback(async (): Promise<void> => {
        const bridge = bridgeRef.current;
        if (!bridge) return;

        dispatch({ type: 'set-running', running: true });
        dispatch({ type: 'set-error', error: null });

        try {
            const result = await bridge.runPrune({
                files: state.files,
                css: state.css,
                framework: state.framework,
                mode: state.mode,
                safelist: safelistEntries,
                keepDynamicPatterns: state.keepDynamicPatterns,
            });

            dispatch({ type: 'set-result', result });
        } catch (error) {
            dispatch({
                type: 'set-error',
                error: error instanceof Error ? error.message : 'Failed to run prune',
            });
        } finally {
            dispatch({ type: 'set-running', running: false });
        }
    }, [
        dispatch,
        safelistEntries,
        state.css,
        state.files,
        state.framework,
        state.keepDynamicPatterns,
        state.mode,
    ]);

    const fileList = Object.keys(state.files);
    const safeActiveFile = fileList.includes(state.activeFile)
        ? state.activeFile
        : fileList[0] ?? 'index.html';

    useEffect(() => {
        if (safeActiveFile !== state.activeFile) {
            dispatch({ type: 'set-active-file', file: safeActiveFile });
        }
    }, [dispatch, safeActiveFile, state.activeFile]);

    useEffect(() => {
        const debounce = window.setTimeout(() => {
            void run();
        }, 220);

        return () => {
            window.clearTimeout(debounce);
        };
    }, [run]);

    return (
        <div className="app-shell">
            <TopBar
                mode={state.mode}
                framework={state.framework}
                benchmark={state.benchmark}
                keepDynamicPatterns={state.keepDynamicPatterns}
                running={state.running}
                onModeChange={(mode) => dispatch({ type: 'set-mode', mode })}
                onFrameworkChange={(framework) => dispatch({ type: 'set-framework', framework })}
                onBenchmarkChange={(benchmark) => dispatch({ type: 'set-benchmark', benchmark })}
                onKeepDynamicPatternsChange={(keepDynamicPatterns) =>
                    dispatch({ type: 'set-keep-dynamic', keepDynamicPatterns })
                }
                onLoadPreset={() => dispatch({ type: 'load-preset', framework: state.framework })}
                onRun={run}
            />

            <main className="workspace">
                <section className="editor-grid">
                    <FileExplorer
                        files={state.files}
                        activeFile={safeActiveFile}
                        onSelect={(file) => dispatch({ type: 'set-active-file', file })}
                    />

                    <MonacoPane
                        title="HTML / JS Editor"
                        language={language}
                        value={activeContent}
                        onChange={(content) =>
                            dispatch({
                                type: 'update-file',
                                file: safeActiveFile,
                                content,
                            })
                        }
                    />

                    <MonacoPane
                        title="CSS Editor"
                        language="css"
                        value={state.css}
                        onChange={(css) => dispatch({ type: 'update-css', css })}
                    />
                </section>

                <section className="safelist-row">
                    <div className="panel panel--safelist">
                        <div className="panel__title">Safelist</div>
                        <textarea
                            className="safelist-input"
                            value={state.safelistInput}
                            onChange={(event) =>
                                dispatch({ type: 'set-safelist', safelistInput: event.target.value })
                            }
                            placeholder={[
                                'One entry per line or comma-separated.',
                                'Examples:',
                                'btn-primary',
                                '/^btn-/',
                                '^alert-',
                            ].join('\n')}
                        />
                        <div className="panel__footnote">
                            Current framework preset files: {Object.keys(frameworkPresets[state.framework].files).length.toString()}
                        </div>
                    </div>
                </section>

                <ResultsPanels
                    cssBefore={state.css}
                    result={state.result}
                    diffLines={diffLines}
                    benchmark={state.benchmark}
                    safelistPreview={safelistPreview}
                    error={state.error}
                />
            </main>
        </div>
    );
}
