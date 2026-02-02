import { useMutation } from "@tanstack/react-query";
import {
  validateCSVFile,
  uploadCSVFile,
  startCSVImport,
  CSVImportRequest,
  CSVImportResult,
  CSVImportValidateResponse,
  CSVImportUploadResponse,
} from "../api/adminApi";

export function useValidateCSV() {
  return useMutation<
    CSVImportValidateResponse,
    Error,
    { file: File; importType: string }
  >({
    mutationFn: ({ file, importType }) => validateCSVFile(file, importType),
  });
}

export function useUploadCSV() {
  return useMutation<CSVImportUploadResponse, Error, File>({
    mutationFn: uploadCSVFile,
  });
}

export function useExecuteCSVImport() {
  return useMutation<CSVImportResult, Error, CSVImportRequest>({
    mutationFn: startCSVImport,
  });
}
