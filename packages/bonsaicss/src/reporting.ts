import fs from 'fs';
import path from 'path';

import type {
    BonsaiOptions,
    BonsaiReport,
    BonsaiReportClassEntry,
    PruneResult,
    ScanSummary,
} from './types.js';

function writeJsonFile(outputPath: string, payload: unknown): void {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
}

export function produceLegacyAnalysisReport(scan: ScanSummary, options: BonsaiOptions): void {
    if (!options.analyze) return;

    const cwd = options.cwd ?? process.cwd();
    const outputPath =
        typeof options.analyze === 'string'
            ? path.resolve(cwd, options.analyze)
            : path.resolve(cwd, 'bonsai-analysis.json');

    const report: Record<string, string[]> = {};
    const sortedClasses = Array.from(scan.classOrigins.keys()).sort();

    sortedClasses.forEach(className => {
        const origins = scan.classOrigins.get(className);
        if (origins) {
            report[className] = Array.from(origins).sort();
        }
    });

    try {
        writeJsonFile(outputPath, report);
    } catch (err) {
        console.error(`[bonsaicss] Failed to write analysis report to ${outputPath}:`, err);
    }
}

export function buildBonsaiReport(
    scan: ScanSummary,
    result: PruneResult,
    options: BonsaiOptions,
    durationMs: number,
): BonsaiReport {
    const cwd = options.cwd ?? process.cwd();
    const classEntries = new Map<string, BonsaiReportClassEntry>();

    scan.classOrigins.forEach((origins, className) => {
        classEntries.set(className, {
            className,
            status: result.keptClasses.includes(className)
                ? 'kept'
                : result.removedClasses.includes(className)
                  ? 'removed'
                  : 'detected-only',
            origins: Array.from(origins).sort(),
        });
    });

    result.keptClasses.forEach(className => {
        if (classEntries.has(className)) return;
        classEntries.set(className, {
            className,
            status: 'kept',
            origins: [],
        });
    });

    result.removedClasses.forEach(className => {
        if (classEntries.has(className)) return;
        classEntries.set(className, {
            className,
            status: 'removed',
            origins: [],
        });
    });

    const classes = Array.from(classEntries.values()).sort((a, b) =>
        a.className.localeCompare(b.className),
    );

    return {
        reportVersion: 1,
        generatedAt: new Date().toISOString(),
        cwd,
        contentGlobs: [...options.content],
        stats: {
            filesScanned: scan.filesScanned,
            classesDetected: scan.classes.size,
            classesKept: result.keptClasses.length,
            classesRemoved: result.removedClasses.length,
            totalRules: result.stats.totalRules,
            removedRules: result.stats.removedRules,
            keptRules: result.stats.keptRules,
            sizeBefore: result.stats.originalSize,
            sizeAfter: result.stats.prunedSize,
            reductionRatio:
                result.stats.originalSize > 0
                    ? 1 - result.stats.prunedSize / result.stats.originalSize
                    : 0,
            durationMs,
        },
        classes,
        warnings: [...(scan.warnings ?? [])],
    };
}

