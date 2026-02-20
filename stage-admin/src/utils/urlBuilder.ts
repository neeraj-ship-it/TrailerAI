export interface BuildUrlOptions<
  T extends Record<string, string | number | boolean | undefined>
> {
  pathParams?: Record<string, string | number>;
  queryParams?: T;
}

class UrlBuilder {
  private static instance: UrlBuilder;

  private constructor() {}

  public static getInstance(): UrlBuilder {
    if (!UrlBuilder.instance) {
      UrlBuilder.instance = new UrlBuilder();
    }
    return UrlBuilder.instance;
  }

  private replacePathParams(
    url: string,
    pathParams?: Record<string, string | number>
  ): string {
    if (!pathParams) {
      return url;
    }

    let result = url;

    Object.entries(pathParams).forEach(([key, value]) => {
      const placeholder = `:${key}`;
      if (result.includes(placeholder)) {
        result = result.replace(
          new RegExp(`:${key}(?=/|$)`, "g"),
          String(value)
        );
      }
    });

    const remainingParams = result.match(/:[a-zA-Z0-9_]+/g);
    if (remainingParams && remainingParams.length > 0) {
      console.warn(
        `Warning: Unreplaced path parameters found: ${remainingParams.join(
          ", "
        )}`
      );
    }

    return result;
  }

  private buildQueryString<
    T extends Record<string, string | number | boolean | undefined>
  >(queryParams?: T): string {
    if (!queryParams) {
      return "";
    }

    const params = new URLSearchParams();

    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    });

    return params.toString();
  }

  public buildUrl<
    T extends Record<string, string | number | boolean | undefined>
  >(baseUrl: string, options?: BuildUrlOptions<T>): string {
    const url = this.replacePathParams(baseUrl, options?.pathParams);
    const queryString = this.buildQueryString(options?.queryParams);
    return queryString ? `${url}?${queryString}` : url;
  }
}

export const urlBuilder = UrlBuilder.getInstance();
export { UrlBuilder };
