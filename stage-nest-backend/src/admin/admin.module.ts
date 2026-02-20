import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

import { AdminUserModule } from './adminUser/adminUser.module';
import { ContentModule } from './content/content.module';
import { AdminPgModule } from './pg/admin-pg.module';
import { AppSettingModule } from './pg/appSetting.module';
import { PlanModule } from './plans/plan.module';
import RefundModule from './refund/refund.module';
import { CacheManagerModule } from 'libs/cache-manager/src';

@Module({
  imports: [
    AdminModule,
    RefundModule,
    AdminUserModule,
    AppSettingModule,
    CacheManagerModule,
    PlanModule,
    AdminPgModule,
    ContentModule,
    RouterModule.register([
      {
        children: [
          {
            module: RefundModule,
            path: 'refund',
          },
          {
            module: AppSettingModule,
            path: 'appSetting',
          },
          {
            module: AdminPgModule,
            path: 'pg',
          },
          {
            module: AdminUserModule,
            path: 'user',
          },
          {
            module: PlanModule,
            path: 'plan',
          },
          {
            module: ContentModule,
            path: 'content',
          },
        ],
        module: AdminModule,
        path: 'admin',
      },
    ]),
  ],
})
export class AdminModule {}
