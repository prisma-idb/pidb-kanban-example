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

	board!: BoardIDBClass;
	task!: TaskIDBClass;

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
				db.createObjectStore('Board', { keyPath: ['name'] });
				db.createObjectStore('Task', { keyPath: ['id'] });
			}
		});
		this.board = new BoardIDBClass(this, ['name']);
		this.task = new TaskIDBClass(this, ['id']);
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

class BoardIDBClass extends BaseIDBModelClass<'Board'> {
	private async _applyWhereClause<
		W extends Prisma.Args<Prisma.BoardDelegate, 'findFirstOrThrow'>['where'],
		R extends Prisma.Result<Prisma.BoardDelegate, object, 'findFirstOrThrow'>
	>(records: R[], whereClause: W, tx: IDBUtils.TransactionType): Promise<R[]> {
		if (!whereClause) return records;
		records = await IDBUtils.applyLogicalFilters<Prisma.BoardDelegate, R, W>(
			records,
			whereClause,
			tx,
			this.keyPath,
			this._applyWhereClause.bind(this)
		);
		return (
			await Promise.all(
				records.map(async (record) => {
					const stringFields = ['name'] as const;
					for (const field of stringFields) {
						if (!IDBUtils.whereStringFilter(record, field, whereClause[field])) return null;
					}
					if (whereClause.tasks) {
						if (whereClause.tasks.every) {
							const violatingRecord = await this.client.task.findFirst({
								where: { NOT: { ...whereClause.tasks.every }, boardName: record.name },
								tx
							});
							if (violatingRecord !== null) return null;
						}
						if (whereClause.tasks.some) {
							const relatedRecords = await this.client.task.findMany({
								where: { ...whereClause.tasks.some, boardName: record.name },
								tx
							});
							if (relatedRecords.length === 0) return null;
						}
						if (whereClause.tasks.none) {
							const violatingRecord = await this.client.task.findFirst({
								where: { ...whereClause.tasks.none, boardName: record.name },
								tx
							});
							if (violatingRecord !== null) return null;
						}
					}
					return record;
				})
			)
		).filter((result) => result !== null);
	}

	private _applySelectClause<S extends Prisma.Args<Prisma.BoardDelegate, 'findMany'>['select']>(
		records: Prisma.Result<Prisma.BoardDelegate, object, 'findFirstOrThrow'>[],
		selectClause: S
	): Prisma.Result<Prisma.BoardDelegate, { select: S }, 'findFirstOrThrow'>[] {
		if (!selectClause) {
			return records as Prisma.Result<Prisma.BoardDelegate, { select: S }, 'findFirstOrThrow'>[];
		}
		return records.map((record) => {
			const partialRecord: Partial<typeof record> = record;
			for (const untypedKey of ['name', 'tasks']) {
				const key = untypedKey as keyof typeof record & keyof S;
				if (!selectClause[key]) delete partialRecord[key];
			}
			return partialRecord;
		}) as Prisma.Result<Prisma.BoardDelegate, { select: S }, 'findFirstOrThrow'>[];
	}

	private async _applyRelations<Q extends Prisma.Args<Prisma.BoardDelegate, 'findMany'>>(
		records: Prisma.Result<Prisma.BoardDelegate, object, 'findFirstOrThrow'>[],
		tx: IDBUtils.TransactionType,
		query?: Q
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'findFirstOrThrow'>[]> {
		if (!query) return records as Prisma.Result<Prisma.BoardDelegate, Q, 'findFirstOrThrow'>[];
		const recordsWithRelations = records.map(async (record) => {
			const unsafeRecord = record as Record<string, unknown>;
			const attach_tasks = query.select?.tasks || query.include?.tasks;
			if (attach_tasks) {
				unsafeRecord['tasks'] = await this.client.task.findMany(
					{
						...(attach_tasks === true ? {} : attach_tasks),
						where: { boardName: record.name }
					},
					tx
				);
			}
			return unsafeRecord;
		});
		return (await Promise.all(recordsWithRelations)) as Prisma.Result<
			Prisma.BoardDelegate,
			Q,
			'findFirstOrThrow'
		>[];
	}

	async _applyOrderByClause<
		O extends Prisma.Args<Prisma.BoardDelegate, 'findMany'>['orderBy'],
		R extends Prisma.Result<Prisma.BoardDelegate, object, 'findFirstOrThrow'>
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
		record: Prisma.Result<Prisma.BoardDelegate, object, 'findFirstOrThrow'>,
		orderByInput: Prisma.BoardOrderByWithRelationInput,
		tx: IDBUtils.TransactionType
	): Promise<unknown> {
		const scalarFields = ['name'] as const;
		for (const field of scalarFields) if (orderByInput[field]) return record[field];
		if (orderByInput.tasks) {
			return await this.client.task.count({ where: { boardName: record.name } }, tx);
		}
	}

	_resolveSortOrder(
		orderByInput: Prisma.BoardOrderByWithRelationInput
	): Prisma.SortOrder | { sort: Prisma.SortOrder; nulls?: 'first' | 'last' } {
		const scalarFields = ['name'] as const;
		for (const field of scalarFields) if (orderByInput[field]) return orderByInput[field];
		if (orderByInput.tasks?._count) {
			return orderByInput.tasks._count;
		}
		throw new Error('No field in orderBy clause');
	}

