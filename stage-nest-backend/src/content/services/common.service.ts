import { Injectable } from '@nestjs/common';

import { ListDialectsResponse } from '@app/cms/controllers/common.controller';
import { DialectStatus } from 'common/enums/app.enum';
import { DialectsRepository } from 'common/repositories/dialects.repository';
@Injectable()
export class CommonService {
  constructor(private readonly dialectsRepository: DialectsRepository) {}

  async listDialects(): Promise<ListDialectsResponse[]> {
    const dialects = await this.dialectsRepository.find(
      {
        status: { $in: [DialectStatus.ACTIVE, DialectStatus.INACTIVE] },
      },
      undefined,
      {
        cache: { enabled: true },
      },
    );
    if (!dialects) {
      return [];
    }
    return dialects.map((dialect) => ({
      abbreviation: dialect.dialectAbbreviation,
      name: dialect.dialect,
    }));
  }
}
