import * as Prisma from '@prisma/client';
import type { DBSchema } from 'idb';

export interface PrismaIDBSchema extends DBSchema {
	Todo: {
		key: [id: Prisma.Todo['id']];
		value: Prisma.Todo;
	};
}
