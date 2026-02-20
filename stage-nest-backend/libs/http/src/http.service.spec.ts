import { Test } from '@nestjs/testing';
import axios, {
  AxiosInstance,
  AxiosInterceptorManager,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { HttpModule } from './http.module';
import { HttpService } from './http.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpService', () => {
  let httpService: HttpService;
  let axiosInstance: jest.Mocked<AxiosInstance>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HttpModule],
    }).compile();

    httpService = moduleRef.get<HttpService>(HttpService);

    // Setup mock responses
    axiosInstance = {
      delete: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        } as unknown as AxiosInterceptorManager<InternalAxiosRequestConfig>,
        response: {
          use: jest.fn(),
        } as unknown as AxiosInterceptorManager<AxiosResponse>,
      },
      patch: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      request: jest.fn(),
    } as unknown as jest.Mocked<AxiosInstance>;

    // Replace the axios instance with our mock
    (httpService as unknown as { instance: AxiosInstance }).instance =
      axiosInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HttpService', () => {
    it('should make a GET request', async () => {
      const responseData = { message: 'Hello from GET' };
      axiosInstance.get.mockResolvedValue({ data: responseData });

      const result = await httpService.get('/test');

      expect(axiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(responseData);
    });

    it('should make a POST request', async () => {
      const postData = { name: 'Test' };
      const responseData = { id: 1, name: 'Test' };
      axiosInstance.post.mockResolvedValue({ data: responseData });

      const result = await httpService.post('/test', { json: postData });

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/test',
        { json: postData },
        undefined,
      );
      expect(result).toEqual(responseData);
    });

    it('should make a PUT request', async () => {
      const putData = { id: 1, name: 'Updated Test' };
      const responseData = { success: true };
      axiosInstance.put.mockResolvedValue({ data: responseData });

      const result = await httpService.put('/test/1', putData);

      expect(axiosInstance.put).toHaveBeenCalledWith(
        '/test/1',
        putData,
        undefined,
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('HttpService', () => {
    it('should make a GET request with chaining', async () => {
      const responseData = { message: 'Hello from GET' };
      axiosInstance.get.mockResolvedValue({ data: responseData });

      const result = await httpService.get('/test').json();

      expect(axiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(responseData);
    });

    it('should make a POST request with chaining', async () => {
      const postData = { name: 'Test' };
      const responseData = { id: 1, name: 'Test' };
      axiosInstance.post.mockResolvedValue({ data: responseData });

      const result = await httpService.post('/test', { json: postData }).json();

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/test',
        postData,
        undefined,
      );
      expect(result).toEqual(responseData);
    });

    it('should make a PUT request with chaining', async () => {
      const putData = { id: 1, name: 'Updated Test' };
      const responseData = { success: true };
      axiosInstance.put.mockResolvedValue({ data: responseData });

      const result = await httpService.put('/test/1', putData).json();

      expect(axiosInstance.put).toHaveBeenCalledWith(
        '/test/1',
        putData,
        undefined,
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('HttpService static factory', () => {
    it('should create an instance with hooks', async () => {
      const beforeRequestHook = jest.fn();

      // Mock axios.create to return our mock instance
      mockedAxios.create.mockReturnValue(axiosInstance);

      // Find the interceptor
      expect(axiosInstance.interceptors.request.use).toHaveBeenCalled();
      const useCallback = (axiosInstance.interceptors.request.use as jest.Mock)
        .mock.calls[0][0];

      // Call the interceptor with a mock config
      const reqConfig = { headers: {} } as InternalAxiosRequestConfig;
      await useCallback(reqConfig);

      expect(beforeRequestHook).toHaveBeenCalledWith(reqConfig);
    });
  });
});
