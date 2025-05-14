import { useCallback, useEffect, useState } from "react";

import {
  type Validator,
  type QueryParserOptions,
  DataCompressor,
  QueryParamCore,
  QueryStringConverter,
} from "./internals";

export function useQueryParams<T extends Record<string, unknown>>(
  validator: Validator<T>,
  options: QueryParserOptions<T> = {},
) {
  const [queryCore] = useState(
    () =>
      new QueryParamCore<T>(
        validator,
        options,
        new QueryStringConverter(),
        new DataCompressor(),
      ),
  );

  const [params, setParams] = useState<T>(() =>
    queryCore.parseQueryParams(queryCore.getQueryParams()),
  );

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const handleUrlChange = () => {
      if (signal.aborted) return;
      const queryString = queryCore.getQueryParams();
      setParams(queryCore.parseQueryParams(queryString));
    };

    handleUrlChange();

    window.addEventListener("popstate", handleUrlChange, { signal });
    return () => abortController.abort();
  }, [queryCore]);

  const setQueryParams = useCallback(
    (
      newParams: Partial<T> | ((prevParams: T) => Partial<T>),
      replace = false,
    ) => {
      setParams((prevParams) => {
        const prevParamsCopy = structuredClone(prevParams);

        const updatedParamsRaw =
          typeof newParams === "function"
            ? { ...prevParamsCopy, ...newParams(prevParamsCopy) }
            : {
                ...prevParamsCopy,
                ...(typeof newParams === "object"
                  ? structuredClone(newParams)
                  : {}),
              };

        const defaults: Partial<T> = options.defaultValues
          ? structuredClone(options.defaultValues)
          : {};

        const finalParams = { ...updatedParamsRaw } as T;
        for (const key in finalParams) {
          if (
            key in defaults &&
            finalParams[key as keyof T] === undefined &&
            defaults[key as keyof T] !== undefined
          ) {
            finalParams[key as keyof T] = defaults[
              key as keyof T
            ] as T[keyof T];
          }
        }

        const validationResult =
          queryCore.validateDeserializedParams(finalParams);

        if (!validationResult.success) {
          console.error("Invalid query params:", validationResult.errors);
          return prevParams;
        }

        const validated = validationResult.data as T;

        const newUrl = queryCore.createUrl(validated);
        queryCore.updateBrowserUrl(newUrl, replace);

        return validated;
      });
    },
    [queryCore, options.defaultValues],
  );

  return {
    params: Object.freeze(structuredClone(params)),
    setQueryParams,
    resetQueryParams: () =>
      setQueryParams(
        options.defaultValues
          ? structuredClone(options.defaultValues)
          : ({} as Partial<T>),
        true,
      ),
  };
}