	private async _fillDefaults<D extends Prisma.Args<Prisma.BoardDelegate, 'create'>['data']>(
		data: D,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<D> {
		if (data === undefined) data = {} as NonNullable<D>;
		return data;
	}

	_getNeededStoresForWhere<W extends Prisma.Args<Prisma.BoardDelegate, 'findMany'>['where']>(
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
		if (whereClause.tasks) {
			neededStores.add('Task');
			this.client.task._getNeededStoresForWhere(whereClause.tasks.every, neededStores);
			this.client.task._getNeededStoresForWhere(whereClause.tasks.some, neededStores);
			this.client.task._getNeededStoresForWhere(whereClause.tasks.none, neededStores);
		}
	}

	_getNeededStoresForFind<Q extends Prisma.Args<Prisma.BoardDelegate, 'findMany'>>(
		query?: Q
	): Set<StoreNames<PrismaIDBSchema>> {
		const neededStores: Set<StoreNames<PrismaIDBSchema>> = new Set();
		neededStores.add('Board');
		this._getNeededStoresForWhere(query?.where, neededStores);
		if (query?.orderBy) {
			const orderBy = IDBUtils.convertToArray(query.orderBy);
			const orderBy_tasks = orderBy.find((clause) => clause.tasks);
			if (orderBy_tasks) {
				neededStores.add('Task');
			}
		}
		if (query?.select?.tasks || query?.include?.tasks) {
			neededStores.add('Task');
			if (typeof query.select?.tasks === 'object') {
				this.client.task
					._getNeededStoresForFind(query.select.tasks)
					.forEach((storeName) => neededStores.add(storeName));
			}
			if (typeof query.include?.tasks === 'object') {
				this.client.task
					._getNeededStoresForFind(query.include.tasks)
					.forEach((storeName) => neededStores.add(storeName));
			}
		}
		return neededStores;
	}

	_getNeededStoresForCreate<D extends Partial<Prisma.Args<Prisma.BoardDelegate, 'create'>['data']>>(
		data: D
	): Set<StoreNames<PrismaIDBSchema>> {
		const neededStores: Set<StoreNames<PrismaIDBSchema>> = new Set();
		neededStores.add('Board');
		if (data?.tasks) {
			neededStores.add('Task');
			if (data.tasks.create) {
				const createData = Array.isArray(data.tasks.create)
					? data.tasks.create
					: [data.tasks.create];
				createData.forEach((record) =>
					this.client.task
						._getNeededStoresForCreate(record)
						.forEach((storeName) => neededStores.add(storeName))
				);
			}
			if (data.tasks.connectOrCreate) {
				IDBUtils.convertToArray(data.tasks.connectOrCreate).forEach((record) =>
					this.client.task
						._getNeededStoresForCreate(record.create)
						.forEach((storeName) => neededStores.add(storeName))
				);
			}
			if (data.tasks.createMany) {
				IDBUtils.convertToArray(data.tasks.createMany.data).forEach((record) =>
					this.client.task
						._getNeededStoresForCreate(record)
						.forEach((storeName) => neededStores.add(storeName))
				);
			}
		}
		return neededStores;
	}

	_getNeededStoresForUpdate<Q extends Prisma.Args<Prisma.BoardDelegate, 'update'>>(
		query: Partial<Q>
	): Set<StoreNames<PrismaIDBSchema>> {
		const neededStores = this._getNeededStoresForFind(query).union(
			this._getNeededStoresForCreate(
				query.data as Prisma.Args<Prisma.BoardDelegate, 'create'>['data']
			)
		);
		if (query.data?.tasks?.connect) {
			neededStores.add('Task');
			IDBUtils.convertToArray(query.data.tasks.connect).forEach((connect) => {
				this.client.task._getNeededStoresForWhere(connect, neededStores);
			});
		}
		if (query.data?.tasks?.set) {
			neededStores.add('Task');
			IDBUtils.convertToArray(query.data.tasks.set).forEach((setWhere) => {
				this.client.task._getNeededStoresForWhere(setWhere, neededStores);
			});
		}
		if (query.data?.tasks?.updateMany) {
			neededStores.add('Task');
			IDBUtils.convertToArray(query.data.tasks.updateMany).forEach((update) => {
				this.client.task
					._getNeededStoresForUpdate(update as Prisma.Args<Prisma.TaskDelegate, 'update'>)
					.forEach((store) => neededStores.add(store));
			});
		}
		if (query.data?.tasks?.update) {
			neededStores.add('Task');
			IDBUtils.convertToArray(query.data.tasks.update).forEach((update) => {
				this.client.task
					._getNeededStoresForUpdate(update as Prisma.Args<Prisma.TaskDelegate, 'update'>)
					.forEach((store) => neededStores.add(store));
			});
		}
		if (query.data?.tasks?.upsert) {
			neededStores.add('Task');
			IDBUtils.convertToArray(query.data.tasks.upsert).forEach((upsert) => {
				const update = {
					where: upsert.where,
					data: { ...upsert.update, ...upsert.create }
				} as Prisma.Args<Prisma.TaskDelegate, 'update'>;
				this.client.task
					._getNeededStoresForUpdate(update)
					.forEach((store) => neededStores.add(store));
			});
		}
		if (query.data?.tasks?.delete || query.data?.tasks?.deleteMany) {
			this.client.task._getNeededStoresForNestedDelete(neededStores);
		}
		if (query.data?.name !== undefined) {
			neededStores.add('Task');
		}
		return neededStores;
	}

	_getNeededStoresForNestedDelete(neededStores: Set<StoreNames<PrismaIDBSchema>>): void {
		neededStores.add('Board');
		this.client.task._getNeededStoresForNestedDelete(neededStores);
	}

	private _removeNestedCreateData<D extends Prisma.Args<Prisma.BoardDelegate, 'create'>['data']>(
		data: D
	): Prisma.Result<Prisma.BoardDelegate, object, 'findFirstOrThrow'> {
		const recordWithoutNestedCreate = structuredClone(data);
		delete recordWithoutNestedCreate?.tasks;
		return recordWithoutNestedCreate as Prisma.Result<
			Prisma.BoardDelegate,
			object,
			'findFirstOrThrow'
		>;
	}

	private _preprocessListFields(
		records: Prisma.Result<Prisma.BoardDelegate, object, 'findMany'>
	): void {}

	async findMany<Q extends Prisma.Args<Prisma.BoardDelegate, 'findMany'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'findMany'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		const records = await this._applyWhereClause(
			await tx.objectStore('Board').getAll(),
			query?.where,
			tx
		);
		await this._applyOrderByClause(records, query?.orderBy, tx);
		const relationAppliedRecords = (await this._applyRelations(
			records,
			tx,
			query
		)) as Prisma.Result<Prisma.BoardDelegate, object, 'findFirstOrThrow'>[];
		const selectClause = query?.select;
		const selectAppliedRecords = this._applySelectClause(relationAppliedRecords, selectClause);
		this._preprocessListFields(selectAppliedRecords);
		return selectAppliedRecords as Prisma.Result<Prisma.BoardDelegate, Q, 'findMany'>;
	}

