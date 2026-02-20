import { Injectable } from '@nestjs/common';
import axios, {
  AxiosInstance,
  type AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

/**
 * Request data with explicit JSON support
 */
export interface RequestData<T = unknown> {
  /**
   * Raw data to be sent with the request
   */
  data?: unknown;

  /**
   * FormData to be sent with the request
   */
  form?: FormData;

  /**
   * JSON payload to be sent with the request.
   * When provided, Content-Type will be set to application/json
   */
  json?: T;

  /**
   * URL-encoded form data
   */
  urlEncoded?: URLSearchParams | Record<string, string>;
}

export interface HTTPOptions extends AxiosRequestConfig {
  hooks?: {
    beforeRequest?: ((
      config: InternalAxiosRequestConfig,
    ) => Promise<void> | void)[];
  };
  json?: unknown;
}

/**
 * Response wrapper to support chainable methods
 */
export class HttpResponse<T> {
  private data: T;

  constructor(response: AxiosResponse<T>) {
    this.data = response.data;
  }

  /**
   * Get response as JSON
   */
  json(): T {
    return this.data;
  }

  /**
   * Get response as text
   */
  async text(): Promise<string> {
    return JSON.stringify(this.data);
  }
}

/**
 * Enhanced HTTP service with chainable response methods
 */
@Injectable()
export class HttpService {
  private instance: AxiosInstance;

  constructor(config?: AxiosRequestConfig) {
    this.instance = axios.create(config);
  }

  /**
   * Creates a new instance with enhanced features
   */
  static createInstance(options: HTTPOptions = {}): HttpService {
    const { hooks, json, ...config } = options;

    // Create axios instance with fetch adapter
    const instance = axios.create({
      ...config,
      adapter: 'fetch',
    });

    // Add JSON body handling
    if (json) {
      config.data = json;
      config.headers = {
        ...config.headers,
        'Content-Type': 'application/json',
      };
    }

    // Apply hooks if provided
    if (hooks?.beforeRequest && hooks.beforeRequest.length > 0) {
      instance.interceptors.request.use(async (reqConfig) => {
        // Execute all beforeRequest hooks
        for (const hook of hooks?.beforeRequest ?? []) {
          await hook(reqConfig);
        }
        return reqConfig;
      });
    }

    // Return new HttpService instance
    const service = new HttpService();
    service.instance = instance;
    return service;
  }

  /**
   * Helper to prepare request config with proper headers for JSON data
   * Handles explicit JSON payloads via the json key
   */
  private prepareRequestConfig<D = unknown>(
    data: RequestData<D> | unknown,
    config?: AxiosRequestConfig,
  ): { config: AxiosRequestConfig; processedData: unknown } {
    if (!config) config = {};
    if (!config.headers) config.headers = {};

    // Default to the original data
    let processedData = data;

    // Check if we have a RequestData object with json, form, or urlEncoded property
    if (data && typeof data === 'object') {
      const requestData = data as RequestData<D>;

      // Handle explicit JSON payload
      if ('json' in requestData && requestData.json !== undefined) {
        config.headers['Content-Type'] = 'application/json';
        processedData = requestData.json;
      }
      // Handle FormData
      else if ('form' in requestData && requestData.form instanceof FormData) {
        // Axios will auto-set the Content-Type header with boundary for FormData
        processedData = requestData.form;
      }
      // Handle URL-encoded form data
      else if ('urlEncoded' in requestData && requestData.urlEncoded) {
        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';

        if (requestData.urlEncoded instanceof URLSearchParams) {
          processedData = requestData.urlEncoded;
        } else {
          // Convert object to URLSearchParams
          const params = new URLSearchParams();
          const formData = requestData.urlEncoded as Record<string, string>;
          Object.keys(formData).forEach((key) => {
            params.append(key, formData[key]);
          });
          processedData = params;
        }
      }
      // Handle explicit data property
      else if ('data' in requestData && requestData.data !== undefined) {
        processedData = requestData.data;
      }
      // Default behavior for regular objects (auto-detect JSON)
      else if (
        !(data instanceof FormData) &&
        !(data instanceof URLSearchParams) &&
        !(data instanceof Blob) &&
        !(data instanceof ArrayBuffer)
      ) {
        // Only set Content-Type if not already set
        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      }
    }

    return { config, processedData };
  }

  /**
   * Send a DELETE request with chainable response methods
   */
  delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<HttpResponse<T>> & { json: () => Promise<T> } {
    const promise = this.instance
      .delete<T>(url, config)
      .then((res) => new HttpResponse<T>(res));
    return Object.assign(promise, {
      json: async () => (await promise).json(),
    });
  }

  /**
   * Send a GET request with chainable response methods
   */
  get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<HttpResponse<T>> & { json: () => Promise<T> } {
    const promise = this.instance
      .get<T>(url, config)
      .then((res) => new HttpResponse<T>(res));
    return Object.assign(promise, {
      json: async () => (await promise).json(),
    });
  }

  /**
   * Send a PATCH request with chainable response methods
   * Supports explicit JSON requests via the json key: patch(url, { json: data })
   */
  patch<T, D = unknown>(
    url: string,
    data?: RequestData<D> | unknown,
    config?: AxiosRequestConfig,
  ): Promise<HttpResponse<T>> & { json: () => Promise<T> } {
    const { config: enhancedConfig, processedData } =
      this.prepareRequestConfig<D>(data, config);

    const promise = this.instance
      .patch<T>(url, processedData, enhancedConfig)
      .then((res) => new HttpResponse<T>(res));
    return Object.assign(promise, {
      json: async () => (await promise).json(),
    });
  }

  /**
   * Send a POST request with chainable response methods
   * Supports explicit JSON requests via the json key: post(url, { json: data })
   */
  post<T, D = unknown>(
    url: string,
    data: RequestData<D>,
    config?: AxiosRequestConfig,
  ): Promise<HttpResponse<T>> & { json: () => Promise<T> } {
    const { config: enhancedConfig, processedData } =
      this.prepareRequestConfig<D>(data, config);

    const promise = this.instance
      .post<T>(url, processedData, enhancedConfig)
      .then((res) => new HttpResponse<T>(res));
    return Object.assign(promise, {
      json: async () => (await promise).json(),
    });
  }

  /**
   * Send a PUT request with chainable response methods
   * Supports explicit JSON requests via the json key: put(url, { json: data })
   */
  put<T, D = unknown>(
    url: string,
    data?: RequestData<D> | unknown,
    config?: AxiosRequestConfig,
  ): Promise<HttpResponse<T>> & { json: () => Promise<T> } {
    const { config: enhancedConfig, processedData } =
      this.prepareRequestConfig<D>(data, config);

    const promise = this.instance
      .put<T>(url, processedData, enhancedConfig)
      .then((res) => new HttpResponse<T>(res));
    return Object.assign(promise, {
      json: async () => (await promise).json(),
    });
  }

  /**
   * Get the underlying Axios instance
   */
  get axiosRef(): AxiosInstance {
    return this.instance;
  }
}
