import * as Prisma from '@prisma/client';
import type { DBSchema } from 'idb';

export interface PrismaIDBSchema extends DBSchema {
	Board: {
		key: [name: Prisma.Board['name']];
		value: Prisma.Board;
	};
	Task: {
		key: [id: Prisma.Task['id']];
		value: Prisma.Task;
	};
}
