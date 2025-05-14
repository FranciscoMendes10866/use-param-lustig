export interface IDataCompressor {
  hasCompressedData(url: string, paramName?: string): boolean;
  getCompressedData(url: string, paramName?: string): string | null;
}

export class DataCompressor implements IDataCompressor {
  public hasCompressedData(url: string, paramName: string = "data"): boolean {
    const searchParams = new URLSearchParams(
      url.includes("?") ? url.split("?")[1] : "",
    );
    return searchParams.has(paramName);
  }

  public getCompressedData(
    url: string,
    paramName: string = "data",
  ): string | null {
    const searchParams = new URLSearchParams(
      url.includes("?") ? url.split("?")[1] : "",
    );
    return searchParams.get(paramName);
  }
}