	async findFirst<Q extends Prisma.Args<Prisma.BoardDelegate, 'findFirst'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'findFirst'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		return (await this.findMany(query, tx))[0] ?? null;
	}

	async findFirstOrThrow<Q extends Prisma.Args<Prisma.BoardDelegate, 'findFirstOrThrow'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'findFirstOrThrow'>> {
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

	async findUnique<Q extends Prisma.Args<Prisma.BoardDelegate, 'findUnique'>>(
		query: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'findUnique'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		let record;
		if (query.where.name !== undefined) {
			record = await tx.objectStore('Board').get([query.where.name]);
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
		return recordWithRelations as Prisma.Result<Prisma.BoardDelegate, Q, 'findUnique'>;
	}

	async findUniqueOrThrow<Q extends Prisma.Args<Prisma.BoardDelegate, 'findUniqueOrThrow'>>(
		query: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'findUniqueOrThrow'>> {
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

	async count<Q extends Prisma.Args<Prisma.BoardDelegate, 'count'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'count'>> {
		tx = tx ?? this.client._db.transaction(['Board'], 'readonly');
		if (!query?.select || query.select === true) {
			const records = await this.findMany({ where: query?.where }, tx);
			return records.length as Prisma.Result<Prisma.BoardDelegate, Q, 'count'>;
		}
		const result: Partial<Record<keyof Prisma.BoardCountAggregateInputType, number>> = {};
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
		return result as Prisma.Result<Prisma.BoardDelegate, Q, 'count'>;
	}

	async create<Q extends Prisma.Args<Prisma.BoardDelegate, 'create'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'create'>> {
		const storesNeeded = this._getNeededStoresForCreate(query.data);
		tx = tx ?? this.client._db.transaction(Array.from(storesNeeded), 'readwrite');
		const record = this._removeNestedCreateData(await this._fillDefaults(query.data, tx));
		const keyPath = await tx.objectStore('Board').add(record);
		if (query.data?.tasks?.create) {
			for (const elem of IDBUtils.convertToArray(query.data.tasks.create)) {
				await this.client.task.create(
					{
						data: { ...elem, board: { connect: { name: keyPath[0] } } } as Prisma.Args<
							Prisma.TaskDelegate,
							'create'
						>['data']
					},
					tx
				);
			}
		}
		if (query.data?.tasks?.connect) {
			await Promise.all(
				IDBUtils.convertToArray(query.data.tasks.connect).map(async (connectWhere) => {
					await this.client.task.update(
						{ where: connectWhere, data: { boardName: keyPath[0] } },
						tx
					);
				})
			);
		}
		if (query.data?.tasks?.connectOrCreate) {
			await Promise.all(
				IDBUtils.convertToArray(query.data.tasks.connectOrCreate).map(async (connectOrCreate) => {
					await this.client.task.upsert(
						{
							where: connectOrCreate.where,
							create: { ...connectOrCreate.create, boardName: keyPath[0] } as Prisma.Args<
								Prisma.TaskDelegate,
								'create'
							>['data'],
							update: { boardName: keyPath[0] }
						},
						tx
					);
				})
			);
		}
		if (query.data?.tasks?.createMany) {
			await this.client.task.createMany(
				{
					data: IDBUtils.convertToArray(query.data.tasks.createMany.data).map((createData) => ({
						...createData,
						boardName: keyPath[0]
					}))
				},
				tx
			);
		}
		const data = (await tx.objectStore('Board').get(keyPath))!;
		const recordsWithRelations = this._applySelectClause(
			await this._applyRelations<object>([data], tx, query),
			query.select
		)[0];
		this._preprocessListFields([recordsWithRelations]);
		this.emit('create', keyPath);
		return recordsWithRelations as Prisma.Result<Prisma.BoardDelegate, Q, 'create'>;
	}

	async createMany<Q extends Prisma.Args<Prisma.BoardDelegate, 'createMany'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'createMany'>> {
		const createManyData = IDBUtils.convertToArray(query.data);
		tx = tx ?? this.client._db.transaction(['Board'], 'readwrite');
		for (const createData of createManyData) {
			const record = this._removeNestedCreateData(await this._fillDefaults(createData, tx));
			const keyPath = await tx.objectStore('Board').add(record);
			this.emit('create', keyPath);
		}
		return { count: createManyData.length };
	}

	async createManyAndReturn<Q extends Prisma.Args<Prisma.BoardDelegate, 'createManyAndReturn'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'createManyAndReturn'>> {
		const createManyData = IDBUtils.convertToArray(query.data);
		const records: Prisma.Result<Prisma.BoardDelegate, object, 'findMany'> = [];
		tx = tx ?? this.client._db.transaction(['Board'], 'readwrite');
		for (const createData of createManyData) {
			const record = this._removeNestedCreateData(await this._fillDefaults(createData, tx));
			const keyPath = await tx.objectStore('Board').add(record);
			this.emit('create', keyPath);
			records.push(this._applySelectClause([record], query.select)[0]);
		}
		this._preprocessListFields(records);
		return records as Prisma.Result<Prisma.BoardDelegate, Q, 'createManyAndReturn'>;
	}

	async delete<Q extends Prisma.Args<Prisma.BoardDelegate, 'delete'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'delete'>> {
		const storesNeeded = this._getNeededStoresForFind(query);
		this._getNeededStoresForNestedDelete(storesNeeded);
		tx = tx ?? this.client._db.transaction(Array.from(storesNeeded), 'readwrite');
		const record = await this.findUnique(query, tx);
		if (!record) throw new Error('Record not found');
		await this.client.task.deleteMany(
			{
				where: { boardName: record.name }
			},
			tx
		);
		await tx.objectStore('Board').delete([record.name]);
		this.emit('delete', [record.name]);
		return record;
	}

	async deleteMany<Q extends Prisma.Args<Prisma.BoardDelegate, 'deleteMany'>>(
		query?: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'deleteMany'>> {
		const storesNeeded = this._getNeededStoresForFind(query);
		this._getNeededStoresForNestedDelete(storesNeeded);
		tx = tx ?? this.client._db.transaction(Array.from(storesNeeded), 'readwrite');
		const records = await this.findMany(query, tx);
		for (const record of records) {
			await this.delete({ where: { name: record.name } }, tx);
		}
		return { count: records.length };
	}

	async update<Q extends Prisma.Args<Prisma.BoardDelegate, 'update'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'update'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForUpdate(query)), 'readwrite');
		const record = await this.findUnique({ where: query.where }, tx);
		if (record === null) {
			tx.abort();
			throw new Error('Record not found');
		}
		const startKeyPath: PrismaIDBSchema['Board']['key'] = [record.name];
		const stringFields = ['name'] as const;
		for (const field of stringFields) {
			IDBUtils.handleStringUpdateField(record, field, query.data[field]);
		}
		if (query.data.tasks) {
			if (query.data.tasks.connect) {
				await Promise.all(
					IDBUtils.convertToArray(query.data.tasks.connect).map(async (connectWhere) => {
						await this.client.task.update(
							{ where: connectWhere, data: { boardName: record.name } },
							tx
						);
					})
				);
			}
			if (query.data.tasks.disconnect) {
				throw new Error('Cannot disconnect required relation');
			}
			if (query.data.tasks.create) {
				const createData = Array.isArray(query.data.tasks.create)
					? query.data.tasks.create
					: [query.data.tasks.create];
				for (const elem of createData) {
					await this.client.task.create(
						{
							data: { ...elem, boardName: record.name } as Prisma.Args<
								Prisma.TaskDelegate,
								'create'
							>['data']
						},
						tx
					);
				}
			}
			if (query.data.tasks.createMany) {
				await Promise.all(
					IDBUtils.convertToArray(query.data.tasks.createMany.data).map(async (createData) => {
						await this.client.task.create({ data: { ...createData, boardName: record.name } }, tx);
					})
				);
			}
			if (query.data.tasks.update) {
				await Promise.all(
					IDBUtils.convertToArray(query.data.tasks.update).map(async (updateData) => {
						await this.client.task.update(updateData, tx);
					})
				);
			}
			if (query.data.tasks.updateMany) {
				await Promise.all(
					IDBUtils.convertToArray(query.data.tasks.updateMany).map(async (updateData) => {
						await this.client.task.updateMany(updateData, tx);
					})
				);
			}
			if (query.data.tasks.upsert) {
				await Promise.all(
					IDBUtils.convertToArray(query.data.tasks.upsert).map(async (upsertData) => {
						await this.client.task.upsert(
							{
								...upsertData,
								where: { ...upsertData.where, boardName: record.name },
								create: { ...upsertData.create, boardName: record.name } as Prisma.Args<
									Prisma.TaskDelegate,
									'upsert'
								>['create']
							},
							tx
						);
					})
				);
			}
			if (query.data.tasks.delete) {
				await Promise.all(
					IDBUtils.convertToArray(query.data.tasks.delete).map(async (deleteData) => {
						await this.client.task.delete({ where: { ...deleteData, boardName: record.name } }, tx);
					})
				);
			}
			if (query.data.tasks.deleteMany) {
				await Promise.all(
					IDBUtils.convertToArray(query.data.tasks.deleteMany).map(async (deleteData) => {
						await this.client.task.deleteMany(
							{ where: { ...deleteData, boardName: record.name } },
							tx
						);
					})
				);
			}
			if (query.data.tasks.set) {
				const existing = await this.client.task.findMany({ where: { boardName: record.name } }, tx);
				if (existing.length > 0) {
					throw new Error('Cannot set required relation');
				}
				await Promise.all(
					IDBUtils.convertToArray(query.data.tasks.set).map(async (setData) => {
						await this.client.task.update({ where: setData, data: { boardName: record.name } }, tx);
					})
				);
			}
		}
		const endKeyPath: PrismaIDBSchema['Board']['key'] = [record.name];
		for (let i = 0; i < startKeyPath.length; i++) {
			if (startKeyPath[i] !== endKeyPath[i]) {
				await tx.objectStore('Board').delete(startKeyPath);
				break;
			}
		}
		const keyPath = await tx.objectStore('Board').put(record);
		this.emit('update', keyPath, startKeyPath);
		for (let i = 0; i < startKeyPath.length; i++) {
			if (startKeyPath[i] !== endKeyPath[i]) {
				await this.client.task.updateMany(
					{
						where: { boardName: startKeyPath[0] },
						data: { boardName: endKeyPath[0] }
					},
					tx
				);
				break;
			}
		}
		const recordWithRelations = (await this.findUnique(
			{
				where: { name: keyPath[0] }
			},
			tx
		))!;
		return recordWithRelations as Prisma.Result<Prisma.BoardDelegate, Q, 'update'>;
	}

	async updateMany<Q extends Prisma.Args<Prisma.BoardDelegate, 'updateMany'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'updateMany'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readwrite');
		const records = await this.findMany({ where: query.where }, tx);
		await Promise.all(
			records.map(async (record) => {
				await this.update({ where: { name: record.name }, data: query.data }, tx);
			})
		);
		return { count: records.length };
	}

	async upsert<Q extends Prisma.Args<Prisma.BoardDelegate, 'upsert'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.BoardDelegate, Q, 'upsert'>> {
		const neededStores = this._getNeededStoresForUpdate({
			...query,
			data: { ...query.update, ...query.create } as Prisma.Args<
				Prisma.BoardDelegate,
				'update'
			>['data']
		});
		tx = tx ?? this.client._db.transaction(Array.from(neededStores), 'readwrite');
		let record = await this.findUnique({ where: query.where }, tx);
		if (!record) record = await this.create({ data: query.create }, tx);
		else record = await this.update({ where: query.where, data: query.update }, tx);
		record = await this.findUniqueOrThrow(
			{ where: { name: record.name }, select: query.select, include: query.include },
			tx
		);
		return record as Prisma.Result<Prisma.BoardDelegate, Q, 'upsert'>;
	}
}

