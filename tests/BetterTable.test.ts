import { parseTableData, tableDataToCode } from '../utils/tableUtils'

describe('BetterTable', () => {
  it('should handle basic table operations', () => {
    const input = `Name|Age
John|30
Jane|25`;
    const result = parseTableData(input);
    expect(result.headers).toEqual(['Name', 'Age', 'Column 3']);
    expect(result.rows).toEqual([
      ['John', '30', ''],
      ['Jane', '25', '']
    ]);
  })

  it('should convert table data to code', () => {
    const input = {
      headers: ['Name', 'Age'],
      rows: [
        ['John', '30'],
        ['Jane', '25']
      ]
    };
    const expected = `Name|Age
John|30
Jane|25`;
    const result = tableDataToCode(input);
    expect(result).toBe(expected);
  })
});