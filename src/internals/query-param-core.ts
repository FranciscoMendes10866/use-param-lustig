import { type IDataCompressor, DataCompressor } from "./data-compressor";
import {
  type IQueryStringConverter,
  QueryStringConverter,
} from "./query-string-converter";

export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: unknown;
};

export type ValidatorContext = "serialized" | "deserialized";
export type Validator<T> = (
  data: unknown,
  context: ValidatorContext,
) => ValidationResult<T>;

export type CompressionOptions = {
  threshold?: number;
  paramName?: string;
  compress: (data: string) => string;
  decompress: (data: string) => string;
};

export type QueryParserOptions<T> = {
  navigate?: (newUrl: string) => void;
  basePath?: string;
  compression?: CompressionOptions;
  defaultValues?: Partial<T>;
};

export class QueryParamCore<T extends Record<string, unknown>> {
  private validator: Validator<T>;
  private options: QueryParserOptions<T>;
  private queryConverter: IQueryStringConverter;
  private dataCompressor: IDataCompressor;
  private compressionOptions: Required<CompressionOptions> | null;

  constructor(
    validator: Validator<T>,
    options: QueryParserOptions<T> = {},
    queryConverter: IQueryStringConverter = new QueryStringConverter(),
    dataCompressor: IDataCompressor = new DataCompressor(),
  ) {
    this.validator = validator;
    this.options = options;
    this.queryConverter = queryConverter;
    this.dataCompressor = dataCompressor;

    this.compressionOptions = options.compression
      ? {
          threshold: options.compression.threshold || 500,
          paramName: options.compression.paramName || "qs",
          compress: options.compression.compress,
          decompress: options.compression.decompress,
        }
      : null;
  }

  public getQueryParams(): string {
    if (typeof window === "undefined") return "";
    return window.location.search;
  }

  public hasCompressed(): boolean {
    if (!this.compressionOptions || typeof window === "undefined") return false;
    return this.dataCompressor.hasCompressedData(
      window.location.search,
      this.compressionOptions.paramName,
    );
  }

  public parseQueryParams(queryString: string): T {
    const withDefaults = this.applyDefaultValues({} as T);

    if (
      this.compressionOptions &&
      this.dataCompressor.hasCompressedData(
        queryString,
        this.compressionOptions.paramName,
      )
    ) {
      return this.parseCompressedParams(queryString, withDefaults);
    }

    return this.parsedSerializedParams(queryString, withDefaults);
  }

  private applyDefaultValues(params: Partial<T>): T {
    const defaults = this.options.defaultValues
      ? structuredClone(this.options.defaultValues)
      : {};
    return { ...defaults, ...structuredClone(params) } as T;
  }

  private parseCompressedParams(queryString: string, defaultParams: T): T {
    if (!this.compressionOptions) {
      return this.parsedSerializedParams(queryString, defaultParams);
    }

    try {
      const compressed = this.dataCompressor.getCompressedData(
        queryString,
        this.compressionOptions.paramName,
      );

      if (compressed) {
        const decompressed = this.compressionOptions.decompress(compressed);
        const parsed = JSON.parse(decompressed);

        const mergedData = { ...defaultParams, ...structuredClone(parsed) };
        const validationResult = this.validator(mergedData, "serialized");

        if (validationResult.success && validationResult.data) {
          return structuredClone(validationResult.data) as T;
        } else {
          console.warn(
            "Decompressed query params validation error:",
            validationResult.errors,
          );
          return mergedData as T;
        }
      }
    } catch (error) {
      console.error("Failed to decompress query params:", error);
    }

    return defaultParams;
  }

  private parsedSerializedParams(queryString: string, defaultParams: T): T {
    const parsed = this.queryConverter.queryStringToObject(queryString);

    const mergedData = { ...defaultParams, ...structuredClone(parsed) };
    const validationResult = this.validator(mergedData, "serialized");

    if (validationResult.success && validationResult.data) {
      return structuredClone(validationResult.data) as T;
    } else {
      console.warn("Query params validation error:", validationResult.errors);
      return mergedData as T;
    }
  }

  public validateDeserializedParams(
    params: Record<string, unknown>,
  ): ValidationResult<T> {
    const withDefaults = {
      ...(this.options.defaultValues
        ? structuredClone(this.options.defaultValues)
        : {}),
      ...(params ? structuredClone(params) : {}),
    };
    const validationResult = this.validator(withDefaults, "deserialized");

    if (validationResult.success && validationResult.data) {
      return {
        success: true,
        data: structuredClone(validationResult.data),
        errors: validationResult.errors,
      };
    }

    return validationResult;
  }

  public createUrl(params: T): string {
    const basePath =
      this.options.basePath ||
      (typeof window !== "undefined" ? window.location.pathname : "/");

    if (
      this.compressionOptions &&
      JSON.stringify(params).length > this.compressionOptions.threshold
    ) {
      return this.createCompressedUrl(params, basePath);
    } else {
      return this.createRegularUrl(params, basePath);
    }
  }

  private createCompressedUrl(params: T, basePath: string): string {
    if (!this.compressionOptions) {
      return this.createRegularUrl(params, basePath);
    }

    const jsonString = JSON.stringify(params);
    const compressed = this.compressionOptions.compress(jsonString);
    return `${basePath}?${this.compressionOptions.paramName}=${encodeURIComponent(compressed)}`;
  }

  private createRegularUrl(params: T, basePath: string): string {
    const queryString = this.queryConverter.objectToQueryString(params);
    return `${basePath}${queryString ? `?${queryString}` : ""}`;
  }

  public updateBrowserUrl(url: string, replace: boolean): void {
    if (this.options.navigate) {
      this.options.navigate(url);
    } else if (typeof window !== "undefined") {
      if (replace) {
        window.history.replaceState({}, "", url);
      } else {
        window.history.pushState({}, "", url);
      }
    }
  }
}
