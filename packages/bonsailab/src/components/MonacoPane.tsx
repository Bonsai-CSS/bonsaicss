import Editor from '@monaco-editor/react';
import type { ReactElement } from 'react';

interface MonacoPaneProps {
    title: string;
    value: string;
    language: string;
    onChange(value: string): void;
}

export function MonacoPane({ title, value, language, onChange }: MonacoPaneProps): ReactElement {
    return (
        <section className="panel panel--editor">
            <div className="panel__title">{title}</div>
            <div className="editor-shell">
                <Editor
                    theme="vs-dark"
                    language={language}
                    value={value}
                    options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        lineNumbersMinChars: 3,
                        scrollBeyondLastLine: false,
                        tabSize: 2,
                        wordWrap: 'on',
                        automaticLayout: true,
                    }}
                    onChange={(nextValue) => onChange(nextValue ?? '')}
                />
            </div>
        </section>
    );
}