class TaskIDBClass extends BaseIDBModelClass<'Task'> {
	private async _applyWhereClause<
		W extends Prisma.Args<Prisma.TaskDelegate, 'findFirstOrThrow'>['where'],
		R extends Prisma.Result<Prisma.TaskDelegate, object, 'findFirstOrThrow'>
	>(records: R[], whereClause: W, tx: IDBUtils.TransactionType): Promise<R[]> {
		if (!whereClause) return records;
		records = await IDBUtils.applyLogicalFilters<Prisma.TaskDelegate, R, W>(
			records,
			whereClause,
			tx,
			this.keyPath,
			this._applyWhereClause.bind(this)
		);
		return (
			await Promise.all(
				records.map(async (record) => {
					const stringFields = ['title', 'description', 'boardName'] as const;
					for (const field of stringFields) {
						if (!IDBUtils.whereStringFilter(record, field, whereClause[field])) return null;
					}
					const numberFields = ['id'] as const;
					for (const field of numberFields) {
						if (!IDBUtils.whereNumberFilter(record, field, whereClause[field])) return null;
					}
					const booleanFields = ['isCompleted'] as const;
					for (const field of booleanFields) {
						if (!IDBUtils.whereBoolFilter(record, field, whereClause[field])) return null;
					}
					const bytesFields = ['image'] as const;
					for (const field of bytesFields) {
						if (!IDBUtils.whereBytesFilter(record, field, whereClause[field])) return null;
					}
					const dateTimeFields = ['createdAt'] as const;
					for (const field of dateTimeFields) {
						if (!IDBUtils.whereDateTimeFilter(record, field, whereClause[field])) return null;
					}
					if (whereClause.board) {
						const { is, isNot, ...rest } = whereClause.board;
						if (is !== null && is !== undefined) {
							const relatedRecord = await this.client.board.findFirst(
								{ where: { ...is, name: record.boardName } },
								tx
							);
							if (!relatedRecord) return null;
						}
						if (isNot !== null && isNot !== undefined) {
							const relatedRecord = await this.client.board.findFirst(
								{ where: { ...isNot, name: record.boardName } },
								tx
							);
							if (relatedRecord) return null;
						}
						if (Object.keys(rest).length) {
							const relatedRecord = await this.client.board.findFirst(
								{ where: { ...whereClause.board, name: record.boardName } },
								tx
							);
							if (!relatedRecord) return null;
						}
					}
					return record;
				})
			)
		).filter((result) => result !== null);
	}

