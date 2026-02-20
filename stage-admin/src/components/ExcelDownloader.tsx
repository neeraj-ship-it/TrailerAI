import { forwardRef, useImperativeHandle } from "react";
import * as XLSX from "xlsx";

// Define a generic type for the data - arrays where id is the header
export type ExcelData = Record<
  string,
  (string | number | boolean | null | undefined)[]
>;

export interface ExcelDownloaderProps {
  /** The data to be converted to Excel format */

  /** The filename for the downloaded Excel file */
  filename?: string;
  /** The sheet name for the Excel file */
  sheetName?: string;
  /** Optional headers to use instead of object keys */
  headers?: string[];
}

export interface ExcelDownloaderHandle {
  download: (data: ExcelData) => void;
}

const ExcelDownloader = forwardRef<ExcelDownloaderHandle, ExcelDownloaderProps>(
  ({ filename = "data.xlsx", sheetName = "Sheet1" }, ref) => {
    useImperativeHandle(ref, () => ({
      download: (data: ExcelData) => {
        if (!data || Object.keys(data).length === 0) {
          console.warn("No data provided for download");
          return;
        }

        // Create a new workbook
        const workbook = XLSX.utils.book_new();

        // Get the keys (headers) from the data object
        const dataKeys = Object.keys(data);

        // Find the maximum length of any array to determine the number of rows
        const maxLength = Math.max(
          ...dataKeys.map((key) => data[key]?.length || 0)
        );

        // Create worksheet data by transposing the arrays
        const worksheetData: Record<
          string,
          string | number | boolean | null | undefined
        >[] = [];

        for (let i = 0; i < maxLength; i++) {
          const row: Record<
            string,
            string | number | boolean | null | undefined
          > = {};
          dataKeys.forEach((key) => {
            row[key] = data[key]?.[i] || "";
          });
          worksheetData.push(row);
        }

        // Convert data to worksheet
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Generate the Excel file
        const excelBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });

        // Create a blob and download
        const blob = new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
    }));

    // This component doesn't render anything visible
    return null;
  }
);

ExcelDownloader.displayName = "ExcelDownloader";

export default ExcelDownloader;
