import type { Prisma } from '@prisma/client';
import type { IDBPTransaction, StoreNames } from 'idb';
import type { PrismaIDBSchema } from './idb-interface';

export function convertToArray<T>(arg: T | T[]): T[] {
	return Array.isArray(arg) ? arg : [arg];
}

export type ReadwriteTransactionType = IDBPTransaction<
	PrismaIDBSchema,
	StoreNames<PrismaIDBSchema>[],
	'readwrite'
>;

export type ReadonlyTransactionType = IDBPTransaction<
	PrismaIDBSchema,
	StoreNames<PrismaIDBSchema>[],
	'readonly'
>;

export type TransactionType = ReadonlyTransactionType | ReadwriteTransactionType;

export const LogicalParams = ['AND', 'OR', 'NOT'] as const;

export function intersectArraysByNestedKey<T>(arrays: T[][], keyPath: string[]): T[] {
	return arrays.reduce((acc, array) =>
		acc.filter((item) =>
			array.some((el) => keyPath.every((key) => el[key as keyof T] === item[key as keyof T]))
		)
	);
}

export function removeDuplicatesByKeyPath<T>(arrays: T[][], keyPath: string[]): T[] {
	const seen = new Set<string>();
	return arrays
		.flatMap((el) => el)
		.filter((item) => {
			const key = JSON.stringify(keyPath.map((key) => item[key as keyof T]));
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

export async function applyLogicalFilters<
	T,
	R extends Prisma.Result<T, object, 'findFirstOrThrow'>,
	W extends Prisma.Args<T, 'findFirstOrThrow'>['where']
>(
	records: R[],
	whereClause: W,
	tx: TransactionType,
	keyPath: string[],
	applyWhereFunction: (records: R[], clause: W, tx: TransactionType) => Promise<R[]>
): Promise<R[]> {
	if (whereClause.AND) {
		records = intersectArraysByNestedKey(
			await Promise.all(
				convertToArray(whereClause.AND).map(
					async (clause) => await applyWhereFunction(records, clause, tx)
				)
			),
			keyPath
		);
	}
	if (whereClause.OR) {
		records = removeDuplicatesByKeyPath(
			await Promise.all(
				convertToArray(whereClause.OR).map(
					async (clause) => await applyWhereFunction(records, clause, tx)
				)
			),
			keyPath
		);
	}
	if (whereClause.NOT) {
		const excludedRecords = removeDuplicatesByKeyPath(
			await Promise.all(
				convertToArray(whereClause.NOT).map(async (clause) =>
					applyWhereFunction(records, clause, tx)
				)
			),
			keyPath
		);
		records = records.filter(
			(item) =>
				!excludedRecords.some((excluded) =>
					keyPath.every((key) => excluded[key as keyof R] === item[key as keyof R])
				)
		);
	}
	return records;
}

export function whereStringFilter<T, R extends Prisma.Result<T, object, 'findFirstOrThrow'>>(
	record: R,
	fieldName: keyof R,
	stringFilter:
		| undefined
		| string
		| Prisma.StringFilter<unknown>
		| null
		| Prisma.StringNullableFilter<unknown>
): boolean {
	if (stringFilter === undefined) return true;

	const value = record[fieldName] as string | null;
	if (stringFilter === null) return value === null;

	if (typeof stringFilter === 'string') {
		if (value !== stringFilter) return false;
	} else {
		if (stringFilter.equals === null) {
			if (value !== null) return false;
		}
		if (typeof stringFilter.equals === 'string') {
			if (value === null) return false;
			if (stringFilter.mode === 'insensitive') {
				if (stringFilter.equals.toLowerCase() !== value.toLowerCase()) return false;
			} else {
				if (stringFilter.equals !== value) return false;
			}
		}
		if (stringFilter.not === null) {
			if (value === null) return false;
		}
		if (typeof stringFilter.not === 'string') {
			if (value === null) return false;
			if (stringFilter.mode === 'insensitive') {
				if (stringFilter.not.toLowerCase() === value.toLowerCase()) return false;
			} else {
				if (stringFilter.not === value) return false;
			}
		}
		if (Array.isArray(stringFilter.in)) {
			if (value === null) return false;
			if (stringFilter.mode === 'insensitive') {
				if (!stringFilter.in.map((s) => s.toLowerCase()).includes(value.toLowerCase()))
					return false;
			} else {
				if (!stringFilter.in.includes(value)) return false;
			}
		}
		if (Array.isArray(stringFilter.notIn)) {
			if (value === null) return false;
			if (stringFilter.mode === 'insensitive') {
				if (stringFilter.notIn.map((s) => s.toLowerCase()).includes(value.toLowerCase()))
					return false;
			} else {
				if (stringFilter.notIn.includes(value)) return false;
			}
		}
		if (typeof stringFilter.lt === 'string') {
			if (value === null) return false;
			if (!(value < stringFilter.lt)) return false;
		}
		if (typeof stringFilter.lte === 'string') {
			if (value === null) return false;
			if (!(value <= stringFilter.lte)) return false;
		}
		if (typeof stringFilter.gt === 'string') {
			if (value === null) return false;
			if (!(value > stringFilter.gt)) return false;
		}
		if (typeof stringFilter.gte === 'string') {
			if (value === null) return false;
			if (!(value >= stringFilter.gte)) return false;
		}
		if (typeof stringFilter.contains === 'string') {
			if (value === null) return false;
			if (stringFilter.mode === 'insensitive') {
				if (!value.toLowerCase().includes(stringFilter.contains.toLowerCase())) return false;
			} else {
				if (!value.includes(stringFilter.contains)) return false;
			}
		}
		if (typeof stringFilter.startsWith === 'string') {
			if (value === null) return false;
			if (stringFilter.mode === 'insensitive') {
				if (!value.toLowerCase().startsWith(stringFilter.startsWith.toLowerCase())) return false;
			} else {
				if (!value.startsWith(stringFilter.startsWith)) return false;
			}
		}
		if (typeof stringFilter.endsWith === 'string') {
			if (value === null) return false;
			if (stringFilter.mode === 'insensitive') {
				if (!value.toLowerCase().endsWith(stringFilter.endsWith.toLowerCase())) return false;
			} else {
				if (!value.endsWith(stringFilter.endsWith)) return false;
			}
		}
	}
	return true;
}

export function whereNumberFilter<T, R extends Prisma.Result<T, object, 'findFirstOrThrow'>>(
	record: R,
	fieldName: keyof R,
	numberFilter: undefined | number | Prisma.IntFilter<unknown>
): boolean {
	if (numberFilter === undefined) return true;

	const value = record[fieldName] as number | null;
	if (numberFilter === null) return value === null;

	if (typeof numberFilter === 'number') {
		if (value !== numberFilter) return false;
	} else {
		if (numberFilter.equals === null) {
			if (value !== null) return false;
		}
		if (typeof numberFilter.equals === 'number') {
			if (numberFilter.equals !== value) return false;
		}
		if (numberFilter.not === null) {
			if (value === null) return false;
		}
		if (typeof numberFilter.not === 'number') {
			if (numberFilter.not === value) return false;
		}
		if (Array.isArray(numberFilter.in)) {
			if (value === null) return false;
			if (!numberFilter.in.includes(value)) return false;
		}
		if (Array.isArray(numberFilter.notIn)) {
			if (value === null) return false;
			if (numberFilter.notIn.includes(value)) return false;
		}
		if (typeof numberFilter.lt === 'number') {
			if (value === null) return false;
			if (!(value < numberFilter.lt)) return false;
		}
		if (typeof numberFilter.lte === 'number') {
			if (value === null) return false;
			if (!(value <= numberFilter.lte)) return false;
		}
		if (typeof numberFilter.gt === 'number') {
			if (value === null) return false;
			if (!(value > numberFilter.gt)) return false;
		}
		if (typeof numberFilter.gte === 'number') {
			if (value === null) return false;
			if (!(value >= numberFilter.gte)) return false;
		}
	}
	return true;
}

export function whereBoolFilter<T, R extends Prisma.Result<T, object, 'findFirstOrThrow'>>(
	record: R,
	fieldName: keyof R,
	boolFilter: undefined | boolean | Prisma.BoolFilter<unknown>
): boolean {
	if (boolFilter === undefined) return true;

	const value = record[fieldName] as boolean | null;
	if (boolFilter === null) return value === null;

	if (typeof boolFilter === 'boolean') {
		if (value !== boolFilter) return false;
	} else {
		if (boolFilter.equals === null) {
			if (value !== null) return false;
		}
		if (typeof boolFilter.equals === 'boolean') {
			if (boolFilter.equals != value) return false;
		}
		if (boolFilter.not === null) {
			if (value === null) return false;
		}
		if (typeof boolFilter.not === 'boolean') {
			if (boolFilter.not == value) return false;
		}
	}
	return true;
}

export function whereBytesFilter<T, R extends Prisma.Result<T, object, 'findFirstOrThrow'>>(
	record: R,
	fieldName: keyof R,
	bytesFilter: undefined | Uint8Array | null | Prisma.BytesNullableFilter<unknown>
): boolean {
	if (bytesFilter === undefined) return true;

	function areUint8ArraysEqual(arr1: Uint8Array, arr2: Uint8Array) {
		if (arr1.length !== arr2.length) return false;
		for (let i = 0; i < arr1.length; i++) if (arr1[i] !== arr2[i]) return false;
		return true;
	}

	const value = record[fieldName] as Uint8Array | null;
	if (bytesFilter === null) return value === null;

	if (bytesFilter instanceof Uint8Array) {
		if (value === null) return false;
		if (!areUint8ArraysEqual(bytesFilter, value)) return false;
	} else {
		if (bytesFilter.equals === null) {
			if (value !== null) return false;
		}
		if (Buffer.isBuffer(bytesFilter.equals)) {
			if (value === null) return false;
			if (!bytesFilter.equals.equals(value)) return false;
		}
		if (bytesFilter.not === null) {
			if (value === null) return false;
		}
		if (Buffer.isBuffer(bytesFilter.not)) {
			if (value === null) return false;
			if (bytesFilter.not.equals(value)) return false;
		}
		if (Array.isArray(bytesFilter.in)) {
			if (value === null) return false;
			if (!bytesFilter.in.some((buffer) => areUint8ArraysEqual(buffer, value))) return false;
		}
		if (Array.isArray(bytesFilter.notIn)) {
			if (value === null) return false;
			if (bytesFilter.notIn.some((buffer) => areUint8ArraysEqual(buffer, value))) return false;
		}
	}
	return true;
}

export function whereDateTimeFilter<T, R extends Prisma.Result<T, object, 'findFirstOrThrow'>>(
	record: R,
	fieldName: keyof R,
	dateTimeFilter: undefined | Date | string | Prisma.DateTimeFilter<unknown>
): boolean {
	if (dateTimeFilter === undefined) return true;

	const value = record[fieldName] as Date | null;
	if (dateTimeFilter === null) return value === null;

	if (typeof dateTimeFilter === 'string' || dateTimeFilter instanceof Date) {
		if (value === null) return false;
		if (new Date(dateTimeFilter).getTime() !== value.getTime()) return false;
	} else {
		if (dateTimeFilter.equals === null) {
			if (value !== null) return false;
		}
		if (typeof dateTimeFilter.equals === 'string' || dateTimeFilter.equals instanceof Date) {
			if (value === null) return false;
			if (new Date(dateTimeFilter.equals).getTime() !== value.getTime()) return false;
		}
		if (dateTimeFilter.not === null) {
			if (value === null) return false;
		}
		if (typeof dateTimeFilter.equals === 'string' || dateTimeFilter.equals instanceof Date) {
			if (value === null) return false;
			if (new Date(dateTimeFilter.equals).getTime() === value.getTime()) return false;
		}
		if (Array.isArray(dateTimeFilter.in)) {
			if (value === null) return false;
			if (!dateTimeFilter.in.map((d) => new Date(d)).some((d) => d.getTime() === value.getTime()))
				return false;
		}
		if (Array.isArray(dateTimeFilter.notIn)) {
			if (value === null) return false;
			if (dateTimeFilter.notIn.map((d) => new Date(d)).some((d) => d.getTime() === value.getTime()))
				return false;
		}
		if (typeof dateTimeFilter.lt === 'string' || dateTimeFilter.lt instanceof Date) {
			if (value === null) return false;
			if (!(value.getTime() < new Date(dateTimeFilter.lt).getTime())) return false;
		}
		if (typeof dateTimeFilter.lte === 'string' || dateTimeFilter.lte instanceof Date) {
			if (value === null) return false;
			if (!(value.getTime() <= new Date(dateTimeFilter.lte).getTime())) return false;
		}
		if (typeof dateTimeFilter.gt === 'string' || dateTimeFilter.gt instanceof Date) {
			if (value === null) return false;
			if (!(value.getTime() > new Date(dateTimeFilter.gt).getTime())) return false;
		}
		if (typeof dateTimeFilter.gte === 'string' || dateTimeFilter.gte instanceof Date) {
			if (value === null) return false;
			if (!(value.getTime() >= new Date(dateTimeFilter.gte).getTime())) return false;
		}
	}
	return true;
}

export function handleStringUpdateField<T, R extends Prisma.Result<T, object, 'findFirstOrThrow'>>(
	record: R,
	fieldName: keyof R,
	stringUpdate:
		| undefined
		| string
		| Prisma.StringFieldUpdateOperationsInput
		| null
		| Prisma.NullableStringFieldUpdateOperationsInput
) {
	if (stringUpdate === undefined) return;
	if (typeof stringUpdate === 'string' || stringUpdate === null) {
		(record[fieldName] as string | null) = stringUpdate;
	} else if (stringUpdate.set !== undefined) {
		(record[fieldName] as string | null) = stringUpdate.set;
	}
}

export function handleBooleanUpdateField<T, R extends Prisma.Result<T, object, 'findFirstOrThrow'>>(
	record: R,
	fieldName: keyof R,
	booleanUpdate: undefined | boolean | Prisma.BoolFieldUpdateOperationsInput
) {
	if (booleanUpdate === undefined) return;
	if (typeof booleanUpdate === 'boolean') {
		(record[fieldName] as boolean) = booleanUpdate;
	} else if (booleanUpdate.set !== undefined) {
		(record[fieldName] as boolean) = booleanUpdate.set;
	}
}

export function handleDateTimeUpdateField<
	T,
	R extends Prisma.Result<T, object, 'findFirstOrThrow'>
>(
	record: R,
	fieldName: keyof R,
	dateTimeUpdate: undefined | Date | string | Prisma.DateTimeFieldUpdateOperationsInput
) {
	if (dateTimeUpdate === undefined) return;
	if (typeof dateTimeUpdate === 'string' || dateTimeUpdate instanceof Date) {
		(record[fieldName] as Date) = new Date(dateTimeUpdate);
	} else if (dateTimeUpdate.set !== undefined) {
		(record[fieldName] as Date) = new Date(dateTimeUpdate.set);
	}
}

export function handleBytesUpdateField<T, R extends Prisma.Result<T, object, 'findFirstOrThrow'>>(
	record: R,
	fieldName: keyof R,
	bytesUpdate:
		| undefined
		| Uint8Array
		| Prisma.BytesFieldUpdateOperationsInput
		| null
		| Prisma.NullableBytesFieldUpdateOperationsInput
) {
	if (bytesUpdate === undefined) return;
	if (bytesUpdate instanceof Uint8Array || bytesUpdate === null) {
		(record[fieldName] as Uint8Array | null) = bytesUpdate;
	} else if (bytesUpdate.set !== undefined) {
		(record[fieldName] as Uint8Array | null) = bytesUpdate.set;
	}
}

export function handleIntUpdateField<T, R extends Prisma.Result<T, object, 'findFirstOrThrow'>>(
	record: R,
	fieldName: keyof R,
	intUpdate: undefined | number | Prisma.IntFieldUpdateOperationsInput
) {
	if (intUpdate === undefined) return;
	if (typeof intUpdate === 'number') {
		(record[fieldName] as number) = intUpdate;
	} else if (intUpdate.set !== undefined) {
		(record[fieldName] as number) = intUpdate.set;
	}
}

export function genericComparator(
	a: unknown,
	b: unknown,
	sortOrder: Prisma.SortOrder | { sort: Prisma.SortOrder; nulls?: 'first' | 'last' } = 'asc'
): number {
	if (typeof sortOrder !== 'string' && sortOrder.nulls) {
		const nullMultiplier = sortOrder.nulls === 'first' ? -1 : 1;

		if (a === null && b === null) return 0;
		if (a === null || b === null) return (a === null ? 1 : -1) * nullMultiplier;
	}
	const multiplier =
		typeof sortOrder === 'string'
			? sortOrder === 'asc'
				? 1
				: -1
			: sortOrder.sort === 'asc'
				? 1
				: -1;
	let returnValue: number | undefined;

	if (typeof a === 'string' && typeof b === 'string') {
		returnValue = a.localeCompare(b);
	}
	if (typeof a === 'number' && typeof b === 'number') {
		returnValue = a - b;
	}
	if (returnValue === undefined) {
		throw new Error(`Comparison of type: ${typeof a} not yet supported`);
	}
	return returnValue * multiplier;
}