	private _applySelectClause<S extends Prisma.Args<Prisma.TaskDelegate, 'findMany'>['select']>(
		records: Prisma.Result<Prisma.TaskDelegate, object, 'findFirstOrThrow'>[],
		selectClause: S
	): Prisma.Result<Prisma.TaskDelegate, { select: S }, 'findFirstOrThrow'>[] {
		if (!selectClause) {
			return records as Prisma.Result<Prisma.TaskDelegate, { select: S }, 'findFirstOrThrow'>[];
		}
		return records.map((record) => {
			const partialRecord: Partial<typeof record> = record;
			for (const untypedKey of [
				'id',
				'title',
				'description',
				'isCompleted',
				'createdAt',
				'image',
				'boardName',
				'board'
			]) {
				const key = untypedKey as keyof typeof record & keyof S;
				if (!selectClause[key]) delete partialRecord[key];
			}
			return partialRecord;
		}) as Prisma.Result<Prisma.TaskDelegate, { select: S }, 'findFirstOrThrow'>[];
	}

	private async _applyRelations<Q extends Prisma.Args<Prisma.TaskDelegate, 'findMany'>>(
		records: Prisma.Result<Prisma.TaskDelegate, object, 'findFirstOrThrow'>[],
		tx: IDBUtils.TransactionType,
		query?: Q
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'findFirstOrThrow'>[]> {
		if (!query) return records as Prisma.Result<Prisma.TaskDelegate, Q, 'findFirstOrThrow'>[];
		const recordsWithRelations = records.map(async (record) => {
			const unsafeRecord = record as Record<string, unknown>;
			const attach_board = query.select?.board || query.include?.board;
			if (attach_board) {
				unsafeRecord['board'] = await this.client.board.findUnique(
					{
						...(attach_board === true ? {} : attach_board),
						where: { name: record.boardName }
					},
					tx
				);
			}
			return unsafeRecord;
		});
		return (await Promise.all(recordsWithRelations)) as Prisma.Result<
			Prisma.TaskDelegate,
			Q,
			'findFirstOrThrow'
		>[];
	}

	async _applyOrderByClause<
		O extends Prisma.Args<Prisma.TaskDelegate, 'findMany'>['orderBy'],
		R extends Prisma.Result<Prisma.TaskDelegate, object, 'findFirstOrThrow'>
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
		record: Prisma.Result<Prisma.TaskDelegate, object, 'findFirstOrThrow'>,
		orderByInput: Prisma.TaskOrderByWithRelationInput,
		tx: IDBUtils.TransactionType
	): Promise<unknown> {
		const scalarFields = [
			'id',
			'title',
			'description',
			'isCompleted',
			'createdAt',
			'image',
			'boardName'
		] as const;
		for (const field of scalarFields) if (orderByInput[field]) return record[field];
		if (orderByInput.board) {
			return await this.client.board._resolveOrderByKey(
				await this.client.board.findFirstOrThrow({ where: { name: record.boardName } }),
				orderByInput.board,
				tx
			);
		}
	}

