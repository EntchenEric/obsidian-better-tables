import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { TableData, BetterTableProps, CellPosition } from '../types';

interface NavigationState {
    tabHistory: number[];
    originalColumn: number;
}

export const BetterTable: React.FC<BetterTableProps> = ({ data, onSave, onAddRow, onAddColumn }) => {
    const [tableData, setTableData] = useState<TableData>(data);
    const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
    const [navigationState, setNavigationState] = useState<NavigationState>({
        tabHistory: [],
        originalColumn: 0
    });
    const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const initialDataRef = useRef<TableData>(data);

    // Only update data when component first mounts or when external data significantly changes
    useEffect(() => {
        // Only update if this is a completely different table (different structure)
        const currentStructure = `${tableData.headers.length}-${tableData.rows.length}`;
        const newStructure = `${data.headers.length}-${data.rows.length}`;
        
        // Only sync if structure is very different or this is the initial load
        if (currentStructure !== newStructure && JSON.stringify(data) !== JSON.stringify(initialDataRef.current)) {
            setTableData(data);
            initialDataRef.current = data;
        }
    }, [data]); // Removed tableData from dependencies to prevent loops

    // Simple auto-save - only save when NOT editing
    useEffect(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Don't save if we're currently editing
        if (editingCell) {
            return;
        }

        saveTimeoutRef.current = setTimeout(() => {
            onSave(tableData);
        }, 500); // Reduced to 500ms

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [tableData, onSave, editingCell]);

    const updateCell = useCallback((rowIndex: number, colIndex: number, value: string) => {
        setTableData(prev => {
            const newData = { ...prev };
            if (rowIndex === -1) {
                // Update header
                newData.headers = [...prev.headers];
                newData.headers[colIndex] = value;
            } else {
                // Update cell
                newData.rows = [...prev.rows];
                newData.rows[rowIndex] = [...prev.rows[rowIndex]];
                newData.rows[rowIndex][colIndex] = value;
            }
            return newData;
        });
    }, []);

    const deleteRow = useCallback((rowIndex: number) => {
        if (tableData.rows.length <= 1) return;
        setTableData(prev => ({
            ...prev,
            rows: prev.rows.filter((_, index) => index !== rowIndex)
        }));
    }, [tableData.rows.length]);

    const deleteColumn = useCallback((colIndex: number) => {
        if (tableData.headers.length <= 1) return;
        setTableData(prev => ({
            headers: prev.headers.filter((_, index) => index !== colIndex),
            rows: prev.rows.map(row => row.filter((_, index) => index !== colIndex))
        }));
    }, [tableData.headers.length]);

    // LOCAL add column
    const addColumnLocal = useCallback((targetRow: number, targetCol: number) => {
        setTableData(prev => {
            const newData = {
                headers: [...prev.headers, `Column ${prev.headers.length + 1}`],
                rows: prev.rows.map(row => [...row, ''])
            };
            
            // Focus after state update
            setTimeout(() => {
                setEditingCell({ row: targetRow, col: targetCol });
                const key = `${targetRow}-${targetCol}`;
                const inputRef = inputRefs.current[key];
                if (inputRef) {
                    inputRef.focus();
                    inputRef.select();
                }
            }, 10);
            
            return newData;
        });
    }, []);

    // LOCAL add row
    const addRowLocal = useCallback((targetRow: number, targetCol: number) => {
        setTableData(prev => {
            const newData = {
                ...prev,
                rows: [...prev.rows, Array(prev.headers.length).fill('')]
            };
            
            // Focus after state update
            setTimeout(() => {
                setEditingCell({ row: targetRow, col: targetCol });
                const key = `${targetRow}-${targetCol}`;
                const inputRef = inputRefs.current[key];
                if (inputRef) {
                    inputRef.focus();
                    inputRef.select();
                }
            }, 10);
            
            return newData;
        });
    }, []);

    const handleCellClick = (rowIndex: number, colIndex: number) => {
        setEditingCell({ row: rowIndex, col: colIndex });
        setNavigationState({ tabHistory: [], originalColumn: colIndex });
    };

    const handleCellBlur = () => {
        setEditingCell(null);
    };

    const focusCell = useCallback((rowIndex: number, colIndex: number) => {
        const key = `${rowIndex}-${colIndex}`;
        const inputRef = inputRefs.current[key];
        if (inputRef) {
            setTimeout(() => {
                inputRef.focus();
                inputRef.select();
            }, 10);
        }
    }, []);

    // EXCEL-LIKE NAVIGATION with TAB and ENTER
    const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            
            const newTabHistory = [...navigationState.tabHistory, 1];
            const nextCol = colIndex + 1;
            
            if (nextCol < tableData.headers.length) {
                // Move to next column
                setEditingCell({ row: rowIndex, col: nextCol });
                setNavigationState({
                    tabHistory: newTabHistory,
                    originalColumn: navigationState.tabHistory.length === 0 ? colIndex : navigationState.originalColumn
                });
                focusCell(rowIndex, nextCol);
            } else {
                // CREATE NEW COLUMN locally
                setNavigationState({
                    tabHistory: newTabHistory,
                    originalColumn: navigationState.tabHistory.length === 0 ? colIndex : navigationState.originalColumn
                });
                addColumnLocal(rowIndex, nextCol);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            const targetCol = navigationState.tabHistory.length === 0 ? colIndex : navigationState.originalColumn;
            const nextRow = rowIndex + 1;
            
            if (nextRow < tableData.rows.length) {
                // Move to next row
                setEditingCell({ row: nextRow, col: targetCol });
                setNavigationState({ tabHistory: [], originalColumn: targetCol });
                focusCell(nextRow, targetCol);
            } else {
                // CREATE NEW ROW locally
                setNavigationState({ tabHistory: [], originalColumn: targetCol });
                addRowLocal(nextRow, targetCol);
            }
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevRow = Math.max(-1, rowIndex - 1);
            setEditingCell({ row: prevRow, col: colIndex });
            focusCell(prevRow, colIndex);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextRow = Math.min(tableData.rows.length - 1, rowIndex + 1);
            setEditingCell({ row: nextRow, col: colIndex });
            focusCell(nextRow, colIndex);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prevCol = Math.max(0, colIndex - 1);
            setEditingCell({ row: rowIndex, col: prevCol });
            focusCell(rowIndex, prevCol);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const nextCol = Math.min(tableData.headers.length - 1, colIndex + 1);
            setEditingCell({ row: rowIndex, col: nextCol });
            focusCell(rowIndex, nextCol);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
        updateCell(rowIndex, colIndex, e.target.value);
    };

    const handleDoubleClick = (rowIndex: number, colIndex: number) => {
        setEditingCell({ row: rowIndex, col: colIndex });
        setNavigationState({ tabHistory: [], originalColumn: colIndex });
    };

    return (
        <div className="better-table-container">
            <div className="better-table-controls">
                <button 
                    onClick={onAddRow}
                    className="better-table-btn add-row-btn"
                >
                    <span className="btn-icon">+</span>
                    <span className="btn-text">Row</span>
                </button>
                <button 
                    onClick={onAddColumn}
                    className="better-table-btn add-col-btn"
                >
                    <span className="btn-icon">+</span>
                    <span className="btn-text">Column</span>
                </button>
            </div>
            
            <div className="better-table-scroll-container">
                <table className="better-table">
                    <thead>
                        <tr>
                            {tableData.headers.map((header, colIndex) => (
                                <th 
                                    key={`header-${colIndex}`}
                                    className="better-table-header"
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
                                                ref={el => inputRefs.current[`-1-${colIndex}`] = el}
                                                autoFocus
                                                placeholder="Column name..."
                                            />
                                        ) : (
                                            <span 
                                                onClick={() => handleCellClick(-1, colIndex)}
                                                onDoubleClick={() => handleDoubleClick(-1, colIndex)}
                                                className="better-table-header-text"
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
                            <tr key={`row-${rowIndex}`}>
                                {row.map((cell, colIndex) => (
                                    <td 
                                        key={`cell-${rowIndex}-${colIndex}`}
                                        className="better-table-cell"
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
                                                    ref={el => inputRefs.current[`${rowIndex}-${colIndex}`] = el}
                                                    autoFocus
                                                    placeholder="Enter text..."
                                                />
                                            ) : (
                                                <span 
                                                    onClick={() => handleCellClick(rowIndex, colIndex)}
                                                    onDoubleClick={() => handleDoubleClick(rowIndex, colIndex)}
                                                    className="better-table-cell-text"
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
