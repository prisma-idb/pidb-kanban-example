import { browser } from '$app/environment';
import { PrismaIDBClient } from './prisma-idb/prisma-idb-client';

export const client = browser ? await PrismaIDBClient.createClient() : undefined;
