import { parseTableData, tableDataToCode } from '../utils/tableUtils'

describe('tableUtils', () => {
  describe('parseTableData', () => {
    it('should parse a simple table correctly', () => {
      const input = `Name|Age|Occupation
John|30|Engineer
Jane|25|Designer`;
      const result = parseTableData(input);
      expect(result.headers).toEqual(['Name', 'Age', 'Occupation']);
      expect(result.rows).toEqual([
        ['John', '30', 'Engineer'],
        ['Jane', '25', 'Designer']
      ]);
    });

    it('should handle empty input', () => {
      const input = '';
      const result = parseTableData(input);
      expect(result.headers).toEqual(['Column 1', 'Column 2', 'Column 3']);
      expect(result.rows).toEqual([['', '', '']]);
    });

    it('should handle missing columns', () => {
      const input = `Name|Age
John|30
Jane|25`;
      const result = parseTableData(input);
      expect(result.headers).toEqual(['Name', 'Age', 'Column 3']);
      expect(result.rows).toEqual([
        ['John', '30', ''],
        ['Jane', '25', '']
      ]);
    });

    it('should handle custom delimiters', () => {
      const input = `Name,Age,Occupation
John,30,Engineer
Jane,25,Designer`;
      const result = parseTableData(input, ',');
      expect(result.headers).toEqual(['Name', 'Age', 'Occupation']);
      expect(result.rows).toEqual([
        ['John', '30', 'Engineer'],
        ['Jane', '25', 'Designer']
      ]);
    });
  });

  describe('tableDataToCode', () => {
    it('should convert table data to code correctly', () => {
      const input = {
        headers: ['Name', 'Age', 'Occupation'],
        rows: [
          ['John', '30', 'Engineer'],
          ['Jane', '25', 'Designer']
        ]
      };
      const expected = `Name|Age|Occupation
John|30|Engineer
Jane|25|Designer`;
      const result = tableDataToCode(input);
      expect(result).toBe(expected);
    });

    it('should handle empty rows', () => {
      const input = {
        headers: ['Name', 'Age'],
        rows: []
      };
      const expected = `Name|Age`;
      const result = tableDataToCode(input);
      expect(result).toBe(expected);
    });
  });
});