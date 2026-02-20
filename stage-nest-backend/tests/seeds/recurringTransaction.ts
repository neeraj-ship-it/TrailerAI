import { Document } from 'mongoose';

import { RecurringTransaction } from '@app/common/entities/recurringTransaction.entity';

export const recurringTransaction: Omit<
  RecurringTransaction,
  keyof Document
>[] = [
  {
    createdAt: new Date(),
    orderId: '1234567890',
    pgTxnId: 'T2409201103477054196093',
    referenceId: '0987654321',
    updatedAt: new Date(),
  },
  {
    createdAt: new Date(),
    orderId: '1234567890',
    pgTxnId: 'T2409201103477054196096',
    referenceId: '0987654321',
    updatedAt: new Date(),
  },
  {
    createdAt: new Date(),
    orderId: '1234567890',
    pgTxnId: 'T2409201103477054196099',
    referenceId: '0987654321',
    updatedAt: new Date(),
  },
];
