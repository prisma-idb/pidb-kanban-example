import type { Prisma } from '@prisma/client';
import type { IDBPDatabase, StoreNames } from 'idb';
import { openDB } from 'idb';
import type { PrismaIDBSchema } from './idb-interface';
import * as IDBUtils from './idb-utils';

/* eslint-disable @typescript-eslint/no-unused-vars */
const IDB_VERSION = 1;

export class PrismaIDBClient {
	private static instance: PrismaIDBClient;
	_db!: IDBPDatabase<PrismaIDBSchema>;

	private constructor() {}

	todo!: TodoIDBClass;

	public static async createClient(): Promise<PrismaIDBClient> {
		if (!PrismaIDBClient.instance) {
			const client = new PrismaIDBClient();
			await client.initialize();
			PrismaIDBClient.instance = client;
		}
		return PrismaIDBClient.instance;
	}

	private async initialize() {
		this._db = await openDB<PrismaIDBSchema>('prisma-idb', IDB_VERSION, {
			upgrade(db) {
				db.createObjectStore('Todo', { keyPath: ['id'] });
			}
		});
		this.todo = new TodoIDBClass(this, ['id']);
	}
}

class BaseIDBModelClass<T extends keyof PrismaIDBSchema> {
	protected client: PrismaIDBClient;
	protected keyPath: string[];
	private eventEmitter: EventTarget;

	constructor(client: PrismaIDBClient, keyPath: string[]) {
		this.client = client;
		this.keyPath = keyPath;
		this.eventEmitter = new EventTarget();
	}

	subscribe(
		event: 'create' | 'update' | 'delete' | ('create' | 'update' | 'delete')[],
		callback: (
			e: CustomEventInit<{
				keyPath: PrismaIDBSchema[T]['key'];
				oldKeyPath?: PrismaIDBSchema[T]['key'];
			}>
		) => void
	) {
		if (Array.isArray(event)) {
			event.forEach((event) => this.eventEmitter.addEventListener(event, callback));
			return;
		}
		this.eventEmitter.addEventListener(event, callback);
	}

	unsubscribe(
		event: 'create' | 'update' | 'delete' | ('create' | 'update' | 'delete')[],
		callback: (
			e: CustomEventInit<{
				keyPath: PrismaIDBSchema[T]['key'];
				oldKeyPath?: PrismaIDBSchema[T]['key'];
			}>
		) => void
	) {
		if (Array.isArray(event)) {
			event.forEach((event) => this.eventEmitter.removeEventListener(event, callback));
			return;
		}
		this.eventEmitter.removeEventListener(event, callback);
	}

	protected emit(
		event: 'create' | 'update' | 'delete',
		keyPath: PrismaIDBSchema[T]['key'],
		oldKeyPath?: PrismaIDBSchema[T]['key']
	) {
		if (event === 'update') {
			this.eventEmitter.dispatchEvent(new CustomEvent(event, { detail: { keyPath, oldKeyPath } }));
			return;
		}
		this.eventEmitter.dispatchEvent(new CustomEvent(event, { detail: { keyPath } }));
	}
}

class TodoIDBClass extends BaseIDBModelClass<'Todo'> {
	private async _applyWhereClause<
		W extends Prisma.Args<Prisma.TodoDelegate, 'findFirstOrThrow'>['where'],
		R extends Prisma.Result<Prisma.TodoDelegate, object, 'findFirstOrThrow'>
	>(records: R[], whereClause: W, tx: IDBUtils.TransactionType): Promise<R[]> {
		if (!whereClause) return records;
		records = await IDBUtils.applyLogicalFilters<Prisma.TodoDelegate, R, W>(
			records,
			whereClause,
			tx,
			this.keyPath,
			this._applyWhereClause.bind(this)
		);
		return (
			await Promise.all(
				records.map(async (record) => {
					const stringFields = ['title'] as const;
					for (const field of stringFields) {
						if (!IDBUtils.whereStringFilter(record, field, whereClause[field])) return null;
					}
					const numberFields = ['id'] as const;
					for (const field of numberFields) {
						if (!IDBUtils.whereNumberFilter(record, field, whereClause[field])) return null;
					}
					const booleanFields = ['completed'] as const;
					for (const field of booleanFields) {
						if (!IDBUtils.whereBoolFilter(record, field, whereClause[field])) return null;
					}
					const dateTimeFields = ['createdAt'] as const;
					for (const field of dateTimeFields) {
						if (!IDBUtils.whereDateTimeFilter(record, field, whereClause[field])) return null;
					}
					return record;
				})
			)
		).filter((result) => result !== null);
	}

