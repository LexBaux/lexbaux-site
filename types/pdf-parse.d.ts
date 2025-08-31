declare module "pdf-parse" {
  interface PDFInfo {
    [key: string]: any;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: any;
    version: string;
    text: string;
  }

  function pdf(dataBuffer: Buffer): Promise<PDFData>;
  export = pdf;
}
