import { useToast } from "@/hooks/useToast";
import React, { useRef, useImperativeHandle, forwardRef } from "react";
import * as XLSX from "xlsx";

export interface ExcelUploaderProps {
  /** Array of column names to extract data from */
  columnNames: string[];
  /** Handler function that receives the parsed data */
  onDataParsed: (data: { [key: string]: string[] }) => void;
}

export interface ExcelUploaderHandle {
  open: () => void;
}

const ExcelUploader = forwardRef<ExcelUploaderHandle, ExcelUploaderProps>(
  ({ columnNames, onDataParsed }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      open: () => {
        inputRef.current?.click();
      },
    }));

    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const file = e.target.files?.[0];

        if (!file) throw new Error("No file selected");

        const reader = new FileReader();

        reader.onload = (evt) => {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
            blankrows: false,
          }) as unknown[][];

          if (rows.length === 0) {
            onDataParsed({});
            return;
          }

          const headers = rows[0] as string[];
          const columnIndices = columnNames.map((name) =>
            headers.findIndex(
              (header) =>
                header?.toString().toLowerCase() === name.toLowerCase()
            )
          );

          // Check if any required columns are missing
          const missingColumns = columnNames.filter(
            (_, index) => columnIndices[index] === -1
          );
          if (missingColumns.length > 0) {
            throw new Error(
              `Missing columns in Excel file: ${missingColumns.join(", ")}`
            );
          }

          const parsedData: { [key: string]: string[] } = {};
          columnNames.forEach((columnName, index) => {
            const colIndex = columnIndices[index];
            if (colIndex !== -1) {
              const values: string[] = [];
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i] as unknown[];
                const cell = row[colIndex];
                if (cell !== null && cell !== undefined && cell !== "") {
                  values.push(String(cell));
                }
              }
              parsedData[columnName] = values;
            } else {
              // Handle missing column by providing empty array
              parsedData[columnName] = [];
            }
          });
          onDataParsed(parsedData);
        };
        reader.readAsArrayBuffer(file);
        e.target.value = "";
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to upload file. Please try again.",
        });
      }
    };

    return (
      <input
        type="file"
        accept=".xlsx,.xls"
        ref={inputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    );
  }
);

ExcelUploader.displayName = "ExcelUploader";

export default ExcelUploader;