function renderHtmlReport(report: BonsaiReport): string {
    const reductionPct = (report.stats.reductionRatio * 100).toFixed(2);
    const classRows = report.classes
        .map(entry => {
            const origins = entry.origins.length > 0 ? entry.origins.join('<br/>') : '-';
            return `<tr><td>${entry.className}</td><td>${entry.status}</td><td>${origins}</td></tr>`;
        })
        .join('\n');
    const warningRows =
        report.warnings.length > 0
            ? report.warnings.map(warning => `<li>${warning}</li>`).join('\n')
            : '<li>None</li>';

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>BonsaiCSS Report</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; color: #0f172a; }
    h1, h2 { margin-bottom: 8px; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; text-align: left; padding: 8px; font-size: 14px; vertical-align: top; }
    th { background: #f1f5f9; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; max-width: 680px; }
    .muted { color: #475569; }
  </style>
</head>
<body>
  <h1>BonsaiCSS Report</h1>
  <p class="muted">Generated at ${report.generatedAt}</p>
  <h2>Stats</h2>
  <div class="grid">
    <div>Files scanned: <strong>${String(report.stats.filesScanned)}</strong></div>
    <div>Classes detected: <strong>${String(report.stats.classesDetected)}</strong></div>
    <div>Classes kept: <strong>${String(report.stats.classesKept)}</strong></div>
    <div>Classes removed: <strong>${String(report.stats.classesRemoved)}</strong></div>
    <div>Rules removed: <strong>${String(report.stats.removedRules)}</strong></div>
    <div>Reduction: <strong>${reductionPct}%</strong></div>
    <div>Size before: <strong>${String(report.stats.sizeBefore)} bytes</strong></div>
    <div>Size after: <strong>${String(report.stats.sizeAfter)} bytes</strong></div>
    <div>Total time: <strong>${report.stats.durationMs.toFixed(2)} ms</strong></div>
  </div>
  <h2>Warnings</h2>
  <ul>${warningRows}</ul>
  <h2>Class Matrix</h2>
  <div style="margin-bottom: 12px; display: flex; gap: 8px;">
    <input type="text" id="class-filter" placeholder="Filter classes..." style="padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px;" />
    <select id="status-filter" style="padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px;">
      <option value="all">All Statuses</option>
      <option value="kept">Kept</option>
      <option value="detected-only">Detected Only</option>
      <option value="removed">Removed</option>
    </select>
  </div>
  <table>
    <thead><tr><th>Class</th><th>Status</th><th>Why</th></tr></thead>
    <tbody>
      ${classRows}
    </tbody>
  </table>
</body>
</html>`;
}

export function emitAdvancedReports(report: BonsaiReport, options: BonsaiOptions): void {
    if (!options.report) return;

    const cwd = options.cwd ?? process.cwd();
    const reportOptions = options.report;

    if (reportOptions.json) {
        const outputPath =
            typeof reportOptions.json === 'string'
                ? path.resolve(cwd, reportOptions.json)
                : path.resolve(cwd, 'bonsai-report.json');
        try {
            writeJsonFile(outputPath, report);
        } catch (err) {
            console.error(`[bonsaicss] Failed to write JSON report to ${outputPath}:`, err);
        }
    }

    if (reportOptions.html) {
        const outputPath =
            typeof reportOptions.html === 'string'
                ? path.resolve(cwd, reportOptions.html)
                : path.resolve(cwd, 'bonsai-report.html');
        try {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, renderHtmlReport(report), 'utf8');
        } catch (err) {
            console.error(`[bonsaicss] Failed to write HTML report to ${outputPath}:`, err);
        }
    }

    if (reportOptions.ci) {
        const outputPath =
            typeof reportOptions.ci === 'string'
                ? path.resolve(cwd, reportOptions.ci)
                : path.resolve(cwd, 'bonsai-ci-stats.txt');
        const lines = [
            `report_version=${String(report.reportVersion ?? 1)}`,
            `files_scanned=${String(report.stats.filesScanned)}`,
            `classes_detected=${String(report.stats.classesDetected)}`,
            `classes_removed=${String(report.stats.classesRemoved)}`,
            `rules_removed=${String(report.stats.removedRules)}`,
            `size_before=${String(report.stats.sizeBefore)}`,
            `size_after=${String(report.stats.sizeAfter)}`,
            `size_after_kb=${(report.stats.sizeAfter / 1024).toFixed(2)}`,
            `reduction_ratio=${report.stats.reductionRatio.toFixed(6)}`,
            `unused_css_percent=${(report.stats.reductionRatio * 100).toFixed(2)}`,
            `duration_ms=${report.stats.durationMs.toFixed(3)}`,
        ];
        try {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
        } catch (err) {
            console.error(`[bonsaicss] Failed to write CI report to ${outputPath}:`, err);
        }
    }
}
