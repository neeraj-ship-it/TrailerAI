import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { posix } from 'path';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MogiService {
  private readonly mogiBaseUrl = 'https://img-transform.mogiio.com';

  constructor(private readonly httpService: HttpService) {}

  async transformImage({
    source,
    width,
  }: {
    source: string;
    width: number;
  }): Promise<ArrayBuffer> {
    const path = posix.normalize(
      `${this.mogiBaseUrl}/mogi-enhance/5ecdf8f77c92cd06870c876c/q90,fauto,ptrue,etrue,w${width}/${source}`,
    );

    // Fetch as ArrayBuffer
    const response: AxiosResponse<ArrayBuffer> = await firstValueFrom(
      this.httpService.get<ArrayBuffer>(path, {
        responseType: 'arraybuffer',
      }),
    );

    // Return the ArrayBuffer directly
    return response.data;
  }
}
