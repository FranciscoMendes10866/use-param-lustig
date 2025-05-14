export interface IQueryStringConverter<T = unknown> {
  objectToQueryString(obj: Record<string, T>, prefix?: string): string;
  queryStringToObject(queryString: string): Record<string, unknown>;
}

export class QueryStringConverter implements IQueryStringConverter {
  public objectToQueryString<T = unknown>(
    object: Record<string, T>,
    prefix = "",
  ): string {
    const queryParts: Array<string> = [];
    const keyValuePairs = Object.entries(object);

    for (let pairIndex = 0; pairIndex < keyValuePairs.length; pairIndex++) {
      const [key, value] = keyValuePairs[pairIndex];
      const fullKey = prefix ? `${prefix}[${key}]` : key;

      if (value === null || value === undefined) {
        continue;
      } else if (typeof value === "object" && !Array.isArray(value)) {
        const nestedQueryString = this.objectToQueryString(
          value as Record<string, unknown>,
          fullKey,
        );
        if (nestedQueryString) {
          queryParts.push(nestedQueryString);
        }
      } else if (Array.isArray(value)) {
        for (let arrayIndex = 0; arrayIndex < value.length; arrayIndex++) {
          const arrayItem = value[arrayIndex];
          if (typeof arrayItem === "object" && arrayItem !== null) {
            queryParts.push(
              this.objectToQueryString(
                arrayItem as Record<string, unknown>,
                `${fullKey}[${arrayIndex}]`,
              ),
            );
          } else if (arrayItem !== null && arrayItem !== undefined) {
            queryParts.push(
              `${encodeURIComponent(fullKey)}[${arrayIndex}]=${encodeURIComponent(String(arrayItem))}`,
            );
          }
        }
      } else {
        queryParts.push(
          `${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`,
        );
      }
    }

    return queryParts.join("&");
  }

  public queryStringToObject(queryString: string): Record<string, unknown> {
    const parsedObject: Record<string, unknown> = {};

    if (!queryString || queryString === "?") return parsedObject;

    const cleanedQuery = queryString.startsWith("?")
      ? queryString.substring(1)
      : queryString;

    const queryPairs = cleanedQuery.split("&").filter(Boolean);

    for (let pairIndex = 0; pairIndex < queryPairs.length; pairIndex++) {
      const queryPair = queryPairs[pairIndex];
      const [key, value] = queryPair.split("=").map(decodeURIComponent);

      if (!key) continue;

      const keySegments = key.match(/([^[\]]+)|\[([^[\]]*)\]/g);

      if (!keySegments) continue;

      let currentLevel = parsedObject;
      const lastSegmentIndex = keySegments.length - 1;

      for (
        let segmentIndex = 0;
        segmentIndex < keySegments.length;
        segmentIndex++
      ) {
        const keySegment = keySegments[segmentIndex];
        const cleanKey = keySegment.replace(/\[|\]/g, "");

        if (segmentIndex === lastSegmentIndex) {
          currentLevel[cleanKey] = value;
        } else {
          if (!currentLevel[cleanKey]) {
            const nextSegment = keySegments[segmentIndex + 1]?.replace(
              /\[|\]/g,
              "",
            );
            currentLevel[cleanKey] = !isNaN(Number(nextSegment)) ? [] : {};
          }
          currentLevel = currentLevel[cleanKey] as Record<string, unknown>;
        }
      }
    }

    return parsedObject;
  }
}
