import type { DetectedClass, RunPruneResult } from '../engine/types';
import type { CssDiffLine } from '../engine/diff';
import type { ReactElement } from 'react';

function groupDetectedClasses(classes: readonly DetectedClass[]): Map<string, DetectedClass[]> {
    const grouped = new Map<string, DetectedClass[]>();

    classes.forEach((item) => {
        const existing = grouped.get(item.name);
        if (existing) {
            existing.push(item);
            return;
        }
        grouped.set(item.name, [item]);
    });

    return new Map(
        Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right)),
    );
}

interface ResultsPanelsProps {
    cssBefore: string;
    result: RunPruneResult | null;
    diffLines: CssDiffLine[];
    benchmark: boolean;
    safelistPreview: string[];
    error: string | null;
}

export function ResultsPanels(props: ResultsPanelsProps): ReactElement {
    const grouped: Map<string, DetectedClass[]> = props.result
        ? groupDetectedClasses(props.result.detectedClasses)
        : new Map<string, DetectedClass[]>();

    return (
        <section className="results-grid">
            <article className="result-card">
                <h3>CSS Before</h3>
                <pre>{props.cssBefore || 'No CSS provided.'}</pre>
            </article>

            <article className="result-card">
                <h3>CSS After</h3>
                <pre>{props.result?.cssFinal || 'Run prune to see output.'}</pre>
            </article>

            <article className="result-card">
                <h3>CSS Diff Viewer</h3>
                <div className="diff-list">
                    {props.diffLines.length === 0 ? (
                        <p className="muted">Run prune to inspect diff.</p>
                    ) : (
                        props.diffLines.map((line, index) => (
                            <pre
                                key={`${line.status}-${index.toString()}`}
                                className={line.status === 'kept' ? 'diff-line kept' : 'diff-line removed'}
                            >
                                {line.content}
                            </pre>
                        ))
                    )}
                </div>
            </article>

            <article className="result-card">
                <h3>Classes Detected</h3>
                {grouped.size === 0 ? (
                    <p className="muted">No classes detected yet.</p>
                ) : (
                    <div className="inspector-list">
                        {Array.from(grouped.entries()).map(([className, entries]) => (
                            <div className="inspector-item" key={className}>
                                <div className="inspector-class">{className}</div>
                                {entries.map((entry, index) => (
                                    <div key={`${entry.file}:${entry.line.toString()}:${index.toString()}`} className="inspector-ref">
                                        ↳ {entry.file}:{entry.line.toString()} ({entry.type})
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </article>

            <article className="result-card">
                <h3>Classes Removed</h3>
                {props.result?.removedClasses.length ? (
                    <ul className="tag-list">
                        {props.result.removedClasses.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="muted">No removed classes.</p>
                )}
            </article>

            <article className="result-card">
                <h3>Warnings</h3>
                {props.error ? <p className="warning">{props.error}</p> : null}
                {props.result?.warnings.length ? (
                    <ul className="warning-list">
                        {props.result.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="muted">No warnings.</p>
                )}
            </article>

            <article className="result-card">
                <h3>Safelist Panel</h3>
                {props.safelistPreview.length ? (
                    <ul className="tag-list">
                        {props.safelistPreview.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="muted">No safelist impact detected.</p>
                )}
            </article>

            <article className="result-card">
                <h3>Metrics</h3>
                {props.result ? (
                    <ul className="metrics-list">
                        <li>Classes detected: {grouped.size.toString()}</li>
                        <li>Classes removed: {props.result.removedClasses.length.toString()}</li>
                        <li>Size before: {(props.result.sizeBefore / 1024).toFixed(2)}kb</li>
                        <li>Size after: {(props.result.sizeAfter / 1024).toFixed(2)}kb</li>
                        <li>Total time: {props.result.timings.total.toFixed(2)}ms</li>
                        {props.benchmark ? (
                            <>
                                <li>Parse: {props.result.timings.parse.toFixed(2)}ms</li>
                                <li>Scan: {props.result.timings.scan.toFixed(2)}ms</li>
                                <li>Prune: {props.result.timings.prune.toFixed(2)}ms</li>
                            </>
                        ) : null}
                    </ul>
                ) : (
                    <p className="muted">Run prune to compute metrics.</p>
                )}
            </article>
        </section>
    );
}