	private _applySelectClause<S extends Prisma.Args<Prisma.TodoDelegate, 'findMany'>['select']>(
		records: Prisma.Result<Prisma.TodoDelegate, object, 'findFirstOrThrow'>[],
		selectClause: S
	): Prisma.Result<Prisma.TodoDelegate, { select: S }, 'findFirstOrThrow'>[] {
		if (!selectClause) {
			return records as Prisma.Result<Prisma.TodoDelegate, { select: S }, 'findFirstOrThrow'>[];
		}
		return records.map((record) => {
			const partialRecord: Partial<typeof record> = record;
			for (const untypedKey of ['id', 'title', 'completed', 'createdAt']) {
				const key = untypedKey as keyof typeof record & keyof S;
				if (!selectClause[key]) delete partialRecord[key];
			}
			return partialRecord;
		}) as Prisma.Result<Prisma.TodoDelegate, { select: S }, 'findFirstOrThrow'>[];
	}

	private async _applyRelations<Q extends Prisma.Args<Prisma.TodoDelegate, 'findMany'>>(
		records: Prisma.Result<Prisma.TodoDelegate, object, 'findFirstOrThrow'>[],
		tx: IDBUtils.TransactionType,
		query?: Q
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'findFirstOrThrow'>[]> {
		if (!query) return records as Prisma.Result<Prisma.TodoDelegate, Q, 'findFirstOrThrow'>[];
		const recordsWithRelations = records.map(async (record) => {
			const unsafeRecord = record as Record<string, unknown>;
			return unsafeRecord;
		});
		return (await Promise.all(recordsWithRelations)) as Prisma.Result<
			Prisma.TodoDelegate,
			Q,
			'findFirstOrThrow'
		>[];
	}

	async _applyOrderByClause<
		O extends Prisma.Args<Prisma.TodoDelegate, 'findMany'>['orderBy'],
		R extends Prisma.Result<Prisma.TodoDelegate, object, 'findFirstOrThrow'>
	>(records: R[], orderByClause: O, tx: IDBUtils.TransactionType): Promise<void> {
		if (orderByClause === undefined) return;
		const orderByClauses = IDBUtils.convertToArray(orderByClause);
		const indexedKeys = await Promise.all(
			records.map(async (record) => {
				const keys = await Promise.all(
					orderByClauses.map(async (clause) => await this._resolveOrderByKey(record, clause, tx))
				);
				return { keys, record };
			})
		);
		indexedKeys.sort((a, b) => {
			for (let i = 0; i < orderByClauses.length; i++) {
				const clause = orderByClauses[i];
				const comparison = IDBUtils.genericComparator(
					a.keys[i],
					b.keys[i],
					this._resolveSortOrder(clause)
				);
				if (comparison !== 0) return comparison;
			}
			return 0;
		});
		for (let i = 0; i < records.length; i++) {
			records[i] = indexedKeys[i].record;
		}
	}

	async _resolveOrderByKey(
		record: Prisma.Result<Prisma.TodoDelegate, object, 'findFirstOrThrow'>,
		orderByInput: Prisma.TodoOrderByWithRelationInput,
		tx: IDBUtils.TransactionType
	): Promise<unknown> {
		const scalarFields = ['id', 'title', 'completed', 'createdAt'] as const;
		for (const field of scalarFields) if (orderByInput[field]) return record[field];
	}

	_resolveSortOrder(
		orderByInput: Prisma.TodoOrderByWithRelationInput
	): Prisma.SortOrder | { sort: Prisma.SortOrder; nulls?: 'first' | 'last' } {
		const scalarFields = ['id', 'title', 'completed', 'createdAt'] as const;
		for (const field of scalarFields) if (orderByInput[field]) return orderByInput[field];
		throw new Error('No field in orderBy clause');
	}

	private async _fillDefaults<D extends Prisma.Args<Prisma.TodoDelegate, 'create'>['data']>(
		data: D,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<D> {
		if (data === undefined) data = {} as NonNullable<D>;
		if (data.id === undefined) {
			const transaction = tx ?? this.client._db.transaction(['Todo'], 'readwrite');
			const store = transaction.objectStore('Todo');
			const cursor = await store.openCursor(null, 'prev');
			data.id = cursor ? Number(cursor.key) + 1 : 1;
		}
		if (data.completed === undefined) {
			data.completed = false;
		}
		if (data.createdAt === undefined) {
			data.createdAt = new Date();
		}
		if (typeof data.createdAt === 'string') {
			data.createdAt = new Date(data.createdAt);
		}
		return data;
	}

	_getNeededStoresForWhere<W extends Prisma.Args<Prisma.TodoDelegate, 'findMany'>['where']>(
		whereClause: W,
		neededStores: Set<StoreNames<PrismaIDBSchema>>
	) {
		if (whereClause === undefined) return;
		for (const param of IDBUtils.LogicalParams) {
			if (whereClause[param]) {
				for (const clause of IDBUtils.convertToArray(whereClause[param])) {
					this._getNeededStoresForWhere(clause, neededStores);
				}
			}
		}
	}

	_getNeededStoresForFind<Q extends Prisma.Args<Prisma.TodoDelegate, 'findMany'>>(
		query?: Q
	): Set<StoreNames<PrismaIDBSchema>> {
		const neededStores: Set<StoreNames<PrismaIDBSchema>> = new Set();
		neededStores.add('Todo');
		this._getNeededStoresForWhere(query?.where, neededStores);
		if (query?.orderBy) {
			const orderBy = IDBUtils.convertToArray(query.orderBy);
		}
		return neededStores;
	}

	_getNeededStoresForCreate<D extends Partial<Prisma.Args<Prisma.TodoDelegate, 'create'>['data']>>(
		data: D
	): Set<StoreNames<PrismaIDBSchema>> {
		const neededStores: Set<StoreNames<PrismaIDBSchema>> = new Set();
		neededStores.add('Todo');
		return neededStores;
	}

	_getNeededStoresForUpdate<Q extends Prisma.Args<Prisma.TodoDelegate, 'update'>>(
		query: Partial<Q>
	): Set<StoreNames<PrismaIDBSchema>> {
		const neededStores = this._getNeededStoresForFind(query).union(
			this._getNeededStoresForCreate(
				query.data as Prisma.Args<Prisma.TodoDelegate, 'create'>['data']
			)
		);
		return neededStores;
	}

	_getNeededStoresForNestedDelete(neededStores: Set<StoreNames<PrismaIDBSchema>>): void {
		neededStores.add('Todo');
	}

	private _removeNestedCreateData<D extends Prisma.Args<Prisma.TodoDelegate, 'create'>['data']>(
		data: D
	): Prisma.Result<Prisma.TodoDelegate, object, 'findFirstOrThrow'> {
		const recordWithoutNestedCreate = structuredClone(data);
		return recordWithoutNestedCreate as Prisma.Result<
			Prisma.TodoDelegate,
			object,
			'findFirstOrThrow'
		>;
	}

	private _preprocessListFields(
		records: Prisma.Result<Prisma.TodoDelegate, object, 'findMany'>
	): void {}

	async findMany<Q extends Prisma.Args<Prisma.TodoDelegate, 'findMany'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'findMany'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		const records = await this._applyWhereClause(
			await tx.objectStore('Todo').getAll(),
			query?.where,
			tx
		);
		await this._applyOrderByClause(records, query?.orderBy, tx);
		const relationAppliedRecords = (await this._applyRelations(
			records,
			tx,
			query
		)) as Prisma.Result<Prisma.TodoDelegate, object, 'findFirstOrThrow'>[];
		const selectClause = query?.select;
		const selectAppliedRecords = this._applySelectClause(relationAppliedRecords, selectClause);
		this._preprocessListFields(selectAppliedRecords);
		return selectAppliedRecords as Prisma.Result<Prisma.TodoDelegate, Q, 'findMany'>;
	}

	async findFirst<Q extends Prisma.Args<Prisma.TodoDelegate, 'findFirst'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'findFirst'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		return (await this.findMany(query, tx))[0] ?? null;
	}

