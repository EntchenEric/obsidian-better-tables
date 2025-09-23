import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TableData, BetterTableProps, CellPosition } from '../types';

interface NavigationState {
    tabHistory: number[];
    originalColumn: number;
}

interface InputRefs {
    [key: string]: HTMLInputElement | null;
}

export const BetterTable: React.FC<BetterTableProps> = ({ data, onSave, onAddRow, onAddColumn }) => {
    const [tableData, setTableData] = useState<TableData>(data);
    const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
    const [navigationState, setNavigationState] = useState<NavigationState>({
        tabHistory: [],
        originalColumn: 0
    });
    
    const inputRefs = useRef<InputRefs>({});
    const saveTimeoutRef = useRef<number | null>(null);
    const initialDataRef = useRef<TableData>(data);
    const mountedRef = useRef(true);

    const dataStructure = useMemo(() => 
        `${data.headers.length}-${data.rows.length}`, 
        [data.headers.length, data.rows.length]
    );
    
    const currentStructure = useMemo(() => 
        `${tableData.headers.length}-${tableData.rows.length}`, 
        [tableData.headers.length, tableData.rows.length]
    );

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (saveTimeoutRef.current !== null) {
                window.clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            inputRefs.current = {};
        };
    }, []);

    useEffect(() => {
        if (currentStructure !== dataStructure) {
            const hasDataChanged = !isTableDataEqual(data, initialDataRef.current);
            if (hasDataChanged) {
                setTableData(data);
                initialDataRef.current = { ...data };
                inputRefs.current = {};
            }
        }
    }, [data, dataStructure, currentStructure]);

    useEffect(() => {
        if (saveTimeoutRef.current !== null) {
            window.clearTimeout(saveTimeoutRef.current);
        }

        if (editingCell || !mountedRef.current) {
            return;
        }

        saveTimeoutRef.current = window.setTimeout(() => {
            if (mountedRef.current) {
                onSave(tableData);
            }
        }, 500);

        return () => {
            if (saveTimeoutRef.current !== null) {
                window.clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, [tableData, onSave, editingCell]);

    const isTableDataEqual = (a: TableData, b: TableData): boolean => {
        if (a.headers.length !== b.headers.length || a.rows.length !== b.rows.length) {
            return false;
        }
        
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
    };

    const updateCell = useCallback((rowIndex: number, colIndex: number, value: string) => {
        setTableData(prev => {
            if (rowIndex === -1) {
                const newHeaders = [...prev.headers];
                newHeaders[colIndex] = value;
                return { ...prev, headers: newHeaders };
            } else {
                const newRows = [...prev.rows];
                const newRow = [...prev.rows[rowIndex]];
                newRow[colIndex] = value;
                newRows[rowIndex] = newRow;
                return { ...prev, rows: newRows };
            }
        });
    }, []);

    const deleteRow = useCallback((rowIndex: number) => {
        if (tableData.rows.length <= 1) return;
        setTableData(prev => ({
            ...prev,
            rows: prev.rows.filter((_, index) => index !== rowIndex)
        }));
        cleanupRefsForRow(rowIndex);
    }, [tableData.rows.length]);

    const deleteColumn = useCallback((colIndex: number) => {
        if (tableData.headers.length <= 1) return;
        setTableData(prev => ({
            headers: prev.headers.filter((_, index) => index !== colIndex),
            rows: prev.rows.map(row => row.filter((_, index) => index !== colIndex))
        }));
        cleanupRefsForColumn(colIndex);
    }, [tableData.headers.length]);

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
        setTableData(prev => ({
            headers: [...prev.headers, `Column ${prev.headers.length + 1}`],
            rows: prev.rows.map(row => [...row, ''])
        }));

        requestAnimationFrame(() => {
            if (mountedRef.current) {
                setEditingCell({ row: targetRow, col: targetCol });
                const key = `${targetRow}-${targetCol}`;
                const inputRef = inputRefs.current[key];
                if (inputRef) {
                    inputRef.focus();
                    inputRef.select();
                }
            }
        });
    }, []);

    const addRowLocal = useCallback((targetRow: number, targetCol: number) => {
        setTableData(prev => ({
            ...prev,
            rows: [...prev.rows, Array(prev.headers.length).fill('')]
        }));

        requestAnimationFrame(() => {
            if (mountedRef.current) {
                setEditingCell({ row: targetRow, col: targetCol });
                const key = `${targetRow}-${targetCol}`;
                const inputRef = inputRefs.current[key];
                if (inputRef) {
                    inputRef.focus();
                    inputRef.select();
                }
            }
        });
    }, []);

    const handleCellClick = useCallback((rowIndex: number, colIndex: number) => {
        setEditingCell({ row: rowIndex, col: colIndex });
        setNavigationState({ tabHistory: [], originalColumn: colIndex });
    }, []);

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
            case 'Tab':
                e.preventDefault();
                const newTabHistory = [...navigationState.tabHistory, 1];
                const nextCol = colIndex + 1;

                if (nextCol < tableData.headers.length) {
                    setEditingCell({ row: rowIndex, col: nextCol });
                    setNavigationState({
                        tabHistory: newTabHistory,
                        originalColumn: navigationState.tabHistory.length === 0 ? colIndex : navigationState.originalColumn
                    });
                    focusCell(rowIndex, nextCol);
                } else {
                    setNavigationState({
                        tabHistory: newTabHistory,
                        originalColumn: navigationState.tabHistory.length === 0 ? colIndex : navigationState.originalColumn
                    });
                    addColumnLocal(rowIndex, nextCol);
                }
                break;

            case 'Enter':
                if (!e.shiftKey) {
                    e.preventDefault();
                    const targetCol = navigationState.tabHistory.length === 0 ? colIndex : navigationState.originalColumn;
                    const nextRow = rowIndex + 1;

                    if (nextRow < tableData.rows.length) {
                        setEditingCell({ row: nextRow, col: targetCol });
                        setNavigationState({ tabHistory: [], originalColumn: targetCol });
                        focusCell(nextRow, targetCol);
                    } else {
                        setNavigationState({ tabHistory: [], originalColumn: targetCol });
                        addRowLocal(nextRow, targetCol);
                    }
                }
                break;

            case 'Escape':
                setEditingCell(null);
                break;

            case 'ArrowUp':
                e.preventDefault();
                const prevRow = Math.max(-1, rowIndex - 1);
                setEditingCell({ row: prevRow, col: colIndex });
                focusCell(prevRow, colIndex);
                break;

            case 'ArrowDown':
                e.preventDefault();
                const nextRowDown = Math.min(tableData.rows.length - 1, rowIndex + 1);
                setEditingCell({ row: nextRowDown, col: colIndex });
                focusCell(nextRowDown, colIndex);
                break;

            case 'ArrowLeft':
                e.preventDefault();
                const prevCol = Math.max(0, colIndex - 1);
                setEditingCell({ row: rowIndex, col: prevCol });
                focusCell(rowIndex, prevCol);
                break;

            case 'ArrowRight':
                e.preventDefault();
                const nextColRight = Math.min(tableData.headers.length - 1, colIndex + 1);
                setEditingCell({ row: rowIndex, col: nextColRight });
                focusCell(rowIndex, nextColRight);
                break;
        }
    }, [navigationState, tableData.headers.length, tableData.rows.length, focusCell, addColumnLocal, addRowLocal]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
        updateCell(rowIndex, colIndex, e.target.value);
    }, [updateCell]);

    const handleDoubleClick = useCallback((rowIndex: number, colIndex: number) => {
        setEditingCell({ row: rowIndex, col: colIndex });
        setNavigationState({ tabHistory: [], originalColumn: colIndex });
    }, []);

    const setInputRef = useCallback((key: string) => (el: HTMLInputElement | null) => {
        if (el) {
            inputRefs.current[key] = el;
        } else {
            delete inputRefs.current[key];
        }
    }, []);

    return (
        <div className="better-table-container" role="application" aria-label="Editable table">
            <div className="better-table-controls">
                <button
                    onClick={onAddRow}
                    className="better-table-btn add-row-btn"
                    aria-label="Add new row"
                >
                    <span className="btn-icon" aria-hidden="true">+</span>
                    <span className="btn-text">Row</span>
                </button>
                <button
                    onClick={onAddColumn}
                    className="better-table-btn add-col-btn"
                    aria-label="Add new column"
                >
                    <span className="btn-icon" aria-hidden="true">+</span>
                    <span className="btn-text">Column</span>
                </button>
            </div>

            <div className="better-table-scroll-container">
                <table className="better-table" role="table">
                    <thead>
                        <tr role="row">
                            {tableData.headers.map((header, colIndex) => (
                                <th
                                    key={`header-${colIndex}`}
                                    className="better-table-header"
                                    role="columnheader"
                                >
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
                                                placeholder="Column name..."
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
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.rows.map((row, rowIndex) => (
                            <tr key={`row-${rowIndex}`} role="row">
                                {row.map((cell, colIndex) => (
                                    <td
                                        key={`cell-${rowIndex}-${colIndex}`}
                                        className="better-table-cell"
                                        role="gridcell"
                                    >
                                        <div className="better-table-cell-content">
                                            {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                                                <input
                                                    type="text"
                                                    value={cell}
                                                    onChange={(e) => handleInputChange(e, rowIndex, colIndex)}
                                                    onBlur={handleCellBlur}
                                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                                    className="better-table-input cell-input"
                                                    ref={setInputRef(`${rowIndex}-${colIndex}`)}
                                                    autoFocus
                                                    placeholder="Enter text..."
                                                    aria-label={`Edit cell row ${rowIndex + 1}, column ${colIndex + 1}`}
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => handleCellClick(rowIndex, colIndex)}
                                                    onDoubleClick={() => handleDoubleClick(rowIndex, colIndex)}
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
