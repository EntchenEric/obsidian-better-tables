import { TableData } from '../types';

export function parseTableData(source: string): TableData {
    const lines = source.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        return {
            headers: ['Column 1', 'Column 2'],
            rows: [['', '']]
        };
    }

    const headers = lines[0].split('|').map(h => h.trim());
    
    const rows = lines.slice(1).map(line => 
        line.split('|').map(cell => cell.trim())
    );

    const maxCols = Math.max(headers.length, ...rows.map(row => row.length));
    const normalizedHeaders = [...headers];
    while (normalizedHeaders.length < maxCols) {
        normalizedHeaders.push(`Column ${normalizedHeaders.length + 1}`);
    }

    const normalizedRows = rows.map(row => {
        const newRow = [...row];
        while (newRow.length < maxCols) {
            newRow.push('');
        }
        return newRow;
    });

    return {
        headers: normalizedHeaders,
        rows: normalizedRows
    };
}

export function tableDataToCode(data: TableData): string {
    const headerLine = data.headers.join(' | ');
    const rowLines = data.rows.map(row => row.join(' | '));
    return [headerLine, ...rowLines].join('\n');
}