	async findFirstOrThrow<Q extends Prisma.Args<Prisma.TodoDelegate, 'findFirstOrThrow'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'findFirstOrThrow'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		const record = await this.findFirst(query, tx);
		if (!record) {
			tx.abort();
			throw new Error('Record not found');
		}
		return record;
	}

	async findUnique<Q extends Prisma.Args<Prisma.TodoDelegate, 'findUnique'>>(
		query: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'findUnique'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		let record;
		if (query.where.id !== undefined) {
			record = await tx.objectStore('Todo').get([query.where.id]);
		}
		if (!record) return null;

		const recordWithRelations = this._applySelectClause(
			await this._applyRelations(
				await this._applyWhereClause([record], query.where, tx),
				tx,
				query
			),
			query.select
		)[0];
		this._preprocessListFields([recordWithRelations]);
		return recordWithRelations as Prisma.Result<Prisma.TodoDelegate, Q, 'findUnique'>;
	}

	async findUniqueOrThrow<Q extends Prisma.Args<Prisma.TodoDelegate, 'findUniqueOrThrow'>>(
		query: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'findUniqueOrThrow'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		const record = await this.findUnique(query, tx);
		if (!record) {
			tx.abort();
			throw new Error('Record not found');
		}
		return record;
	}

	async count<Q extends Prisma.Args<Prisma.TodoDelegate, 'count'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'count'>> {
		tx = tx ?? this.client._db.transaction(['Todo'], 'readonly');
		if (!query?.select || query.select === true) {
			const records = await this.findMany({ where: query?.where }, tx);
			return records.length as Prisma.Result<Prisma.TodoDelegate, Q, 'count'>;
		}
		const result: Partial<Record<keyof Prisma.TodoCountAggregateInputType, number>> = {};
		for (const key of Object.keys(query.select)) {
			const typedKey = key as keyof typeof query.select;
			if (typedKey === '_all') {
				result[typedKey] = (await this.findMany({ where: query.where }, tx)).length;
				continue;
			}
			result[typedKey] = (
				await this.findMany({ where: { [`${typedKey}`]: { not: null } } }, tx)
			).length;
		}
		return result as Prisma.Result<Prisma.TodoDelegate, Q, 'count'>;
	}

	async create<Q extends Prisma.Args<Prisma.TodoDelegate, 'create'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'create'>> {
		const storesNeeded = this._getNeededStoresForCreate(query.data);
		tx = tx ?? this.client._db.transaction(Array.from(storesNeeded), 'readwrite');
		const record = this._removeNestedCreateData(await this._fillDefaults(query.data, tx));
		const keyPath = await tx.objectStore('Todo').add(record);
		const data = (await tx.objectStore('Todo').get(keyPath))!;
		const recordsWithRelations = this._applySelectClause(
			await this._applyRelations<object>([data], tx, query),
			query.select
		)[0];
		this._preprocessListFields([recordsWithRelations]);
		this.emit('create', keyPath);
		return recordsWithRelations as Prisma.Result<Prisma.TodoDelegate, Q, 'create'>;
	}

	async createMany<Q extends Prisma.Args<Prisma.TodoDelegate, 'createMany'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'createMany'>> {
		const createManyData = IDBUtils.convertToArray(query.data);
		tx = tx ?? this.client._db.transaction(['Todo'], 'readwrite');
		for (const createData of createManyData) {
			const record = this._removeNestedCreateData(await this._fillDefaults(createData, tx));
			const keyPath = await tx.objectStore('Todo').add(record);
			this.emit('create', keyPath);
		}
		return { count: createManyData.length };
	}

	async createManyAndReturn<Q extends Prisma.Args<Prisma.TodoDelegate, 'createManyAndReturn'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'createManyAndReturn'>> {
		const createManyData = IDBUtils.convertToArray(query.data);
		const records: Prisma.Result<Prisma.TodoDelegate, object, 'findMany'> = [];
		tx = tx ?? this.client._db.transaction(['Todo'], 'readwrite');
		for (const createData of createManyData) {
			const record = this._removeNestedCreateData(await this._fillDefaults(createData, tx));
			const keyPath = await tx.objectStore('Todo').add(record);
			this.emit('create', keyPath);
			records.push(this._applySelectClause([record], query.select)[0]);
		}
		this._preprocessListFields(records);
		return records as Prisma.Result<Prisma.TodoDelegate, Q, 'createManyAndReturn'>;
	}

	async delete<Q extends Prisma.Args<Prisma.TodoDelegate, 'delete'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'delete'>> {
		const storesNeeded = this._getNeededStoresForFind(query);
		this._getNeededStoresForNestedDelete(storesNeeded);
		tx = tx ?? this.client._db.transaction(Array.from(storesNeeded), 'readwrite');
		const record = await this.findUnique(query, tx);
		if (!record) throw new Error('Record not found');
		await tx.objectStore('Todo').delete([record.id]);
		this.emit('delete', [record.id]);
		return record;
	}

	async deleteMany<Q extends Prisma.Args<Prisma.TodoDelegate, 'deleteMany'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'deleteMany'>> {
		const storesNeeded = this._getNeededStoresForFind(query);
		this._getNeededStoresForNestedDelete(storesNeeded);
		tx = tx ?? this.client._db.transaction(Array.from(storesNeeded), 'readwrite');
		const records = await this.findMany(query, tx);
		for (const record of records) {
			await this.delete({ where: { id: record.id } }, tx);
		}
		return { count: records.length };
	}

	async update<Q extends Prisma.Args<Prisma.TodoDelegate, 'update'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'update'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForUpdate(query)), 'readwrite');
		const record = await this.findUnique({ where: query.where }, tx);
		if (record === null) {
			tx.abort();
			throw new Error('Record not found');
		}
		const startKeyPath: PrismaIDBSchema['Todo']['key'] = [record.id];
		const stringFields = ['title'] as const;
		for (const field of stringFields) {
			IDBUtils.handleStringUpdateField(record, field, query.data[field]);
		}
		const dateTimeFields = ['createdAt'] as const;
		for (const field of dateTimeFields) {
			IDBUtils.handleDateTimeUpdateField(record, field, query.data[field]);
		}
		const booleanFields = ['completed'] as const;
		for (const field of booleanFields) {
			IDBUtils.handleBooleanUpdateField(record, field, query.data[field]);
		}
		const intFields = ['id'] as const;
		for (const field of intFields) {
			IDBUtils.handleIntUpdateField(record, field, query.data[field]);
		}
		const endKeyPath: PrismaIDBSchema['Todo']['key'] = [record.id];
		for (let i = 0; i < startKeyPath.length; i++) {
			if (startKeyPath[i] !== endKeyPath[i]) {
				await tx.objectStore('Todo').delete(startKeyPath);
				break;
			}
		}
		const keyPath = await tx.objectStore('Todo').put(record);
		this.emit('update', keyPath, startKeyPath);
		for (let i = 0; i < startKeyPath.length; i++) {
			if (startKeyPath[i] !== endKeyPath[i]) {
				break;
			}
		}
		const recordWithRelations = (await this.findUnique(
			{
				where: { id: keyPath[0] }
			},
			tx
		))!;
		return recordWithRelations as Prisma.Result<Prisma.TodoDelegate, Q, 'update'>;
	}

	async updateMany<Q extends Prisma.Args<Prisma.TodoDelegate, 'updateMany'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'updateMany'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readwrite');
		const records = await this.findMany({ where: query.where }, tx);
		await Promise.all(
			records.map(async (record) => {
				await this.update({ where: { id: record.id }, data: query.data }, tx);
			})
		);
		return { count: records.length };
	}

	async upsert<Q extends Prisma.Args<Prisma.TodoDelegate, 'upsert'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TodoDelegate, Q, 'upsert'>> {
		const neededStores = this._getNeededStoresForUpdate({
			...query,
			data: { ...query.update, ...query.create } as Prisma.Args<
				Prisma.TodoDelegate,
				'update'
			>['data']
		});
		tx = tx ?? this.client._db.transaction(Array.from(neededStores), 'readwrite');
		let record = await this.findUnique({ where: query.where }, tx);
		if (!record) record = await this.create({ data: query.create }, tx);
		else record = await this.update({ where: query.where, data: query.update }, tx);
		record = await this.findUniqueOrThrow({ where: { id: record.id }, select: query.select }, tx);
		return record as Prisma.Result<Prisma.TodoDelegate, Q, 'upsert'>;
	}
}
