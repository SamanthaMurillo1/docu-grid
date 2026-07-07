import { ExtractedData, MappedField } from "../types";

export function buildExportRows(
  extractedData: ExtractedData,
  mappings: MappedField[]
): Record<string, any>[] {
  const rowData: Record<string, any> = {};
  mappings.forEach(m => {
    if (m.excelColumn) {
      rowData[m.excelColumn] = (extractedData as any)[m.extractedKey];
    }
  });

  const rowsToExport: Record<string, any>[] = [];
  if (extractedData.items && extractedData.items.length > 0) {
    extractedData.items.forEach(item => {
      rowsToExport.push({
        ...rowData,
        "Item Name": item.name,
        "Quantity": item.quantity,
        "Item Price": item.price,
      });
    });
  } else {
    rowsToExport.push(rowData);
  }

  return rowsToExport;
}