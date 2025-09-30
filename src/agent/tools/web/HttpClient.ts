import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface HttpClientOptions {
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  userAgent?: string;
  proxy?: string;
  headers?: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
  timing: number;
  url: string;
}

export class HttpClient {
  private client: AxiosInstance;
  private cookies: Map<string, string>;
  private opts: HttpClientOptions;

  constructor(options: HttpClientOptions = {}) {
    this.opts = {
      timeout: options.timeout || 10000,
      followRedirects: options.followRedirects !== undefined ? options.followRedirects : true,
      maxRedirects: options.maxRedirects || 5,
      userAgent: options.userAgent || 'Cyber-Claude/0.3.0 (Security Scanner)',
      ...options,
    };

    this.cookies = new Map();

    this.client = axios.create({
      timeout: this.opts.timeout,
      maxRedirects: this.opts.maxRedirects,
      validateStatus: () => true, // Accept all status codes
      headers: {
        'User-Agent': this.opts.userAgent,
        ...this.opts.headers,
      },
    });
  }

  /**
   * Perform GET request
   */
  async get(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({
      method: 'GET',
      url,
      headers,
    });
  }

  /**
   * Perform POST request
   */
  async post(
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<HttpResponse> {
    return this.request({
      method: 'POST',
      url,
      data,
      headers,
    });
  }

  /**
   * Perform HEAD request
   */
  async head(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({
      method: 'HEAD',
      url,
      headers,
    });
  }

  /**
   * Perform OPTIONS request
   */
  async options(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({
      method: 'OPTIONS',
      url,
      headers,
    });
  }

  /**
   * Generic request method
   */
  async request(config: AxiosRequestConfig): Promise<HttpResponse> {
    const startTime = Date.now();

    // Add cookies to request headers
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader && !config.headers?.['Cookie']) {
      config.headers = {
        ...config.headers,
        'Cookie': cookieHeader,
      };
    }

    try {
      const response: AxiosResponse = await this.client.request(config);
      const timing = Date.now() - startTime;

      // Store cookies from response
      this.storeCookies(response.headers);

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        timing,
        url: response.config.url || config.url || '',
      };
    } catch (error: any) {
      // Handle network errors, timeouts, etc.
      const timing = Date.now() - startTime;

      if (error.response) {
        // Store cookies even on error responses
        this.storeCookies(error.response.headers);

        // Server responded with error status
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers as Record<string, string>,
          data: typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data),
          timing,
          url: error.response.config?.url || config.url || '',
        };
      } else {
        // Network error or timeout
        throw new Error(`HTTP request failed: ${error.message}`);
      }
    }
  }

  /**
   * Get all cookies
   */
  getCookies(): Map<string, string> {
    return new Map(this.cookies);
  }

  /**
   * Set a cookie
   */
  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  /**
   * Clear all cookies
   */
  clearCookies(): void {
    this.cookies.clear();
  }

  /**
   * Get cookie header string
   */
  private getCookieHeader(): string {
    const cookies: string[] = [];
    this.cookies.forEach((value, name) => {
      cookies.push(`${name}=${value}`);
    });
    return cookies.join('; ');
  }

  /**
   * Parse Set-Cookie headers and store cookies
   */
  private storeCookies(headers: Record<string, any>): void {
    const setCookie = headers['set-cookie'];
    if (!setCookie) return;

    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    cookies.forEach((cookieStr: string) => {
      const parts = cookieStr.split(';')[0].split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        this.cookies.set(name, value);
      }
    });
  }
}