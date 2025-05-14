## use-param-lustig

A simple React hook for managing query parameters with validation, compression, and URL syncing.

### Features

- **Type-Safe Query Management**: Define query parameters with a validator for robust type checking.
- **Seamless URL Sync**: Automatically syncs query parameters with the browser's URL and history.
- **Validation**: Built-in validation to ensure query parameters conform to your schema.

### Requirements

- **Validator Library**: A schema validator like Zod or Valibot for defining query parameter schemas.

### Installation

Install the package via npm:

```bash
npm install use-param-lustig
```

### Usage

The `useQueryParams` hook simplifies managing query parameters in React applications. It requires a validator (e.g., Zod or Valibot) to define the schema for your query parameters.

`Validator` abstraction deserializes the query parameter data, but a transformation step is needed to ensure runtime data integrity. The schema must support both URL and runtime, for types like integers, booleans and others.

#### Example

```jsx
import { useQueryParams } from "use-param-lustig";
import * as v from "valibot";

const querySchema = v.object({
  search: v.optional(v.string(), ""),
  sort: v.optional(
    v.object({
      field: v.string(),
      order: v.union([v.literal("asc"), v.literal("desc")]),
    }),
    { field: "createdAt", order: "desc" },
  ),
  filters: v.optional(
    v.array(
      v.object({
        key: v.pipe(
          v.union([v.string(), v.number()]),
          v.transform((input) => Number(input)),
        ),
        value: v.string(),
      }),
    ),
    [],
  ),
});

function MyComponent() {
  const { params, setQueryParams, resetQueryParams } = useQueryParams(
    (data) => {
      try {
        const validated = v.parse(querySchema, data);
        return { success: true, data: validated };
      } catch (error) {
        return { success: false, errors: error };
      }
    },
    {
      defaultValues: {
        search: "",
        sort: { field: "createdAt", order: "desc" },
        filters: [],
      },
      navigate: (newURL) => {
        // your router "navigate" function
      },
    },
  );

  return (
    <div>
      <input
        type="text"
        value={params.search}
        onChange={(evt) => setQueryParams({ search: evt.target.value })}
        placeholder="Search products..."
      />
      <button
        onClick={() =>
          setQueryParams((prevParams) => ({
            ...prevParams,
            filters: [...prevParams.filters, { key: 1, value: "electronics" }],
          }))
        }
      >
        Add Filter
      </button>
      <button onClick={() => resetQueryParams()}>Reset</button>
    </div>
  );
}
```

#### Example with URL compression

```jsx
import { useQueryParams } from "use-param-lustig";
import * as v from "valibot";
import lzString from "lz-string";

const querySchema = v.object({
  // ...
});

function MyComponent() {
  const { params, setQueryParams, resetQueryParams } = useQueryParams(
    (data) => {
      // ...
    },
    {
      // ...
      compression: {
        threshold: 300,
        paramName: "qs",
        compress: (datums) => lzString.compressToEncodedURIComponent(datums),
        decompress: (datums) =>
          lzString.decompressFromEncodedURIComponent(datums),
      },
    },
  );

  // ...
}
```

### License

This project is licensed under the MIT License.
