import * as React from 'react';
import { useRef, useState, useMemo, useCallback } from 'react';
import { TableData, BetterTableProps, CellPosition } from '../types';

interface NavigationState {
    tabHistory: number[];
    originalColumn: number;
    clipboard: { text: string; type: 'copy' | 'cut' } | null;
}

interface ResizeState {
    isResizing: boolean;
    startWidth: number;
    colIndex: number;
    startX: number;
}

export const ReactTable: React.FC<BetterTableProps> = ({ data, onSave, onAddRow, onAddColumn }) => {
    const [tableData, setTableData] = useState<TableData>(data);
    const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
    const [navigationState, setNavigationState] = useState<NavigationState>({
        tabHistory: [],
        originalColumn: 0,
        clipboard: null
    });
    const [resizeState, setResizeState] = useState<ResizeState>({
        isResizing: false,
        startWidth: 100,
        colIndex: -1,
        startX: 0
    });

    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const saveTimeoutRef = useRef<number | null>(null);
    const initialDataRef = useRef<TableData>(data);
    const mountedRef = useRef(true);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
    const [undoStack, setUndoStack] = useState<TableData[]>([]);
const [redoStack, setRedoStack] = useState<TableData[]>([]);
const [lastAction, setLastAction] = useState<{ type: 'add' | 'edit' | 'delete'; timestamp: number } | null>(null);

    const dataStructure = useMemo(() =>
        JSON.stringify({ headers: data.headers, rows: data.rows }),
        [data.headers, data.rows]
    );

    const currentStructure = useMemo(() =>
        JSON.stringify({ headers: tableData.headers, rows: tableData.rows }),
        [tableData.headers, tableData.rows]
    );

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (saveTimeoutRef.current !== null) {
                window.clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (dataStructure !== currentStructure) {
            setTableData(data);
            initialDataRef.current = { ...data };
            inputRefs.current = {};
        }
    }, [dataStructure, currentStructure, data, mountedRef.current]);

    const isTableDataEqual = useCallback((a: TableData, b: TableData): boolean => {
        if (a.headers.length !== b.headers.length || a.rows.length !== b.rows.length) return false;
        for (let i = 0; i < a.headers.length; i++) {
            if (a.headers[i] !== b.headers[i]) return false;
        }
        for (let i = 0; i < a.rows.length; i++) {
            if (a.rows[i].length !== b.rows[i].length) return false;
            for (let j = 0; j < a.rows[i].length; j++) {
                if (a.rows[i][j] !== b.rows[i][j]) return false;
            }
        }
        return true;
    }, []);

    const cleanupSelection = useCallback(() => {
        setSelectedCells(new Set());
        setSelectionMode(false);
    }, []);

    const updateCell = useCallback((rowIndex: number, colIndex: number, value: string) => {
        const currentTableData = { ...tableData };
        if (rowIndex === -1) {
            const newHeaders = [...currentTableData.headers];
            newHeaders[colIndex] = value;
            currentTableData.headers = newHeaders;
        } else {
            const newRows = [...currentTableData.rows];
            const newRow = [...newRows[rowIndex]];
            newRow[colIndex] = value;
            newRows[rowIndex] = newRow;
            currentTableData.rows = newRows;
        }

        // Save current state to undo stack before updating
        setUndoStack(prev => [...prev, tableData]);
        setRedoStack([]); // Clear redo stack on new action

        setTableData(currentTableData);
        setLastAction({ type: 'edit', timestamp: Date.now() });

        if (editingCell?.row === rowIndex && editingCell?.col === colIndex) {
            setEditingCell(null);
            setNavigationState(prev => ({ ...prev, clipboard: null }));
        }
    }, [editingCell, tableData]);

    const deleteRow = useCallback((rowIndex: number) => {
        if (tableData.rows.length <= 1) return;
        const currentTableData = { ...tableData };
        currentTableData.rows = currentTableData.rows.filter((_, index) => index !== rowIndex);

        // Save current state to undo stack before updating
        setUndoStack(prev => [...prev, tableData]);
        setRedoStack([]); // Clear redo stack on new action

        setTableData(currentTableData);
        setLastAction({ type: 'delete', timestamp: Date.now() });
        cleanupRefsForRow(rowIndex);
        cleanupSelection();
    }, [tableData.rows.length, cleanupSelection, tableData]);

    const deleteColumn = useCallback((colIndex: number) => {
        if (tableData.headers.length <= 1) return;
        const currentTableData = { ...tableData };
        currentTableData.headers = currentTableData.headers.filter((_, index) => index !== colIndex);
        currentTableData.rows = currentTableData.rows.map(row => row.filter((_, index) => index !== colIndex));

        // Save current state to undo stack before updating
        setUndoStack(prev => [...prev, tableData]);
        setRedoStack([]); // Clear redo stack on new action

        setTableData(currentTableData);
        setLastAction({ type: 'delete', timestamp: Date.now() });
        cleanupRefsForColumn(colIndex);
        cleanupSelection();
    }, [tableData.headers.length, cleanupSelection, tableData]);

    const cleanupRefsForRow = (rowIndex: number) => {
        Object.keys(inputRefs.current).forEach(key => {
            if (key.startsWith(`${rowIndex}-`)) {
                delete inputRefs.current[key];
            }
        });
    };

    const cleanupRefsForColumn = (colIndex: number) => {
        Object.keys(inputRefs.current).forEach(key => {
            if (key.endsWith(`-${colIndex}`)) {
                delete inputRefs.current[key];
            }
        });
    };

    const addColumnLocal = useCallback((targetRow: number, targetCol: number) => {
        const currentTableData = { ...tableData };
        currentTableData.headers.push(`Column ${currentTableData.headers.length + 1}`);
        currentTableData.rows = currentTableData.rows.map(row => [...row, '']);

        // Save current state to undo stack before updating
        setUndoStack(prev => [...prev, tableData]);
        setRedoStack([]); // Clear redo stack on new action

        setTableData(currentTableData);
        setLastAction({ type: 'add', timestamp: Date.now() });
        requestAnimationFrame(() => {
            if (mountedRef.current) {
                setEditingCell({ row: targetRow, col: targetCol });
                const key = `${targetRow}-${targetCol}`;
                const inputRef = inputRefs.current[key];
                if (inputRef) {
                    requestAnimationFrame(() => {
                        inputRef.focus();
                        inputRef.select();
                    });
                }
            }
        });
    }, [setLastAction, setEditingCell, mountedRef.current]);

    const addRowLocal = useCallback((targetRow: number, targetCol: number) => {
        const currentTableData = { ...tableData };
        currentTableData.rows.push(Array(currentTableData.headers.length).fill(''));

        // Save current state to undo stack before updating
        setUndoStack(prev => [...prev, tableData]);
        setRedoStack([]); // Clear redo stack on new action

        setTableData(currentTableData);
        setLastAction({ type: 'add', timestamp: Date.now() });
        requestAnimationFrame(() => {
            if (mountedRef.current) {
                setEditingCell({ row: targetRow, col: targetCol });
                const key = `${targetRow}-${targetCol}`;
                const inputRef = inputRefs.current[key];
                if (inputRef) {
                    requestAnimationFrame(() => {
                        inputRef.focus();
                        inputRef.select();
                    });
                }
            }
        });
    }, [setLastAction, setEditingCell, mountedRef.current]);

    const handleCellClick = useCallback((rowIndex: number, colIndex: number) => {
        setEditingCell({ row: rowIndex, col: colIndex });
        setNavigationState({
            tabHistory: [],
            originalColumn: colIndex,
            clipboard: null
        });

        if (selectionMode && !selectionDisabled) {
            const key = `${rowIndex}-${colIndex}`;
            if (selectedCells.has(key)) {
                setSelectedCells(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            } else {
                setSelectedCells(prev => new Set([...prev, `${rowIndex}-${colIndex}`]));
            }
        }
    }, [selectionMode, selectedCells, selectionDisabled]);

    const handleCellBlur = useCallback(() => {
        setEditingCell(null);
    }, []);

    const focusCell = useCallback((rowIndex: number, colIndex: number) => {
        const key = `${rowIndex}-${colIndex}`;
        const inputRef = inputRefs.current[key];
        if (inputRef && mountedRef.current) {
            requestAnimationFrame(() => {
                inputRef.focus();
                inputRef.select();
            });
        }
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
        switch (e.key) {
            case 'Tab': {
                e.preventDefault();
                const newTabHistory = [...navigationState.tabHistory, 1];
                const nextCol = colIndex + 1;

                if (nextCol < tableData.headers.length) {
                    setEditingCell({ row: rowIndex, col: nextCol });
                    setNavigationState({
                        tabHistory: newTabHistory,
                        originalColumn: navigationState.tabHistory.length === 0 ? colIndex : navigationState.originalColumn,
                        clipboard: null
                    });
                    focusCell(rowIndex, nextCol);
                } else {
                    setNavigationState({
                        tabHistory: newTabHistory,
                        originalColumn: navigationState.tabHistory.length === 0 ? colIndex : navigationState.originalColumn,
                        clipboard: null
                    });
                    addColumnLocal(rowIndex, nextCol);
                }
                break;
            }

            case 'Enter': {
                if (editingCell) {
                    // Save current cell content
                    const input = inputRefs.current[`${editingCell.row}-${editingCell.col}`];
                    if (input) {
                        updateCell(editingCell.row, editingCell.col, input.value);
                    }
                }

                if (!e.shiftKey) {
                    e.preventDefault();
                    const targetCol = navigationState.tabHistory.length === 0 ? colIndex : navigationState.originalColumn;
                    const nextRow = rowIndex + 1;

                    if (nextRow < tableData.rows.length) {
                        setEditingCell({ row: nextRow, col: targetCol });
                        setNavigationState({ tabHistory: [], originalColumn: targetCol, clipboard: null });
                        focusCell(nextRow, targetCol);
                    } else {
                        setNavigationState({ tabHistory: [], originalColumn: targetCol, clipboard: null });
                        addRowLocal(nextRow, targetCol);
                    }
                }
                break;
            }

            case 'Escape':
                setEditingCell(null);
                setNavigationState(prev => ({ ...prev, clipboard: null }));
                break;

            case 'ArrowUp': {
                e.preventDefault();
                const prevRow = Math.max(-1, rowIndex - 1);
                setEditingCell({ row: prevRow, col: colIndex });
                focusCell(prevRow, colIndex);
                break;
            }

            case 'ArrowDown': {
                e.preventDefault();
                const nextRowDown = Math.min(tableData.rows.length - 1, rowIndex + 1);
                setEditingCell({ row: nextRowDown, col: colIndex });
                focusCell(nextRowDown, colIndex);
                break;
            }

            case 'ArrowLeft': {
                e.preventDefault();
                const prevCol = Math.max(0, colIndex - 1);
                setEditingCell({ row: rowIndex, col: prevCol });
                focusCell(rowIndex, prevCol);
                break;
            }

            case 'ArrowRight': {
                e.preventDefault();
                const nextColRight = Math.min(tableData.headers.length - 1, colIndex + 1);
                setEditingCell({ row: rowIndex, col: nextColRight });
                focusCell(rowIndex, nextColRight);
                break;
            }
        }
    }, [navigationState, tableData.headers.length, tableData.rows.length, focusCell, addColumnLocal, addRowLocal, editingCell, updateCell]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
        updateCell(rowIndex, colIndex, e.target.value);
    }, [updateCell]);

    const handleDoubleClick = useCallback((rowIndex: number, colIndex: number) => {
        setEditingCell({ row: rowIndex, col: colIndex });
        setNavigationState({ tabHistory: [], originalColumn: colIndex, clipboard: null });
    }, []);

    const setInputRef = useCallback((key: string) => (el: HTMLInputElement | null) => {
        if (el) {
            inputRefs.current[key] = el;
        } else {
            delete inputRefs.current[key];
        }
    }, []);

    // Resize handle handler
    const handleResizeStart = useCallback((e: React.MouseEvent, colIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        const container = tableContainerRef.current;
        if (!container) return;

        const startX = e.clientX;
        const startWidth = e.target.getBoundingClientRect().width;

        setResizeState({
            isResizing: true,
            startWidth,
            colIndex,
            startX
        });

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!resizeState.isResizing) return;

            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.max(80, startWidth + deltaX);

            const currentHeaders = tableData.headers;
            const newHeaders = [...currentHeaders];
            const currentRows = [...tableData.rows];

            for (const row of currentRows) {
                const newRow = [...row];
                newRow[colIndex] = newRow[colIndex].slice(0, Math.floor(newRow[colIndex].length * (newWidth / startWidth)));
                newHeaders[colIndex] = newRow[colIndex];
            }

            setTableData(prev => ({
                headers: newHeaders,
                rows: currentRows
            }));
        };

        const handleMouseUp = () => {
            if (!resizeState.isResizing) return;

            setResizeState({
                isResizing: false,
                startWidth: 100,
                colIndex: -1,
                startX: 0
            });

            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            if (!editingCell && mountedRef.current) {
                const timeoutId = window.setTimeout(() => {
                    if (mountedRef.current) {
                        onSave(tableData);
                    }
                }, 500);

                return () => window.clearTimeout(timeoutId);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [resizeState.isResizing, editingCell, tableData.headers, tableData.rows, onSave]);

    // Export to CSV
    const handleExportCSV = useCallback(() => {
        const headers = tableData.headers.length > 0 ? tableData.headers : ['No headers'];
        const csvContent = [
            headers.join(','),
            ...tableData.rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'better-table-export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [tableData.headers, tableData.rows]);

    // Export to PNG
    const handleExportImage = useCallback(async () => {
        const container = tableContainerRef.current;
        if (!container) return;

        const canvas = document.createElement('canvas');
        const tableRect = container.getBoundingClientRect();
        const padding = 40;
        canvas.width = tableRect.width + padding * 2;
        canvas.height = tableRect.height + padding * 2;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText('Table export', 20, 30);

        const link = document.createElement('a');
        link.download = 'better-table.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }, []);

    // Import from CSV
    const handleImportCSV = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim());
                const rows: string[][] = [];

                for (let i = 1; i < lines.length; i++) {
                    const cells = lines[i].split(',').map(cell => cell.trim());
                    rows.push(cells);
                }

                if (headers.length > 0 && rows.length > 0) {
                    const newTableData: TableData = {
                        headers,
                        rows
                    };

                    setTableData(newTableData);
                    initialDataRef.current = { ...newTableData };
                    inputRefs.current = {};
                }
            }
        };
        reader.readAsText(file);
    }, []);

    // Handle copy
    const handleCopy = useCallback((e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
        e.preventDefault();
        if (!editingCell) {
            const key = `${rowIndex}-${colIndex}`;
            const value = tableData.rows[rowIndex]?.[colIndex] || '';
            if (value) {
                navigator.clipboard.writeText(value).then(() => {
                    setNavigationState(prev => ({ ...prev, clipboard: { text: value, type: 'copy' } }));
                });
            }
        }
    }, [editingCell, tableData.rows]);

    // Handle paste
    const handlePaste = useCallback((e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
            updateCell(rowIndex, colIndex, text);
            setNavigationState(prev => ({ ...prev, clipboard: null }));
        });
    }, [updateCell]);

    // Handle cut
    const handleCut = useCallback((e: React.ClipboardEvent, rowIndex: number, colIndex: number) => {
        e.preventDefault();
        if (editingCell?.row === rowIndex && editingCell?.col === colIndex) {
            const input = inputRefs.current[`${rowIndex}-${colIndex}`];
            if (input) {
                navigator.clipboard.writeText(input.value).then(() => {
                    const input = inputRefs.current[`${rowIndex}-${colIndex}`];
                    if (input) {
                        input.value = '';
                        updateCell(rowIndex, colIndex, '');
                        setNavigationState(prev => ({ ...prev, clipboard: { text: '', type: 'cut' } }));
                    }
                });
            }
        }
    }, [editingCell, updateCell]);

    // Undo
    const handleUndo = useCallback(() => {
        if (undoStack.length === 0) return;

        const lastState = undoStack[undoStack.length - 1];
        setRedoStack(prev => [...prev, tableData]);
        setTableData(lastState);
        setUndoStack(prev => prev.slice(0, -1));
    }, [undoStack, tableData]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;

        const nextState = redoStack[redoStack.length - 1];
        setUndoStack(prev => [...prev, tableData]);
        setTableData(nextState);
        setRedoStack(prev => prev.slice(0, -1));
    }, [redoStack, tableData]);

    // Selection toggle
    const handleSelectionToggle = useCallback((e: React.MouseEvent, rowIndex: number, colIndex: number) => {
        e.stopPropagation();
        const key = `${rowIndex}-${colIndex}`;
        const isSelected = selectedCells.has(key);

        if (isSelected) {
            setSelectedCells(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        } else {
            setSelectedCells(prev => new Set([...prev, key]));
        }
    }, [selectedCells]);

    return (
        <div className="better-table-container" role="application" aria-label="Editable table">
            <div className="better-table-controls">
                <button onClick={handleUndo} className="better-table-btn undo-btn" aria-label="Undo last action" title="Undo">
                    <span className="btn-icon" aria-hidden="true">↩</span><span className="btn-text">Undo</span>
                </button>
                <button onClick={handleRedo} className="better-table-btn redo-btn" aria-label="Redo last action" title="Redo">
                    <span className="btn-icon" aria-hidden="true">↪</span><span className="btn-text">Redo</span>
                </button>
                <button onClick={onAddRow} className="better-table-btn add-row-btn" aria-label="Add new row">
                    <span className="btn-icon" aria-hidden="true">+</span><span className="btn-text">Row</span>
                </button>
                <button onClick={onAddColumn} className="better-table-btn add-col-btn" aria-label="Add new column">
                    <span className="btn-icon" aria-hidden="true">+</span><span className="btn-text">Column</span>
                </button>
                <button onClick={handleExportCSV} className="better-table-btn export-btn" aria-label="Export table as CSV" title="Export to CSV">
                    <span className="btn-icon" aria-hidden="true">↪</span><span className="btn-text">Export</span>
                </button>
                <label className="better-table-btn import-btn" aria-label="Import from CSV">
                    <span className="btn-icon" aria-hidden="true">↩</span><span className="btn-text">Import</span>
                    <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} aria-hidden="true" />
                </label>
                <button onClick={handleExportImage} className="better-table-btn image-btn" aria-label="Export table as image" title="Export to PNG">
                    <span className="btn-icon" aria-hidden="true">📷</span><span className="btn-text">Image</span>
                </button>
                {selectionMode && (
                    <button onClick={() => { setSelectionMode(false); cleanupSelection(); }} className="better-table-btn clear-btn" aria-label="Clear selection">
                        <span className="btn-icon" aria-hidden="true">✕</span><span className="btn-text">Clear</span>
                    </button>
                )}
                <button
                    onClick={handleUndo}
                    className="better-table-btn undo-btn"
                    aria-label="Undo last action"
                    title="Undo"
                >
                    <span className="btn-icon" aria-hidden="true">↩</span>
                    <span className="btn-text">Undo</span>
                </button>
                <button
                    onClick={handleRedo}
                    className="better-table-btn redo-btn"
                    aria-label="Redo last action"
                    title="Redo"
                >
                    <span className="btn-icon" aria-hidden="true">↪</span>
                    <span className="btn-text">Redo</span>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectionMode(prev => !prev);
                        if (selectionMode) {
                            cleanupSelection();
                        }
                    }}
                    className={`better-table-btn ${selectionMode ? 'active' : ''}`}
                    aria-pressed={selectionMode}
                    aria-label={selectionMode ? 'Deselect all' : 'Select all cells'}
                    title={selectionMode ? 'Deselect all' : 'Select all cells'}
                >
                    <span className="btn-icon" aria-hidden="true">{selectionMode ? '✕' : '✓'}</span>
                    <span className="btn-text">{selectionMode ? 'Deselect' : 'Select'}</span>
                </button>
            </div>

            <div ref={tableContainerRef} className="better-table-scroll-container" role="grid" aria-label="Table grid">
                <table className="better-table" role="table">
                    <thead>
                        <tr role="row">
                            {tableData.headers.map((header, colIndex) => (
                                <th key={`header-${colIndex}`} className="better-table-header" role="columnheader">
                                    <div className="better-table-header-content">
                                        {editingCell?.row === -1 && editingCell?.col === colIndex ? (
                                            <input
                                                type="text"
                                                value={header}
                                                onChange={(e) => handleInputChange(e, -1, colIndex)}
                                                onBlur={handleCellBlur}
                                                onKeyDown={(e) => handleKeyDown(e, -1, colIndex)}
                                                className="better-table-input header-input"
                                                ref={setInputRef(`-1-${colIndex}`)}
                                                autoFocus
                                                aria-label={`Edit column ${colIndex + 1} header`}
                                            />
                                        ) : (
                                            <span
                                                onClick={() => handleCellClick(-1, colIndex)}
                                                onDoubleClick={() => handleDoubleClick(-1, colIndex)}
                                                className="better-table-header-text"
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`Column ${colIndex + 1} header: ${header || 'Empty'}`}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleCellClick(-1, colIndex);
                                                    }
                                                }}
                                            >
                                                {header || <span className="better-table-placeholder">Column name</span>}
                                            </span>
                                        )}
                                        {tableData.headers.length > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteColumn(colIndex);
                                                }}
                                                className="better-table-delete-btn"
                                                title="Delete column"
                                                aria-label={`Delete column ${colIndex + 1}`}
                                            >
                                                ×
                                            </button>
                                        )}
                                        {colIndex < tableData.headers.length - 1 && (
                                            <div
                                                className="better-table-resize-handle"
                                                onMouseDown={(e) => handleResizeStart(e, colIndex)}
                                                role="slider"
                                                aria-label="Resize column"
                                                aria-valuemin={80}
                                                aria-valuemax={400}
                                                aria-valuenow={resizeState.colIndex === colIndex ? resizeState.startWidth : 100}
                                                tabIndex={-1}
                                            />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.rows.map((row, rowIndex) => (
                            <tr key={`row-${rowIndex}`} role="row">
                                {row.map((cell, colIndex) => (
                                    <td key={`cell-${rowIndex}-${colIndex}`} className="better-table-cell" role="gridcell">
                                        <div className="better-table-cell-content">
                                            {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                                                <input
                                                    type="text"
                                                    value={cell}
                                                    onChange={(e) => handleInputChange(e, rowIndex, colIndex)}
                                                    onBlur={handleCellBlur}
                                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                                    onCopy={(e) => handleCopy(e, rowIndex, colIndex)}
                                                    onPaste={(e) => handlePaste(e, rowIndex, colIndex)}
                                                    onCut={(e) => handleCut(e, rowIndex, colIndex)}
                                                    className="better-table-input cell-input"
                                                    ref={setInputRef(`${rowIndex}-${colIndex}`)}
                                                    autoFocus
                                                    aria-label={`Edit cell row ${rowIndex + 1}, column ${colIndex + 1}`}
                                                    data-original-value={inputRefs.current[`${rowIndex}-${colIndex}`]?.dataset.originalValue || ''}
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => handleCellClick(rowIndex, colIndex)}
                                                    onDoubleClick={() => handleDoubleClick(rowIndex, colIndex)}
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        // Show context menu if needed
                                                    }}
                                                    className="better-table-cell-text"
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}: ${cell || 'Empty'}`}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleCellClick(rowIndex, colIndex);
                                                        }
                                                    }}
                                                    onPaste={(e) => {
                                                        if (selectionMode) {
                                                            e.preventDefault();
                                                            navigator.clipboard.readText().then(text => {
                                                                const cells = tableData.rows[rowIndex];
                                                                const currentCol = parseInt(e.currentTarget.getAttribute('data-col') || '0');
                                                                for (let i = 0; i < text.split('\n').length && i < cells.length; i++) {
                                                                    if (cells[i]) {
                                                                        inputRefs.current[`${rowIndex}-${i}`]?.value = text.split('\n')[i];
                                                                        updateCell(rowIndex, i, text.split('\n')[i]);
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    }}
                                                >
                                                    {cell || <span className="better-table-placeholder">Click to edit</span>}
                                                </span>
                                            )}
                                            {colIndex === row.length - 1 && tableData.rows.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteRow(rowIndex);
                                                    }}
                                                    className="better-table-delete-btn row-delete"
                                                    title="Delete row"
                                                    aria-label={`Delete row ${rowIndex + 1}`}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