	_resolveSortOrder(
		orderByInput: Prisma.TaskOrderByWithRelationInput
	): Prisma.SortOrder | { sort: Prisma.SortOrder; nulls?: 'first' | 'last' } {
		const scalarFields = [
			'id',
			'title',
			'description',
			'isCompleted',
			'createdAt',
			'image',
			'boardName'
		] as const;
		for (const field of scalarFields) if (orderByInput[field]) return orderByInput[field];
		if (orderByInput.board) {
			return this.client.board._resolveSortOrder(orderByInput.board);
		}
		throw new Error('No field in orderBy clause');
	}

	private async _fillDefaults<D extends Prisma.Args<Prisma.TaskDelegate, 'create'>['data']>(
		data: D,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<D> {
		if (data === undefined) data = {} as NonNullable<D>;
		if (data.id === undefined) {
			const transaction = tx ?? this.client._db.transaction(['Task'], 'readwrite');
			const store = transaction.objectStore('Task');
			const cursor = await store.openCursor(null, 'prev');
			data.id = cursor ? Number(cursor.key) + 1 : 1;
		}
		if (data.description === undefined) {
			data.description = null;
		}
		if (data.isCompleted === undefined) {
			data.isCompleted = false;
		}
		if (data.createdAt === undefined) {
			data.createdAt = new Date();
		}
		if (data.image === undefined) {
			data.image = null;
		}
		if (typeof data.createdAt === 'string') {
			data.createdAt = new Date(data.createdAt);
		}
		return data;
	}

	_getNeededStoresForWhere<W extends Prisma.Args<Prisma.TaskDelegate, 'findMany'>['where']>(
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
		if (whereClause.board) {
			neededStores.add('Board');
			this.client.board._getNeededStoresForWhere(whereClause.board, neededStores);
		}
	}

	_getNeededStoresForFind<Q extends Prisma.Args<Prisma.TaskDelegate, 'findMany'>>(
		query?: Q
	): Set<StoreNames<PrismaIDBSchema>> {
		const neededStores: Set<StoreNames<PrismaIDBSchema>> = new Set();
		neededStores.add('Task');
		this._getNeededStoresForWhere(query?.where, neededStores);
		if (query?.orderBy) {
			const orderBy = IDBUtils.convertToArray(query.orderBy);
			const orderBy_board = orderBy.find((clause) => clause.board);
			if (orderBy_board) {
				this.client.board
					._getNeededStoresForFind({ orderBy: orderBy_board.board })
					.forEach((storeName) => neededStores.add(storeName));
			}
		}
		if (query?.select?.board || query?.include?.board) {
			neededStores.add('Board');
			if (typeof query.select?.board === 'object') {
				this.client.board
					._getNeededStoresForFind(query.select.board)
					.forEach((storeName) => neededStores.add(storeName));
			}
			if (typeof query.include?.board === 'object') {
				this.client.board
					._getNeededStoresForFind(query.include.board)
					.forEach((storeName) => neededStores.add(storeName));
			}
		}
		return neededStores;
	}

	_getNeededStoresForCreate<D extends Partial<Prisma.Args<Prisma.TaskDelegate, 'create'>['data']>>(
		data: D
	): Set<StoreNames<PrismaIDBSchema>> {
		const neededStores: Set<StoreNames<PrismaIDBSchema>> = new Set();
		neededStores.add('Task');
		if (data?.board) {
			neededStores.add('Board');
			if (data.board.create) {
				const createData = Array.isArray(data.board.create)
					? data.board.create
					: [data.board.create];
				createData.forEach((record) =>
					this.client.board
						._getNeededStoresForCreate(record)
						.forEach((storeName) => neededStores.add(storeName))
				);
			}
			if (data.board.connectOrCreate) {
				IDBUtils.convertToArray(data.board.connectOrCreate).forEach((record) =>
					this.client.board
						._getNeededStoresForCreate(record.create)
						.forEach((storeName) => neededStores.add(storeName))
				);
			}
		}
		if (data.boardName !== undefined) {
			neededStores.add('Board');
		}
		return neededStores;
	}

	_getNeededStoresForUpdate<Q extends Prisma.Args<Prisma.TaskDelegate, 'update'>>(
		query: Partial<Q>
	): Set<StoreNames<PrismaIDBSchema>> {
		const neededStores = this._getNeededStoresForFind(query).union(
			this._getNeededStoresForCreate(
				query.data as Prisma.Args<Prisma.TaskDelegate, 'create'>['data']
			)
		);
		if (query.data?.board?.connect) {
			neededStores.add('Board');
			IDBUtils.convertToArray(query.data.board.connect).forEach((connect) => {
				this.client.board._getNeededStoresForWhere(connect, neededStores);
			});
		}
		if (query.data?.board?.update) {
			neededStores.add('Board');
			IDBUtils.convertToArray(query.data.board.update).forEach((update) => {
				this.client.board
					._getNeededStoresForUpdate(update as Prisma.Args<Prisma.BoardDelegate, 'update'>)
					.forEach((store) => neededStores.add(store));
			});
		}
		if (query.data?.board?.upsert) {
			neededStores.add('Board');
			IDBUtils.convertToArray(query.data.board.upsert).forEach((upsert) => {
				const update = {
					where: upsert.where,
					data: { ...upsert.update, ...upsert.create }
				} as Prisma.Args<Prisma.BoardDelegate, 'update'>;
				this.client.board
					._getNeededStoresForUpdate(update)
					.forEach((store) => neededStores.add(store));
			});
		}
		return neededStores;
	}

	_getNeededStoresForNestedDelete(neededStores: Set<StoreNames<PrismaIDBSchema>>): void {
		neededStores.add('Task');
	}

	private _removeNestedCreateData<D extends Prisma.Args<Prisma.TaskDelegate, 'create'>['data']>(
		data: D
	): Prisma.Result<Prisma.TaskDelegate, object, 'findFirstOrThrow'> {
		const recordWithoutNestedCreate = structuredClone(data);
		delete recordWithoutNestedCreate?.board;
		return recordWithoutNestedCreate as Prisma.Result<
			Prisma.TaskDelegate,
			object,
			'findFirstOrThrow'
		>;
	}

	private _preprocessListFields(
		records: Prisma.Result<Prisma.TaskDelegate, object, 'findMany'>
	): void {}

	async findMany<Q extends Prisma.Args<Prisma.TaskDelegate, 'findMany'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'findMany'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		const records = await this._applyWhereClause(
			await tx.objectStore('Task').getAll(),
			query?.where,
			tx
		);
		await this._applyOrderByClause(records, query?.orderBy, tx);
		const relationAppliedRecords = (await this._applyRelations(
			records,
			tx,
			query
		)) as Prisma.Result<Prisma.TaskDelegate, object, 'findFirstOrThrow'>[];
		const selectClause = query?.select;
		const selectAppliedRecords = this._applySelectClause(relationAppliedRecords, selectClause);
		this._preprocessListFields(selectAppliedRecords);
		return selectAppliedRecords as Prisma.Result<Prisma.TaskDelegate, Q, 'findMany'>;
	}

