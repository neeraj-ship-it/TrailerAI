import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'supertest';
const realAxios = jest.requireActual('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TestHelperService {
  // Handle the mock axios implementation if the url matches the endpoint
  private static handleMock<T>(
    url: string,
    endpoint: string,
    data: unknown,
    response: T,
    statusCode: number,
  ) {
    if (url === endpoint) {
      return Promise.resolve({ data: response, status: statusCode });
    }
    return realAxios.post(url, data);
  }

  // Mock the axios implementation
  public static mockAxiosImplementation<T>(
    endpoint: string,
    response: T,
    requestType: 'patch' | 'post' | 'get' | 'put' | 'delete',
    statusCode = 200, // default status code 200 if not passed
  ) {
    jest.mock('axios');

    switch (requestType) {
      case 'patch': {
        return mockedAxios.patch.mockImplementation((url, data) =>
          this.handleMock<T>(url, endpoint, data, response, statusCode),
        );
      }
      case 'post': {
        return mockedAxios.post.mockImplementation((url, data) =>
          this.handleMock<T>(url, endpoint, data, response, statusCode),
        );
      }
      case 'delete': {
        return mockedAxios.delete.mockImplementation((url, data) =>
          this.handleMock<T>(url, endpoint, data, response, statusCode),
        );
      }
      case 'get': {
        return mockedAxios.get.mockImplementation((url, data) =>
          this.handleMock<T>(url, endpoint, data, response, statusCode),
        );
      }
      case 'put': {
        return mockedAxios.put.mockImplementation((url, data) =>
          this.handleMock<T>(url, endpoint, data, response, statusCode),
        );
      }
    }
  }

  public static validateErrorResponse(response: Response, errorCode: number) {
    // extract data from response
    const { body, status } = response;
    const { data, error } = body;

    // run all the checks
    expect(status).toBe(errorCode);
    expect(data).toBe(undefined);
    expect(typeof error).toBe('string');

    // Ensure error properties exist and are not null
    expect(error).toBeDefined();
    expect(error).not.toBeNull();
  }

  // // Check for the presence of provided keys in mongo
  public static validateMongoEntity(
    entityResponse: object,
    expectedEntity: object,
  ) {
    expect(entityResponse).toBeDefined();
    expect(entityResponse).not.toBeNull();
    expect(expectedEntity).toBeDefined();
    expect(expectedEntity).not.toBeNull();

    if (entityResponse === null || expectedEntity === null) {
      return;
    }

    // Check that entityResponse only contains keys present in includedKeys
    const entityResponseKeys = Object.keys(entityResponse);
    const expectedEntityKeys = Object.keys(expectedEntity);
    expect(entityResponseKeys.length).toEqual(expectedEntityKeys.length);

    Object.entries(expectedEntity).forEach(([key, value]) => {
      expect(entityResponse).toHaveProperty(key);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: Record<string, any> = entityResponse;

      // expect(response[key]).toBeInstanceOf(value);
      expect(response[key]).toEqual(value); // deep equality check
    });
  }

  // Check for the presence of keys, key types, and matches with expected values
  public static validateResponse(
    response: Response,
    expectedResponse: object,
    statusCode: number,
  ) {
    expect(response).toBeDefined();
    expect(response).not.toBeNull();

    // extract data from response
    const { body, status } = response;

    // Ensure response properties exist and are not null
    expect(status).toBeDefined();
    expect(status).not.toBeNull();
    expect(body).toBeDefined();
    expect(body).not.toBeNull();

    const { error } = body;

    // Ensure body properties exist and are not null
    expect(error).toBe(undefined);

    // run all the checks
    expect(status).toBe(statusCode);

    expect(Object.keys(expectedResponse).length).toEqual(
      Object.keys(body).length,
    );

    Object.entries(expectedResponse).forEach(([key, value]) => {
      expect(body).toHaveProperty(key);
      expect(typeof body[key]).toBe(typeof value);
      expect(body[key]).toEqual(value);
    });
  }
}
