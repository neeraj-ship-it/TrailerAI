import { Test } from '@nestjs/testing';

import { HttpModule } from './http.module';
import { HttpService } from './http.service';

describe('HttpModule', () => {
  describe('module initialization', () => {
    it('should provide HttpService and ChainableHttpService', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [HttpModule],
      }).compile();

      expect(moduleRef.get(HttpService)).toBeInstanceOf(HttpService);
    });
  });

  describe('service initialization', () => {
    it('should initialize services with default Axios instances', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [HttpModule],
      }).compile();

      const httpService = moduleRef.get(HttpService);

      expect(httpService.axiosRef).toBeDefined();
    });
  });
});