	async findFirst<Q extends Prisma.Args<Prisma.TaskDelegate, 'findFirst'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'findFirst'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		return (await this.findMany(query, tx))[0] ?? null;
	}

	async findFirstOrThrow<Q extends Prisma.Args<Prisma.TaskDelegate, 'findFirstOrThrow'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'findFirstOrThrow'>> {
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

	async findUnique<Q extends Prisma.Args<Prisma.TaskDelegate, 'findUnique'>>(
		query: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'findUnique'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForFind(query)), 'readonly');
		let record;
		if (query.where.id !== undefined) {
			record = await tx.objectStore('Task').get([query.where.id]);
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
		return recordWithRelations as Prisma.Result<Prisma.TaskDelegate, Q, 'findUnique'>;
	}

	async findUniqueOrThrow<Q extends Prisma.Args<Prisma.TaskDelegate, 'findUniqueOrThrow'>>(
		query: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'findUniqueOrThrow'>> {
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

	async count<Q extends Prisma.Args<Prisma.TaskDelegate, 'count'>>(
		query?: Q,
		tx?: IDBUtils.TransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'count'>> {
		tx = tx ?? this.client._db.transaction(['Task'], 'readonly');
		if (!query?.select || query.select === true) {
			const records = await this.findMany({ where: query?.where }, tx);
			return records.length as Prisma.Result<Prisma.TaskDelegate, Q, 'count'>;
		}
		const result: Partial<Record<keyof Prisma.TaskCountAggregateInputType, number>> = {};
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
		return result as Prisma.Result<Prisma.TaskDelegate, Q, 'count'>;
	}

	async create<Q extends Prisma.Args<Prisma.TaskDelegate, 'create'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'create'>> {
		const storesNeeded = this._getNeededStoresForCreate(query.data);
		tx = tx ?? this.client._db.transaction(Array.from(storesNeeded), 'readwrite');
		if (query.data.board) {
			const fk: Partial<PrismaIDBSchema['Board']['key']> = [];
			if (query.data.board?.create) {
				const record = await this.client.board.create({ data: query.data.board.create }, tx);
				fk[0] = record.name;
			}
			if (query.data.board?.connect) {
				const record = await this.client.board.findUniqueOrThrow(
					{ where: query.data.board.connect },
					tx
				);
				delete query.data.board.connect;
				fk[0] = record.name;
			}
			if (query.data.board?.connectOrCreate) {
				const record = await this.client.board.upsert(
					{
						where: query.data.board.connectOrCreate.where,
						create: query.data.board.connectOrCreate.create,
						update: {}
					},
					tx
				);
				fk[0] = record.name;
			}
			const unsafeData = query.data as Record<string, unknown>;
			unsafeData.boardName = fk[0];
			delete unsafeData.board;
		} else if (query.data?.boardName !== undefined && query.data.boardName !== null) {
			await this.client.board.findUniqueOrThrow(
				{
					where: { name: query.data.boardName }
				},
				tx
			);
		}
		const record = this._removeNestedCreateData(await this._fillDefaults(query.data, tx));
		const keyPath = await tx.objectStore('Task').add(record);
		const data = (await tx.objectStore('Task').get(keyPath))!;
		const recordsWithRelations = this._applySelectClause(
			await this._applyRelations<object>([data], tx, query),
			query.select
		)[0];
		this._preprocessListFields([recordsWithRelations]);
		this.emit('create', keyPath);
		return recordsWithRelations as Prisma.Result<Prisma.TaskDelegate, Q, 'create'>;
	}

	async createMany<Q extends Prisma.Args<Prisma.TaskDelegate, 'createMany'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'createMany'>> {
		const createManyData = IDBUtils.convertToArray(query.data);
		tx = tx ?? this.client._db.transaction(['Task'], 'readwrite');
		for (const createData of createManyData) {
			const record = this._removeNestedCreateData(await this._fillDefaults(createData, tx));
			const keyPath = await tx.objectStore('Task').add(record);
			this.emit('create', keyPath);
		}
		return { count: createManyData.length };
	}

	async createManyAndReturn<Q extends Prisma.Args<Prisma.TaskDelegate, 'createManyAndReturn'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'createManyAndReturn'>> {
		const createManyData = IDBUtils.convertToArray(query.data);
		const records: Prisma.Result<Prisma.TaskDelegate, object, 'findMany'> = [];
		tx = tx ?? this.client._db.transaction(['Task'], 'readwrite');
		for (const createData of createManyData) {
			const record = this._removeNestedCreateData(await this._fillDefaults(createData, tx));
			const keyPath = await tx.objectStore('Task').add(record);
			this.emit('create', keyPath);
			records.push(this._applySelectClause([record], query.select)[0]);
		}
		this._preprocessListFields(records);
		return records as Prisma.Result<Prisma.TaskDelegate, Q, 'createManyAndReturn'>;
	}

	async delete<Q extends Prisma.Args<Prisma.TaskDelegate, 'delete'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'delete'>> {
		const storesNeeded = this._getNeededStoresForFind(query);
		this._getNeededStoresForNestedDelete(storesNeeded);
		tx = tx ?? this.client._db.transaction(Array.from(storesNeeded), 'readwrite');
		const record = await this.findUnique(query, tx);
		if (!record) throw new Error('Record not found');
		await tx.objectStore('Task').delete([record.id]);
		this.emit('delete', [record.id]);
		return record;
	}

	async deleteMany<Q extends Prisma.Args<Prisma.TaskDelegate, 'deleteMany'>>(
		query?: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'deleteMany'>> {
		const storesNeeded = this._getNeededStoresForFind(query);
		this._getNeededStoresForNestedDelete(storesNeeded);
		tx = tx ?? this.client._db.transaction(Array.from(storesNeeded), 'readwrite');
		const records = await this.findMany(query, tx);
		for (const record of records) {
			await this.delete({ where: { id: record.id } }, tx);
		}
		return { count: records.length };
	}

	async update<Q extends Prisma.Args<Prisma.TaskDelegate, 'update'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'update'>> {
		tx =
			tx ??
			this.client._db.transaction(Array.from(this._getNeededStoresForUpdate(query)), 'readwrite');
		const record = await this.findUnique({ where: query.where }, tx);
		if (record === null) {
			tx.abort();
			throw new Error('Record not found');
		}
		const startKeyPath: PrismaIDBSchema['Task']['key'] = [record.id];
		const stringFields = ['title', 'description', 'boardName'] as const;
		for (const field of stringFields) {
			IDBUtils.handleStringUpdateField(record, field, query.data[field]);
		}
		const dateTimeFields = ['createdAt'] as const;
		for (const field of dateTimeFields) {
			IDBUtils.handleDateTimeUpdateField(record, field, query.data[field]);
		}
		const booleanFields = ['isCompleted'] as const;
		for (const field of booleanFields) {
			IDBUtils.handleBooleanUpdateField(record, field, query.data[field]);
		}
		const bytesFields = ['image'] as const;
		for (const field of bytesFields) {
			IDBUtils.handleBytesUpdateField(record, field, query.data[field]);
		}
		const intFields = ['id'] as const;
		for (const field of intFields) {
			IDBUtils.handleIntUpdateField(record, field, query.data[field]);
		}
		if (query.data.board) {
			if (query.data.board.connect) {
				const other = await this.client.board.findUniqueOrThrow(
					{ where: query.data.board.connect },
					tx
				);
				record.boardName = other.name;
			}
			if (query.data.board.create) {
				const other = await this.client.board.create({ data: query.data.board.create }, tx);
				record.boardName = other.name;
			}
			if (query.data.board.update) {
				const updateData = query.data.board.update.data ?? query.data.board.update;
				await this.client.board.update(
					{
						where: { ...query.data.board.update.where, name: record.boardName! },
						data: updateData
					},
					tx
				);
			}
			if (query.data.board.upsert) {
				await this.client.board.upsert(
					{
						where: { ...query.data.board.upsert.where, name: record.boardName! },
						create: { ...query.data.board.upsert.create, name: record.boardName! } as Prisma.Args<
							Prisma.BoardDelegate,
							'upsert'
						>['create'],
						update: query.data.board.upsert.update
					},
					tx
				);
			}
			if (query.data.board.connectOrCreate) {
				await this.client.board.upsert(
					{
						where: { ...query.data.board.connectOrCreate.where, name: record.boardName! },
						create: {
							...query.data.board.connectOrCreate.create,
							name: record.boardName!
						} as Prisma.Args<Prisma.BoardDelegate, 'upsert'>['create'],
						update: { name: record.boardName! }
					},
					tx
				);
			}
		}
		if (query.data.boardName !== undefined) {
			const related = await this.client.board.findUnique({ where: { name: record.boardName } }, tx);
			if (!related) throw new Error('Related record not found');
		}
		const endKeyPath: PrismaIDBSchema['Task']['key'] = [record.id];
		for (let i = 0; i < startKeyPath.length; i++) {
			if (startKeyPath[i] !== endKeyPath[i]) {
				await tx.objectStore('Task').delete(startKeyPath);
				break;
			}
		}
		const keyPath = await tx.objectStore('Task').put(record);
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
		return recordWithRelations as Prisma.Result<Prisma.TaskDelegate, Q, 'update'>;
	}

	async updateMany<Q extends Prisma.Args<Prisma.TaskDelegate, 'updateMany'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'updateMany'>> {
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

	async upsert<Q extends Prisma.Args<Prisma.TaskDelegate, 'upsert'>>(
		query: Q,
		tx?: IDBUtils.ReadwriteTransactionType
	): Promise<Prisma.Result<Prisma.TaskDelegate, Q, 'upsert'>> {
		const neededStores = this._getNeededStoresForUpdate({
			...query,
			data: { ...query.update, ...query.create } as Prisma.Args<
				Prisma.TaskDelegate,
				'update'
			>['data']
		});
		tx = tx ?? this.client._db.transaction(Array.from(neededStores), 'readwrite');
		let record = await this.findUnique({ where: query.where }, tx);
		if (!record) record = await this.create({ data: query.create }, tx);
		else record = await this.update({ where: query.where, data: query.update }, tx);
		record = await this.findUniqueOrThrow(
			{ where: { id: record.id }, select: query.select, include: query.include },
			tx
		);
		return record as Prisma.Result<Prisma.TaskDelegate, Q, 'upsert'>;
	}
}
