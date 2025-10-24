declare module 'verovio' {
  export interface VerovioOptions {
    scale?: number;
    pageWidth?: number;
    pageHeight?: number;
    adjustPageHeight?: boolean;
    breaks?: string;
    font?: string;
  }

  export class toolkit {
    constructor();
    loadData(data: string): boolean;
    renderToSVG(pageNumber: number): string;
    setOptions(options: VerovioOptions): void;
    getPageCount(): number;
    getTimeForElement(xmlId: string): number;
  }

  const verovio: {
    toolkit: typeof toolkit;
  };

  export default verovio;
}