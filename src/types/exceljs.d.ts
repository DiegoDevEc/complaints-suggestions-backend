declare module 'exceljs' {
  interface WorksheetColumn {
    header?: string;
    key?: string;
    width?: number;
  }

  interface WorksheetAutoFilter {
    from: string;
    to: string;
  }

  interface WorksheetRow {
    font?: {
      bold?: boolean;
      [key: string]: unknown;
    };
  }

  interface Worksheet {
    columns: WorksheetColumn[];
    addRow(data: Record<string, unknown>): void;
    getRow(row: number): WorksheetRow;
    autoFilter?: WorksheetAutoFilter;
  }

  interface WorkbookWriter {
    writeBuffer(): Promise<Buffer>;
  }

  class Workbook {
    addWorksheet(name: string): Worksheet;
    readonly xlsx: WorkbookWriter;
  }

  export { Workbook };
}
