import { createContext, useContext, useMemo, useReducer } from 'react';
import type { Dispatch, ReactElement, ReactNode } from 'react';

import { frameworkPresets } from '../engine/presets';
import type { Framework, PruneMode, RunPruneResult } from '../engine/types';

export interface LabState {
    mode: PruneMode;
    framework: Framework;
    benchmark: boolean;
    keepDynamicPatterns: boolean;
    files: Record<string, string>;
    activeFile: string;
    css: string;
    safelistInput: string;
    running: boolean;
    result: RunPruneResult | null;
    error: string | null;
}

type Action =
    | { type: 'set-mode'; mode: PruneMode }
    | { type: 'set-framework'; framework: Framework }
    | { type: 'set-benchmark'; benchmark: boolean }
    | { type: 'set-keep-dynamic'; keepDynamicPatterns: boolean }
    | { type: 'set-active-file'; file: string }
    | { type: 'update-file'; file: string; content: string }
    | { type: 'update-css'; css: string }
    | { type: 'set-safelist'; safelistInput: string }
    | { type: 'set-running'; running: boolean }
    | { type: 'set-result'; result: RunPruneResult | null }
    | { type: 'set-error'; error: string | null }
    | { type: 'load-preset'; framework: Framework };

function createInitialState(): LabState {
    const framework: Framework = 'react';
    const preset = frameworkPresets[framework];
    const activeFile = Object.keys(preset.files)[0] ?? 'App.tsx';

    return {
        mode: 'safe',
        framework,
        benchmark: true,
        keepDynamicPatterns: true,
        files: { ...preset.files },
        activeFile,
        css: preset.css,
        safelistInput: '',
        running: false,
        result: null,
        error: null,
    };
}

function reducer(state: LabState, action: Action): LabState {
    switch (action.type) {
        case 'set-mode':
            return { ...state, mode: action.mode };
        case 'set-framework':
            return { ...state, framework: action.framework };
        case 'set-benchmark':
            return { ...state, benchmark: action.benchmark };
        case 'set-keep-dynamic':
            return { ...state, keepDynamicPatterns: action.keepDynamicPatterns };
        case 'set-active-file':
            return { ...state, activeFile: action.file };
        case 'update-file':
            return {
                ...state,
                files: {
                    ...state.files,
                    [action.file]: action.content,
                },
            };
        case 'update-css':
            return { ...state, css: action.css };
        case 'set-safelist':
            return { ...state, safelistInput: action.safelistInput };
        case 'set-running':
            return { ...state, running: action.running };
        case 'set-result':
            return { ...state, result: action.result };
        case 'set-error':
            return { ...state, error: action.error };
        case 'load-preset': {
            const preset = frameworkPresets[action.framework];
            const firstFile = Object.keys(preset.files)[0] ?? 'index.html';
            return {
                ...state,
                framework: action.framework,
                files: { ...preset.files },
                activeFile: firstFile,
                css: preset.css,
                result: null,
                error: null,
            };
        }
        default:
            return state;
    }
}

interface LabStoreValue {
    state: LabState;
    dispatch: Dispatch<Action>;
}

const LabStoreContext = createContext<LabStoreValue | null>(null);

export function LabStoreProvider({ children }: { children: ReactNode }): ReactElement {
    const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
    const value = useMemo(() => ({ state, dispatch }), [state]);
    return <LabStoreContext.Provider value={value}>{children}</LabStoreContext.Provider>;
}

export function useLabStore(): LabStoreValue {
    const store = useContext(LabStoreContext);
    if (!store) {
        throw new Error('useLabStore must be used inside LabStoreProvider');
    }
    return store;
}

export function parseSafelistInput(input: string): string[] {
    return input
        .split(/[\n,]/g)
        .map((item) => item.trim())
        .filter(Boolean);
}
