export interface TableData {
    headers: string[];
    rows: string[][];
}

export interface CellPosition {
    row: number;
    col: number;
}

export interface BetterTableProps {
    data: TableData;
    onSave: (data: TableData) => void;
    onAddRow: () => void;
    onAddColumn: () => void;
}

export interface MyPluginSettings {
    mySetting: string;
}
