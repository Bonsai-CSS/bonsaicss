import type { ReactElement } from 'react';

interface FileExplorerProps {
    files: Record<string, string>;
    activeFile: string;
    onSelect(file: string): void;
}

export function FileExplorer({ files, activeFile, onSelect }: FileExplorerProps): ReactElement {
    const fileNames = Object.keys(files).sort();

    return (
        <aside className="panel panel--explorer">
            <div className="panel__title">File Explorer</div>
            <ul className="file-list">
                {fileNames.map((file) => (
                    <li key={file}>
                        <button
                            className={file === activeFile ? 'file-item active' : 'file-item'}
                            onClick={() => onSelect(file)}
                            type="button"
                        >
                            {file}
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
