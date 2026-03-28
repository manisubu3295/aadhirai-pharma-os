import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseCSV, downloadFile, generateCSV } from "@/lib/exportUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  templateHeaders: string[];
  templateSampleData: string[][];
  templateFilename: string;
  entityName: string;
  onImport: (data: Record<string, string>[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  onSuccess?: () => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  title,
  templateHeaders,
  templateSampleData,
  templateFilename,
  entityName,
  onImport,
  onSuccess,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csv = generateCSV(templateHeaders, templateSampleData);
    downloadFile(csv, `${templateFilename}_template.csv`, "text/csv");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      const fileName = file.name.toLowerCase();
      let headers: string[] = [];
      let rows: string[][] = [];

      if (fileName.endsWith(".csv")) {
        const text = await file.text();
        const parsed = parseCSV(text);
        headers = parsed.headers;
        rows = parsed.rows;
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error("No sheets found in the Excel file");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const sheetRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
          header: 1,
          raw: false,
          defval: "",
        });

        if (sheetRows.length === 0) {
          throw new Error("The selected Excel file is empty");
        }

        headers = (sheetRows[0] || []).map((cell) => String(cell ?? "").trim());
        rows = sheetRows
          .slice(1)
          .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
          .map((row) => row.map((cell) => String(cell ?? "").trim()));
      } else {
        throw new Error("Unsupported file format. Please upload CSV or Excel (.xlsx/.xls)");
      }

      if (headers.length === 0) {
        throw new Error("Missing header row in uploaded file");
      }
      
      const data = rows.map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '')] = row[index] || '';
        });
        return obj;
      });

      const importResult = await onImport(data);
      setResult(importResult);
      
      if (importResult.success > 0 && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setResult({ success: 0, failed: 1, errors: [error instanceof Error ? error.message : 'Unknown error'] });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import {entityName}. Download the template first to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={downloadTemplate}
            data-testid="button-download-template"
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </Button>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Select CSV or Excel File</Label>
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-file"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-file-upload"
              />
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click to select a CSV or Excel file</p>
              )}
            </div>
          </div>

          {result && (
            <Alert variant={result.failed > 0 ? "destructive" : "default"}>
              {result.failed > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertDescription>
                <div>
                  Imported: {result.success} | Failed: {result.failed}
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-2 text-xs max-h-24 overflow-y-auto">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                    {result.errors.length > 5 && (
                      <div>...and {result.errors.length - 5} more errors</div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-import">
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button 
              onClick={handleImport} 
              disabled={!file || isImporting}
              data-testid="button-confirm-import"
            >
              {isImporting ? "Importing..." : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
