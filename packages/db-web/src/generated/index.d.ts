
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Region
 * 
 */
export type Region = $Result.DefaultSelection<Prisma.$RegionPayload>
/**
 * Model Topic
 * 
 */
export type Topic = $Result.DefaultSelection<Prisma.$TopicPayload>
/**
 * Model Tag
 * 
 */
export type Tag = $Result.DefaultSelection<Prisma.$TagPayload>
/**
 * Model TopicTag
 * 
 */
export type TopicTag = $Result.DefaultSelection<Prisma.$TopicTagPayload>
/**
 * Model ItemTag
 * 
 */
export type ItemTag = $Result.DefaultSelection<Prisma.$ItemTagPayload>
/**
 * Model ContentItem
 * 
 */
export type ContentItem = $Result.DefaultSelection<Prisma.$ContentItemPayload>
/**
 * Model AnswerOption
 * 
 */
export type AnswerOption = $Result.DefaultSelection<Prisma.$AnswerOptionPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const ContentKind: {
  SWIPE: 'SWIPE',
  EVENT: 'EVENT',
  SUNDAY_POLL: 'SUNDAY_POLL'
};

export type ContentKind = (typeof ContentKind)[keyof typeof ContentKind]


export const PublishStatus: {
  draft: 'draft',
  review: 'review',
  published: 'published',
  archived: 'archived'
};

export type PublishStatus = (typeof PublishStatus)[keyof typeof PublishStatus]


export const RegionMode: {
  AUTO: 'AUTO',
  MANUAL: 'MANUAL'
};

export type RegionMode = (typeof RegionMode)[keyof typeof RegionMode]


export const Locale: {
  de: 'de',
  en: 'en',
  fr: 'fr',
  it: 'it',
  es: 'es',
  pl: 'pl',
  uk: 'uk',
  ru: 'ru',
  tr: 'tr',
  hi: 'hi',
  zh: 'zh',
  ar: 'ar'
};

export type Locale = (typeof Locale)[keyof typeof Locale]

}

export type ContentKind = $Enums.ContentKind

export const ContentKind: typeof $Enums.ContentKind

export type PublishStatus = $Enums.PublishStatus

export const PublishStatus: typeof $Enums.PublishStatus

export type RegionMode = $Enums.RegionMode

export const RegionMode: typeof $Enums.RegionMode

export type Locale = $Enums.Locale

export const Locale: typeof $Enums.Locale

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Regions
 * const regions = await prisma.region.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Regions
   * const regions = await prisma.region.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.region`: Exposes CRUD operations for the **Region** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Regions
    * const regions = await prisma.region.findMany()
    * ```
    */
  get region(): Prisma.RegionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.topic`: Exposes CRUD operations for the **Topic** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Topics
    * const topics = await prisma.topic.findMany()
    * ```
    */
  get topic(): Prisma.TopicDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.tag`: Exposes CRUD operations for the **Tag** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Tags
    * const tags = await prisma.tag.findMany()
    * ```
    */
  get tag(): Prisma.TagDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.topicTag`: Exposes CRUD operations for the **TopicTag** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TopicTags
    * const topicTags = await prisma.topicTag.findMany()
    * ```
    */
  get topicTag(): Prisma.TopicTagDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.itemTag`: Exposes CRUD operations for the **ItemTag** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ItemTags
    * const itemTags = await prisma.itemTag.findMany()
    * ```
    */
  get itemTag(): Prisma.ItemTagDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.contentItem`: Exposes CRUD operations for the **ContentItem** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ContentItems
    * const contentItems = await prisma.contentItem.findMany()
    * ```
    */
  get contentItem(): Prisma.ContentItemDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.answerOption`: Exposes CRUD operations for the **AnswerOption** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AnswerOptions
    * const answerOptions = await prisma.answerOption.findMany()
    * ```
    */
  get answerOption(): Prisma.AnswerOptionDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.0
   * Query Engine version: 2ba551f319ab1df4bc874a89965d8b3641056773
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Region: 'Region',
    Topic: 'Topic',
    Tag: 'Tag',
    TopicTag: 'TopicTag',
    ItemTag: 'ItemTag',
    ContentItem: 'ContentItem',
    AnswerOption: 'AnswerOption'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "region" | "topic" | "tag" | "topicTag" | "itemTag" | "contentItem" | "answerOption"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Region: {
        payload: Prisma.$RegionPayload<ExtArgs>
        fields: Prisma.RegionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RegionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RegionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          findFirst: {
            args: Prisma.RegionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RegionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          findMany: {
            args: Prisma.RegionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>[]
          }
          create: {
            args: Prisma.RegionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          createMany: {
            args: Prisma.RegionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RegionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>[]
          }
          delete: {
            args: Prisma.RegionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          update: {
            args: Prisma.RegionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          deleteMany: {
            args: Prisma.RegionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RegionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RegionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>[]
          }
          upsert: {
            args: Prisma.RegionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RegionPayload>
          }
          aggregate: {
            args: Prisma.RegionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRegion>
          }
          groupBy: {
            args: Prisma.RegionGroupByArgs<ExtArgs>
            result: $Utils.Optional<RegionGroupByOutputType>[]
          }
          count: {
            args: Prisma.RegionCountArgs<ExtArgs>
            result: $Utils.Optional<RegionCountAggregateOutputType> | number
          }
        }
      }
      Topic: {
        payload: Prisma.$TopicPayload<ExtArgs>
        fields: Prisma.TopicFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TopicFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TopicFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload>
          }
          findFirst: {
            args: Prisma.TopicFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TopicFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload>
          }
          findMany: {
            args: Prisma.TopicFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload>[]
          }
          create: {
            args: Prisma.TopicCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload>
          }
          createMany: {
            args: Prisma.TopicCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TopicCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload>[]
          }
          delete: {
            args: Prisma.TopicDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload>
          }
          update: {
            args: Prisma.TopicUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload>
          }
          deleteMany: {
            args: Prisma.TopicDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TopicUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TopicUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload>[]
          }
          upsert: {
            args: Prisma.TopicUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicPayload>
          }
          aggregate: {
            args: Prisma.TopicAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTopic>
          }
          groupBy: {
            args: Prisma.TopicGroupByArgs<ExtArgs>
            result: $Utils.Optional<TopicGroupByOutputType>[]
          }
          count: {
            args: Prisma.TopicCountArgs<ExtArgs>
            result: $Utils.Optional<TopicCountAggregateOutputType> | number
          }
        }
      }
      Tag: {
        payload: Prisma.$TagPayload<ExtArgs>
        fields: Prisma.TagFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TagFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TagFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          findFirst: {
            args: Prisma.TagFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TagFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          findMany: {
            args: Prisma.TagFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload>[]
          }
          create: {
            args: Prisma.TagCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          createMany: {
            args: Prisma.TagCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TagCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload>[]
          }
          delete: {
            args: Prisma.TagDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          update: {
            args: Prisma.TagUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          deleteMany: {
            args: Prisma.TagDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TagUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TagUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload>[]
          }
          upsert: {
            args: Prisma.TagUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TagPayload>
          }
          aggregate: {
            args: Prisma.TagAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTag>
          }
          groupBy: {
            args: Prisma.TagGroupByArgs<ExtArgs>
            result: $Utils.Optional<TagGroupByOutputType>[]
          }
          count: {
            args: Prisma.TagCountArgs<ExtArgs>
            result: $Utils.Optional<TagCountAggregateOutputType> | number
          }
        }
      }
      TopicTag: {
        payload: Prisma.$TopicTagPayload<ExtArgs>
        fields: Prisma.TopicTagFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TopicTagFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TopicTagFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload>
          }
          findFirst: {
            args: Prisma.TopicTagFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TopicTagFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload>
          }
          findMany: {
            args: Prisma.TopicTagFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload>[]
          }
          create: {
            args: Prisma.TopicTagCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload>
          }
          createMany: {
            args: Prisma.TopicTagCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TopicTagCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload>[]
          }
          delete: {
            args: Prisma.TopicTagDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload>
          }
          update: {
            args: Prisma.TopicTagUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload>
          }
          deleteMany: {
            args: Prisma.TopicTagDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TopicTagUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.TopicTagUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload>[]
          }
          upsert: {
            args: Prisma.TopicTagUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TopicTagPayload>
          }
          aggregate: {
            args: Prisma.TopicTagAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTopicTag>
          }
          groupBy: {
            args: Prisma.TopicTagGroupByArgs<ExtArgs>
            result: $Utils.Optional<TopicTagGroupByOutputType>[]
          }
          count: {
            args: Prisma.TopicTagCountArgs<ExtArgs>
            result: $Utils.Optional<TopicTagCountAggregateOutputType> | number
          }
        }
      }
      ItemTag: {
        payload: Prisma.$ItemTagPayload<ExtArgs>
        fields: Prisma.ItemTagFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ItemTagFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ItemTagFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload>
          }
          findFirst: {
            args: Prisma.ItemTagFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ItemTagFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload>
          }
          findMany: {
            args: Prisma.ItemTagFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload>[]
          }
          create: {
            args: Prisma.ItemTagCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload>
          }
          createMany: {
            args: Prisma.ItemTagCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ItemTagCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload>[]
          }
          delete: {
            args: Prisma.ItemTagDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload>
          }
          update: {
            args: Prisma.ItemTagUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload>
          }
          deleteMany: {
            args: Prisma.ItemTagDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ItemTagUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ItemTagUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload>[]
          }
          upsert: {
            args: Prisma.ItemTagUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItemTagPayload>
          }
          aggregate: {
            args: Prisma.ItemTagAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateItemTag>
          }
          groupBy: {
            args: Prisma.ItemTagGroupByArgs<ExtArgs>
            result: $Utils.Optional<ItemTagGroupByOutputType>[]
          }
          count: {
            args: Prisma.ItemTagCountArgs<ExtArgs>
            result: $Utils.Optional<ItemTagCountAggregateOutputType> | number
          }
        }
      }
      ContentItem: {
        payload: Prisma.$ContentItemPayload<ExtArgs>
        fields: Prisma.ContentItemFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ContentItemFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ContentItemFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload>
          }
          findFirst: {
            args: Prisma.ContentItemFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ContentItemFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload>
          }
          findMany: {
            args: Prisma.ContentItemFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload>[]
          }
          create: {
            args: Prisma.ContentItemCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload>
          }
          createMany: {
            args: Prisma.ContentItemCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ContentItemCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload>[]
          }
          delete: {
            args: Prisma.ContentItemDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload>
          }
          update: {
            args: Prisma.ContentItemUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload>
          }
          deleteMany: {
            args: Prisma.ContentItemDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ContentItemUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ContentItemUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload>[]
          }
          upsert: {
            args: Prisma.ContentItemUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContentItemPayload>
          }
          aggregate: {
            args: Prisma.ContentItemAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateContentItem>
          }
          groupBy: {
            args: Prisma.ContentItemGroupByArgs<ExtArgs>
            result: $Utils.Optional<ContentItemGroupByOutputType>[]
          }
          count: {
            args: Prisma.ContentItemCountArgs<ExtArgs>
            result: $Utils.Optional<ContentItemCountAggregateOutputType> | number
          }
        }
      }
      AnswerOption: {
        payload: Prisma.$AnswerOptionPayload<ExtArgs>
        fields: Prisma.AnswerOptionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AnswerOptionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AnswerOptionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload>
          }
          findFirst: {
            args: Prisma.AnswerOptionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AnswerOptionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload>
          }
          findMany: {
            args: Prisma.AnswerOptionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload>[]
          }
          create: {
            args: Prisma.AnswerOptionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload>
          }
          createMany: {
            args: Prisma.AnswerOptionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AnswerOptionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload>[]
          }
          delete: {
            args: Prisma.AnswerOptionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload>
          }
          update: {
            args: Prisma.AnswerOptionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload>
          }
          deleteMany: {
            args: Prisma.AnswerOptionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AnswerOptionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AnswerOptionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload>[]
          }
          upsert: {
            args: Prisma.AnswerOptionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnswerOptionPayload>
          }
          aggregate: {
            args: Prisma.AnswerOptionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAnswerOption>
          }
          groupBy: {
            args: Prisma.AnswerOptionGroupByArgs<ExtArgs>
            result: $Utils.Optional<AnswerOptionGroupByOutputType>[]
          }
          count: {
            args: Prisma.AnswerOptionCountArgs<ExtArgs>
            result: $Utils.Optional<AnswerOptionCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    region?: RegionOmit
    topic?: TopicOmit
    tag?: TagOmit
    topicTag?: TopicTagOmit
    itemTag?: ItemTagOmit
    contentItem?: ContentItemOmit
    answerOption?: AnswerOptionOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type RegionCountOutputType
   */

  export type RegionCountOutputType = {
    manualItems: number
    effectiveItems: number
  }

  export type RegionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    manualItems?: boolean | RegionCountOutputTypeCountManualItemsArgs
    effectiveItems?: boolean | RegionCountOutputTypeCountEffectiveItemsArgs
  }

  // Custom InputTypes
  /**
   * RegionCountOutputType without action
   */
  export type RegionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RegionCountOutputType
     */
    select?: RegionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RegionCountOutputType without action
   */
  export type RegionCountOutputTypeCountManualItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ContentItemWhereInput
  }

  /**
   * RegionCountOutputType without action
   */
  export type RegionCountOutputTypeCountEffectiveItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ContentItemWhereInput
  }


  /**
   * Count Type TopicCountOutputType
   */

  export type TopicCountOutputType = {
    items: number
    tags: number
  }

  export type TopicCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    items?: boolean | TopicCountOutputTypeCountItemsArgs
    tags?: boolean | TopicCountOutputTypeCountTagsArgs
  }

  // Custom InputTypes
  /**
   * TopicCountOutputType without action
   */
  export type TopicCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicCountOutputType
     */
    select?: TopicCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TopicCountOutputType without action
   */
  export type TopicCountOutputTypeCountItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ContentItemWhereInput
  }

  /**
   * TopicCountOutputType without action
   */
  export type TopicCountOutputTypeCountTagsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TopicTagWhereInput
  }


  /**
   * Count Type TagCountOutputType
   */

  export type TagCountOutputType = {
    topics: number
    items: number
  }

  export type TagCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    topics?: boolean | TagCountOutputTypeCountTopicsArgs
    items?: boolean | TagCountOutputTypeCountItemsArgs
  }

  // Custom InputTypes
  /**
   * TagCountOutputType without action
   */
  export type TagCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TagCountOutputType
     */
    select?: TagCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TagCountOutputType without action
   */
  export type TagCountOutputTypeCountTopicsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TopicTagWhereInput
  }

  /**
   * TagCountOutputType without action
   */
  export type TagCountOutputTypeCountItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ItemTagWhereInput
  }


  /**
   * Count Type ContentItemCountOutputType
   */

  export type ContentItemCountOutputType = {
    answerOptions: number
    tags: number
  }

  export type ContentItemCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    answerOptions?: boolean | ContentItemCountOutputTypeCountAnswerOptionsArgs
    tags?: boolean | ContentItemCountOutputTypeCountTagsArgs
  }

  // Custom InputTypes
  /**
   * ContentItemCountOutputType without action
   */
  export type ContentItemCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItemCountOutputType
     */
    select?: ContentItemCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ContentItemCountOutputType without action
   */
  export type ContentItemCountOutputTypeCountAnswerOptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AnswerOptionWhereInput
  }

  /**
   * ContentItemCountOutputType without action
   */
  export type ContentItemCountOutputTypeCountTagsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ItemTagWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Region
   */

  export type AggregateRegion = {
    _count: RegionCountAggregateOutputType | null
    _avg: RegionAvgAggregateOutputType | null
    _sum: RegionSumAggregateOutputType | null
    _min: RegionMinAggregateOutputType | null
    _max: RegionMaxAggregateOutputType | null
  }

  export type RegionAvgAggregateOutputType = {
    level: number | null
  }

  export type RegionSumAggregateOutputType = {
    level: number | null
  }

  export type RegionMinAggregateOutputType = {
    id: string | null
    code: string | null
    name: string | null
    level: number | null
  }

  export type RegionMaxAggregateOutputType = {
    id: string | null
    code: string | null
    name: string | null
    level: number | null
  }

  export type RegionCountAggregateOutputType = {
    id: number
    code: number
    name: number
    level: number
    _all: number
  }


  export type RegionAvgAggregateInputType = {
    level?: true
  }

  export type RegionSumAggregateInputType = {
    level?: true
  }

  export type RegionMinAggregateInputType = {
    id?: true
    code?: true
    name?: true
    level?: true
  }

  export type RegionMaxAggregateInputType = {
    id?: true
    code?: true
    name?: true
    level?: true
  }

  export type RegionCountAggregateInputType = {
    id?: true
    code?: true
    name?: true
    level?: true
    _all?: true
  }

  export type RegionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Region to aggregate.
     */
    where?: RegionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Regions to fetch.
     */
    orderBy?: RegionOrderByWithRelationInput | RegionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RegionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Regions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Regions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Regions
    **/
    _count?: true | RegionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RegionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RegionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RegionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RegionMaxAggregateInputType
  }

  export type GetRegionAggregateType<T extends RegionAggregateArgs> = {
        [P in keyof T & keyof AggregateRegion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRegion[P]>
      : GetScalarType<T[P], AggregateRegion[P]>
  }




  export type RegionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RegionWhereInput
    orderBy?: RegionOrderByWithAggregationInput | RegionOrderByWithAggregationInput[]
    by: RegionScalarFieldEnum[] | RegionScalarFieldEnum
    having?: RegionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RegionCountAggregateInputType | true
    _avg?: RegionAvgAggregateInputType
    _sum?: RegionSumAggregateInputType
    _min?: RegionMinAggregateInputType
    _max?: RegionMaxAggregateInputType
  }

  export type RegionGroupByOutputType = {
    id: string
    code: string
    name: string
    level: number
    _count: RegionCountAggregateOutputType | null
    _avg: RegionAvgAggregateOutputType | null
    _sum: RegionSumAggregateOutputType | null
    _min: RegionMinAggregateOutputType | null
    _max: RegionMaxAggregateOutputType | null
  }

  type GetRegionGroupByPayload<T extends RegionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RegionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RegionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RegionGroupByOutputType[P]>
            : GetScalarType<T[P], RegionGroupByOutputType[P]>
        }
      >
    >


  export type RegionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    level?: boolean
    manualItems?: boolean | Region$manualItemsArgs<ExtArgs>
    effectiveItems?: boolean | Region$effectiveItemsArgs<ExtArgs>
    _count?: boolean | RegionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["region"]>

  export type RegionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    level?: boolean
  }, ExtArgs["result"]["region"]>

  export type RegionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    level?: boolean
  }, ExtArgs["result"]["region"]>

  export type RegionSelectScalar = {
    id?: boolean
    code?: boolean
    name?: boolean
    level?: boolean
  }

  export type RegionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "code" | "name" | "level", ExtArgs["result"]["region"]>
  export type RegionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    manualItems?: boolean | Region$manualItemsArgs<ExtArgs>
    effectiveItems?: boolean | Region$effectiveItemsArgs<ExtArgs>
    _count?: boolean | RegionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RegionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type RegionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $RegionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Region"
    objects: {
      manualItems: Prisma.$ContentItemPayload<ExtArgs>[]
      effectiveItems: Prisma.$ContentItemPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      code: string
      name: string
      level: number
    }, ExtArgs["result"]["region"]>
    composites: {}
  }

  type RegionGetPayload<S extends boolean | null | undefined | RegionDefaultArgs> = $Result.GetResult<Prisma.$RegionPayload, S>

  type RegionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<RegionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RegionCountAggregateInputType | true
    }

  export interface RegionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Region'], meta: { name: 'Region' } }
    /**
     * Find zero or one Region that matches the filter.
     * @param {RegionFindUniqueArgs} args - Arguments to find a Region
     * @example
     * // Get one Region
     * const region = await prisma.region.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RegionFindUniqueArgs>(args: SelectSubset<T, RegionFindUniqueArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Region that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RegionFindUniqueOrThrowArgs} args - Arguments to find a Region
     * @example
     * // Get one Region
     * const region = await prisma.region.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RegionFindUniqueOrThrowArgs>(args: SelectSubset<T, RegionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Region that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionFindFirstArgs} args - Arguments to find a Region
     * @example
     * // Get one Region
     * const region = await prisma.region.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RegionFindFirstArgs>(args?: SelectSubset<T, RegionFindFirstArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Region that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionFindFirstOrThrowArgs} args - Arguments to find a Region
     * @example
     * // Get one Region
     * const region = await prisma.region.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RegionFindFirstOrThrowArgs>(args?: SelectSubset<T, RegionFindFirstOrThrowArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Regions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Regions
     * const regions = await prisma.region.findMany()
     * 
     * // Get first 10 Regions
     * const regions = await prisma.region.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const regionWithIdOnly = await prisma.region.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RegionFindManyArgs>(args?: SelectSubset<T, RegionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Region.
     * @param {RegionCreateArgs} args - Arguments to create a Region.
     * @example
     * // Create one Region
     * const Region = await prisma.region.create({
     *   data: {
     *     // ... data to create a Region
     *   }
     * })
     * 
     */
    create<T extends RegionCreateArgs>(args: SelectSubset<T, RegionCreateArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Regions.
     * @param {RegionCreateManyArgs} args - Arguments to create many Regions.
     * @example
     * // Create many Regions
     * const region = await prisma.region.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RegionCreateManyArgs>(args?: SelectSubset<T, RegionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Regions and returns the data saved in the database.
     * @param {RegionCreateManyAndReturnArgs} args - Arguments to create many Regions.
     * @example
     * // Create many Regions
     * const region = await prisma.region.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Regions and only return the `id`
     * const regionWithIdOnly = await prisma.region.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RegionCreateManyAndReturnArgs>(args?: SelectSubset<T, RegionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Region.
     * @param {RegionDeleteArgs} args - Arguments to delete one Region.
     * @example
     * // Delete one Region
     * const Region = await prisma.region.delete({
     *   where: {
     *     // ... filter to delete one Region
     *   }
     * })
     * 
     */
    delete<T extends RegionDeleteArgs>(args: SelectSubset<T, RegionDeleteArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Region.
     * @param {RegionUpdateArgs} args - Arguments to update one Region.
     * @example
     * // Update one Region
     * const region = await prisma.region.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RegionUpdateArgs>(args: SelectSubset<T, RegionUpdateArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Regions.
     * @param {RegionDeleteManyArgs} args - Arguments to filter Regions to delete.
     * @example
     * // Delete a few Regions
     * const { count } = await prisma.region.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RegionDeleteManyArgs>(args?: SelectSubset<T, RegionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Regions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Regions
     * const region = await prisma.region.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RegionUpdateManyArgs>(args: SelectSubset<T, RegionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Regions and returns the data updated in the database.
     * @param {RegionUpdateManyAndReturnArgs} args - Arguments to update many Regions.
     * @example
     * // Update many Regions
     * const region = await prisma.region.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Regions and only return the `id`
     * const regionWithIdOnly = await prisma.region.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RegionUpdateManyAndReturnArgs>(args: SelectSubset<T, RegionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Region.
     * @param {RegionUpsertArgs} args - Arguments to update or create a Region.
     * @example
     * // Update or create a Region
     * const region = await prisma.region.upsert({
     *   create: {
     *     // ... data to create a Region
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Region we want to update
     *   }
     * })
     */
    upsert<T extends RegionUpsertArgs>(args: SelectSubset<T, RegionUpsertArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Regions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionCountArgs} args - Arguments to filter Regions to count.
     * @example
     * // Count the number of Regions
     * const count = await prisma.region.count({
     *   where: {
     *     // ... the filter for the Regions we want to count
     *   }
     * })
    **/
    count<T extends RegionCountArgs>(
      args?: Subset<T, RegionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RegionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Region.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RegionAggregateArgs>(args: Subset<T, RegionAggregateArgs>): Prisma.PrismaPromise<GetRegionAggregateType<T>>

    /**
     * Group by Region.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RegionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RegionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RegionGroupByArgs['orderBy'] }
        : { orderBy?: RegionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RegionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRegionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Region model
   */
  readonly fields: RegionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Region.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RegionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    manualItems<T extends Region$manualItemsArgs<ExtArgs> = {}>(args?: Subset<T, Region$manualItemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    effectiveItems<T extends Region$effectiveItemsArgs<ExtArgs> = {}>(args?: Subset<T, Region$effectiveItemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Region model
   */
  interface RegionFieldRefs {
    readonly id: FieldRef<"Region", 'String'>
    readonly code: FieldRef<"Region", 'String'>
    readonly name: FieldRef<"Region", 'String'>
    readonly level: FieldRef<"Region", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * Region findUnique
   */
  export type RegionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter, which Region to fetch.
     */
    where: RegionWhereUniqueInput
  }

  /**
   * Region findUniqueOrThrow
   */
  export type RegionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter, which Region to fetch.
     */
    where: RegionWhereUniqueInput
  }

  /**
   * Region findFirst
   */
  export type RegionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter, which Region to fetch.
     */
    where?: RegionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Regions to fetch.
     */
    orderBy?: RegionOrderByWithRelationInput | RegionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Regions.
     */
    cursor?: RegionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Regions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Regions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Regions.
     */
    distinct?: RegionScalarFieldEnum | RegionScalarFieldEnum[]
  }

  /**
   * Region findFirstOrThrow
   */
  export type RegionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter, which Region to fetch.
     */
    where?: RegionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Regions to fetch.
     */
    orderBy?: RegionOrderByWithRelationInput | RegionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Regions.
     */
    cursor?: RegionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Regions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Regions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Regions.
     */
    distinct?: RegionScalarFieldEnum | RegionScalarFieldEnum[]
  }

  /**
   * Region findMany
   */
  export type RegionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter, which Regions to fetch.
     */
    where?: RegionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Regions to fetch.
     */
    orderBy?: RegionOrderByWithRelationInput | RegionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Regions.
     */
    cursor?: RegionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Regions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Regions.
     */
    skip?: number
    distinct?: RegionScalarFieldEnum | RegionScalarFieldEnum[]
  }

  /**
   * Region create
   */
  export type RegionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * The data needed to create a Region.
     */
    data: XOR<RegionCreateInput, RegionUncheckedCreateInput>
  }

  /**
   * Region createMany
   */
  export type RegionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Regions.
     */
    data: RegionCreateManyInput | RegionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Region createManyAndReturn
   */
  export type RegionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * The data used to create many Regions.
     */
    data: RegionCreateManyInput | RegionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Region update
   */
  export type RegionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * The data needed to update a Region.
     */
    data: XOR<RegionUpdateInput, RegionUncheckedUpdateInput>
    /**
     * Choose, which Region to update.
     */
    where: RegionWhereUniqueInput
  }

  /**
   * Region updateMany
   */
  export type RegionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Regions.
     */
    data: XOR<RegionUpdateManyMutationInput, RegionUncheckedUpdateManyInput>
    /**
     * Filter which Regions to update
     */
    where?: RegionWhereInput
    /**
     * Limit how many Regions to update.
     */
    limit?: number
  }

  /**
   * Region updateManyAndReturn
   */
  export type RegionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * The data used to update Regions.
     */
    data: XOR<RegionUpdateManyMutationInput, RegionUncheckedUpdateManyInput>
    /**
     * Filter which Regions to update
     */
    where?: RegionWhereInput
    /**
     * Limit how many Regions to update.
     */
    limit?: number
  }

  /**
   * Region upsert
   */
  export type RegionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * The filter to search for the Region to update in case it exists.
     */
    where: RegionWhereUniqueInput
    /**
     * In case the Region found by the `where` argument doesn't exist, create a new Region with this data.
     */
    create: XOR<RegionCreateInput, RegionUncheckedCreateInput>
    /**
     * In case the Region was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RegionUpdateInput, RegionUncheckedUpdateInput>
  }

  /**
   * Region delete
   */
  export type RegionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    /**
     * Filter which Region to delete.
     */
    where: RegionWhereUniqueInput
  }

  /**
   * Region deleteMany
   */
  export type RegionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Regions to delete
     */
    where?: RegionWhereInput
    /**
     * Limit how many Regions to delete.
     */
    limit?: number
  }

  /**
   * Region.manualItems
   */
  export type Region$manualItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    where?: ContentItemWhereInput
    orderBy?: ContentItemOrderByWithRelationInput | ContentItemOrderByWithRelationInput[]
    cursor?: ContentItemWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ContentItemScalarFieldEnum | ContentItemScalarFieldEnum[]
  }

  /**
   * Region.effectiveItems
   */
  export type Region$effectiveItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    where?: ContentItemWhereInput
    orderBy?: ContentItemOrderByWithRelationInput | ContentItemOrderByWithRelationInput[]
    cursor?: ContentItemWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ContentItemScalarFieldEnum | ContentItemScalarFieldEnum[]
  }

  /**
   * Region without action
   */
  export type RegionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
  }


  /**
   * Model Topic
   */

  export type AggregateTopic = {
    _count: TopicCountAggregateOutputType | null
    _min: TopicMinAggregateOutputType | null
    _max: TopicMaxAggregateOutputType | null
  }

  export type TopicMinAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    description: string | null
    locale: $Enums.Locale | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TopicMaxAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    description: string | null
    locale: $Enums.Locale | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TopicCountAggregateOutputType = {
    id: number
    slug: number
    title: number
    description: number
    locale: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TopicMinAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    description?: true
    locale?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TopicMaxAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    description?: true
    locale?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TopicCountAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    description?: true
    locale?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TopicAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Topic to aggregate.
     */
    where?: TopicWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Topics to fetch.
     */
    orderBy?: TopicOrderByWithRelationInput | TopicOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TopicWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Topics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Topics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Topics
    **/
    _count?: true | TopicCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TopicMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TopicMaxAggregateInputType
  }

  export type GetTopicAggregateType<T extends TopicAggregateArgs> = {
        [P in keyof T & keyof AggregateTopic]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTopic[P]>
      : GetScalarType<T[P], AggregateTopic[P]>
  }




  export type TopicGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TopicWhereInput
    orderBy?: TopicOrderByWithAggregationInput | TopicOrderByWithAggregationInput[]
    by: TopicScalarFieldEnum[] | TopicScalarFieldEnum
    having?: TopicScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TopicCountAggregateInputType | true
    _min?: TopicMinAggregateInputType
    _max?: TopicMaxAggregateInputType
  }

  export type TopicGroupByOutputType = {
    id: string
    slug: string
    title: string
    description: string | null
    locale: $Enums.Locale
    createdAt: Date
    updatedAt: Date
    _count: TopicCountAggregateOutputType | null
    _min: TopicMinAggregateOutputType | null
    _max: TopicMaxAggregateOutputType | null
  }

  type GetTopicGroupByPayload<T extends TopicGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TopicGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TopicGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TopicGroupByOutputType[P]>
            : GetScalarType<T[P], TopicGroupByOutputType[P]>
        }
      >
    >


  export type TopicSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    locale?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    items?: boolean | Topic$itemsArgs<ExtArgs>
    tags?: boolean | Topic$tagsArgs<ExtArgs>
    _count?: boolean | TopicCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["topic"]>

  export type TopicSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    locale?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["topic"]>

  export type TopicSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    locale?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["topic"]>

  export type TopicSelectScalar = {
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    locale?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TopicOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "slug" | "title" | "description" | "locale" | "createdAt" | "updatedAt", ExtArgs["result"]["topic"]>
  export type TopicInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    items?: boolean | Topic$itemsArgs<ExtArgs>
    tags?: boolean | Topic$tagsArgs<ExtArgs>
    _count?: boolean | TopicCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TopicIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type TopicIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $TopicPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Topic"
    objects: {
      items: Prisma.$ContentItemPayload<ExtArgs>[]
      tags: Prisma.$TopicTagPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      slug: string
      title: string
      description: string | null
      locale: $Enums.Locale
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["topic"]>
    composites: {}
  }

  type TopicGetPayload<S extends boolean | null | undefined | TopicDefaultArgs> = $Result.GetResult<Prisma.$TopicPayload, S>

  type TopicCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TopicFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TopicCountAggregateInputType | true
    }

  export interface TopicDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Topic'], meta: { name: 'Topic' } }
    /**
     * Find zero or one Topic that matches the filter.
     * @param {TopicFindUniqueArgs} args - Arguments to find a Topic
     * @example
     * // Get one Topic
     * const topic = await prisma.topic.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TopicFindUniqueArgs>(args: SelectSubset<T, TopicFindUniqueArgs<ExtArgs>>): Prisma__TopicClient<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Topic that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TopicFindUniqueOrThrowArgs} args - Arguments to find a Topic
     * @example
     * // Get one Topic
     * const topic = await prisma.topic.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TopicFindUniqueOrThrowArgs>(args: SelectSubset<T, TopicFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TopicClient<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Topic that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicFindFirstArgs} args - Arguments to find a Topic
     * @example
     * // Get one Topic
     * const topic = await prisma.topic.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TopicFindFirstArgs>(args?: SelectSubset<T, TopicFindFirstArgs<ExtArgs>>): Prisma__TopicClient<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Topic that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicFindFirstOrThrowArgs} args - Arguments to find a Topic
     * @example
     * // Get one Topic
     * const topic = await prisma.topic.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TopicFindFirstOrThrowArgs>(args?: SelectSubset<T, TopicFindFirstOrThrowArgs<ExtArgs>>): Prisma__TopicClient<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Topics that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Topics
     * const topics = await prisma.topic.findMany()
     * 
     * // Get first 10 Topics
     * const topics = await prisma.topic.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const topicWithIdOnly = await prisma.topic.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TopicFindManyArgs>(args?: SelectSubset<T, TopicFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Topic.
     * @param {TopicCreateArgs} args - Arguments to create a Topic.
     * @example
     * // Create one Topic
     * const Topic = await prisma.topic.create({
     *   data: {
     *     // ... data to create a Topic
     *   }
     * })
     * 
     */
    create<T extends TopicCreateArgs>(args: SelectSubset<T, TopicCreateArgs<ExtArgs>>): Prisma__TopicClient<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Topics.
     * @param {TopicCreateManyArgs} args - Arguments to create many Topics.
     * @example
     * // Create many Topics
     * const topic = await prisma.topic.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TopicCreateManyArgs>(args?: SelectSubset<T, TopicCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Topics and returns the data saved in the database.
     * @param {TopicCreateManyAndReturnArgs} args - Arguments to create many Topics.
     * @example
     * // Create many Topics
     * const topic = await prisma.topic.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Topics and only return the `id`
     * const topicWithIdOnly = await prisma.topic.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TopicCreateManyAndReturnArgs>(args?: SelectSubset<T, TopicCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Topic.
     * @param {TopicDeleteArgs} args - Arguments to delete one Topic.
     * @example
     * // Delete one Topic
     * const Topic = await prisma.topic.delete({
     *   where: {
     *     // ... filter to delete one Topic
     *   }
     * })
     * 
     */
    delete<T extends TopicDeleteArgs>(args: SelectSubset<T, TopicDeleteArgs<ExtArgs>>): Prisma__TopicClient<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Topic.
     * @param {TopicUpdateArgs} args - Arguments to update one Topic.
     * @example
     * // Update one Topic
     * const topic = await prisma.topic.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TopicUpdateArgs>(args: SelectSubset<T, TopicUpdateArgs<ExtArgs>>): Prisma__TopicClient<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Topics.
     * @param {TopicDeleteManyArgs} args - Arguments to filter Topics to delete.
     * @example
     * // Delete a few Topics
     * const { count } = await prisma.topic.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TopicDeleteManyArgs>(args?: SelectSubset<T, TopicDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Topics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Topics
     * const topic = await prisma.topic.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TopicUpdateManyArgs>(args: SelectSubset<T, TopicUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Topics and returns the data updated in the database.
     * @param {TopicUpdateManyAndReturnArgs} args - Arguments to update many Topics.
     * @example
     * // Update many Topics
     * const topic = await prisma.topic.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Topics and only return the `id`
     * const topicWithIdOnly = await prisma.topic.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TopicUpdateManyAndReturnArgs>(args: SelectSubset<T, TopicUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Topic.
     * @param {TopicUpsertArgs} args - Arguments to update or create a Topic.
     * @example
     * // Update or create a Topic
     * const topic = await prisma.topic.upsert({
     *   create: {
     *     // ... data to create a Topic
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Topic we want to update
     *   }
     * })
     */
    upsert<T extends TopicUpsertArgs>(args: SelectSubset<T, TopicUpsertArgs<ExtArgs>>): Prisma__TopicClient<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Topics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicCountArgs} args - Arguments to filter Topics to count.
     * @example
     * // Count the number of Topics
     * const count = await prisma.topic.count({
     *   where: {
     *     // ... the filter for the Topics we want to count
     *   }
     * })
    **/
    count<T extends TopicCountArgs>(
      args?: Subset<T, TopicCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TopicCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Topic.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TopicAggregateArgs>(args: Subset<T, TopicAggregateArgs>): Prisma.PrismaPromise<GetTopicAggregateType<T>>

    /**
     * Group by Topic.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TopicGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TopicGroupByArgs['orderBy'] }
        : { orderBy?: TopicGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TopicGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTopicGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Topic model
   */
  readonly fields: TopicFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Topic.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TopicClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    items<T extends Topic$itemsArgs<ExtArgs> = {}>(args?: Subset<T, Topic$itemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    tags<T extends Topic$tagsArgs<ExtArgs> = {}>(args?: Subset<T, Topic$tagsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Topic model
   */
  interface TopicFieldRefs {
    readonly id: FieldRef<"Topic", 'String'>
    readonly slug: FieldRef<"Topic", 'String'>
    readonly title: FieldRef<"Topic", 'String'>
    readonly description: FieldRef<"Topic", 'String'>
    readonly locale: FieldRef<"Topic", 'Locale'>
    readonly createdAt: FieldRef<"Topic", 'DateTime'>
    readonly updatedAt: FieldRef<"Topic", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Topic findUnique
   */
  export type TopicFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicInclude<ExtArgs> | null
    /**
     * Filter, which Topic to fetch.
     */
    where: TopicWhereUniqueInput
  }

  /**
   * Topic findUniqueOrThrow
   */
  export type TopicFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicInclude<ExtArgs> | null
    /**
     * Filter, which Topic to fetch.
     */
    where: TopicWhereUniqueInput
  }

  /**
   * Topic findFirst
   */
  export type TopicFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicInclude<ExtArgs> | null
    /**
     * Filter, which Topic to fetch.
     */
    where?: TopicWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Topics to fetch.
     */
    orderBy?: TopicOrderByWithRelationInput | TopicOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Topics.
     */
    cursor?: TopicWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Topics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Topics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Topics.
     */
    distinct?: TopicScalarFieldEnum | TopicScalarFieldEnum[]
  }

  /**
   * Topic findFirstOrThrow
   */
  export type TopicFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicInclude<ExtArgs> | null
    /**
     * Filter, which Topic to fetch.
     */
    where?: TopicWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Topics to fetch.
     */
    orderBy?: TopicOrderByWithRelationInput | TopicOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Topics.
     */
    cursor?: TopicWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Topics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Topics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Topics.
     */
    distinct?: TopicScalarFieldEnum | TopicScalarFieldEnum[]
  }

  /**
   * Topic findMany
   */
  export type TopicFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicInclude<ExtArgs> | null
    /**
     * Filter, which Topics to fetch.
     */
    where?: TopicWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Topics to fetch.
     */
    orderBy?: TopicOrderByWithRelationInput | TopicOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Topics.
     */
    cursor?: TopicWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Topics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Topics.
     */
    skip?: number
    distinct?: TopicScalarFieldEnum | TopicScalarFieldEnum[]
  }

  /**
   * Topic create
   */
  export type TopicCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicInclude<ExtArgs> | null
    /**
     * The data needed to create a Topic.
     */
    data: XOR<TopicCreateInput, TopicUncheckedCreateInput>
  }

  /**
   * Topic createMany
   */
  export type TopicCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Topics.
     */
    data: TopicCreateManyInput | TopicCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Topic createManyAndReturn
   */
  export type TopicCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * The data used to create many Topics.
     */
    data: TopicCreateManyInput | TopicCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Topic update
   */
  export type TopicUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicInclude<ExtArgs> | null
    /**
     * The data needed to update a Topic.
     */
    data: XOR<TopicUpdateInput, TopicUncheckedUpdateInput>
    /**
     * Choose, which Topic to update.
     */
    where: TopicWhereUniqueInput
  }

  /**
   * Topic updateMany
   */
  export type TopicUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Topics.
     */
    data: XOR<TopicUpdateManyMutationInput, TopicUncheckedUpdateManyInput>
    /**
     * Filter which Topics to update
     */
    where?: TopicWhereInput
    /**
     * Limit how many Topics to update.
     */
    limit?: number
  }

  /**
   * Topic updateManyAndReturn
   */
  export type TopicUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * The data used to update Topics.
     */
    data: XOR<TopicUpdateManyMutationInput, TopicUncheckedUpdateManyInput>
    /**
     * Filter which Topics to update
     */
    where?: TopicWhereInput
    /**
     * Limit how many Topics to update.
     */
    limit?: number
  }

  /**
   * Topic upsert
   */
  export type TopicUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicInclude<ExtArgs> | null
    /**
     * The filter to search for the Topic to update in case it exists.
     */
    where: TopicWhereUniqueInput
    /**
     * In case the Topic found by the `where` argument doesn't exist, create a new Topic with this data.
     */
    create: XOR<TopicCreateInput, TopicUncheckedCreateInput>
    /**
     * In case the Topic was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TopicUpdateInput, TopicUncheckedUpdateInput>
  }

  /**
   * Topic delete
   */
  export type TopicDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicInclude<ExtArgs> | null
    /**
     * Filter which Topic to delete.
     */
    where: TopicWhereUniqueInput
  }

  /**
   * Topic deleteMany
   */
  export type TopicDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Topics to delete
     */
    where?: TopicWhereInput
    /**
     * Limit how many Topics to delete.
     */
    limit?: number
  }

  /**
   * Topic.items
   */
  export type Topic$itemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    where?: ContentItemWhereInput
    orderBy?: ContentItemOrderByWithRelationInput | ContentItemOrderByWithRelationInput[]
    cursor?: ContentItemWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ContentItemScalarFieldEnum | ContentItemScalarFieldEnum[]
  }

  /**
   * Topic.tags
   */
  export type Topic$tagsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    where?: TopicTagWhereInput
    orderBy?: TopicTagOrderByWithRelationInput | TopicTagOrderByWithRelationInput[]
    cursor?: TopicTagWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TopicTagScalarFieldEnum | TopicTagScalarFieldEnum[]
  }

  /**
   * Topic without action
   */
  export type TopicDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Topic
     */
    select?: TopicSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Topic
     */
    omit?: TopicOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicInclude<ExtArgs> | null
  }


  /**
   * Model Tag
   */

  export type AggregateTag = {
    _count: TagCountAggregateOutputType | null
    _min: TagMinAggregateOutputType | null
    _max: TagMaxAggregateOutputType | null
  }

  export type TagMinAggregateOutputType = {
    id: string | null
    slug: string | null
    label: string | null
  }

  export type TagMaxAggregateOutputType = {
    id: string | null
    slug: string | null
    label: string | null
  }

  export type TagCountAggregateOutputType = {
    id: number
    slug: number
    label: number
    _all: number
  }


  export type TagMinAggregateInputType = {
    id?: true
    slug?: true
    label?: true
  }

  export type TagMaxAggregateInputType = {
    id?: true
    slug?: true
    label?: true
  }

  export type TagCountAggregateInputType = {
    id?: true
    slug?: true
    label?: true
    _all?: true
  }

  export type TagAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tag to aggregate.
     */
    where?: TagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tags to fetch.
     */
    orderBy?: TagOrderByWithRelationInput | TagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Tags
    **/
    _count?: true | TagCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TagMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TagMaxAggregateInputType
  }

  export type GetTagAggregateType<T extends TagAggregateArgs> = {
        [P in keyof T & keyof AggregateTag]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTag[P]>
      : GetScalarType<T[P], AggregateTag[P]>
  }




  export type TagGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TagWhereInput
    orderBy?: TagOrderByWithAggregationInput | TagOrderByWithAggregationInput[]
    by: TagScalarFieldEnum[] | TagScalarFieldEnum
    having?: TagScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TagCountAggregateInputType | true
    _min?: TagMinAggregateInputType
    _max?: TagMaxAggregateInputType
  }

  export type TagGroupByOutputType = {
    id: string
    slug: string
    label: string
    _count: TagCountAggregateOutputType | null
    _min: TagMinAggregateOutputType | null
    _max: TagMaxAggregateOutputType | null
  }

  type GetTagGroupByPayload<T extends TagGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TagGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TagGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TagGroupByOutputType[P]>
            : GetScalarType<T[P], TagGroupByOutputType[P]>
        }
      >
    >


  export type TagSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    label?: boolean
    topics?: boolean | Tag$topicsArgs<ExtArgs>
    items?: boolean | Tag$itemsArgs<ExtArgs>
    _count?: boolean | TagCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tag"]>

  export type TagSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    label?: boolean
  }, ExtArgs["result"]["tag"]>

  export type TagSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    label?: boolean
  }, ExtArgs["result"]["tag"]>

  export type TagSelectScalar = {
    id?: boolean
    slug?: boolean
    label?: boolean
  }

  export type TagOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "slug" | "label", ExtArgs["result"]["tag"]>
  export type TagInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    topics?: boolean | Tag$topicsArgs<ExtArgs>
    items?: boolean | Tag$itemsArgs<ExtArgs>
    _count?: boolean | TagCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TagIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type TagIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $TagPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Tag"
    objects: {
      topics: Prisma.$TopicTagPayload<ExtArgs>[]
      items: Prisma.$ItemTagPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      slug: string
      label: string
    }, ExtArgs["result"]["tag"]>
    composites: {}
  }

  type TagGetPayload<S extends boolean | null | undefined | TagDefaultArgs> = $Result.GetResult<Prisma.$TagPayload, S>

  type TagCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TagFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TagCountAggregateInputType | true
    }

  export interface TagDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Tag'], meta: { name: 'Tag' } }
    /**
     * Find zero or one Tag that matches the filter.
     * @param {TagFindUniqueArgs} args - Arguments to find a Tag
     * @example
     * // Get one Tag
     * const tag = await prisma.tag.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TagFindUniqueArgs>(args: SelectSubset<T, TagFindUniqueArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Tag that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TagFindUniqueOrThrowArgs} args - Arguments to find a Tag
     * @example
     * // Get one Tag
     * const tag = await prisma.tag.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TagFindUniqueOrThrowArgs>(args: SelectSubset<T, TagFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Tag that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagFindFirstArgs} args - Arguments to find a Tag
     * @example
     * // Get one Tag
     * const tag = await prisma.tag.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TagFindFirstArgs>(args?: SelectSubset<T, TagFindFirstArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Tag that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagFindFirstOrThrowArgs} args - Arguments to find a Tag
     * @example
     * // Get one Tag
     * const tag = await prisma.tag.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TagFindFirstOrThrowArgs>(args?: SelectSubset<T, TagFindFirstOrThrowArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Tags that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tags
     * const tags = await prisma.tag.findMany()
     * 
     * // Get first 10 Tags
     * const tags = await prisma.tag.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const tagWithIdOnly = await prisma.tag.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TagFindManyArgs>(args?: SelectSubset<T, TagFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Tag.
     * @param {TagCreateArgs} args - Arguments to create a Tag.
     * @example
     * // Create one Tag
     * const Tag = await prisma.tag.create({
     *   data: {
     *     // ... data to create a Tag
     *   }
     * })
     * 
     */
    create<T extends TagCreateArgs>(args: SelectSubset<T, TagCreateArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Tags.
     * @param {TagCreateManyArgs} args - Arguments to create many Tags.
     * @example
     * // Create many Tags
     * const tag = await prisma.tag.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TagCreateManyArgs>(args?: SelectSubset<T, TagCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Tags and returns the data saved in the database.
     * @param {TagCreateManyAndReturnArgs} args - Arguments to create many Tags.
     * @example
     * // Create many Tags
     * const tag = await prisma.tag.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Tags and only return the `id`
     * const tagWithIdOnly = await prisma.tag.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TagCreateManyAndReturnArgs>(args?: SelectSubset<T, TagCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Tag.
     * @param {TagDeleteArgs} args - Arguments to delete one Tag.
     * @example
     * // Delete one Tag
     * const Tag = await prisma.tag.delete({
     *   where: {
     *     // ... filter to delete one Tag
     *   }
     * })
     * 
     */
    delete<T extends TagDeleteArgs>(args: SelectSubset<T, TagDeleteArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Tag.
     * @param {TagUpdateArgs} args - Arguments to update one Tag.
     * @example
     * // Update one Tag
     * const tag = await prisma.tag.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TagUpdateArgs>(args: SelectSubset<T, TagUpdateArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Tags.
     * @param {TagDeleteManyArgs} args - Arguments to filter Tags to delete.
     * @example
     * // Delete a few Tags
     * const { count } = await prisma.tag.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TagDeleteManyArgs>(args?: SelectSubset<T, TagDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tags
     * const tag = await prisma.tag.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TagUpdateManyArgs>(args: SelectSubset<T, TagUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Tags and returns the data updated in the database.
     * @param {TagUpdateManyAndReturnArgs} args - Arguments to update many Tags.
     * @example
     * // Update many Tags
     * const tag = await prisma.tag.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Tags and only return the `id`
     * const tagWithIdOnly = await prisma.tag.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TagUpdateManyAndReturnArgs>(args: SelectSubset<T, TagUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Tag.
     * @param {TagUpsertArgs} args - Arguments to update or create a Tag.
     * @example
     * // Update or create a Tag
     * const tag = await prisma.tag.upsert({
     *   create: {
     *     // ... data to create a Tag
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Tag we want to update
     *   }
     * })
     */
    upsert<T extends TagUpsertArgs>(args: SelectSubset<T, TagUpsertArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Tags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagCountArgs} args - Arguments to filter Tags to count.
     * @example
     * // Count the number of Tags
     * const count = await prisma.tag.count({
     *   where: {
     *     // ... the filter for the Tags we want to count
     *   }
     * })
    **/
    count<T extends TagCountArgs>(
      args?: Subset<T, TagCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TagCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Tag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TagAggregateArgs>(args: Subset<T, TagAggregateArgs>): Prisma.PrismaPromise<GetTagAggregateType<T>>

    /**
     * Group by Tag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TagGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TagGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TagGroupByArgs['orderBy'] }
        : { orderBy?: TagGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TagGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTagGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Tag model
   */
  readonly fields: TagFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Tag.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TagClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    topics<T extends Tag$topicsArgs<ExtArgs> = {}>(args?: Subset<T, Tag$topicsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    items<T extends Tag$itemsArgs<ExtArgs> = {}>(args?: Subset<T, Tag$itemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Tag model
   */
  interface TagFieldRefs {
    readonly id: FieldRef<"Tag", 'String'>
    readonly slug: FieldRef<"Tag", 'String'>
    readonly label: FieldRef<"Tag", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Tag findUnique
   */
  export type TagFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter, which Tag to fetch.
     */
    where: TagWhereUniqueInput
  }

  /**
   * Tag findUniqueOrThrow
   */
  export type TagFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter, which Tag to fetch.
     */
    where: TagWhereUniqueInput
  }

  /**
   * Tag findFirst
   */
  export type TagFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter, which Tag to fetch.
     */
    where?: TagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tags to fetch.
     */
    orderBy?: TagOrderByWithRelationInput | TagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tags.
     */
    cursor?: TagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tags.
     */
    distinct?: TagScalarFieldEnum | TagScalarFieldEnum[]
  }

  /**
   * Tag findFirstOrThrow
   */
  export type TagFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter, which Tag to fetch.
     */
    where?: TagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tags to fetch.
     */
    orderBy?: TagOrderByWithRelationInput | TagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Tags.
     */
    cursor?: TagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Tags.
     */
    distinct?: TagScalarFieldEnum | TagScalarFieldEnum[]
  }

  /**
   * Tag findMany
   */
  export type TagFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter, which Tags to fetch.
     */
    where?: TagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Tags to fetch.
     */
    orderBy?: TagOrderByWithRelationInput | TagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Tags.
     */
    cursor?: TagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Tags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Tags.
     */
    skip?: number
    distinct?: TagScalarFieldEnum | TagScalarFieldEnum[]
  }

  /**
   * Tag create
   */
  export type TagCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * The data needed to create a Tag.
     */
    data: XOR<TagCreateInput, TagUncheckedCreateInput>
  }

  /**
   * Tag createMany
   */
  export type TagCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Tags.
     */
    data: TagCreateManyInput | TagCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Tag createManyAndReturn
   */
  export type TagCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * The data used to create many Tags.
     */
    data: TagCreateManyInput | TagCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Tag update
   */
  export type TagUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * The data needed to update a Tag.
     */
    data: XOR<TagUpdateInput, TagUncheckedUpdateInput>
    /**
     * Choose, which Tag to update.
     */
    where: TagWhereUniqueInput
  }

  /**
   * Tag updateMany
   */
  export type TagUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Tags.
     */
    data: XOR<TagUpdateManyMutationInput, TagUncheckedUpdateManyInput>
    /**
     * Filter which Tags to update
     */
    where?: TagWhereInput
    /**
     * Limit how many Tags to update.
     */
    limit?: number
  }

  /**
   * Tag updateManyAndReturn
   */
  export type TagUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * The data used to update Tags.
     */
    data: XOR<TagUpdateManyMutationInput, TagUncheckedUpdateManyInput>
    /**
     * Filter which Tags to update
     */
    where?: TagWhereInput
    /**
     * Limit how many Tags to update.
     */
    limit?: number
  }

  /**
   * Tag upsert
   */
  export type TagUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * The filter to search for the Tag to update in case it exists.
     */
    where: TagWhereUniqueInput
    /**
     * In case the Tag found by the `where` argument doesn't exist, create a new Tag with this data.
     */
    create: XOR<TagCreateInput, TagUncheckedCreateInput>
    /**
     * In case the Tag was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TagUpdateInput, TagUncheckedUpdateInput>
  }

  /**
   * Tag delete
   */
  export type TagDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TagInclude<ExtArgs> | null
    /**
     * Filter which Tag to delete.
     */
    where: TagWhereUniqueInput
  }

  /**
   * Tag deleteMany
   */
  export type TagDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Tags to delete
     */
    where?: TagWhereInput
    /**
     * Limit how many Tags to delete.
     */
    limit?: number
  }

  /**
   * Tag.topics
   */
  export type Tag$topicsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    where?: TopicTagWhereInput
    orderBy?: TopicTagOrderByWithRelationInput | TopicTagOrderByWithRelationInput[]
    cursor?: TopicTagWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TopicTagScalarFieldEnum | TopicTagScalarFieldEnum[]
  }

  /**
   * Tag.items
   */
  export type Tag$itemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    where?: ItemTagWhereInput
    orderBy?: ItemTagOrderByWithRelationInput | ItemTagOrderByWithRelationInput[]
    cursor?: ItemTagWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ItemTagScalarFieldEnum | ItemTagScalarFieldEnum[]
  }

  /**
   * Tag without action
   */
  export type TagDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Tag
     */
    select?: TagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Tag
     */
    omit?: TagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TagInclude<ExtArgs> | null
  }


  /**
   * Model TopicTag
   */

  export type AggregateTopicTag = {
    _count: TopicTagCountAggregateOutputType | null
    _min: TopicTagMinAggregateOutputType | null
    _max: TopicTagMaxAggregateOutputType | null
  }

  export type TopicTagMinAggregateOutputType = {
    id: string | null
    topicId: string | null
    tagId: string | null
  }

  export type TopicTagMaxAggregateOutputType = {
    id: string | null
    topicId: string | null
    tagId: string | null
  }

  export type TopicTagCountAggregateOutputType = {
    id: number
    topicId: number
    tagId: number
    _all: number
  }


  export type TopicTagMinAggregateInputType = {
    id?: true
    topicId?: true
    tagId?: true
  }

  export type TopicTagMaxAggregateInputType = {
    id?: true
    topicId?: true
    tagId?: true
  }

  export type TopicTagCountAggregateInputType = {
    id?: true
    topicId?: true
    tagId?: true
    _all?: true
  }

  export type TopicTagAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TopicTag to aggregate.
     */
    where?: TopicTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TopicTags to fetch.
     */
    orderBy?: TopicTagOrderByWithRelationInput | TopicTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TopicTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TopicTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TopicTags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TopicTags
    **/
    _count?: true | TopicTagCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TopicTagMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TopicTagMaxAggregateInputType
  }

  export type GetTopicTagAggregateType<T extends TopicTagAggregateArgs> = {
        [P in keyof T & keyof AggregateTopicTag]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTopicTag[P]>
      : GetScalarType<T[P], AggregateTopicTag[P]>
  }




  export type TopicTagGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TopicTagWhereInput
    orderBy?: TopicTagOrderByWithAggregationInput | TopicTagOrderByWithAggregationInput[]
    by: TopicTagScalarFieldEnum[] | TopicTagScalarFieldEnum
    having?: TopicTagScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TopicTagCountAggregateInputType | true
    _min?: TopicTagMinAggregateInputType
    _max?: TopicTagMaxAggregateInputType
  }

  export type TopicTagGroupByOutputType = {
    id: string
    topicId: string
    tagId: string
    _count: TopicTagCountAggregateOutputType | null
    _min: TopicTagMinAggregateOutputType | null
    _max: TopicTagMaxAggregateOutputType | null
  }

  type GetTopicTagGroupByPayload<T extends TopicTagGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TopicTagGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TopicTagGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TopicTagGroupByOutputType[P]>
            : GetScalarType<T[P], TopicTagGroupByOutputType[P]>
        }
      >
    >


  export type TopicTagSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    topicId?: boolean
    tagId?: boolean
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["topicTag"]>

  export type TopicTagSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    topicId?: boolean
    tagId?: boolean
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["topicTag"]>

  export type TopicTagSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    topicId?: boolean
    tagId?: boolean
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["topicTag"]>

  export type TopicTagSelectScalar = {
    id?: boolean
    topicId?: boolean
    tagId?: boolean
  }

  export type TopicTagOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "topicId" | "tagId", ExtArgs["result"]["topicTag"]>
  export type TopicTagInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }
  export type TopicTagIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }
  export type TopicTagIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }

  export type $TopicTagPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TopicTag"
    objects: {
      topic: Prisma.$TopicPayload<ExtArgs>
      tag: Prisma.$TagPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      topicId: string
      tagId: string
    }, ExtArgs["result"]["topicTag"]>
    composites: {}
  }

  type TopicTagGetPayload<S extends boolean | null | undefined | TopicTagDefaultArgs> = $Result.GetResult<Prisma.$TopicTagPayload, S>

  type TopicTagCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TopicTagFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TopicTagCountAggregateInputType | true
    }

  export interface TopicTagDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TopicTag'], meta: { name: 'TopicTag' } }
    /**
     * Find zero or one TopicTag that matches the filter.
     * @param {TopicTagFindUniqueArgs} args - Arguments to find a TopicTag
     * @example
     * // Get one TopicTag
     * const topicTag = await prisma.topicTag.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TopicTagFindUniqueArgs>(args: SelectSubset<T, TopicTagFindUniqueArgs<ExtArgs>>): Prisma__TopicTagClient<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TopicTag that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TopicTagFindUniqueOrThrowArgs} args - Arguments to find a TopicTag
     * @example
     * // Get one TopicTag
     * const topicTag = await prisma.topicTag.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TopicTagFindUniqueOrThrowArgs>(args: SelectSubset<T, TopicTagFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TopicTagClient<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TopicTag that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicTagFindFirstArgs} args - Arguments to find a TopicTag
     * @example
     * // Get one TopicTag
     * const topicTag = await prisma.topicTag.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TopicTagFindFirstArgs>(args?: SelectSubset<T, TopicTagFindFirstArgs<ExtArgs>>): Prisma__TopicTagClient<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TopicTag that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicTagFindFirstOrThrowArgs} args - Arguments to find a TopicTag
     * @example
     * // Get one TopicTag
     * const topicTag = await prisma.topicTag.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TopicTagFindFirstOrThrowArgs>(args?: SelectSubset<T, TopicTagFindFirstOrThrowArgs<ExtArgs>>): Prisma__TopicTagClient<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TopicTags that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicTagFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TopicTags
     * const topicTags = await prisma.topicTag.findMany()
     * 
     * // Get first 10 TopicTags
     * const topicTags = await prisma.topicTag.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const topicTagWithIdOnly = await prisma.topicTag.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TopicTagFindManyArgs>(args?: SelectSubset<T, TopicTagFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TopicTag.
     * @param {TopicTagCreateArgs} args - Arguments to create a TopicTag.
     * @example
     * // Create one TopicTag
     * const TopicTag = await prisma.topicTag.create({
     *   data: {
     *     // ... data to create a TopicTag
     *   }
     * })
     * 
     */
    create<T extends TopicTagCreateArgs>(args: SelectSubset<T, TopicTagCreateArgs<ExtArgs>>): Prisma__TopicTagClient<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TopicTags.
     * @param {TopicTagCreateManyArgs} args - Arguments to create many TopicTags.
     * @example
     * // Create many TopicTags
     * const topicTag = await prisma.topicTag.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TopicTagCreateManyArgs>(args?: SelectSubset<T, TopicTagCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TopicTags and returns the data saved in the database.
     * @param {TopicTagCreateManyAndReturnArgs} args - Arguments to create many TopicTags.
     * @example
     * // Create many TopicTags
     * const topicTag = await prisma.topicTag.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TopicTags and only return the `id`
     * const topicTagWithIdOnly = await prisma.topicTag.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TopicTagCreateManyAndReturnArgs>(args?: SelectSubset<T, TopicTagCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a TopicTag.
     * @param {TopicTagDeleteArgs} args - Arguments to delete one TopicTag.
     * @example
     * // Delete one TopicTag
     * const TopicTag = await prisma.topicTag.delete({
     *   where: {
     *     // ... filter to delete one TopicTag
     *   }
     * })
     * 
     */
    delete<T extends TopicTagDeleteArgs>(args: SelectSubset<T, TopicTagDeleteArgs<ExtArgs>>): Prisma__TopicTagClient<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TopicTag.
     * @param {TopicTagUpdateArgs} args - Arguments to update one TopicTag.
     * @example
     * // Update one TopicTag
     * const topicTag = await prisma.topicTag.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TopicTagUpdateArgs>(args: SelectSubset<T, TopicTagUpdateArgs<ExtArgs>>): Prisma__TopicTagClient<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TopicTags.
     * @param {TopicTagDeleteManyArgs} args - Arguments to filter TopicTags to delete.
     * @example
     * // Delete a few TopicTags
     * const { count } = await prisma.topicTag.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TopicTagDeleteManyArgs>(args?: SelectSubset<T, TopicTagDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TopicTags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicTagUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TopicTags
     * const topicTag = await prisma.topicTag.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TopicTagUpdateManyArgs>(args: SelectSubset<T, TopicTagUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TopicTags and returns the data updated in the database.
     * @param {TopicTagUpdateManyAndReturnArgs} args - Arguments to update many TopicTags.
     * @example
     * // Update many TopicTags
     * const topicTag = await prisma.topicTag.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more TopicTags and only return the `id`
     * const topicTagWithIdOnly = await prisma.topicTag.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends TopicTagUpdateManyAndReturnArgs>(args: SelectSubset<T, TopicTagUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one TopicTag.
     * @param {TopicTagUpsertArgs} args - Arguments to update or create a TopicTag.
     * @example
     * // Update or create a TopicTag
     * const topicTag = await prisma.topicTag.upsert({
     *   create: {
     *     // ... data to create a TopicTag
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TopicTag we want to update
     *   }
     * })
     */
    upsert<T extends TopicTagUpsertArgs>(args: SelectSubset<T, TopicTagUpsertArgs<ExtArgs>>): Prisma__TopicTagClient<$Result.GetResult<Prisma.$TopicTagPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TopicTags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicTagCountArgs} args - Arguments to filter TopicTags to count.
     * @example
     * // Count the number of TopicTags
     * const count = await prisma.topicTag.count({
     *   where: {
     *     // ... the filter for the TopicTags we want to count
     *   }
     * })
    **/
    count<T extends TopicTagCountArgs>(
      args?: Subset<T, TopicTagCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TopicTagCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TopicTag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicTagAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TopicTagAggregateArgs>(args: Subset<T, TopicTagAggregateArgs>): Prisma.PrismaPromise<GetTopicTagAggregateType<T>>

    /**
     * Group by TopicTag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TopicTagGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TopicTagGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TopicTagGroupByArgs['orderBy'] }
        : { orderBy?: TopicTagGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TopicTagGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTopicTagGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TopicTag model
   */
  readonly fields: TopicTagFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TopicTag.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TopicTagClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    topic<T extends TopicDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TopicDefaultArgs<ExtArgs>>): Prisma__TopicClient<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    tag<T extends TagDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TagDefaultArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TopicTag model
   */
  interface TopicTagFieldRefs {
    readonly id: FieldRef<"TopicTag", 'String'>
    readonly topicId: FieldRef<"TopicTag", 'String'>
    readonly tagId: FieldRef<"TopicTag", 'String'>
  }
    

  // Custom InputTypes
  /**
   * TopicTag findUnique
   */
  export type TopicTagFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    /**
     * Filter, which TopicTag to fetch.
     */
    where: TopicTagWhereUniqueInput
  }

  /**
   * TopicTag findUniqueOrThrow
   */
  export type TopicTagFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    /**
     * Filter, which TopicTag to fetch.
     */
    where: TopicTagWhereUniqueInput
  }

  /**
   * TopicTag findFirst
   */
  export type TopicTagFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    /**
     * Filter, which TopicTag to fetch.
     */
    where?: TopicTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TopicTags to fetch.
     */
    orderBy?: TopicTagOrderByWithRelationInput | TopicTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TopicTags.
     */
    cursor?: TopicTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TopicTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TopicTags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TopicTags.
     */
    distinct?: TopicTagScalarFieldEnum | TopicTagScalarFieldEnum[]
  }

  /**
   * TopicTag findFirstOrThrow
   */
  export type TopicTagFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    /**
     * Filter, which TopicTag to fetch.
     */
    where?: TopicTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TopicTags to fetch.
     */
    orderBy?: TopicTagOrderByWithRelationInput | TopicTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TopicTags.
     */
    cursor?: TopicTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TopicTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TopicTags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TopicTags.
     */
    distinct?: TopicTagScalarFieldEnum | TopicTagScalarFieldEnum[]
  }

  /**
   * TopicTag findMany
   */
  export type TopicTagFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    /**
     * Filter, which TopicTags to fetch.
     */
    where?: TopicTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TopicTags to fetch.
     */
    orderBy?: TopicTagOrderByWithRelationInput | TopicTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TopicTags.
     */
    cursor?: TopicTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TopicTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TopicTags.
     */
    skip?: number
    distinct?: TopicTagScalarFieldEnum | TopicTagScalarFieldEnum[]
  }

  /**
   * TopicTag create
   */
  export type TopicTagCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    /**
     * The data needed to create a TopicTag.
     */
    data: XOR<TopicTagCreateInput, TopicTagUncheckedCreateInput>
  }

  /**
   * TopicTag createMany
   */
  export type TopicTagCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TopicTags.
     */
    data: TopicTagCreateManyInput | TopicTagCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TopicTag createManyAndReturn
   */
  export type TopicTagCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * The data used to create many TopicTags.
     */
    data: TopicTagCreateManyInput | TopicTagCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TopicTag update
   */
  export type TopicTagUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    /**
     * The data needed to update a TopicTag.
     */
    data: XOR<TopicTagUpdateInput, TopicTagUncheckedUpdateInput>
    /**
     * Choose, which TopicTag to update.
     */
    where: TopicTagWhereUniqueInput
  }

  /**
   * TopicTag updateMany
   */
  export type TopicTagUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TopicTags.
     */
    data: XOR<TopicTagUpdateManyMutationInput, TopicTagUncheckedUpdateManyInput>
    /**
     * Filter which TopicTags to update
     */
    where?: TopicTagWhereInput
    /**
     * Limit how many TopicTags to update.
     */
    limit?: number
  }

  /**
   * TopicTag updateManyAndReturn
   */
  export type TopicTagUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * The data used to update TopicTags.
     */
    data: XOR<TopicTagUpdateManyMutationInput, TopicTagUncheckedUpdateManyInput>
    /**
     * Filter which TopicTags to update
     */
    where?: TopicTagWhereInput
    /**
     * Limit how many TopicTags to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * TopicTag upsert
   */
  export type TopicTagUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    /**
     * The filter to search for the TopicTag to update in case it exists.
     */
    where: TopicTagWhereUniqueInput
    /**
     * In case the TopicTag found by the `where` argument doesn't exist, create a new TopicTag with this data.
     */
    create: XOR<TopicTagCreateInput, TopicTagUncheckedCreateInput>
    /**
     * In case the TopicTag was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TopicTagUpdateInput, TopicTagUncheckedUpdateInput>
  }

  /**
   * TopicTag delete
   */
  export type TopicTagDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
    /**
     * Filter which TopicTag to delete.
     */
    where: TopicTagWhereUniqueInput
  }

  /**
   * TopicTag deleteMany
   */
  export type TopicTagDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TopicTags to delete
     */
    where?: TopicTagWhereInput
    /**
     * Limit how many TopicTags to delete.
     */
    limit?: number
  }

  /**
   * TopicTag without action
   */
  export type TopicTagDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TopicTag
     */
    select?: TopicTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TopicTag
     */
    omit?: TopicTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TopicTagInclude<ExtArgs> | null
  }


  /**
   * Model ItemTag
   */

  export type AggregateItemTag = {
    _count: ItemTagCountAggregateOutputType | null
    _min: ItemTagMinAggregateOutputType | null
    _max: ItemTagMaxAggregateOutputType | null
  }

  export type ItemTagMinAggregateOutputType = {
    id: string | null
    itemId: string | null
    tagId: string | null
  }

  export type ItemTagMaxAggregateOutputType = {
    id: string | null
    itemId: string | null
    tagId: string | null
  }

  export type ItemTagCountAggregateOutputType = {
    id: number
    itemId: number
    tagId: number
    _all: number
  }


  export type ItemTagMinAggregateInputType = {
    id?: true
    itemId?: true
    tagId?: true
  }

  export type ItemTagMaxAggregateInputType = {
    id?: true
    itemId?: true
    tagId?: true
  }

  export type ItemTagCountAggregateInputType = {
    id?: true
    itemId?: true
    tagId?: true
    _all?: true
  }

  export type ItemTagAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ItemTag to aggregate.
     */
    where?: ItemTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemTags to fetch.
     */
    orderBy?: ItemTagOrderByWithRelationInput | ItemTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ItemTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemTags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ItemTags
    **/
    _count?: true | ItemTagCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ItemTagMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ItemTagMaxAggregateInputType
  }

  export type GetItemTagAggregateType<T extends ItemTagAggregateArgs> = {
        [P in keyof T & keyof AggregateItemTag]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateItemTag[P]>
      : GetScalarType<T[P], AggregateItemTag[P]>
  }




  export type ItemTagGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ItemTagWhereInput
    orderBy?: ItemTagOrderByWithAggregationInput | ItemTagOrderByWithAggregationInput[]
    by: ItemTagScalarFieldEnum[] | ItemTagScalarFieldEnum
    having?: ItemTagScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ItemTagCountAggregateInputType | true
    _min?: ItemTagMinAggregateInputType
    _max?: ItemTagMaxAggregateInputType
  }

  export type ItemTagGroupByOutputType = {
    id: string
    itemId: string
    tagId: string
    _count: ItemTagCountAggregateOutputType | null
    _min: ItemTagMinAggregateOutputType | null
    _max: ItemTagMaxAggregateOutputType | null
  }

  type GetItemTagGroupByPayload<T extends ItemTagGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ItemTagGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ItemTagGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ItemTagGroupByOutputType[P]>
            : GetScalarType<T[P], ItemTagGroupByOutputType[P]>
        }
      >
    >


  export type ItemTagSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    itemId?: boolean
    tagId?: boolean
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["itemTag"]>

  export type ItemTagSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    itemId?: boolean
    tagId?: boolean
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["itemTag"]>

  export type ItemTagSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    itemId?: boolean
    tagId?: boolean
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["itemTag"]>

  export type ItemTagSelectScalar = {
    id?: boolean
    itemId?: boolean
    tagId?: boolean
  }

  export type ItemTagOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "itemId" | "tagId", ExtArgs["result"]["itemTag"]>
  export type ItemTagInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }
  export type ItemTagIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }
  export type ItemTagIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
    tag?: boolean | TagDefaultArgs<ExtArgs>
  }

  export type $ItemTagPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ItemTag"
    objects: {
      item: Prisma.$ContentItemPayload<ExtArgs>
      tag: Prisma.$TagPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      itemId: string
      tagId: string
    }, ExtArgs["result"]["itemTag"]>
    composites: {}
  }

  type ItemTagGetPayload<S extends boolean | null | undefined | ItemTagDefaultArgs> = $Result.GetResult<Prisma.$ItemTagPayload, S>

  type ItemTagCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ItemTagFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ItemTagCountAggregateInputType | true
    }

  export interface ItemTagDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ItemTag'], meta: { name: 'ItemTag' } }
    /**
     * Find zero or one ItemTag that matches the filter.
     * @param {ItemTagFindUniqueArgs} args - Arguments to find a ItemTag
     * @example
     * // Get one ItemTag
     * const itemTag = await prisma.itemTag.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ItemTagFindUniqueArgs>(args: SelectSubset<T, ItemTagFindUniqueArgs<ExtArgs>>): Prisma__ItemTagClient<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ItemTag that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ItemTagFindUniqueOrThrowArgs} args - Arguments to find a ItemTag
     * @example
     * // Get one ItemTag
     * const itemTag = await prisma.itemTag.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ItemTagFindUniqueOrThrowArgs>(args: SelectSubset<T, ItemTagFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ItemTagClient<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ItemTag that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemTagFindFirstArgs} args - Arguments to find a ItemTag
     * @example
     * // Get one ItemTag
     * const itemTag = await prisma.itemTag.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ItemTagFindFirstArgs>(args?: SelectSubset<T, ItemTagFindFirstArgs<ExtArgs>>): Prisma__ItemTagClient<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ItemTag that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemTagFindFirstOrThrowArgs} args - Arguments to find a ItemTag
     * @example
     * // Get one ItemTag
     * const itemTag = await prisma.itemTag.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ItemTagFindFirstOrThrowArgs>(args?: SelectSubset<T, ItemTagFindFirstOrThrowArgs<ExtArgs>>): Prisma__ItemTagClient<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ItemTags that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemTagFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ItemTags
     * const itemTags = await prisma.itemTag.findMany()
     * 
     * // Get first 10 ItemTags
     * const itemTags = await prisma.itemTag.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const itemTagWithIdOnly = await prisma.itemTag.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ItemTagFindManyArgs>(args?: SelectSubset<T, ItemTagFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ItemTag.
     * @param {ItemTagCreateArgs} args - Arguments to create a ItemTag.
     * @example
     * // Create one ItemTag
     * const ItemTag = await prisma.itemTag.create({
     *   data: {
     *     // ... data to create a ItemTag
     *   }
     * })
     * 
     */
    create<T extends ItemTagCreateArgs>(args: SelectSubset<T, ItemTagCreateArgs<ExtArgs>>): Prisma__ItemTagClient<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ItemTags.
     * @param {ItemTagCreateManyArgs} args - Arguments to create many ItemTags.
     * @example
     * // Create many ItemTags
     * const itemTag = await prisma.itemTag.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ItemTagCreateManyArgs>(args?: SelectSubset<T, ItemTagCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ItemTags and returns the data saved in the database.
     * @param {ItemTagCreateManyAndReturnArgs} args - Arguments to create many ItemTags.
     * @example
     * // Create many ItemTags
     * const itemTag = await prisma.itemTag.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ItemTags and only return the `id`
     * const itemTagWithIdOnly = await prisma.itemTag.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ItemTagCreateManyAndReturnArgs>(args?: SelectSubset<T, ItemTagCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ItemTag.
     * @param {ItemTagDeleteArgs} args - Arguments to delete one ItemTag.
     * @example
     * // Delete one ItemTag
     * const ItemTag = await prisma.itemTag.delete({
     *   where: {
     *     // ... filter to delete one ItemTag
     *   }
     * })
     * 
     */
    delete<T extends ItemTagDeleteArgs>(args: SelectSubset<T, ItemTagDeleteArgs<ExtArgs>>): Prisma__ItemTagClient<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ItemTag.
     * @param {ItemTagUpdateArgs} args - Arguments to update one ItemTag.
     * @example
     * // Update one ItemTag
     * const itemTag = await prisma.itemTag.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ItemTagUpdateArgs>(args: SelectSubset<T, ItemTagUpdateArgs<ExtArgs>>): Prisma__ItemTagClient<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ItemTags.
     * @param {ItemTagDeleteManyArgs} args - Arguments to filter ItemTags to delete.
     * @example
     * // Delete a few ItemTags
     * const { count } = await prisma.itemTag.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ItemTagDeleteManyArgs>(args?: SelectSubset<T, ItemTagDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ItemTags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemTagUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ItemTags
     * const itemTag = await prisma.itemTag.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ItemTagUpdateManyArgs>(args: SelectSubset<T, ItemTagUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ItemTags and returns the data updated in the database.
     * @param {ItemTagUpdateManyAndReturnArgs} args - Arguments to update many ItemTags.
     * @example
     * // Update many ItemTags
     * const itemTag = await prisma.itemTag.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ItemTags and only return the `id`
     * const itemTagWithIdOnly = await prisma.itemTag.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ItemTagUpdateManyAndReturnArgs>(args: SelectSubset<T, ItemTagUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ItemTag.
     * @param {ItemTagUpsertArgs} args - Arguments to update or create a ItemTag.
     * @example
     * // Update or create a ItemTag
     * const itemTag = await prisma.itemTag.upsert({
     *   create: {
     *     // ... data to create a ItemTag
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ItemTag we want to update
     *   }
     * })
     */
    upsert<T extends ItemTagUpsertArgs>(args: SelectSubset<T, ItemTagUpsertArgs<ExtArgs>>): Prisma__ItemTagClient<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ItemTags.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemTagCountArgs} args - Arguments to filter ItemTags to count.
     * @example
     * // Count the number of ItemTags
     * const count = await prisma.itemTag.count({
     *   where: {
     *     // ... the filter for the ItemTags we want to count
     *   }
     * })
    **/
    count<T extends ItemTagCountArgs>(
      args?: Subset<T, ItemTagCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ItemTagCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ItemTag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemTagAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ItemTagAggregateArgs>(args: Subset<T, ItemTagAggregateArgs>): Prisma.PrismaPromise<GetItemTagAggregateType<T>>

    /**
     * Group by ItemTag.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItemTagGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ItemTagGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ItemTagGroupByArgs['orderBy'] }
        : { orderBy?: ItemTagGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ItemTagGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetItemTagGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ItemTag model
   */
  readonly fields: ItemTagFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ItemTag.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ItemTagClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    item<T extends ContentItemDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ContentItemDefaultArgs<ExtArgs>>): Prisma__ContentItemClient<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    tag<T extends TagDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TagDefaultArgs<ExtArgs>>): Prisma__TagClient<$Result.GetResult<Prisma.$TagPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ItemTag model
   */
  interface ItemTagFieldRefs {
    readonly id: FieldRef<"ItemTag", 'String'>
    readonly itemId: FieldRef<"ItemTag", 'String'>
    readonly tagId: FieldRef<"ItemTag", 'String'>
  }
    

  // Custom InputTypes
  /**
   * ItemTag findUnique
   */
  export type ItemTagFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    /**
     * Filter, which ItemTag to fetch.
     */
    where: ItemTagWhereUniqueInput
  }

  /**
   * ItemTag findUniqueOrThrow
   */
  export type ItemTagFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    /**
     * Filter, which ItemTag to fetch.
     */
    where: ItemTagWhereUniqueInput
  }

  /**
   * ItemTag findFirst
   */
  export type ItemTagFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    /**
     * Filter, which ItemTag to fetch.
     */
    where?: ItemTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemTags to fetch.
     */
    orderBy?: ItemTagOrderByWithRelationInput | ItemTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ItemTags.
     */
    cursor?: ItemTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemTags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ItemTags.
     */
    distinct?: ItemTagScalarFieldEnum | ItemTagScalarFieldEnum[]
  }

  /**
   * ItemTag findFirstOrThrow
   */
  export type ItemTagFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    /**
     * Filter, which ItemTag to fetch.
     */
    where?: ItemTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemTags to fetch.
     */
    orderBy?: ItemTagOrderByWithRelationInput | ItemTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ItemTags.
     */
    cursor?: ItemTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemTags.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ItemTags.
     */
    distinct?: ItemTagScalarFieldEnum | ItemTagScalarFieldEnum[]
  }

  /**
   * ItemTag findMany
   */
  export type ItemTagFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    /**
     * Filter, which ItemTags to fetch.
     */
    where?: ItemTagWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItemTags to fetch.
     */
    orderBy?: ItemTagOrderByWithRelationInput | ItemTagOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ItemTags.
     */
    cursor?: ItemTagWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItemTags from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItemTags.
     */
    skip?: number
    distinct?: ItemTagScalarFieldEnum | ItemTagScalarFieldEnum[]
  }

  /**
   * ItemTag create
   */
  export type ItemTagCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    /**
     * The data needed to create a ItemTag.
     */
    data: XOR<ItemTagCreateInput, ItemTagUncheckedCreateInput>
  }

  /**
   * ItemTag createMany
   */
  export type ItemTagCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ItemTags.
     */
    data: ItemTagCreateManyInput | ItemTagCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ItemTag createManyAndReturn
   */
  export type ItemTagCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * The data used to create many ItemTags.
     */
    data: ItemTagCreateManyInput | ItemTagCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ItemTag update
   */
  export type ItemTagUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    /**
     * The data needed to update a ItemTag.
     */
    data: XOR<ItemTagUpdateInput, ItemTagUncheckedUpdateInput>
    /**
     * Choose, which ItemTag to update.
     */
    where: ItemTagWhereUniqueInput
  }

  /**
   * ItemTag updateMany
   */
  export type ItemTagUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ItemTags.
     */
    data: XOR<ItemTagUpdateManyMutationInput, ItemTagUncheckedUpdateManyInput>
    /**
     * Filter which ItemTags to update
     */
    where?: ItemTagWhereInput
    /**
     * Limit how many ItemTags to update.
     */
    limit?: number
  }

  /**
   * ItemTag updateManyAndReturn
   */
  export type ItemTagUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * The data used to update ItemTags.
     */
    data: XOR<ItemTagUpdateManyMutationInput, ItemTagUncheckedUpdateManyInput>
    /**
     * Filter which ItemTags to update
     */
    where?: ItemTagWhereInput
    /**
     * Limit how many ItemTags to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ItemTag upsert
   */
  export type ItemTagUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    /**
     * The filter to search for the ItemTag to update in case it exists.
     */
    where: ItemTagWhereUniqueInput
    /**
     * In case the ItemTag found by the `where` argument doesn't exist, create a new ItemTag with this data.
     */
    create: XOR<ItemTagCreateInput, ItemTagUncheckedCreateInput>
    /**
     * In case the ItemTag was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ItemTagUpdateInput, ItemTagUncheckedUpdateInput>
  }

  /**
   * ItemTag delete
   */
  export type ItemTagDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    /**
     * Filter which ItemTag to delete.
     */
    where: ItemTagWhereUniqueInput
  }

  /**
   * ItemTag deleteMany
   */
  export type ItemTagDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ItemTags to delete
     */
    where?: ItemTagWhereInput
    /**
     * Limit how many ItemTags to delete.
     */
    limit?: number
  }

  /**
   * ItemTag without action
   */
  export type ItemTagDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
  }


  /**
   * Model ContentItem
   */

  export type AggregateContentItem = {
    _count: ContentItemCountAggregateOutputType | null
    _avg: ContentItemAvgAggregateOutputType | null
    _sum: ContentItemSumAggregateOutputType | null
    _min: ContentItemMinAggregateOutputType | null
    _max: ContentItemMaxAggregateOutputType | null
  }

  export type ContentItemAvgAggregateOutputType = {
    sortOrder: number | null
  }

  export type ContentItemSumAggregateOutputType = {
    sortOrder: number | null
  }

  export type ContentItemMinAggregateOutputType = {
    id: string | null
    kind: $Enums.ContentKind | null
    topicId: string | null
    locale: $Enums.Locale | null
    title: string | null
    text: string | null
    richText: string | null
    sortOrder: number | null
    status: $Enums.PublishStatus | null
    authorName: string | null
    createdAt: Date | null
    updatedAt: Date | null
    publishAt: Date | null
    expireAt: Date | null
    regionMode: $Enums.RegionMode | null
    regionManualId: string | null
    regionEffectiveId: string | null
  }

  export type ContentItemMaxAggregateOutputType = {
    id: string | null
    kind: $Enums.ContentKind | null
    topicId: string | null
    locale: $Enums.Locale | null
    title: string | null
    text: string | null
    richText: string | null
    sortOrder: number | null
    status: $Enums.PublishStatus | null
    authorName: string | null
    createdAt: Date | null
    updatedAt: Date | null
    publishAt: Date | null
    expireAt: Date | null
    regionMode: $Enums.RegionMode | null
    regionManualId: string | null
    regionEffectiveId: string | null
  }

  export type ContentItemCountAggregateOutputType = {
    id: number
    kind: number
    topicId: number
    locale: number
    title: number
    text: number
    richText: number
    sortOrder: number
    status: number
    authorName: number
    createdAt: number
    updatedAt: number
    publishAt: number
    expireAt: number
    regionMode: number
    regionManualId: number
    regionEffectiveId: number
    regionAuto: number
    validation: number
    meta: number
    _all: number
  }


  export type ContentItemAvgAggregateInputType = {
    sortOrder?: true
  }

  export type ContentItemSumAggregateInputType = {
    sortOrder?: true
  }

  export type ContentItemMinAggregateInputType = {
    id?: true
    kind?: true
    topicId?: true
    locale?: true
    title?: true
    text?: true
    richText?: true
    sortOrder?: true
    status?: true
    authorName?: true
    createdAt?: true
    updatedAt?: true
    publishAt?: true
    expireAt?: true
    regionMode?: true
    regionManualId?: true
    regionEffectiveId?: true
  }

  export type ContentItemMaxAggregateInputType = {
    id?: true
    kind?: true
    topicId?: true
    locale?: true
    title?: true
    text?: true
    richText?: true
    sortOrder?: true
    status?: true
    authorName?: true
    createdAt?: true
    updatedAt?: true
    publishAt?: true
    expireAt?: true
    regionMode?: true
    regionManualId?: true
    regionEffectiveId?: true
  }

  export type ContentItemCountAggregateInputType = {
    id?: true
    kind?: true
    topicId?: true
    locale?: true
    title?: true
    text?: true
    richText?: true
    sortOrder?: true
    status?: true
    authorName?: true
    createdAt?: true
    updatedAt?: true
    publishAt?: true
    expireAt?: true
    regionMode?: true
    regionManualId?: true
    regionEffectiveId?: true
    regionAuto?: true
    validation?: true
    meta?: true
    _all?: true
  }

  export type ContentItemAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ContentItem to aggregate.
     */
    where?: ContentItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContentItems to fetch.
     */
    orderBy?: ContentItemOrderByWithRelationInput | ContentItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ContentItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContentItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContentItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ContentItems
    **/
    _count?: true | ContentItemCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ContentItemAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ContentItemSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ContentItemMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ContentItemMaxAggregateInputType
  }

  export type GetContentItemAggregateType<T extends ContentItemAggregateArgs> = {
        [P in keyof T & keyof AggregateContentItem]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateContentItem[P]>
      : GetScalarType<T[P], AggregateContentItem[P]>
  }




  export type ContentItemGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ContentItemWhereInput
    orderBy?: ContentItemOrderByWithAggregationInput | ContentItemOrderByWithAggregationInput[]
    by: ContentItemScalarFieldEnum[] | ContentItemScalarFieldEnum
    having?: ContentItemScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ContentItemCountAggregateInputType | true
    _avg?: ContentItemAvgAggregateInputType
    _sum?: ContentItemSumAggregateInputType
    _min?: ContentItemMinAggregateInputType
    _max?: ContentItemMaxAggregateInputType
  }

  export type ContentItemGroupByOutputType = {
    id: string
    kind: $Enums.ContentKind
    topicId: string
    locale: $Enums.Locale
    title: string | null
    text: string
    richText: string | null
    sortOrder: number
    status: $Enums.PublishStatus
    authorName: string | null
    createdAt: Date
    updatedAt: Date
    publishAt: Date | null
    expireAt: Date | null
    regionMode: $Enums.RegionMode
    regionManualId: string | null
    regionEffectiveId: string | null
    regionAuto: JsonValue | null
    validation: JsonValue | null
    meta: JsonValue | null
    _count: ContentItemCountAggregateOutputType | null
    _avg: ContentItemAvgAggregateOutputType | null
    _sum: ContentItemSumAggregateOutputType | null
    _min: ContentItemMinAggregateOutputType | null
    _max: ContentItemMaxAggregateOutputType | null
  }

  type GetContentItemGroupByPayload<T extends ContentItemGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ContentItemGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ContentItemGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ContentItemGroupByOutputType[P]>
            : GetScalarType<T[P], ContentItemGroupByOutputType[P]>
        }
      >
    >


  export type ContentItemSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    kind?: boolean
    topicId?: boolean
    locale?: boolean
    title?: boolean
    text?: boolean
    richText?: boolean
    sortOrder?: boolean
    status?: boolean
    authorName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    publishAt?: boolean
    expireAt?: boolean
    regionMode?: boolean
    regionManualId?: boolean
    regionEffectiveId?: boolean
    regionAuto?: boolean
    validation?: boolean
    meta?: boolean
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    regionManual?: boolean | ContentItem$regionManualArgs<ExtArgs>
    regionEffective?: boolean | ContentItem$regionEffectiveArgs<ExtArgs>
    answerOptions?: boolean | ContentItem$answerOptionsArgs<ExtArgs>
    tags?: boolean | ContentItem$tagsArgs<ExtArgs>
    _count?: boolean | ContentItemCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["contentItem"]>

  export type ContentItemSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    kind?: boolean
    topicId?: boolean
    locale?: boolean
    title?: boolean
    text?: boolean
    richText?: boolean
    sortOrder?: boolean
    status?: boolean
    authorName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    publishAt?: boolean
    expireAt?: boolean
    regionMode?: boolean
    regionManualId?: boolean
    regionEffectiveId?: boolean
    regionAuto?: boolean
    validation?: boolean
    meta?: boolean
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    regionManual?: boolean | ContentItem$regionManualArgs<ExtArgs>
    regionEffective?: boolean | ContentItem$regionEffectiveArgs<ExtArgs>
  }, ExtArgs["result"]["contentItem"]>

  export type ContentItemSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    kind?: boolean
    topicId?: boolean
    locale?: boolean
    title?: boolean
    text?: boolean
    richText?: boolean
    sortOrder?: boolean
    status?: boolean
    authorName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    publishAt?: boolean
    expireAt?: boolean
    regionMode?: boolean
    regionManualId?: boolean
    regionEffectiveId?: boolean
    regionAuto?: boolean
    validation?: boolean
    meta?: boolean
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    regionManual?: boolean | ContentItem$regionManualArgs<ExtArgs>
    regionEffective?: boolean | ContentItem$regionEffectiveArgs<ExtArgs>
  }, ExtArgs["result"]["contentItem"]>

  export type ContentItemSelectScalar = {
    id?: boolean
    kind?: boolean
    topicId?: boolean
    locale?: boolean
    title?: boolean
    text?: boolean
    richText?: boolean
    sortOrder?: boolean
    status?: boolean
    authorName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    publishAt?: boolean
    expireAt?: boolean
    regionMode?: boolean
    regionManualId?: boolean
    regionEffectiveId?: boolean
    regionAuto?: boolean
    validation?: boolean
    meta?: boolean
  }

  export type ContentItemOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "kind" | "topicId" | "locale" | "title" | "text" | "richText" | "sortOrder" | "status" | "authorName" | "createdAt" | "updatedAt" | "publishAt" | "expireAt" | "regionMode" | "regionManualId" | "regionEffectiveId" | "regionAuto" | "validation" | "meta", ExtArgs["result"]["contentItem"]>
  export type ContentItemInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    regionManual?: boolean | ContentItem$regionManualArgs<ExtArgs>
    regionEffective?: boolean | ContentItem$regionEffectiveArgs<ExtArgs>
    answerOptions?: boolean | ContentItem$answerOptionsArgs<ExtArgs>
    tags?: boolean | ContentItem$tagsArgs<ExtArgs>
    _count?: boolean | ContentItemCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ContentItemIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    regionManual?: boolean | ContentItem$regionManualArgs<ExtArgs>
    regionEffective?: boolean | ContentItem$regionEffectiveArgs<ExtArgs>
  }
  export type ContentItemIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    topic?: boolean | TopicDefaultArgs<ExtArgs>
    regionManual?: boolean | ContentItem$regionManualArgs<ExtArgs>
    regionEffective?: boolean | ContentItem$regionEffectiveArgs<ExtArgs>
  }

  export type $ContentItemPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ContentItem"
    objects: {
      topic: Prisma.$TopicPayload<ExtArgs>
      regionManual: Prisma.$RegionPayload<ExtArgs> | null
      regionEffective: Prisma.$RegionPayload<ExtArgs> | null
      answerOptions: Prisma.$AnswerOptionPayload<ExtArgs>[]
      tags: Prisma.$ItemTagPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      kind: $Enums.ContentKind
      topicId: string
      locale: $Enums.Locale
      title: string | null
      text: string
      richText: string | null
      sortOrder: number
      status: $Enums.PublishStatus
      authorName: string | null
      createdAt: Date
      updatedAt: Date
      publishAt: Date | null
      expireAt: Date | null
      regionMode: $Enums.RegionMode
      regionManualId: string | null
      regionEffectiveId: string | null
      regionAuto: Prisma.JsonValue | null
      validation: Prisma.JsonValue | null
      meta: Prisma.JsonValue | null
    }, ExtArgs["result"]["contentItem"]>
    composites: {}
  }

  type ContentItemGetPayload<S extends boolean | null | undefined | ContentItemDefaultArgs> = $Result.GetResult<Prisma.$ContentItemPayload, S>

  type ContentItemCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ContentItemFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ContentItemCountAggregateInputType | true
    }

  export interface ContentItemDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ContentItem'], meta: { name: 'ContentItem' } }
    /**
     * Find zero or one ContentItem that matches the filter.
     * @param {ContentItemFindUniqueArgs} args - Arguments to find a ContentItem
     * @example
     * // Get one ContentItem
     * const contentItem = await prisma.contentItem.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ContentItemFindUniqueArgs>(args: SelectSubset<T, ContentItemFindUniqueArgs<ExtArgs>>): Prisma__ContentItemClient<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ContentItem that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ContentItemFindUniqueOrThrowArgs} args - Arguments to find a ContentItem
     * @example
     * // Get one ContentItem
     * const contentItem = await prisma.contentItem.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ContentItemFindUniqueOrThrowArgs>(args: SelectSubset<T, ContentItemFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ContentItemClient<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ContentItem that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContentItemFindFirstArgs} args - Arguments to find a ContentItem
     * @example
     * // Get one ContentItem
     * const contentItem = await prisma.contentItem.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ContentItemFindFirstArgs>(args?: SelectSubset<T, ContentItemFindFirstArgs<ExtArgs>>): Prisma__ContentItemClient<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ContentItem that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContentItemFindFirstOrThrowArgs} args - Arguments to find a ContentItem
     * @example
     * // Get one ContentItem
     * const contentItem = await prisma.contentItem.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ContentItemFindFirstOrThrowArgs>(args?: SelectSubset<T, ContentItemFindFirstOrThrowArgs<ExtArgs>>): Prisma__ContentItemClient<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ContentItems that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContentItemFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ContentItems
     * const contentItems = await prisma.contentItem.findMany()
     * 
     * // Get first 10 ContentItems
     * const contentItems = await prisma.contentItem.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const contentItemWithIdOnly = await prisma.contentItem.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ContentItemFindManyArgs>(args?: SelectSubset<T, ContentItemFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ContentItem.
     * @param {ContentItemCreateArgs} args - Arguments to create a ContentItem.
     * @example
     * // Create one ContentItem
     * const ContentItem = await prisma.contentItem.create({
     *   data: {
     *     // ... data to create a ContentItem
     *   }
     * })
     * 
     */
    create<T extends ContentItemCreateArgs>(args: SelectSubset<T, ContentItemCreateArgs<ExtArgs>>): Prisma__ContentItemClient<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ContentItems.
     * @param {ContentItemCreateManyArgs} args - Arguments to create many ContentItems.
     * @example
     * // Create many ContentItems
     * const contentItem = await prisma.contentItem.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ContentItemCreateManyArgs>(args?: SelectSubset<T, ContentItemCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ContentItems and returns the data saved in the database.
     * @param {ContentItemCreateManyAndReturnArgs} args - Arguments to create many ContentItems.
     * @example
     * // Create many ContentItems
     * const contentItem = await prisma.contentItem.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ContentItems and only return the `id`
     * const contentItemWithIdOnly = await prisma.contentItem.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ContentItemCreateManyAndReturnArgs>(args?: SelectSubset<T, ContentItemCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ContentItem.
     * @param {ContentItemDeleteArgs} args - Arguments to delete one ContentItem.
     * @example
     * // Delete one ContentItem
     * const ContentItem = await prisma.contentItem.delete({
     *   where: {
     *     // ... filter to delete one ContentItem
     *   }
     * })
     * 
     */
    delete<T extends ContentItemDeleteArgs>(args: SelectSubset<T, ContentItemDeleteArgs<ExtArgs>>): Prisma__ContentItemClient<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ContentItem.
     * @param {ContentItemUpdateArgs} args - Arguments to update one ContentItem.
     * @example
     * // Update one ContentItem
     * const contentItem = await prisma.contentItem.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ContentItemUpdateArgs>(args: SelectSubset<T, ContentItemUpdateArgs<ExtArgs>>): Prisma__ContentItemClient<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ContentItems.
     * @param {ContentItemDeleteManyArgs} args - Arguments to filter ContentItems to delete.
     * @example
     * // Delete a few ContentItems
     * const { count } = await prisma.contentItem.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ContentItemDeleteManyArgs>(args?: SelectSubset<T, ContentItemDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ContentItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContentItemUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ContentItems
     * const contentItem = await prisma.contentItem.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ContentItemUpdateManyArgs>(args: SelectSubset<T, ContentItemUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ContentItems and returns the data updated in the database.
     * @param {ContentItemUpdateManyAndReturnArgs} args - Arguments to update many ContentItems.
     * @example
     * // Update many ContentItems
     * const contentItem = await prisma.contentItem.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ContentItems and only return the `id`
     * const contentItemWithIdOnly = await prisma.contentItem.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ContentItemUpdateManyAndReturnArgs>(args: SelectSubset<T, ContentItemUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ContentItem.
     * @param {ContentItemUpsertArgs} args - Arguments to update or create a ContentItem.
     * @example
     * // Update or create a ContentItem
     * const contentItem = await prisma.contentItem.upsert({
     *   create: {
     *     // ... data to create a ContentItem
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ContentItem we want to update
     *   }
     * })
     */
    upsert<T extends ContentItemUpsertArgs>(args: SelectSubset<T, ContentItemUpsertArgs<ExtArgs>>): Prisma__ContentItemClient<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ContentItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContentItemCountArgs} args - Arguments to filter ContentItems to count.
     * @example
     * // Count the number of ContentItems
     * const count = await prisma.contentItem.count({
     *   where: {
     *     // ... the filter for the ContentItems we want to count
     *   }
     * })
    **/
    count<T extends ContentItemCountArgs>(
      args?: Subset<T, ContentItemCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ContentItemCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ContentItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContentItemAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ContentItemAggregateArgs>(args: Subset<T, ContentItemAggregateArgs>): Prisma.PrismaPromise<GetContentItemAggregateType<T>>

    /**
     * Group by ContentItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContentItemGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ContentItemGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ContentItemGroupByArgs['orderBy'] }
        : { orderBy?: ContentItemGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ContentItemGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetContentItemGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ContentItem model
   */
  readonly fields: ContentItemFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ContentItem.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ContentItemClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    topic<T extends TopicDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TopicDefaultArgs<ExtArgs>>): Prisma__TopicClient<$Result.GetResult<Prisma.$TopicPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    regionManual<T extends ContentItem$regionManualArgs<ExtArgs> = {}>(args?: Subset<T, ContentItem$regionManualArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    regionEffective<T extends ContentItem$regionEffectiveArgs<ExtArgs> = {}>(args?: Subset<T, ContentItem$regionEffectiveArgs<ExtArgs>>): Prisma__RegionClient<$Result.GetResult<Prisma.$RegionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    answerOptions<T extends ContentItem$answerOptionsArgs<ExtArgs> = {}>(args?: Subset<T, ContentItem$answerOptionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    tags<T extends ContentItem$tagsArgs<ExtArgs> = {}>(args?: Subset<T, ContentItem$tagsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItemTagPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ContentItem model
   */
  interface ContentItemFieldRefs {
    readonly id: FieldRef<"ContentItem", 'String'>
    readonly kind: FieldRef<"ContentItem", 'ContentKind'>
    readonly topicId: FieldRef<"ContentItem", 'String'>
    readonly locale: FieldRef<"ContentItem", 'Locale'>
    readonly title: FieldRef<"ContentItem", 'String'>
    readonly text: FieldRef<"ContentItem", 'String'>
    readonly richText: FieldRef<"ContentItem", 'String'>
    readonly sortOrder: FieldRef<"ContentItem", 'Int'>
    readonly status: FieldRef<"ContentItem", 'PublishStatus'>
    readonly authorName: FieldRef<"ContentItem", 'String'>
    readonly createdAt: FieldRef<"ContentItem", 'DateTime'>
    readonly updatedAt: FieldRef<"ContentItem", 'DateTime'>
    readonly publishAt: FieldRef<"ContentItem", 'DateTime'>
    readonly expireAt: FieldRef<"ContentItem", 'DateTime'>
    readonly regionMode: FieldRef<"ContentItem", 'RegionMode'>
    readonly regionManualId: FieldRef<"ContentItem", 'String'>
    readonly regionEffectiveId: FieldRef<"ContentItem", 'String'>
    readonly regionAuto: FieldRef<"ContentItem", 'Json'>
    readonly validation: FieldRef<"ContentItem", 'Json'>
    readonly meta: FieldRef<"ContentItem", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * ContentItem findUnique
   */
  export type ContentItemFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    /**
     * Filter, which ContentItem to fetch.
     */
    where: ContentItemWhereUniqueInput
  }

  /**
   * ContentItem findUniqueOrThrow
   */
  export type ContentItemFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    /**
     * Filter, which ContentItem to fetch.
     */
    where: ContentItemWhereUniqueInput
  }

  /**
   * ContentItem findFirst
   */
  export type ContentItemFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    /**
     * Filter, which ContentItem to fetch.
     */
    where?: ContentItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContentItems to fetch.
     */
    orderBy?: ContentItemOrderByWithRelationInput | ContentItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ContentItems.
     */
    cursor?: ContentItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContentItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContentItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ContentItems.
     */
    distinct?: ContentItemScalarFieldEnum | ContentItemScalarFieldEnum[]
  }

  /**
   * ContentItem findFirstOrThrow
   */
  export type ContentItemFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    /**
     * Filter, which ContentItem to fetch.
     */
    where?: ContentItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContentItems to fetch.
     */
    orderBy?: ContentItemOrderByWithRelationInput | ContentItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ContentItems.
     */
    cursor?: ContentItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContentItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContentItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ContentItems.
     */
    distinct?: ContentItemScalarFieldEnum | ContentItemScalarFieldEnum[]
  }

  /**
   * ContentItem findMany
   */
  export type ContentItemFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    /**
     * Filter, which ContentItems to fetch.
     */
    where?: ContentItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContentItems to fetch.
     */
    orderBy?: ContentItemOrderByWithRelationInput | ContentItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ContentItems.
     */
    cursor?: ContentItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContentItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContentItems.
     */
    skip?: number
    distinct?: ContentItemScalarFieldEnum | ContentItemScalarFieldEnum[]
  }

  /**
   * ContentItem create
   */
  export type ContentItemCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    /**
     * The data needed to create a ContentItem.
     */
    data: XOR<ContentItemCreateInput, ContentItemUncheckedCreateInput>
  }

  /**
   * ContentItem createMany
   */
  export type ContentItemCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ContentItems.
     */
    data: ContentItemCreateManyInput | ContentItemCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ContentItem createManyAndReturn
   */
  export type ContentItemCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * The data used to create many ContentItems.
     */
    data: ContentItemCreateManyInput | ContentItemCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ContentItem update
   */
  export type ContentItemUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    /**
     * The data needed to update a ContentItem.
     */
    data: XOR<ContentItemUpdateInput, ContentItemUncheckedUpdateInput>
    /**
     * Choose, which ContentItem to update.
     */
    where: ContentItemWhereUniqueInput
  }

  /**
   * ContentItem updateMany
   */
  export type ContentItemUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ContentItems.
     */
    data: XOR<ContentItemUpdateManyMutationInput, ContentItemUncheckedUpdateManyInput>
    /**
     * Filter which ContentItems to update
     */
    where?: ContentItemWhereInput
    /**
     * Limit how many ContentItems to update.
     */
    limit?: number
  }

  /**
   * ContentItem updateManyAndReturn
   */
  export type ContentItemUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * The data used to update ContentItems.
     */
    data: XOR<ContentItemUpdateManyMutationInput, ContentItemUncheckedUpdateManyInput>
    /**
     * Filter which ContentItems to update
     */
    where?: ContentItemWhereInput
    /**
     * Limit how many ContentItems to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ContentItem upsert
   */
  export type ContentItemUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    /**
     * The filter to search for the ContentItem to update in case it exists.
     */
    where: ContentItemWhereUniqueInput
    /**
     * In case the ContentItem found by the `where` argument doesn't exist, create a new ContentItem with this data.
     */
    create: XOR<ContentItemCreateInput, ContentItemUncheckedCreateInput>
    /**
     * In case the ContentItem was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ContentItemUpdateInput, ContentItemUncheckedUpdateInput>
  }

  /**
   * ContentItem delete
   */
  export type ContentItemDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
    /**
     * Filter which ContentItem to delete.
     */
    where: ContentItemWhereUniqueInput
  }

  /**
   * ContentItem deleteMany
   */
  export type ContentItemDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ContentItems to delete
     */
    where?: ContentItemWhereInput
    /**
     * Limit how many ContentItems to delete.
     */
    limit?: number
  }

  /**
   * ContentItem.regionManual
   */
  export type ContentItem$regionManualArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    where?: RegionWhereInput
  }

  /**
   * ContentItem.regionEffective
   */
  export type ContentItem$regionEffectiveArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Region
     */
    select?: RegionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Region
     */
    omit?: RegionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RegionInclude<ExtArgs> | null
    where?: RegionWhereInput
  }

  /**
   * ContentItem.answerOptions
   */
  export type ContentItem$answerOptionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
    where?: AnswerOptionWhereInput
    orderBy?: AnswerOptionOrderByWithRelationInput | AnswerOptionOrderByWithRelationInput[]
    cursor?: AnswerOptionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AnswerOptionScalarFieldEnum | AnswerOptionScalarFieldEnum[]
  }

  /**
   * ContentItem.tags
   */
  export type ContentItem$tagsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItemTag
     */
    select?: ItemTagSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ItemTag
     */
    omit?: ItemTagOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItemTagInclude<ExtArgs> | null
    where?: ItemTagWhereInput
    orderBy?: ItemTagOrderByWithRelationInput | ItemTagOrderByWithRelationInput[]
    cursor?: ItemTagWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ItemTagScalarFieldEnum | ItemTagScalarFieldEnum[]
  }

  /**
   * ContentItem without action
   */
  export type ContentItemDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContentItem
     */
    select?: ContentItemSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ContentItem
     */
    omit?: ContentItemOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContentItemInclude<ExtArgs> | null
  }


  /**
   * Model AnswerOption
   */

  export type AggregateAnswerOption = {
    _count: AnswerOptionCountAggregateOutputType | null
    _avg: AnswerOptionAvgAggregateOutputType | null
    _sum: AnswerOptionSumAggregateOutputType | null
    _min: AnswerOptionMinAggregateOutputType | null
    _max: AnswerOptionMaxAggregateOutputType | null
  }

  export type AnswerOptionAvgAggregateOutputType = {
    sortOrder: number | null
  }

  export type AnswerOptionSumAggregateOutputType = {
    sortOrder: number | null
  }

  export type AnswerOptionMinAggregateOutputType = {
    id: string | null
    itemId: string | null
    label: string | null
    value: string | null
    sortOrder: number | null
    exclusive: boolean | null
  }

  export type AnswerOptionMaxAggregateOutputType = {
    id: string | null
    itemId: string | null
    label: string | null
    value: string | null
    sortOrder: number | null
    exclusive: boolean | null
  }

  export type AnswerOptionCountAggregateOutputType = {
    id: number
    itemId: number
    label: number
    value: number
    sortOrder: number
    exclusive: number
    meta: number
    _all: number
  }


  export type AnswerOptionAvgAggregateInputType = {
    sortOrder?: true
  }

  export type AnswerOptionSumAggregateInputType = {
    sortOrder?: true
  }

  export type AnswerOptionMinAggregateInputType = {
    id?: true
    itemId?: true
    label?: true
    value?: true
    sortOrder?: true
    exclusive?: true
  }

  export type AnswerOptionMaxAggregateInputType = {
    id?: true
    itemId?: true
    label?: true
    value?: true
    sortOrder?: true
    exclusive?: true
  }

  export type AnswerOptionCountAggregateInputType = {
    id?: true
    itemId?: true
    label?: true
    value?: true
    sortOrder?: true
    exclusive?: true
    meta?: true
    _all?: true
  }

  export type AnswerOptionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AnswerOption to aggregate.
     */
    where?: AnswerOptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnswerOptions to fetch.
     */
    orderBy?: AnswerOptionOrderByWithRelationInput | AnswerOptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AnswerOptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnswerOptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnswerOptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AnswerOptions
    **/
    _count?: true | AnswerOptionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AnswerOptionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AnswerOptionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AnswerOptionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AnswerOptionMaxAggregateInputType
  }

  export type GetAnswerOptionAggregateType<T extends AnswerOptionAggregateArgs> = {
        [P in keyof T & keyof AggregateAnswerOption]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAnswerOption[P]>
      : GetScalarType<T[P], AggregateAnswerOption[P]>
  }




  export type AnswerOptionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AnswerOptionWhereInput
    orderBy?: AnswerOptionOrderByWithAggregationInput | AnswerOptionOrderByWithAggregationInput[]
    by: AnswerOptionScalarFieldEnum[] | AnswerOptionScalarFieldEnum
    having?: AnswerOptionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AnswerOptionCountAggregateInputType | true
    _avg?: AnswerOptionAvgAggregateInputType
    _sum?: AnswerOptionSumAggregateInputType
    _min?: AnswerOptionMinAggregateInputType
    _max?: AnswerOptionMaxAggregateInputType
  }

  export type AnswerOptionGroupByOutputType = {
    id: string
    itemId: string
    label: string
    value: string
    sortOrder: number
    exclusive: boolean
    meta: JsonValue | null
    _count: AnswerOptionCountAggregateOutputType | null
    _avg: AnswerOptionAvgAggregateOutputType | null
    _sum: AnswerOptionSumAggregateOutputType | null
    _min: AnswerOptionMinAggregateOutputType | null
    _max: AnswerOptionMaxAggregateOutputType | null
  }

  type GetAnswerOptionGroupByPayload<T extends AnswerOptionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AnswerOptionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AnswerOptionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AnswerOptionGroupByOutputType[P]>
            : GetScalarType<T[P], AnswerOptionGroupByOutputType[P]>
        }
      >
    >


  export type AnswerOptionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    itemId?: boolean
    label?: boolean
    value?: boolean
    sortOrder?: boolean
    exclusive?: boolean
    meta?: boolean
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["answerOption"]>

  export type AnswerOptionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    itemId?: boolean
    label?: boolean
    value?: boolean
    sortOrder?: boolean
    exclusive?: boolean
    meta?: boolean
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["answerOption"]>

  export type AnswerOptionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    itemId?: boolean
    label?: boolean
    value?: boolean
    sortOrder?: boolean
    exclusive?: boolean
    meta?: boolean
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["answerOption"]>

  export type AnswerOptionSelectScalar = {
    id?: boolean
    itemId?: boolean
    label?: boolean
    value?: boolean
    sortOrder?: boolean
    exclusive?: boolean
    meta?: boolean
  }

  export type AnswerOptionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "itemId" | "label" | "value" | "sortOrder" | "exclusive" | "meta", ExtArgs["result"]["answerOption"]>
  export type AnswerOptionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
  }
  export type AnswerOptionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
  }
  export type AnswerOptionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    item?: boolean | ContentItemDefaultArgs<ExtArgs>
  }

  export type $AnswerOptionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AnswerOption"
    objects: {
      item: Prisma.$ContentItemPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      itemId: string
      label: string
      value: string
      sortOrder: number
      exclusive: boolean
      meta: Prisma.JsonValue | null
    }, ExtArgs["result"]["answerOption"]>
    composites: {}
  }

  type AnswerOptionGetPayload<S extends boolean | null | undefined | AnswerOptionDefaultArgs> = $Result.GetResult<Prisma.$AnswerOptionPayload, S>

  type AnswerOptionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AnswerOptionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AnswerOptionCountAggregateInputType | true
    }

  export interface AnswerOptionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AnswerOption'], meta: { name: 'AnswerOption' } }
    /**
     * Find zero or one AnswerOption that matches the filter.
     * @param {AnswerOptionFindUniqueArgs} args - Arguments to find a AnswerOption
     * @example
     * // Get one AnswerOption
     * const answerOption = await prisma.answerOption.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AnswerOptionFindUniqueArgs>(args: SelectSubset<T, AnswerOptionFindUniqueArgs<ExtArgs>>): Prisma__AnswerOptionClient<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AnswerOption that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AnswerOptionFindUniqueOrThrowArgs} args - Arguments to find a AnswerOption
     * @example
     * // Get one AnswerOption
     * const answerOption = await prisma.answerOption.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AnswerOptionFindUniqueOrThrowArgs>(args: SelectSubset<T, AnswerOptionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AnswerOptionClient<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AnswerOption that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnswerOptionFindFirstArgs} args - Arguments to find a AnswerOption
     * @example
     * // Get one AnswerOption
     * const answerOption = await prisma.answerOption.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AnswerOptionFindFirstArgs>(args?: SelectSubset<T, AnswerOptionFindFirstArgs<ExtArgs>>): Prisma__AnswerOptionClient<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AnswerOption that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnswerOptionFindFirstOrThrowArgs} args - Arguments to find a AnswerOption
     * @example
     * // Get one AnswerOption
     * const answerOption = await prisma.answerOption.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AnswerOptionFindFirstOrThrowArgs>(args?: SelectSubset<T, AnswerOptionFindFirstOrThrowArgs<ExtArgs>>): Prisma__AnswerOptionClient<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AnswerOptions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnswerOptionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AnswerOptions
     * const answerOptions = await prisma.answerOption.findMany()
     * 
     * // Get first 10 AnswerOptions
     * const answerOptions = await prisma.answerOption.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const answerOptionWithIdOnly = await prisma.answerOption.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AnswerOptionFindManyArgs>(args?: SelectSubset<T, AnswerOptionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AnswerOption.
     * @param {AnswerOptionCreateArgs} args - Arguments to create a AnswerOption.
     * @example
     * // Create one AnswerOption
     * const AnswerOption = await prisma.answerOption.create({
     *   data: {
     *     // ... data to create a AnswerOption
     *   }
     * })
     * 
     */
    create<T extends AnswerOptionCreateArgs>(args: SelectSubset<T, AnswerOptionCreateArgs<ExtArgs>>): Prisma__AnswerOptionClient<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AnswerOptions.
     * @param {AnswerOptionCreateManyArgs} args - Arguments to create many AnswerOptions.
     * @example
     * // Create many AnswerOptions
     * const answerOption = await prisma.answerOption.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AnswerOptionCreateManyArgs>(args?: SelectSubset<T, AnswerOptionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AnswerOptions and returns the data saved in the database.
     * @param {AnswerOptionCreateManyAndReturnArgs} args - Arguments to create many AnswerOptions.
     * @example
     * // Create many AnswerOptions
     * const answerOption = await prisma.answerOption.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AnswerOptions and only return the `id`
     * const answerOptionWithIdOnly = await prisma.answerOption.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AnswerOptionCreateManyAndReturnArgs>(args?: SelectSubset<T, AnswerOptionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AnswerOption.
     * @param {AnswerOptionDeleteArgs} args - Arguments to delete one AnswerOption.
     * @example
     * // Delete one AnswerOption
     * const AnswerOption = await prisma.answerOption.delete({
     *   where: {
     *     // ... filter to delete one AnswerOption
     *   }
     * })
     * 
     */
    delete<T extends AnswerOptionDeleteArgs>(args: SelectSubset<T, AnswerOptionDeleteArgs<ExtArgs>>): Prisma__AnswerOptionClient<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AnswerOption.
     * @param {AnswerOptionUpdateArgs} args - Arguments to update one AnswerOption.
     * @example
     * // Update one AnswerOption
     * const answerOption = await prisma.answerOption.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AnswerOptionUpdateArgs>(args: SelectSubset<T, AnswerOptionUpdateArgs<ExtArgs>>): Prisma__AnswerOptionClient<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AnswerOptions.
     * @param {AnswerOptionDeleteManyArgs} args - Arguments to filter AnswerOptions to delete.
     * @example
     * // Delete a few AnswerOptions
     * const { count } = await prisma.answerOption.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AnswerOptionDeleteManyArgs>(args?: SelectSubset<T, AnswerOptionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AnswerOptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnswerOptionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AnswerOptions
     * const answerOption = await prisma.answerOption.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AnswerOptionUpdateManyArgs>(args: SelectSubset<T, AnswerOptionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AnswerOptions and returns the data updated in the database.
     * @param {AnswerOptionUpdateManyAndReturnArgs} args - Arguments to update many AnswerOptions.
     * @example
     * // Update many AnswerOptions
     * const answerOption = await prisma.answerOption.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AnswerOptions and only return the `id`
     * const answerOptionWithIdOnly = await prisma.answerOption.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AnswerOptionUpdateManyAndReturnArgs>(args: SelectSubset<T, AnswerOptionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AnswerOption.
     * @param {AnswerOptionUpsertArgs} args - Arguments to update or create a AnswerOption.
     * @example
     * // Update or create a AnswerOption
     * const answerOption = await prisma.answerOption.upsert({
     *   create: {
     *     // ... data to create a AnswerOption
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AnswerOption we want to update
     *   }
     * })
     */
    upsert<T extends AnswerOptionUpsertArgs>(args: SelectSubset<T, AnswerOptionUpsertArgs<ExtArgs>>): Prisma__AnswerOptionClient<$Result.GetResult<Prisma.$AnswerOptionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AnswerOptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnswerOptionCountArgs} args - Arguments to filter AnswerOptions to count.
     * @example
     * // Count the number of AnswerOptions
     * const count = await prisma.answerOption.count({
     *   where: {
     *     // ... the filter for the AnswerOptions we want to count
     *   }
     * })
    **/
    count<T extends AnswerOptionCountArgs>(
      args?: Subset<T, AnswerOptionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AnswerOptionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AnswerOption.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnswerOptionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AnswerOptionAggregateArgs>(args: Subset<T, AnswerOptionAggregateArgs>): Prisma.PrismaPromise<GetAnswerOptionAggregateType<T>>

    /**
     * Group by AnswerOption.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnswerOptionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AnswerOptionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AnswerOptionGroupByArgs['orderBy'] }
        : { orderBy?: AnswerOptionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AnswerOptionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAnswerOptionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AnswerOption model
   */
  readonly fields: AnswerOptionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AnswerOption.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AnswerOptionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    item<T extends ContentItemDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ContentItemDefaultArgs<ExtArgs>>): Prisma__ContentItemClient<$Result.GetResult<Prisma.$ContentItemPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AnswerOption model
   */
  interface AnswerOptionFieldRefs {
    readonly id: FieldRef<"AnswerOption", 'String'>
    readonly itemId: FieldRef<"AnswerOption", 'String'>
    readonly label: FieldRef<"AnswerOption", 'String'>
    readonly value: FieldRef<"AnswerOption", 'String'>
    readonly sortOrder: FieldRef<"AnswerOption", 'Int'>
    readonly exclusive: FieldRef<"AnswerOption", 'Boolean'>
    readonly meta: FieldRef<"AnswerOption", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * AnswerOption findUnique
   */
  export type AnswerOptionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
    /**
     * Filter, which AnswerOption to fetch.
     */
    where: AnswerOptionWhereUniqueInput
  }

  /**
   * AnswerOption findUniqueOrThrow
   */
  export type AnswerOptionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
    /**
     * Filter, which AnswerOption to fetch.
     */
    where: AnswerOptionWhereUniqueInput
  }

  /**
   * AnswerOption findFirst
   */
  export type AnswerOptionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
    /**
     * Filter, which AnswerOption to fetch.
     */
    where?: AnswerOptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnswerOptions to fetch.
     */
    orderBy?: AnswerOptionOrderByWithRelationInput | AnswerOptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AnswerOptions.
     */
    cursor?: AnswerOptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnswerOptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnswerOptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AnswerOptions.
     */
    distinct?: AnswerOptionScalarFieldEnum | AnswerOptionScalarFieldEnum[]
  }

  /**
   * AnswerOption findFirstOrThrow
   */
  export type AnswerOptionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
    /**
     * Filter, which AnswerOption to fetch.
     */
    where?: AnswerOptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnswerOptions to fetch.
     */
    orderBy?: AnswerOptionOrderByWithRelationInput | AnswerOptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AnswerOptions.
     */
    cursor?: AnswerOptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnswerOptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnswerOptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AnswerOptions.
     */
    distinct?: AnswerOptionScalarFieldEnum | AnswerOptionScalarFieldEnum[]
  }

  /**
   * AnswerOption findMany
   */
  export type AnswerOptionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
    /**
     * Filter, which AnswerOptions to fetch.
     */
    where?: AnswerOptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AnswerOptions to fetch.
     */
    orderBy?: AnswerOptionOrderByWithRelationInput | AnswerOptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AnswerOptions.
     */
    cursor?: AnswerOptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AnswerOptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AnswerOptions.
     */
    skip?: number
    distinct?: AnswerOptionScalarFieldEnum | AnswerOptionScalarFieldEnum[]
  }

  /**
   * AnswerOption create
   */
  export type AnswerOptionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
    /**
     * The data needed to create a AnswerOption.
     */
    data: XOR<AnswerOptionCreateInput, AnswerOptionUncheckedCreateInput>
  }

  /**
   * AnswerOption createMany
   */
  export type AnswerOptionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AnswerOptions.
     */
    data: AnswerOptionCreateManyInput | AnswerOptionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AnswerOption createManyAndReturn
   */
  export type AnswerOptionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * The data used to create many AnswerOptions.
     */
    data: AnswerOptionCreateManyInput | AnswerOptionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AnswerOption update
   */
  export type AnswerOptionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
    /**
     * The data needed to update a AnswerOption.
     */
    data: XOR<AnswerOptionUpdateInput, AnswerOptionUncheckedUpdateInput>
    /**
     * Choose, which AnswerOption to update.
     */
    where: AnswerOptionWhereUniqueInput
  }

  /**
   * AnswerOption updateMany
   */
  export type AnswerOptionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AnswerOptions.
     */
    data: XOR<AnswerOptionUpdateManyMutationInput, AnswerOptionUncheckedUpdateManyInput>
    /**
     * Filter which AnswerOptions to update
     */
    where?: AnswerOptionWhereInput
    /**
     * Limit how many AnswerOptions to update.
     */
    limit?: number
  }

  /**
   * AnswerOption updateManyAndReturn
   */
  export type AnswerOptionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * The data used to update AnswerOptions.
     */
    data: XOR<AnswerOptionUpdateManyMutationInput, AnswerOptionUncheckedUpdateManyInput>
    /**
     * Filter which AnswerOptions to update
     */
    where?: AnswerOptionWhereInput
    /**
     * Limit how many AnswerOptions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AnswerOption upsert
   */
  export type AnswerOptionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
    /**
     * The filter to search for the AnswerOption to update in case it exists.
     */
    where: AnswerOptionWhereUniqueInput
    /**
     * In case the AnswerOption found by the `where` argument doesn't exist, create a new AnswerOption with this data.
     */
    create: XOR<AnswerOptionCreateInput, AnswerOptionUncheckedCreateInput>
    /**
     * In case the AnswerOption was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AnswerOptionUpdateInput, AnswerOptionUncheckedUpdateInput>
  }

  /**
   * AnswerOption delete
   */
  export type AnswerOptionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
    /**
     * Filter which AnswerOption to delete.
     */
    where: AnswerOptionWhereUniqueInput
  }

  /**
   * AnswerOption deleteMany
   */
  export type AnswerOptionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AnswerOptions to delete
     */
    where?: AnswerOptionWhereInput
    /**
     * Limit how many AnswerOptions to delete.
     */
    limit?: number
  }

  /**
   * AnswerOption without action
   */
  export type AnswerOptionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnswerOption
     */
    select?: AnswerOptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AnswerOption
     */
    omit?: AnswerOptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnswerOptionInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const RegionScalarFieldEnum: {
    id: 'id',
    code: 'code',
    name: 'name',
    level: 'level'
  };

  export type RegionScalarFieldEnum = (typeof RegionScalarFieldEnum)[keyof typeof RegionScalarFieldEnum]


  export const TopicScalarFieldEnum: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    description: 'description',
    locale: 'locale',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TopicScalarFieldEnum = (typeof TopicScalarFieldEnum)[keyof typeof TopicScalarFieldEnum]


  export const TagScalarFieldEnum: {
    id: 'id',
    slug: 'slug',
    label: 'label'
  };

  export type TagScalarFieldEnum = (typeof TagScalarFieldEnum)[keyof typeof TagScalarFieldEnum]


  export const TopicTagScalarFieldEnum: {
    id: 'id',
    topicId: 'topicId',
    tagId: 'tagId'
  };

  export type TopicTagScalarFieldEnum = (typeof TopicTagScalarFieldEnum)[keyof typeof TopicTagScalarFieldEnum]


  export const ItemTagScalarFieldEnum: {
    id: 'id',
    itemId: 'itemId',
    tagId: 'tagId'
  };

  export type ItemTagScalarFieldEnum = (typeof ItemTagScalarFieldEnum)[keyof typeof ItemTagScalarFieldEnum]


  export const ContentItemScalarFieldEnum: {
    id: 'id',
    kind: 'kind',
    topicId: 'topicId',
    locale: 'locale',
    title: 'title',
    text: 'text',
    richText: 'richText',
    sortOrder: 'sortOrder',
    status: 'status',
    authorName: 'authorName',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    publishAt: 'publishAt',
    expireAt: 'expireAt',
    regionMode: 'regionMode',
    regionManualId: 'regionManualId',
    regionEffectiveId: 'regionEffectiveId',
    regionAuto: 'regionAuto',
    validation: 'validation',
    meta: 'meta'
  };

  export type ContentItemScalarFieldEnum = (typeof ContentItemScalarFieldEnum)[keyof typeof ContentItemScalarFieldEnum]


  export const AnswerOptionScalarFieldEnum: {
    id: 'id',
    itemId: 'itemId',
    label: 'label',
    value: 'value',
    sortOrder: 'sortOrder',
    exclusive: 'exclusive',
    meta: 'meta'
  };

  export type AnswerOptionScalarFieldEnum = (typeof AnswerOptionScalarFieldEnum)[keyof typeof AnswerOptionScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Locale'
   */
  export type EnumLocaleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Locale'>
    


  /**
   * Reference to a field of type 'Locale[]'
   */
  export type ListEnumLocaleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Locale[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'ContentKind'
   */
  export type EnumContentKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ContentKind'>
    


  /**
   * Reference to a field of type 'ContentKind[]'
   */
  export type ListEnumContentKindFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ContentKind[]'>
    


  /**
   * Reference to a field of type 'PublishStatus'
   */
  export type EnumPublishStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PublishStatus'>
    


  /**
   * Reference to a field of type 'PublishStatus[]'
   */
  export type ListEnumPublishStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PublishStatus[]'>
    


  /**
   * Reference to a field of type 'RegionMode'
   */
  export type EnumRegionModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RegionMode'>
    


  /**
   * Reference to a field of type 'RegionMode[]'
   */
  export type ListEnumRegionModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RegionMode[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type RegionWhereInput = {
    AND?: RegionWhereInput | RegionWhereInput[]
    OR?: RegionWhereInput[]
    NOT?: RegionWhereInput | RegionWhereInput[]
    id?: StringFilter<"Region"> | string
    code?: StringFilter<"Region"> | string
    name?: StringFilter<"Region"> | string
    level?: IntFilter<"Region"> | number
    manualItems?: ContentItemListRelationFilter
    effectiveItems?: ContentItemListRelationFilter
  }

  export type RegionOrderByWithRelationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    level?: SortOrder
    manualItems?: ContentItemOrderByRelationAggregateInput
    effectiveItems?: ContentItemOrderByRelationAggregateInput
  }

  export type RegionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    code?: string
    AND?: RegionWhereInput | RegionWhereInput[]
    OR?: RegionWhereInput[]
    NOT?: RegionWhereInput | RegionWhereInput[]
    name?: StringFilter<"Region"> | string
    level?: IntFilter<"Region"> | number
    manualItems?: ContentItemListRelationFilter
    effectiveItems?: ContentItemListRelationFilter
  }, "id" | "code">

  export type RegionOrderByWithAggregationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    level?: SortOrder
    _count?: RegionCountOrderByAggregateInput
    _avg?: RegionAvgOrderByAggregateInput
    _max?: RegionMaxOrderByAggregateInput
    _min?: RegionMinOrderByAggregateInput
    _sum?: RegionSumOrderByAggregateInput
  }

  export type RegionScalarWhereWithAggregatesInput = {
    AND?: RegionScalarWhereWithAggregatesInput | RegionScalarWhereWithAggregatesInput[]
    OR?: RegionScalarWhereWithAggregatesInput[]
    NOT?: RegionScalarWhereWithAggregatesInput | RegionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Region"> | string
    code?: StringWithAggregatesFilter<"Region"> | string
    name?: StringWithAggregatesFilter<"Region"> | string
    level?: IntWithAggregatesFilter<"Region"> | number
  }

  export type TopicWhereInput = {
    AND?: TopicWhereInput | TopicWhereInput[]
    OR?: TopicWhereInput[]
    NOT?: TopicWhereInput | TopicWhereInput[]
    id?: StringFilter<"Topic"> | string
    slug?: StringFilter<"Topic"> | string
    title?: StringFilter<"Topic"> | string
    description?: StringNullableFilter<"Topic"> | string | null
    locale?: EnumLocaleFilter<"Topic"> | $Enums.Locale
    createdAt?: DateTimeFilter<"Topic"> | Date | string
    updatedAt?: DateTimeFilter<"Topic"> | Date | string
    items?: ContentItemListRelationFilter
    tags?: TopicTagListRelationFilter
  }

  export type TopicOrderByWithRelationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    locale?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    items?: ContentItemOrderByRelationAggregateInput
    tags?: TopicTagOrderByRelationAggregateInput
  }

  export type TopicWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    slug?: string
    AND?: TopicWhereInput | TopicWhereInput[]
    OR?: TopicWhereInput[]
    NOT?: TopicWhereInput | TopicWhereInput[]
    title?: StringFilter<"Topic"> | string
    description?: StringNullableFilter<"Topic"> | string | null
    locale?: EnumLocaleFilter<"Topic"> | $Enums.Locale
    createdAt?: DateTimeFilter<"Topic"> | Date | string
    updatedAt?: DateTimeFilter<"Topic"> | Date | string
    items?: ContentItemListRelationFilter
    tags?: TopicTagListRelationFilter
  }, "id" | "slug">

  export type TopicOrderByWithAggregationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    locale?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TopicCountOrderByAggregateInput
    _max?: TopicMaxOrderByAggregateInput
    _min?: TopicMinOrderByAggregateInput
  }

  export type TopicScalarWhereWithAggregatesInput = {
    AND?: TopicScalarWhereWithAggregatesInput | TopicScalarWhereWithAggregatesInput[]
    OR?: TopicScalarWhereWithAggregatesInput[]
    NOT?: TopicScalarWhereWithAggregatesInput | TopicScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Topic"> | string
    slug?: StringWithAggregatesFilter<"Topic"> | string
    title?: StringWithAggregatesFilter<"Topic"> | string
    description?: StringNullableWithAggregatesFilter<"Topic"> | string | null
    locale?: EnumLocaleWithAggregatesFilter<"Topic"> | $Enums.Locale
    createdAt?: DateTimeWithAggregatesFilter<"Topic"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Topic"> | Date | string
  }

  export type TagWhereInput = {
    AND?: TagWhereInput | TagWhereInput[]
    OR?: TagWhereInput[]
    NOT?: TagWhereInput | TagWhereInput[]
    id?: StringFilter<"Tag"> | string
    slug?: StringFilter<"Tag"> | string
    label?: StringFilter<"Tag"> | string
    topics?: TopicTagListRelationFilter
    items?: ItemTagListRelationFilter
  }

  export type TagOrderByWithRelationInput = {
    id?: SortOrder
    slug?: SortOrder
    label?: SortOrder
    topics?: TopicTagOrderByRelationAggregateInput
    items?: ItemTagOrderByRelationAggregateInput
  }

  export type TagWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    slug?: string
    AND?: TagWhereInput | TagWhereInput[]
    OR?: TagWhereInput[]
    NOT?: TagWhereInput | TagWhereInput[]
    label?: StringFilter<"Tag"> | string
    topics?: TopicTagListRelationFilter
    items?: ItemTagListRelationFilter
  }, "id" | "slug">

  export type TagOrderByWithAggregationInput = {
    id?: SortOrder
    slug?: SortOrder
    label?: SortOrder
    _count?: TagCountOrderByAggregateInput
    _max?: TagMaxOrderByAggregateInput
    _min?: TagMinOrderByAggregateInput
  }

  export type TagScalarWhereWithAggregatesInput = {
    AND?: TagScalarWhereWithAggregatesInput | TagScalarWhereWithAggregatesInput[]
    OR?: TagScalarWhereWithAggregatesInput[]
    NOT?: TagScalarWhereWithAggregatesInput | TagScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Tag"> | string
    slug?: StringWithAggregatesFilter<"Tag"> | string
    label?: StringWithAggregatesFilter<"Tag"> | string
  }

  export type TopicTagWhereInput = {
    AND?: TopicTagWhereInput | TopicTagWhereInput[]
    OR?: TopicTagWhereInput[]
    NOT?: TopicTagWhereInput | TopicTagWhereInput[]
    id?: StringFilter<"TopicTag"> | string
    topicId?: StringFilter<"TopicTag"> | string
    tagId?: StringFilter<"TopicTag"> | string
    topic?: XOR<TopicScalarRelationFilter, TopicWhereInput>
    tag?: XOR<TagScalarRelationFilter, TagWhereInput>
  }

  export type TopicTagOrderByWithRelationInput = {
    id?: SortOrder
    topicId?: SortOrder
    tagId?: SortOrder
    topic?: TopicOrderByWithRelationInput
    tag?: TagOrderByWithRelationInput
  }

  export type TopicTagWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    topicId_tagId?: TopicTagTopicIdTagIdCompoundUniqueInput
    AND?: TopicTagWhereInput | TopicTagWhereInput[]
    OR?: TopicTagWhereInput[]
    NOT?: TopicTagWhereInput | TopicTagWhereInput[]
    topicId?: StringFilter<"TopicTag"> | string
    tagId?: StringFilter<"TopicTag"> | string
    topic?: XOR<TopicScalarRelationFilter, TopicWhereInput>
    tag?: XOR<TagScalarRelationFilter, TagWhereInput>
  }, "id" | "topicId_tagId">

  export type TopicTagOrderByWithAggregationInput = {
    id?: SortOrder
    topicId?: SortOrder
    tagId?: SortOrder
    _count?: TopicTagCountOrderByAggregateInput
    _max?: TopicTagMaxOrderByAggregateInput
    _min?: TopicTagMinOrderByAggregateInput
  }

  export type TopicTagScalarWhereWithAggregatesInput = {
    AND?: TopicTagScalarWhereWithAggregatesInput | TopicTagScalarWhereWithAggregatesInput[]
    OR?: TopicTagScalarWhereWithAggregatesInput[]
    NOT?: TopicTagScalarWhereWithAggregatesInput | TopicTagScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TopicTag"> | string
    topicId?: StringWithAggregatesFilter<"TopicTag"> | string
    tagId?: StringWithAggregatesFilter<"TopicTag"> | string
  }

  export type ItemTagWhereInput = {
    AND?: ItemTagWhereInput | ItemTagWhereInput[]
    OR?: ItemTagWhereInput[]
    NOT?: ItemTagWhereInput | ItemTagWhereInput[]
    id?: StringFilter<"ItemTag"> | string
    itemId?: StringFilter<"ItemTag"> | string
    tagId?: StringFilter<"ItemTag"> | string
    item?: XOR<ContentItemScalarRelationFilter, ContentItemWhereInput>
    tag?: XOR<TagScalarRelationFilter, TagWhereInput>
  }

  export type ItemTagOrderByWithRelationInput = {
    id?: SortOrder
    itemId?: SortOrder
    tagId?: SortOrder
    item?: ContentItemOrderByWithRelationInput
    tag?: TagOrderByWithRelationInput
  }

  export type ItemTagWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    itemId_tagId?: ItemTagItemIdTagIdCompoundUniqueInput
    AND?: ItemTagWhereInput | ItemTagWhereInput[]
    OR?: ItemTagWhereInput[]
    NOT?: ItemTagWhereInput | ItemTagWhereInput[]
    itemId?: StringFilter<"ItemTag"> | string
    tagId?: StringFilter<"ItemTag"> | string
    item?: XOR<ContentItemScalarRelationFilter, ContentItemWhereInput>
    tag?: XOR<TagScalarRelationFilter, TagWhereInput>
  }, "id" | "itemId_tagId">

  export type ItemTagOrderByWithAggregationInput = {
    id?: SortOrder
    itemId?: SortOrder
    tagId?: SortOrder
    _count?: ItemTagCountOrderByAggregateInput
    _max?: ItemTagMaxOrderByAggregateInput
    _min?: ItemTagMinOrderByAggregateInput
  }

  export type ItemTagScalarWhereWithAggregatesInput = {
    AND?: ItemTagScalarWhereWithAggregatesInput | ItemTagScalarWhereWithAggregatesInput[]
    OR?: ItemTagScalarWhereWithAggregatesInput[]
    NOT?: ItemTagScalarWhereWithAggregatesInput | ItemTagScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ItemTag"> | string
    itemId?: StringWithAggregatesFilter<"ItemTag"> | string
    tagId?: StringWithAggregatesFilter<"ItemTag"> | string
  }

  export type ContentItemWhereInput = {
    AND?: ContentItemWhereInput | ContentItemWhereInput[]
    OR?: ContentItemWhereInput[]
    NOT?: ContentItemWhereInput | ContentItemWhereInput[]
    id?: StringFilter<"ContentItem"> | string
    kind?: EnumContentKindFilter<"ContentItem"> | $Enums.ContentKind
    topicId?: StringFilter<"ContentItem"> | string
    locale?: EnumLocaleFilter<"ContentItem"> | $Enums.Locale
    title?: StringNullableFilter<"ContentItem"> | string | null
    text?: StringFilter<"ContentItem"> | string
    richText?: StringNullableFilter<"ContentItem"> | string | null
    sortOrder?: IntFilter<"ContentItem"> | number
    status?: EnumPublishStatusFilter<"ContentItem"> | $Enums.PublishStatus
    authorName?: StringNullableFilter<"ContentItem"> | string | null
    createdAt?: DateTimeFilter<"ContentItem"> | Date | string
    updatedAt?: DateTimeFilter<"ContentItem"> | Date | string
    publishAt?: DateTimeNullableFilter<"ContentItem"> | Date | string | null
    expireAt?: DateTimeNullableFilter<"ContentItem"> | Date | string | null
    regionMode?: EnumRegionModeFilter<"ContentItem"> | $Enums.RegionMode
    regionManualId?: StringNullableFilter<"ContentItem"> | string | null
    regionEffectiveId?: StringNullableFilter<"ContentItem"> | string | null
    regionAuto?: JsonNullableFilter<"ContentItem">
    validation?: JsonNullableFilter<"ContentItem">
    meta?: JsonNullableFilter<"ContentItem">
    topic?: XOR<TopicScalarRelationFilter, TopicWhereInput>
    regionManual?: XOR<RegionNullableScalarRelationFilter, RegionWhereInput> | null
    regionEffective?: XOR<RegionNullableScalarRelationFilter, RegionWhereInput> | null
    answerOptions?: AnswerOptionListRelationFilter
    tags?: ItemTagListRelationFilter
  }

  export type ContentItemOrderByWithRelationInput = {
    id?: SortOrder
    kind?: SortOrder
    topicId?: SortOrder
    locale?: SortOrder
    title?: SortOrderInput | SortOrder
    text?: SortOrder
    richText?: SortOrderInput | SortOrder
    sortOrder?: SortOrder
    status?: SortOrder
    authorName?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    publishAt?: SortOrderInput | SortOrder
    expireAt?: SortOrderInput | SortOrder
    regionMode?: SortOrder
    regionManualId?: SortOrderInput | SortOrder
    regionEffectiveId?: SortOrderInput | SortOrder
    regionAuto?: SortOrderInput | SortOrder
    validation?: SortOrderInput | SortOrder
    meta?: SortOrderInput | SortOrder
    topic?: TopicOrderByWithRelationInput
    regionManual?: RegionOrderByWithRelationInput
    regionEffective?: RegionOrderByWithRelationInput
    answerOptions?: AnswerOptionOrderByRelationAggregateInput
    tags?: ItemTagOrderByRelationAggregateInput
  }

  export type ContentItemWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ContentItemWhereInput | ContentItemWhereInput[]
    OR?: ContentItemWhereInput[]
    NOT?: ContentItemWhereInput | ContentItemWhereInput[]
    kind?: EnumContentKindFilter<"ContentItem"> | $Enums.ContentKind
    topicId?: StringFilter<"ContentItem"> | string
    locale?: EnumLocaleFilter<"ContentItem"> | $Enums.Locale
    title?: StringNullableFilter<"ContentItem"> | string | null
    text?: StringFilter<"ContentItem"> | string
    richText?: StringNullableFilter<"ContentItem"> | string | null
    sortOrder?: IntFilter<"ContentItem"> | number
    status?: EnumPublishStatusFilter<"ContentItem"> | $Enums.PublishStatus
    authorName?: StringNullableFilter<"ContentItem"> | string | null
    createdAt?: DateTimeFilter<"ContentItem"> | Date | string
    updatedAt?: DateTimeFilter<"ContentItem"> | Date | string
    publishAt?: DateTimeNullableFilter<"ContentItem"> | Date | string | null
    expireAt?: DateTimeNullableFilter<"ContentItem"> | Date | string | null
    regionMode?: EnumRegionModeFilter<"ContentItem"> | $Enums.RegionMode
    regionManualId?: StringNullableFilter<"ContentItem"> | string | null
    regionEffectiveId?: StringNullableFilter<"ContentItem"> | string | null
    regionAuto?: JsonNullableFilter<"ContentItem">
    validation?: JsonNullableFilter<"ContentItem">
    meta?: JsonNullableFilter<"ContentItem">
    topic?: XOR<TopicScalarRelationFilter, TopicWhereInput>
    regionManual?: XOR<RegionNullableScalarRelationFilter, RegionWhereInput> | null
    regionEffective?: XOR<RegionNullableScalarRelationFilter, RegionWhereInput> | null
    answerOptions?: AnswerOptionListRelationFilter
    tags?: ItemTagListRelationFilter
  }, "id">

  export type ContentItemOrderByWithAggregationInput = {
    id?: SortOrder
    kind?: SortOrder
    topicId?: SortOrder
    locale?: SortOrder
    title?: SortOrderInput | SortOrder
    text?: SortOrder
    richText?: SortOrderInput | SortOrder
    sortOrder?: SortOrder
    status?: SortOrder
    authorName?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    publishAt?: SortOrderInput | SortOrder
    expireAt?: SortOrderInput | SortOrder
    regionMode?: SortOrder
    regionManualId?: SortOrderInput | SortOrder
    regionEffectiveId?: SortOrderInput | SortOrder
    regionAuto?: SortOrderInput | SortOrder
    validation?: SortOrderInput | SortOrder
    meta?: SortOrderInput | SortOrder
    _count?: ContentItemCountOrderByAggregateInput
    _avg?: ContentItemAvgOrderByAggregateInput
    _max?: ContentItemMaxOrderByAggregateInput
    _min?: ContentItemMinOrderByAggregateInput
    _sum?: ContentItemSumOrderByAggregateInput
  }

  export type ContentItemScalarWhereWithAggregatesInput = {
    AND?: ContentItemScalarWhereWithAggregatesInput | ContentItemScalarWhereWithAggregatesInput[]
    OR?: ContentItemScalarWhereWithAggregatesInput[]
    NOT?: ContentItemScalarWhereWithAggregatesInput | ContentItemScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ContentItem"> | string
    kind?: EnumContentKindWithAggregatesFilter<"ContentItem"> | $Enums.ContentKind
    topicId?: StringWithAggregatesFilter<"ContentItem"> | string
    locale?: EnumLocaleWithAggregatesFilter<"ContentItem"> | $Enums.Locale
    title?: StringNullableWithAggregatesFilter<"ContentItem"> | string | null
    text?: StringWithAggregatesFilter<"ContentItem"> | string
    richText?: StringNullableWithAggregatesFilter<"ContentItem"> | string | null
    sortOrder?: IntWithAggregatesFilter<"ContentItem"> | number
    status?: EnumPublishStatusWithAggregatesFilter<"ContentItem"> | $Enums.PublishStatus
    authorName?: StringNullableWithAggregatesFilter<"ContentItem"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ContentItem"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ContentItem"> | Date | string
    publishAt?: DateTimeNullableWithAggregatesFilter<"ContentItem"> | Date | string | null
    expireAt?: DateTimeNullableWithAggregatesFilter<"ContentItem"> | Date | string | null
    regionMode?: EnumRegionModeWithAggregatesFilter<"ContentItem"> | $Enums.RegionMode
    regionManualId?: StringNullableWithAggregatesFilter<"ContentItem"> | string | null
    regionEffectiveId?: StringNullableWithAggregatesFilter<"ContentItem"> | string | null
    regionAuto?: JsonNullableWithAggregatesFilter<"ContentItem">
    validation?: JsonNullableWithAggregatesFilter<"ContentItem">
    meta?: JsonNullableWithAggregatesFilter<"ContentItem">
  }

  export type AnswerOptionWhereInput = {
    AND?: AnswerOptionWhereInput | AnswerOptionWhereInput[]
    OR?: AnswerOptionWhereInput[]
    NOT?: AnswerOptionWhereInput | AnswerOptionWhereInput[]
    id?: StringFilter<"AnswerOption"> | string
    itemId?: StringFilter<"AnswerOption"> | string
    label?: StringFilter<"AnswerOption"> | string
    value?: StringFilter<"AnswerOption"> | string
    sortOrder?: IntFilter<"AnswerOption"> | number
    exclusive?: BoolFilter<"AnswerOption"> | boolean
    meta?: JsonNullableFilter<"AnswerOption">
    item?: XOR<ContentItemScalarRelationFilter, ContentItemWhereInput>
  }

  export type AnswerOptionOrderByWithRelationInput = {
    id?: SortOrder
    itemId?: SortOrder
    label?: SortOrder
    value?: SortOrder
    sortOrder?: SortOrder
    exclusive?: SortOrder
    meta?: SortOrderInput | SortOrder
    item?: ContentItemOrderByWithRelationInput
  }

  export type AnswerOptionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    itemId_sortOrder?: AnswerOptionItemIdSortOrderCompoundUniqueInput
    itemId_value?: AnswerOptionItemIdValueCompoundUniqueInput
    AND?: AnswerOptionWhereInput | AnswerOptionWhereInput[]
    OR?: AnswerOptionWhereInput[]
    NOT?: AnswerOptionWhereInput | AnswerOptionWhereInput[]
    itemId?: StringFilter<"AnswerOption"> | string
    label?: StringFilter<"AnswerOption"> | string
    value?: StringFilter<"AnswerOption"> | string
    sortOrder?: IntFilter<"AnswerOption"> | number
    exclusive?: BoolFilter<"AnswerOption"> | boolean
    meta?: JsonNullableFilter<"AnswerOption">
    item?: XOR<ContentItemScalarRelationFilter, ContentItemWhereInput>
  }, "id" | "itemId_sortOrder" | "itemId_value">

  export type AnswerOptionOrderByWithAggregationInput = {
    id?: SortOrder
    itemId?: SortOrder
    label?: SortOrder
    value?: SortOrder
    sortOrder?: SortOrder
    exclusive?: SortOrder
    meta?: SortOrderInput | SortOrder
    _count?: AnswerOptionCountOrderByAggregateInput
    _avg?: AnswerOptionAvgOrderByAggregateInput
    _max?: AnswerOptionMaxOrderByAggregateInput
    _min?: AnswerOptionMinOrderByAggregateInput
    _sum?: AnswerOptionSumOrderByAggregateInput
  }

  export type AnswerOptionScalarWhereWithAggregatesInput = {
    AND?: AnswerOptionScalarWhereWithAggregatesInput | AnswerOptionScalarWhereWithAggregatesInput[]
    OR?: AnswerOptionScalarWhereWithAggregatesInput[]
    NOT?: AnswerOptionScalarWhereWithAggregatesInput | AnswerOptionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AnswerOption"> | string
    itemId?: StringWithAggregatesFilter<"AnswerOption"> | string
    label?: StringWithAggregatesFilter<"AnswerOption"> | string
    value?: StringWithAggregatesFilter<"AnswerOption"> | string
    sortOrder?: IntWithAggregatesFilter<"AnswerOption"> | number
    exclusive?: BoolWithAggregatesFilter<"AnswerOption"> | boolean
    meta?: JsonNullableWithAggregatesFilter<"AnswerOption">
  }

  export type RegionCreateInput = {
    id?: string
    code: string
    name: string
    level: number
    manualItems?: ContentItemCreateNestedManyWithoutRegionManualInput
    effectiveItems?: ContentItemCreateNestedManyWithoutRegionEffectiveInput
  }

  export type RegionUncheckedCreateInput = {
    id?: string
    code: string
    name: string
    level: number
    manualItems?: ContentItemUncheckedCreateNestedManyWithoutRegionManualInput
    effectiveItems?: ContentItemUncheckedCreateNestedManyWithoutRegionEffectiveInput
  }

  export type RegionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    level?: IntFieldUpdateOperationsInput | number
    manualItems?: ContentItemUpdateManyWithoutRegionManualNestedInput
    effectiveItems?: ContentItemUpdateManyWithoutRegionEffectiveNestedInput
  }

  export type RegionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    level?: IntFieldUpdateOperationsInput | number
    manualItems?: ContentItemUncheckedUpdateManyWithoutRegionManualNestedInput
    effectiveItems?: ContentItemUncheckedUpdateManyWithoutRegionEffectiveNestedInput
  }

  export type RegionCreateManyInput = {
    id?: string
    code: string
    name: string
    level: number
  }

  export type RegionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    level?: IntFieldUpdateOperationsInput | number
  }

  export type RegionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    level?: IntFieldUpdateOperationsInput | number
  }

  export type TopicCreateInput = {
    id?: string
    slug: string
    title: string
    description?: string | null
    locale?: $Enums.Locale
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: ContentItemCreateNestedManyWithoutTopicInput
    tags?: TopicTagCreateNestedManyWithoutTopicInput
  }

  export type TopicUncheckedCreateInput = {
    id?: string
    slug: string
    title: string
    description?: string | null
    locale?: $Enums.Locale
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: ContentItemUncheckedCreateNestedManyWithoutTopicInput
    tags?: TopicTagUncheckedCreateNestedManyWithoutTopicInput
  }

  export type TopicUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: ContentItemUpdateManyWithoutTopicNestedInput
    tags?: TopicTagUpdateManyWithoutTopicNestedInput
  }

  export type TopicUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: ContentItemUncheckedUpdateManyWithoutTopicNestedInput
    tags?: TopicTagUncheckedUpdateManyWithoutTopicNestedInput
  }

  export type TopicCreateManyInput = {
    id?: string
    slug: string
    title: string
    description?: string | null
    locale?: $Enums.Locale
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TopicUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TopicUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TagCreateInput = {
    id?: string
    slug: string
    label: string
    topics?: TopicTagCreateNestedManyWithoutTagInput
    items?: ItemTagCreateNestedManyWithoutTagInput
  }

  export type TagUncheckedCreateInput = {
    id?: string
    slug: string
    label: string
    topics?: TopicTagUncheckedCreateNestedManyWithoutTagInput
    items?: ItemTagUncheckedCreateNestedManyWithoutTagInput
  }

  export type TagUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    topics?: TopicTagUpdateManyWithoutTagNestedInput
    items?: ItemTagUpdateManyWithoutTagNestedInput
  }

  export type TagUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    topics?: TopicTagUncheckedUpdateManyWithoutTagNestedInput
    items?: ItemTagUncheckedUpdateManyWithoutTagNestedInput
  }

  export type TagCreateManyInput = {
    id?: string
    slug: string
    label: string
  }

  export type TagUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
  }

  export type TagUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
  }

  export type TopicTagCreateInput = {
    id?: string
    topic: TopicCreateNestedOneWithoutTagsInput
    tag: TagCreateNestedOneWithoutTopicsInput
  }

  export type TopicTagUncheckedCreateInput = {
    id?: string
    topicId: string
    tagId: string
  }

  export type TopicTagUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    topic?: TopicUpdateOneRequiredWithoutTagsNestedInput
    tag?: TagUpdateOneRequiredWithoutTopicsNestedInput
  }

  export type TopicTagUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    topicId?: StringFieldUpdateOperationsInput | string
    tagId?: StringFieldUpdateOperationsInput | string
  }

  export type TopicTagCreateManyInput = {
    id?: string
    topicId: string
    tagId: string
  }

  export type TopicTagUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
  }

  export type TopicTagUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    topicId?: StringFieldUpdateOperationsInput | string
    tagId?: StringFieldUpdateOperationsInput | string
  }

  export type ItemTagCreateInput = {
    id?: string
    item: ContentItemCreateNestedOneWithoutTagsInput
    tag: TagCreateNestedOneWithoutItemsInput
  }

  export type ItemTagUncheckedCreateInput = {
    id?: string
    itemId: string
    tagId: string
  }

  export type ItemTagUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: ContentItemUpdateOneRequiredWithoutTagsNestedInput
    tag?: TagUpdateOneRequiredWithoutItemsNestedInput
  }

  export type ItemTagUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    tagId?: StringFieldUpdateOperationsInput | string
  }

  export type ItemTagCreateManyInput = {
    id?: string
    itemId: string
    tagId: string
  }

  export type ItemTagUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
  }

  export type ItemTagUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    tagId?: StringFieldUpdateOperationsInput | string
  }

  export type ContentItemCreateInput = {
    id?: string
    kind: $Enums.ContentKind
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    topic: TopicCreateNestedOneWithoutItemsInput
    regionManual?: RegionCreateNestedOneWithoutManualItemsInput
    regionEffective?: RegionCreateNestedOneWithoutEffectiveItemsInput
    answerOptions?: AnswerOptionCreateNestedManyWithoutItemInput
    tags?: ItemTagCreateNestedManyWithoutItemInput
  }

  export type ContentItemUncheckedCreateInput = {
    id?: string
    kind: $Enums.ContentKind
    topicId: string
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionManualId?: string | null
    regionEffectiveId?: string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    answerOptions?: AnswerOptionUncheckedCreateNestedManyWithoutItemInput
    tags?: ItemTagUncheckedCreateNestedManyWithoutItemInput
  }

  export type ContentItemUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    topic?: TopicUpdateOneRequiredWithoutItemsNestedInput
    regionManual?: RegionUpdateOneWithoutManualItemsNestedInput
    regionEffective?: RegionUpdateOneWithoutEffectiveItemsNestedInput
    answerOptions?: AnswerOptionUpdateManyWithoutItemNestedInput
    tags?: ItemTagUpdateManyWithoutItemNestedInput
  }

  export type ContentItemUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    topicId?: StringFieldUpdateOperationsInput | string
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionManualId?: NullableStringFieldUpdateOperationsInput | string | null
    regionEffectiveId?: NullableStringFieldUpdateOperationsInput | string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    answerOptions?: AnswerOptionUncheckedUpdateManyWithoutItemNestedInput
    tags?: ItemTagUncheckedUpdateManyWithoutItemNestedInput
  }

  export type ContentItemCreateManyInput = {
    id?: string
    kind: $Enums.ContentKind
    topicId: string
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionManualId?: string | null
    regionEffectiveId?: string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ContentItemUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ContentItemUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    topicId?: StringFieldUpdateOperationsInput | string
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionManualId?: NullableStringFieldUpdateOperationsInput | string | null
    regionEffectiveId?: NullableStringFieldUpdateOperationsInput | string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AnswerOptionCreateInput = {
    id?: string
    label: string
    value: string
    sortOrder?: number
    exclusive?: boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
    item: ContentItemCreateNestedOneWithoutAnswerOptionsInput
  }

  export type AnswerOptionUncheckedCreateInput = {
    id?: string
    itemId: string
    label: string
    value: string
    sortOrder?: number
    exclusive?: boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AnswerOptionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    exclusive?: BoolFieldUpdateOperationsInput | boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
    item?: ContentItemUpdateOneRequiredWithoutAnswerOptionsNestedInput
  }

  export type AnswerOptionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    exclusive?: BoolFieldUpdateOperationsInput | boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AnswerOptionCreateManyInput = {
    id?: string
    itemId: string
    label: string
    value: string
    sortOrder?: number
    exclusive?: boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AnswerOptionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    exclusive?: BoolFieldUpdateOperationsInput | boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AnswerOptionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    exclusive?: BoolFieldUpdateOperationsInput | boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type ContentItemListRelationFilter = {
    every?: ContentItemWhereInput
    some?: ContentItemWhereInput
    none?: ContentItemWhereInput
  }

  export type ContentItemOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RegionCountOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    level?: SortOrder
  }

  export type RegionAvgOrderByAggregateInput = {
    level?: SortOrder
  }

  export type RegionMaxOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    level?: SortOrder
  }

  export type RegionMinOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    level?: SortOrder
  }

  export type RegionSumOrderByAggregateInput = {
    level?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumLocaleFilter<$PrismaModel = never> = {
    equals?: $Enums.Locale | EnumLocaleFieldRefInput<$PrismaModel>
    in?: $Enums.Locale[] | ListEnumLocaleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Locale[] | ListEnumLocaleFieldRefInput<$PrismaModel>
    not?: NestedEnumLocaleFilter<$PrismaModel> | $Enums.Locale
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type TopicTagListRelationFilter = {
    every?: TopicTagWhereInput
    some?: TopicTagWhereInput
    none?: TopicTagWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type TopicTagOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TopicCountOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    locale?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TopicMaxOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    locale?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TopicMinOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    locale?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumLocaleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Locale | EnumLocaleFieldRefInput<$PrismaModel>
    in?: $Enums.Locale[] | ListEnumLocaleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Locale[] | ListEnumLocaleFieldRefInput<$PrismaModel>
    not?: NestedEnumLocaleWithAggregatesFilter<$PrismaModel> | $Enums.Locale
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLocaleFilter<$PrismaModel>
    _max?: NestedEnumLocaleFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type ItemTagListRelationFilter = {
    every?: ItemTagWhereInput
    some?: ItemTagWhereInput
    none?: ItemTagWhereInput
  }

  export type ItemTagOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TagCountOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    label?: SortOrder
  }

  export type TagMaxOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    label?: SortOrder
  }

  export type TagMinOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    label?: SortOrder
  }

  export type TopicScalarRelationFilter = {
    is?: TopicWhereInput
    isNot?: TopicWhereInput
  }

  export type TagScalarRelationFilter = {
    is?: TagWhereInput
    isNot?: TagWhereInput
  }

  export type TopicTagTopicIdTagIdCompoundUniqueInput = {
    topicId: string
    tagId: string
  }

  export type TopicTagCountOrderByAggregateInput = {
    id?: SortOrder
    topicId?: SortOrder
    tagId?: SortOrder
  }

  export type TopicTagMaxOrderByAggregateInput = {
    id?: SortOrder
    topicId?: SortOrder
    tagId?: SortOrder
  }

  export type TopicTagMinOrderByAggregateInput = {
    id?: SortOrder
    topicId?: SortOrder
    tagId?: SortOrder
  }

  export type ContentItemScalarRelationFilter = {
    is?: ContentItemWhereInput
    isNot?: ContentItemWhereInput
  }

  export type ItemTagItemIdTagIdCompoundUniqueInput = {
    itemId: string
    tagId: string
  }

  export type ItemTagCountOrderByAggregateInput = {
    id?: SortOrder
    itemId?: SortOrder
    tagId?: SortOrder
  }

  export type ItemTagMaxOrderByAggregateInput = {
    id?: SortOrder
    itemId?: SortOrder
    tagId?: SortOrder
  }

  export type ItemTagMinOrderByAggregateInput = {
    id?: SortOrder
    itemId?: SortOrder
    tagId?: SortOrder
  }

  export type EnumContentKindFilter<$PrismaModel = never> = {
    equals?: $Enums.ContentKind | EnumContentKindFieldRefInput<$PrismaModel>
    in?: $Enums.ContentKind[] | ListEnumContentKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.ContentKind[] | ListEnumContentKindFieldRefInput<$PrismaModel>
    not?: NestedEnumContentKindFilter<$PrismaModel> | $Enums.ContentKind
  }

  export type EnumPublishStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.PublishStatus | EnumPublishStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PublishStatus[] | ListEnumPublishStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PublishStatus[] | ListEnumPublishStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPublishStatusFilter<$PrismaModel> | $Enums.PublishStatus
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type EnumRegionModeFilter<$PrismaModel = never> = {
    equals?: $Enums.RegionMode | EnumRegionModeFieldRefInput<$PrismaModel>
    in?: $Enums.RegionMode[] | ListEnumRegionModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RegionMode[] | ListEnumRegionModeFieldRefInput<$PrismaModel>
    not?: NestedEnumRegionModeFilter<$PrismaModel> | $Enums.RegionMode
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type RegionNullableScalarRelationFilter = {
    is?: RegionWhereInput | null
    isNot?: RegionWhereInput | null
  }

  export type AnswerOptionListRelationFilter = {
    every?: AnswerOptionWhereInput
    some?: AnswerOptionWhereInput
    none?: AnswerOptionWhereInput
  }

  export type AnswerOptionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ContentItemCountOrderByAggregateInput = {
    id?: SortOrder
    kind?: SortOrder
    topicId?: SortOrder
    locale?: SortOrder
    title?: SortOrder
    text?: SortOrder
    richText?: SortOrder
    sortOrder?: SortOrder
    status?: SortOrder
    authorName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    publishAt?: SortOrder
    expireAt?: SortOrder
    regionMode?: SortOrder
    regionManualId?: SortOrder
    regionEffectiveId?: SortOrder
    regionAuto?: SortOrder
    validation?: SortOrder
    meta?: SortOrder
  }

  export type ContentItemAvgOrderByAggregateInput = {
    sortOrder?: SortOrder
  }

  export type ContentItemMaxOrderByAggregateInput = {
    id?: SortOrder
    kind?: SortOrder
    topicId?: SortOrder
    locale?: SortOrder
    title?: SortOrder
    text?: SortOrder
    richText?: SortOrder
    sortOrder?: SortOrder
    status?: SortOrder
    authorName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    publishAt?: SortOrder
    expireAt?: SortOrder
    regionMode?: SortOrder
    regionManualId?: SortOrder
    regionEffectiveId?: SortOrder
  }

  export type ContentItemMinOrderByAggregateInput = {
    id?: SortOrder
    kind?: SortOrder
    topicId?: SortOrder
    locale?: SortOrder
    title?: SortOrder
    text?: SortOrder
    richText?: SortOrder
    sortOrder?: SortOrder
    status?: SortOrder
    authorName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    publishAt?: SortOrder
    expireAt?: SortOrder
    regionMode?: SortOrder
    regionManualId?: SortOrder
    regionEffectiveId?: SortOrder
  }

  export type ContentItemSumOrderByAggregateInput = {
    sortOrder?: SortOrder
  }

  export type EnumContentKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ContentKind | EnumContentKindFieldRefInput<$PrismaModel>
    in?: $Enums.ContentKind[] | ListEnumContentKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.ContentKind[] | ListEnumContentKindFieldRefInput<$PrismaModel>
    not?: NestedEnumContentKindWithAggregatesFilter<$PrismaModel> | $Enums.ContentKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumContentKindFilter<$PrismaModel>
    _max?: NestedEnumContentKindFilter<$PrismaModel>
  }

  export type EnumPublishStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PublishStatus | EnumPublishStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PublishStatus[] | ListEnumPublishStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PublishStatus[] | ListEnumPublishStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPublishStatusWithAggregatesFilter<$PrismaModel> | $Enums.PublishStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPublishStatusFilter<$PrismaModel>
    _max?: NestedEnumPublishStatusFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type EnumRegionModeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RegionMode | EnumRegionModeFieldRefInput<$PrismaModel>
    in?: $Enums.RegionMode[] | ListEnumRegionModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RegionMode[] | ListEnumRegionModeFieldRefInput<$PrismaModel>
    not?: NestedEnumRegionModeWithAggregatesFilter<$PrismaModel> | $Enums.RegionMode
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRegionModeFilter<$PrismaModel>
    _max?: NestedEnumRegionModeFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type AnswerOptionItemIdSortOrderCompoundUniqueInput = {
    itemId: string
    sortOrder: number
  }

  export type AnswerOptionItemIdValueCompoundUniqueInput = {
    itemId: string
    value: string
  }

  export type AnswerOptionCountOrderByAggregateInput = {
    id?: SortOrder
    itemId?: SortOrder
    label?: SortOrder
    value?: SortOrder
    sortOrder?: SortOrder
    exclusive?: SortOrder
    meta?: SortOrder
  }

  export type AnswerOptionAvgOrderByAggregateInput = {
    sortOrder?: SortOrder
  }

  export type AnswerOptionMaxOrderByAggregateInput = {
    id?: SortOrder
    itemId?: SortOrder
    label?: SortOrder
    value?: SortOrder
    sortOrder?: SortOrder
    exclusive?: SortOrder
  }

  export type AnswerOptionMinOrderByAggregateInput = {
    id?: SortOrder
    itemId?: SortOrder
    label?: SortOrder
    value?: SortOrder
    sortOrder?: SortOrder
    exclusive?: SortOrder
  }

  export type AnswerOptionSumOrderByAggregateInput = {
    sortOrder?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type ContentItemCreateNestedManyWithoutRegionManualInput = {
    create?: XOR<ContentItemCreateWithoutRegionManualInput, ContentItemUncheckedCreateWithoutRegionManualInput> | ContentItemCreateWithoutRegionManualInput[] | ContentItemUncheckedCreateWithoutRegionManualInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutRegionManualInput | ContentItemCreateOrConnectWithoutRegionManualInput[]
    createMany?: ContentItemCreateManyRegionManualInputEnvelope
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
  }

  export type ContentItemCreateNestedManyWithoutRegionEffectiveInput = {
    create?: XOR<ContentItemCreateWithoutRegionEffectiveInput, ContentItemUncheckedCreateWithoutRegionEffectiveInput> | ContentItemCreateWithoutRegionEffectiveInput[] | ContentItemUncheckedCreateWithoutRegionEffectiveInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutRegionEffectiveInput | ContentItemCreateOrConnectWithoutRegionEffectiveInput[]
    createMany?: ContentItemCreateManyRegionEffectiveInputEnvelope
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
  }

  export type ContentItemUncheckedCreateNestedManyWithoutRegionManualInput = {
    create?: XOR<ContentItemCreateWithoutRegionManualInput, ContentItemUncheckedCreateWithoutRegionManualInput> | ContentItemCreateWithoutRegionManualInput[] | ContentItemUncheckedCreateWithoutRegionManualInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutRegionManualInput | ContentItemCreateOrConnectWithoutRegionManualInput[]
    createMany?: ContentItemCreateManyRegionManualInputEnvelope
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
  }

  export type ContentItemUncheckedCreateNestedManyWithoutRegionEffectiveInput = {
    create?: XOR<ContentItemCreateWithoutRegionEffectiveInput, ContentItemUncheckedCreateWithoutRegionEffectiveInput> | ContentItemCreateWithoutRegionEffectiveInput[] | ContentItemUncheckedCreateWithoutRegionEffectiveInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutRegionEffectiveInput | ContentItemCreateOrConnectWithoutRegionEffectiveInput[]
    createMany?: ContentItemCreateManyRegionEffectiveInputEnvelope
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ContentItemUpdateManyWithoutRegionManualNestedInput = {
    create?: XOR<ContentItemCreateWithoutRegionManualInput, ContentItemUncheckedCreateWithoutRegionManualInput> | ContentItemCreateWithoutRegionManualInput[] | ContentItemUncheckedCreateWithoutRegionManualInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutRegionManualInput | ContentItemCreateOrConnectWithoutRegionManualInput[]
    upsert?: ContentItemUpsertWithWhereUniqueWithoutRegionManualInput | ContentItemUpsertWithWhereUniqueWithoutRegionManualInput[]
    createMany?: ContentItemCreateManyRegionManualInputEnvelope
    set?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    disconnect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    delete?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    update?: ContentItemUpdateWithWhereUniqueWithoutRegionManualInput | ContentItemUpdateWithWhereUniqueWithoutRegionManualInput[]
    updateMany?: ContentItemUpdateManyWithWhereWithoutRegionManualInput | ContentItemUpdateManyWithWhereWithoutRegionManualInput[]
    deleteMany?: ContentItemScalarWhereInput | ContentItemScalarWhereInput[]
  }

  export type ContentItemUpdateManyWithoutRegionEffectiveNestedInput = {
    create?: XOR<ContentItemCreateWithoutRegionEffectiveInput, ContentItemUncheckedCreateWithoutRegionEffectiveInput> | ContentItemCreateWithoutRegionEffectiveInput[] | ContentItemUncheckedCreateWithoutRegionEffectiveInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutRegionEffectiveInput | ContentItemCreateOrConnectWithoutRegionEffectiveInput[]
    upsert?: ContentItemUpsertWithWhereUniqueWithoutRegionEffectiveInput | ContentItemUpsertWithWhereUniqueWithoutRegionEffectiveInput[]
    createMany?: ContentItemCreateManyRegionEffectiveInputEnvelope
    set?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    disconnect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    delete?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    update?: ContentItemUpdateWithWhereUniqueWithoutRegionEffectiveInput | ContentItemUpdateWithWhereUniqueWithoutRegionEffectiveInput[]
    updateMany?: ContentItemUpdateManyWithWhereWithoutRegionEffectiveInput | ContentItemUpdateManyWithWhereWithoutRegionEffectiveInput[]
    deleteMany?: ContentItemScalarWhereInput | ContentItemScalarWhereInput[]
  }

  export type ContentItemUncheckedUpdateManyWithoutRegionManualNestedInput = {
    create?: XOR<ContentItemCreateWithoutRegionManualInput, ContentItemUncheckedCreateWithoutRegionManualInput> | ContentItemCreateWithoutRegionManualInput[] | ContentItemUncheckedCreateWithoutRegionManualInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutRegionManualInput | ContentItemCreateOrConnectWithoutRegionManualInput[]
    upsert?: ContentItemUpsertWithWhereUniqueWithoutRegionManualInput | ContentItemUpsertWithWhereUniqueWithoutRegionManualInput[]
    createMany?: ContentItemCreateManyRegionManualInputEnvelope
    set?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    disconnect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    delete?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    update?: ContentItemUpdateWithWhereUniqueWithoutRegionManualInput | ContentItemUpdateWithWhereUniqueWithoutRegionManualInput[]
    updateMany?: ContentItemUpdateManyWithWhereWithoutRegionManualInput | ContentItemUpdateManyWithWhereWithoutRegionManualInput[]
    deleteMany?: ContentItemScalarWhereInput | ContentItemScalarWhereInput[]
  }

  export type ContentItemUncheckedUpdateManyWithoutRegionEffectiveNestedInput = {
    create?: XOR<ContentItemCreateWithoutRegionEffectiveInput, ContentItemUncheckedCreateWithoutRegionEffectiveInput> | ContentItemCreateWithoutRegionEffectiveInput[] | ContentItemUncheckedCreateWithoutRegionEffectiveInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutRegionEffectiveInput | ContentItemCreateOrConnectWithoutRegionEffectiveInput[]
    upsert?: ContentItemUpsertWithWhereUniqueWithoutRegionEffectiveInput | ContentItemUpsertWithWhereUniqueWithoutRegionEffectiveInput[]
    createMany?: ContentItemCreateManyRegionEffectiveInputEnvelope
    set?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    disconnect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    delete?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    update?: ContentItemUpdateWithWhereUniqueWithoutRegionEffectiveInput | ContentItemUpdateWithWhereUniqueWithoutRegionEffectiveInput[]
    updateMany?: ContentItemUpdateManyWithWhereWithoutRegionEffectiveInput | ContentItemUpdateManyWithWhereWithoutRegionEffectiveInput[]
    deleteMany?: ContentItemScalarWhereInput | ContentItemScalarWhereInput[]
  }

  export type ContentItemCreateNestedManyWithoutTopicInput = {
    create?: XOR<ContentItemCreateWithoutTopicInput, ContentItemUncheckedCreateWithoutTopicInput> | ContentItemCreateWithoutTopicInput[] | ContentItemUncheckedCreateWithoutTopicInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutTopicInput | ContentItemCreateOrConnectWithoutTopicInput[]
    createMany?: ContentItemCreateManyTopicInputEnvelope
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
  }

  export type TopicTagCreateNestedManyWithoutTopicInput = {
    create?: XOR<TopicTagCreateWithoutTopicInput, TopicTagUncheckedCreateWithoutTopicInput> | TopicTagCreateWithoutTopicInput[] | TopicTagUncheckedCreateWithoutTopicInput[]
    connectOrCreate?: TopicTagCreateOrConnectWithoutTopicInput | TopicTagCreateOrConnectWithoutTopicInput[]
    createMany?: TopicTagCreateManyTopicInputEnvelope
    connect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
  }

  export type ContentItemUncheckedCreateNestedManyWithoutTopicInput = {
    create?: XOR<ContentItemCreateWithoutTopicInput, ContentItemUncheckedCreateWithoutTopicInput> | ContentItemCreateWithoutTopicInput[] | ContentItemUncheckedCreateWithoutTopicInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutTopicInput | ContentItemCreateOrConnectWithoutTopicInput[]
    createMany?: ContentItemCreateManyTopicInputEnvelope
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
  }

  export type TopicTagUncheckedCreateNestedManyWithoutTopicInput = {
    create?: XOR<TopicTagCreateWithoutTopicInput, TopicTagUncheckedCreateWithoutTopicInput> | TopicTagCreateWithoutTopicInput[] | TopicTagUncheckedCreateWithoutTopicInput[]
    connectOrCreate?: TopicTagCreateOrConnectWithoutTopicInput | TopicTagCreateOrConnectWithoutTopicInput[]
    createMany?: TopicTagCreateManyTopicInputEnvelope
    connect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumLocaleFieldUpdateOperationsInput = {
    set?: $Enums.Locale
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type ContentItemUpdateManyWithoutTopicNestedInput = {
    create?: XOR<ContentItemCreateWithoutTopicInput, ContentItemUncheckedCreateWithoutTopicInput> | ContentItemCreateWithoutTopicInput[] | ContentItemUncheckedCreateWithoutTopicInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutTopicInput | ContentItemCreateOrConnectWithoutTopicInput[]
    upsert?: ContentItemUpsertWithWhereUniqueWithoutTopicInput | ContentItemUpsertWithWhereUniqueWithoutTopicInput[]
    createMany?: ContentItemCreateManyTopicInputEnvelope
    set?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    disconnect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    delete?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    update?: ContentItemUpdateWithWhereUniqueWithoutTopicInput | ContentItemUpdateWithWhereUniqueWithoutTopicInput[]
    updateMany?: ContentItemUpdateManyWithWhereWithoutTopicInput | ContentItemUpdateManyWithWhereWithoutTopicInput[]
    deleteMany?: ContentItemScalarWhereInput | ContentItemScalarWhereInput[]
  }

  export type TopicTagUpdateManyWithoutTopicNestedInput = {
    create?: XOR<TopicTagCreateWithoutTopicInput, TopicTagUncheckedCreateWithoutTopicInput> | TopicTagCreateWithoutTopicInput[] | TopicTagUncheckedCreateWithoutTopicInput[]
    connectOrCreate?: TopicTagCreateOrConnectWithoutTopicInput | TopicTagCreateOrConnectWithoutTopicInput[]
    upsert?: TopicTagUpsertWithWhereUniqueWithoutTopicInput | TopicTagUpsertWithWhereUniqueWithoutTopicInput[]
    createMany?: TopicTagCreateManyTopicInputEnvelope
    set?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    disconnect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    delete?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    connect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    update?: TopicTagUpdateWithWhereUniqueWithoutTopicInput | TopicTagUpdateWithWhereUniqueWithoutTopicInput[]
    updateMany?: TopicTagUpdateManyWithWhereWithoutTopicInput | TopicTagUpdateManyWithWhereWithoutTopicInput[]
    deleteMany?: TopicTagScalarWhereInput | TopicTagScalarWhereInput[]
  }

  export type ContentItemUncheckedUpdateManyWithoutTopicNestedInput = {
    create?: XOR<ContentItemCreateWithoutTopicInput, ContentItemUncheckedCreateWithoutTopicInput> | ContentItemCreateWithoutTopicInput[] | ContentItemUncheckedCreateWithoutTopicInput[]
    connectOrCreate?: ContentItemCreateOrConnectWithoutTopicInput | ContentItemCreateOrConnectWithoutTopicInput[]
    upsert?: ContentItemUpsertWithWhereUniqueWithoutTopicInput | ContentItemUpsertWithWhereUniqueWithoutTopicInput[]
    createMany?: ContentItemCreateManyTopicInputEnvelope
    set?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    disconnect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    delete?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    connect?: ContentItemWhereUniqueInput | ContentItemWhereUniqueInput[]
    update?: ContentItemUpdateWithWhereUniqueWithoutTopicInput | ContentItemUpdateWithWhereUniqueWithoutTopicInput[]
    updateMany?: ContentItemUpdateManyWithWhereWithoutTopicInput | ContentItemUpdateManyWithWhereWithoutTopicInput[]
    deleteMany?: ContentItemScalarWhereInput | ContentItemScalarWhereInput[]
  }

  export type TopicTagUncheckedUpdateManyWithoutTopicNestedInput = {
    create?: XOR<TopicTagCreateWithoutTopicInput, TopicTagUncheckedCreateWithoutTopicInput> | TopicTagCreateWithoutTopicInput[] | TopicTagUncheckedCreateWithoutTopicInput[]
    connectOrCreate?: TopicTagCreateOrConnectWithoutTopicInput | TopicTagCreateOrConnectWithoutTopicInput[]
    upsert?: TopicTagUpsertWithWhereUniqueWithoutTopicInput | TopicTagUpsertWithWhereUniqueWithoutTopicInput[]
    createMany?: TopicTagCreateManyTopicInputEnvelope
    set?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    disconnect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    delete?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    connect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    update?: TopicTagUpdateWithWhereUniqueWithoutTopicInput | TopicTagUpdateWithWhereUniqueWithoutTopicInput[]
    updateMany?: TopicTagUpdateManyWithWhereWithoutTopicInput | TopicTagUpdateManyWithWhereWithoutTopicInput[]
    deleteMany?: TopicTagScalarWhereInput | TopicTagScalarWhereInput[]
  }

  export type TopicTagCreateNestedManyWithoutTagInput = {
    create?: XOR<TopicTagCreateWithoutTagInput, TopicTagUncheckedCreateWithoutTagInput> | TopicTagCreateWithoutTagInput[] | TopicTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: TopicTagCreateOrConnectWithoutTagInput | TopicTagCreateOrConnectWithoutTagInput[]
    createMany?: TopicTagCreateManyTagInputEnvelope
    connect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
  }

  export type ItemTagCreateNestedManyWithoutTagInput = {
    create?: XOR<ItemTagCreateWithoutTagInput, ItemTagUncheckedCreateWithoutTagInput> | ItemTagCreateWithoutTagInput[] | ItemTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: ItemTagCreateOrConnectWithoutTagInput | ItemTagCreateOrConnectWithoutTagInput[]
    createMany?: ItemTagCreateManyTagInputEnvelope
    connect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
  }

  export type TopicTagUncheckedCreateNestedManyWithoutTagInput = {
    create?: XOR<TopicTagCreateWithoutTagInput, TopicTagUncheckedCreateWithoutTagInput> | TopicTagCreateWithoutTagInput[] | TopicTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: TopicTagCreateOrConnectWithoutTagInput | TopicTagCreateOrConnectWithoutTagInput[]
    createMany?: TopicTagCreateManyTagInputEnvelope
    connect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
  }

  export type ItemTagUncheckedCreateNestedManyWithoutTagInput = {
    create?: XOR<ItemTagCreateWithoutTagInput, ItemTagUncheckedCreateWithoutTagInput> | ItemTagCreateWithoutTagInput[] | ItemTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: ItemTagCreateOrConnectWithoutTagInput | ItemTagCreateOrConnectWithoutTagInput[]
    createMany?: ItemTagCreateManyTagInputEnvelope
    connect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
  }

  export type TopicTagUpdateManyWithoutTagNestedInput = {
    create?: XOR<TopicTagCreateWithoutTagInput, TopicTagUncheckedCreateWithoutTagInput> | TopicTagCreateWithoutTagInput[] | TopicTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: TopicTagCreateOrConnectWithoutTagInput | TopicTagCreateOrConnectWithoutTagInput[]
    upsert?: TopicTagUpsertWithWhereUniqueWithoutTagInput | TopicTagUpsertWithWhereUniqueWithoutTagInput[]
    createMany?: TopicTagCreateManyTagInputEnvelope
    set?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    disconnect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    delete?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    connect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    update?: TopicTagUpdateWithWhereUniqueWithoutTagInput | TopicTagUpdateWithWhereUniqueWithoutTagInput[]
    updateMany?: TopicTagUpdateManyWithWhereWithoutTagInput | TopicTagUpdateManyWithWhereWithoutTagInput[]
    deleteMany?: TopicTagScalarWhereInput | TopicTagScalarWhereInput[]
  }

  export type ItemTagUpdateManyWithoutTagNestedInput = {
    create?: XOR<ItemTagCreateWithoutTagInput, ItemTagUncheckedCreateWithoutTagInput> | ItemTagCreateWithoutTagInput[] | ItemTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: ItemTagCreateOrConnectWithoutTagInput | ItemTagCreateOrConnectWithoutTagInput[]
    upsert?: ItemTagUpsertWithWhereUniqueWithoutTagInput | ItemTagUpsertWithWhereUniqueWithoutTagInput[]
    createMany?: ItemTagCreateManyTagInputEnvelope
    set?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    disconnect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    delete?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    connect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    update?: ItemTagUpdateWithWhereUniqueWithoutTagInput | ItemTagUpdateWithWhereUniqueWithoutTagInput[]
    updateMany?: ItemTagUpdateManyWithWhereWithoutTagInput | ItemTagUpdateManyWithWhereWithoutTagInput[]
    deleteMany?: ItemTagScalarWhereInput | ItemTagScalarWhereInput[]
  }

  export type TopicTagUncheckedUpdateManyWithoutTagNestedInput = {
    create?: XOR<TopicTagCreateWithoutTagInput, TopicTagUncheckedCreateWithoutTagInput> | TopicTagCreateWithoutTagInput[] | TopicTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: TopicTagCreateOrConnectWithoutTagInput | TopicTagCreateOrConnectWithoutTagInput[]
    upsert?: TopicTagUpsertWithWhereUniqueWithoutTagInput | TopicTagUpsertWithWhereUniqueWithoutTagInput[]
    createMany?: TopicTagCreateManyTagInputEnvelope
    set?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    disconnect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    delete?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    connect?: TopicTagWhereUniqueInput | TopicTagWhereUniqueInput[]
    update?: TopicTagUpdateWithWhereUniqueWithoutTagInput | TopicTagUpdateWithWhereUniqueWithoutTagInput[]
    updateMany?: TopicTagUpdateManyWithWhereWithoutTagInput | TopicTagUpdateManyWithWhereWithoutTagInput[]
    deleteMany?: TopicTagScalarWhereInput | TopicTagScalarWhereInput[]
  }

  export type ItemTagUncheckedUpdateManyWithoutTagNestedInput = {
    create?: XOR<ItemTagCreateWithoutTagInput, ItemTagUncheckedCreateWithoutTagInput> | ItemTagCreateWithoutTagInput[] | ItemTagUncheckedCreateWithoutTagInput[]
    connectOrCreate?: ItemTagCreateOrConnectWithoutTagInput | ItemTagCreateOrConnectWithoutTagInput[]
    upsert?: ItemTagUpsertWithWhereUniqueWithoutTagInput | ItemTagUpsertWithWhereUniqueWithoutTagInput[]
    createMany?: ItemTagCreateManyTagInputEnvelope
    set?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    disconnect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    delete?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    connect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    update?: ItemTagUpdateWithWhereUniqueWithoutTagInput | ItemTagUpdateWithWhereUniqueWithoutTagInput[]
    updateMany?: ItemTagUpdateManyWithWhereWithoutTagInput | ItemTagUpdateManyWithWhereWithoutTagInput[]
    deleteMany?: ItemTagScalarWhereInput | ItemTagScalarWhereInput[]
  }

  export type TopicCreateNestedOneWithoutTagsInput = {
    create?: XOR<TopicCreateWithoutTagsInput, TopicUncheckedCreateWithoutTagsInput>
    connectOrCreate?: TopicCreateOrConnectWithoutTagsInput
    connect?: TopicWhereUniqueInput
  }

  export type TagCreateNestedOneWithoutTopicsInput = {
    create?: XOR<TagCreateWithoutTopicsInput, TagUncheckedCreateWithoutTopicsInput>
    connectOrCreate?: TagCreateOrConnectWithoutTopicsInput
    connect?: TagWhereUniqueInput
  }

  export type TopicUpdateOneRequiredWithoutTagsNestedInput = {
    create?: XOR<TopicCreateWithoutTagsInput, TopicUncheckedCreateWithoutTagsInput>
    connectOrCreate?: TopicCreateOrConnectWithoutTagsInput
    upsert?: TopicUpsertWithoutTagsInput
    connect?: TopicWhereUniqueInput
    update?: XOR<XOR<TopicUpdateToOneWithWhereWithoutTagsInput, TopicUpdateWithoutTagsInput>, TopicUncheckedUpdateWithoutTagsInput>
  }

  export type TagUpdateOneRequiredWithoutTopicsNestedInput = {
    create?: XOR<TagCreateWithoutTopicsInput, TagUncheckedCreateWithoutTopicsInput>
    connectOrCreate?: TagCreateOrConnectWithoutTopicsInput
    upsert?: TagUpsertWithoutTopicsInput
    connect?: TagWhereUniqueInput
    update?: XOR<XOR<TagUpdateToOneWithWhereWithoutTopicsInput, TagUpdateWithoutTopicsInput>, TagUncheckedUpdateWithoutTopicsInput>
  }

  export type ContentItemCreateNestedOneWithoutTagsInput = {
    create?: XOR<ContentItemCreateWithoutTagsInput, ContentItemUncheckedCreateWithoutTagsInput>
    connectOrCreate?: ContentItemCreateOrConnectWithoutTagsInput
    connect?: ContentItemWhereUniqueInput
  }

  export type TagCreateNestedOneWithoutItemsInput = {
    create?: XOR<TagCreateWithoutItemsInput, TagUncheckedCreateWithoutItemsInput>
    connectOrCreate?: TagCreateOrConnectWithoutItemsInput
    connect?: TagWhereUniqueInput
  }

  export type ContentItemUpdateOneRequiredWithoutTagsNestedInput = {
    create?: XOR<ContentItemCreateWithoutTagsInput, ContentItemUncheckedCreateWithoutTagsInput>
    connectOrCreate?: ContentItemCreateOrConnectWithoutTagsInput
    upsert?: ContentItemUpsertWithoutTagsInput
    connect?: ContentItemWhereUniqueInput
    update?: XOR<XOR<ContentItemUpdateToOneWithWhereWithoutTagsInput, ContentItemUpdateWithoutTagsInput>, ContentItemUncheckedUpdateWithoutTagsInput>
  }

  export type TagUpdateOneRequiredWithoutItemsNestedInput = {
    create?: XOR<TagCreateWithoutItemsInput, TagUncheckedCreateWithoutItemsInput>
    connectOrCreate?: TagCreateOrConnectWithoutItemsInput
    upsert?: TagUpsertWithoutItemsInput
    connect?: TagWhereUniqueInput
    update?: XOR<XOR<TagUpdateToOneWithWhereWithoutItemsInput, TagUpdateWithoutItemsInput>, TagUncheckedUpdateWithoutItemsInput>
  }

  export type TopicCreateNestedOneWithoutItemsInput = {
    create?: XOR<TopicCreateWithoutItemsInput, TopicUncheckedCreateWithoutItemsInput>
    connectOrCreate?: TopicCreateOrConnectWithoutItemsInput
    connect?: TopicWhereUniqueInput
  }

  export type RegionCreateNestedOneWithoutManualItemsInput = {
    create?: XOR<RegionCreateWithoutManualItemsInput, RegionUncheckedCreateWithoutManualItemsInput>
    connectOrCreate?: RegionCreateOrConnectWithoutManualItemsInput
    connect?: RegionWhereUniqueInput
  }

  export type RegionCreateNestedOneWithoutEffectiveItemsInput = {
    create?: XOR<RegionCreateWithoutEffectiveItemsInput, RegionUncheckedCreateWithoutEffectiveItemsInput>
    connectOrCreate?: RegionCreateOrConnectWithoutEffectiveItemsInput
    connect?: RegionWhereUniqueInput
  }

  export type AnswerOptionCreateNestedManyWithoutItemInput = {
    create?: XOR<AnswerOptionCreateWithoutItemInput, AnswerOptionUncheckedCreateWithoutItemInput> | AnswerOptionCreateWithoutItemInput[] | AnswerOptionUncheckedCreateWithoutItemInput[]
    connectOrCreate?: AnswerOptionCreateOrConnectWithoutItemInput | AnswerOptionCreateOrConnectWithoutItemInput[]
    createMany?: AnswerOptionCreateManyItemInputEnvelope
    connect?: AnswerOptionWhereUniqueInput | AnswerOptionWhereUniqueInput[]
  }

  export type ItemTagCreateNestedManyWithoutItemInput = {
    create?: XOR<ItemTagCreateWithoutItemInput, ItemTagUncheckedCreateWithoutItemInput> | ItemTagCreateWithoutItemInput[] | ItemTagUncheckedCreateWithoutItemInput[]
    connectOrCreate?: ItemTagCreateOrConnectWithoutItemInput | ItemTagCreateOrConnectWithoutItemInput[]
    createMany?: ItemTagCreateManyItemInputEnvelope
    connect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
  }

  export type AnswerOptionUncheckedCreateNestedManyWithoutItemInput = {
    create?: XOR<AnswerOptionCreateWithoutItemInput, AnswerOptionUncheckedCreateWithoutItemInput> | AnswerOptionCreateWithoutItemInput[] | AnswerOptionUncheckedCreateWithoutItemInput[]
    connectOrCreate?: AnswerOptionCreateOrConnectWithoutItemInput | AnswerOptionCreateOrConnectWithoutItemInput[]
    createMany?: AnswerOptionCreateManyItemInputEnvelope
    connect?: AnswerOptionWhereUniqueInput | AnswerOptionWhereUniqueInput[]
  }

  export type ItemTagUncheckedCreateNestedManyWithoutItemInput = {
    create?: XOR<ItemTagCreateWithoutItemInput, ItemTagUncheckedCreateWithoutItemInput> | ItemTagCreateWithoutItemInput[] | ItemTagUncheckedCreateWithoutItemInput[]
    connectOrCreate?: ItemTagCreateOrConnectWithoutItemInput | ItemTagCreateOrConnectWithoutItemInput[]
    createMany?: ItemTagCreateManyItemInputEnvelope
    connect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
  }

  export type EnumContentKindFieldUpdateOperationsInput = {
    set?: $Enums.ContentKind
  }

  export type EnumPublishStatusFieldUpdateOperationsInput = {
    set?: $Enums.PublishStatus
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type EnumRegionModeFieldUpdateOperationsInput = {
    set?: $Enums.RegionMode
  }

  export type TopicUpdateOneRequiredWithoutItemsNestedInput = {
    create?: XOR<TopicCreateWithoutItemsInput, TopicUncheckedCreateWithoutItemsInput>
    connectOrCreate?: TopicCreateOrConnectWithoutItemsInput
    upsert?: TopicUpsertWithoutItemsInput
    connect?: TopicWhereUniqueInput
    update?: XOR<XOR<TopicUpdateToOneWithWhereWithoutItemsInput, TopicUpdateWithoutItemsInput>, TopicUncheckedUpdateWithoutItemsInput>
  }

  export type RegionUpdateOneWithoutManualItemsNestedInput = {
    create?: XOR<RegionCreateWithoutManualItemsInput, RegionUncheckedCreateWithoutManualItemsInput>
    connectOrCreate?: RegionCreateOrConnectWithoutManualItemsInput
    upsert?: RegionUpsertWithoutManualItemsInput
    disconnect?: RegionWhereInput | boolean
    delete?: RegionWhereInput | boolean
    connect?: RegionWhereUniqueInput
    update?: XOR<XOR<RegionUpdateToOneWithWhereWithoutManualItemsInput, RegionUpdateWithoutManualItemsInput>, RegionUncheckedUpdateWithoutManualItemsInput>
  }

  export type RegionUpdateOneWithoutEffectiveItemsNestedInput = {
    create?: XOR<RegionCreateWithoutEffectiveItemsInput, RegionUncheckedCreateWithoutEffectiveItemsInput>
    connectOrCreate?: RegionCreateOrConnectWithoutEffectiveItemsInput
    upsert?: RegionUpsertWithoutEffectiveItemsInput
    disconnect?: RegionWhereInput | boolean
    delete?: RegionWhereInput | boolean
    connect?: RegionWhereUniqueInput
    update?: XOR<XOR<RegionUpdateToOneWithWhereWithoutEffectiveItemsInput, RegionUpdateWithoutEffectiveItemsInput>, RegionUncheckedUpdateWithoutEffectiveItemsInput>
  }

  export type AnswerOptionUpdateManyWithoutItemNestedInput = {
    create?: XOR<AnswerOptionCreateWithoutItemInput, AnswerOptionUncheckedCreateWithoutItemInput> | AnswerOptionCreateWithoutItemInput[] | AnswerOptionUncheckedCreateWithoutItemInput[]
    connectOrCreate?: AnswerOptionCreateOrConnectWithoutItemInput | AnswerOptionCreateOrConnectWithoutItemInput[]
    upsert?: AnswerOptionUpsertWithWhereUniqueWithoutItemInput | AnswerOptionUpsertWithWhereUniqueWithoutItemInput[]
    createMany?: AnswerOptionCreateManyItemInputEnvelope
    set?: AnswerOptionWhereUniqueInput | AnswerOptionWhereUniqueInput[]
    disconnect?: AnswerOptionWhereUniqueInput | AnswerOptionWhereUniqueInput[]
    delete?: AnswerOptionWhereUniqueInput | AnswerOptionWhereUniqueInput[]
    connect?: AnswerOptionWhereUniqueInput | AnswerOptionWhereUniqueInput[]
    update?: AnswerOptionUpdateWithWhereUniqueWithoutItemInput | AnswerOptionUpdateWithWhereUniqueWithoutItemInput[]
    updateMany?: AnswerOptionUpdateManyWithWhereWithoutItemInput | AnswerOptionUpdateManyWithWhereWithoutItemInput[]
    deleteMany?: AnswerOptionScalarWhereInput | AnswerOptionScalarWhereInput[]
  }

  export type ItemTagUpdateManyWithoutItemNestedInput = {
    create?: XOR<ItemTagCreateWithoutItemInput, ItemTagUncheckedCreateWithoutItemInput> | ItemTagCreateWithoutItemInput[] | ItemTagUncheckedCreateWithoutItemInput[]
    connectOrCreate?: ItemTagCreateOrConnectWithoutItemInput | ItemTagCreateOrConnectWithoutItemInput[]
    upsert?: ItemTagUpsertWithWhereUniqueWithoutItemInput | ItemTagUpsertWithWhereUniqueWithoutItemInput[]
    createMany?: ItemTagCreateManyItemInputEnvelope
    set?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    disconnect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    delete?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    connect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    update?: ItemTagUpdateWithWhereUniqueWithoutItemInput | ItemTagUpdateWithWhereUniqueWithoutItemInput[]
    updateMany?: ItemTagUpdateManyWithWhereWithoutItemInput | ItemTagUpdateManyWithWhereWithoutItemInput[]
    deleteMany?: ItemTagScalarWhereInput | ItemTagScalarWhereInput[]
  }

  export type AnswerOptionUncheckedUpdateManyWithoutItemNestedInput = {
    create?: XOR<AnswerOptionCreateWithoutItemInput, AnswerOptionUncheckedCreateWithoutItemInput> | AnswerOptionCreateWithoutItemInput[] | AnswerOptionUncheckedCreateWithoutItemInput[]
    connectOrCreate?: AnswerOptionCreateOrConnectWithoutItemInput | AnswerOptionCreateOrConnectWithoutItemInput[]
    upsert?: AnswerOptionUpsertWithWhereUniqueWithoutItemInput | AnswerOptionUpsertWithWhereUniqueWithoutItemInput[]
    createMany?: AnswerOptionCreateManyItemInputEnvelope
    set?: AnswerOptionWhereUniqueInput | AnswerOptionWhereUniqueInput[]
    disconnect?: AnswerOptionWhereUniqueInput | AnswerOptionWhereUniqueInput[]
    delete?: AnswerOptionWhereUniqueInput | AnswerOptionWhereUniqueInput[]
    connect?: AnswerOptionWhereUniqueInput | AnswerOptionWhereUniqueInput[]
    update?: AnswerOptionUpdateWithWhereUniqueWithoutItemInput | AnswerOptionUpdateWithWhereUniqueWithoutItemInput[]
    updateMany?: AnswerOptionUpdateManyWithWhereWithoutItemInput | AnswerOptionUpdateManyWithWhereWithoutItemInput[]
    deleteMany?: AnswerOptionScalarWhereInput | AnswerOptionScalarWhereInput[]
  }

  export type ItemTagUncheckedUpdateManyWithoutItemNestedInput = {
    create?: XOR<ItemTagCreateWithoutItemInput, ItemTagUncheckedCreateWithoutItemInput> | ItemTagCreateWithoutItemInput[] | ItemTagUncheckedCreateWithoutItemInput[]
    connectOrCreate?: ItemTagCreateOrConnectWithoutItemInput | ItemTagCreateOrConnectWithoutItemInput[]
    upsert?: ItemTagUpsertWithWhereUniqueWithoutItemInput | ItemTagUpsertWithWhereUniqueWithoutItemInput[]
    createMany?: ItemTagCreateManyItemInputEnvelope
    set?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    disconnect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    delete?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    connect?: ItemTagWhereUniqueInput | ItemTagWhereUniqueInput[]
    update?: ItemTagUpdateWithWhereUniqueWithoutItemInput | ItemTagUpdateWithWhereUniqueWithoutItemInput[]
    updateMany?: ItemTagUpdateManyWithWhereWithoutItemInput | ItemTagUpdateManyWithWhereWithoutItemInput[]
    deleteMany?: ItemTagScalarWhereInput | ItemTagScalarWhereInput[]
  }

  export type ContentItemCreateNestedOneWithoutAnswerOptionsInput = {
    create?: XOR<ContentItemCreateWithoutAnswerOptionsInput, ContentItemUncheckedCreateWithoutAnswerOptionsInput>
    connectOrCreate?: ContentItemCreateOrConnectWithoutAnswerOptionsInput
    connect?: ContentItemWhereUniqueInput
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type ContentItemUpdateOneRequiredWithoutAnswerOptionsNestedInput = {
    create?: XOR<ContentItemCreateWithoutAnswerOptionsInput, ContentItemUncheckedCreateWithoutAnswerOptionsInput>
    connectOrCreate?: ContentItemCreateOrConnectWithoutAnswerOptionsInput
    upsert?: ContentItemUpsertWithoutAnswerOptionsInput
    connect?: ContentItemWhereUniqueInput
    update?: XOR<XOR<ContentItemUpdateToOneWithWhereWithoutAnswerOptionsInput, ContentItemUpdateWithoutAnswerOptionsInput>, ContentItemUncheckedUpdateWithoutAnswerOptionsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumLocaleFilter<$PrismaModel = never> = {
    equals?: $Enums.Locale | EnumLocaleFieldRefInput<$PrismaModel>
    in?: $Enums.Locale[] | ListEnumLocaleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Locale[] | ListEnumLocaleFieldRefInput<$PrismaModel>
    not?: NestedEnumLocaleFilter<$PrismaModel> | $Enums.Locale
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumLocaleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Locale | EnumLocaleFieldRefInput<$PrismaModel>
    in?: $Enums.Locale[] | ListEnumLocaleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Locale[] | ListEnumLocaleFieldRefInput<$PrismaModel>
    not?: NestedEnumLocaleWithAggregatesFilter<$PrismaModel> | $Enums.Locale
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLocaleFilter<$PrismaModel>
    _max?: NestedEnumLocaleFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedEnumContentKindFilter<$PrismaModel = never> = {
    equals?: $Enums.ContentKind | EnumContentKindFieldRefInput<$PrismaModel>
    in?: $Enums.ContentKind[] | ListEnumContentKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.ContentKind[] | ListEnumContentKindFieldRefInput<$PrismaModel>
    not?: NestedEnumContentKindFilter<$PrismaModel> | $Enums.ContentKind
  }

  export type NestedEnumPublishStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.PublishStatus | EnumPublishStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PublishStatus[] | ListEnumPublishStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PublishStatus[] | ListEnumPublishStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPublishStatusFilter<$PrismaModel> | $Enums.PublishStatus
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumRegionModeFilter<$PrismaModel = never> = {
    equals?: $Enums.RegionMode | EnumRegionModeFieldRefInput<$PrismaModel>
    in?: $Enums.RegionMode[] | ListEnumRegionModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RegionMode[] | ListEnumRegionModeFieldRefInput<$PrismaModel>
    not?: NestedEnumRegionModeFilter<$PrismaModel> | $Enums.RegionMode
  }

  export type NestedEnumContentKindWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ContentKind | EnumContentKindFieldRefInput<$PrismaModel>
    in?: $Enums.ContentKind[] | ListEnumContentKindFieldRefInput<$PrismaModel>
    notIn?: $Enums.ContentKind[] | ListEnumContentKindFieldRefInput<$PrismaModel>
    not?: NestedEnumContentKindWithAggregatesFilter<$PrismaModel> | $Enums.ContentKind
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumContentKindFilter<$PrismaModel>
    _max?: NestedEnumContentKindFilter<$PrismaModel>
  }

  export type NestedEnumPublishStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PublishStatus | EnumPublishStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PublishStatus[] | ListEnumPublishStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PublishStatus[] | ListEnumPublishStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPublishStatusWithAggregatesFilter<$PrismaModel> | $Enums.PublishStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPublishStatusFilter<$PrismaModel>
    _max?: NestedEnumPublishStatusFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumRegionModeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RegionMode | EnumRegionModeFieldRefInput<$PrismaModel>
    in?: $Enums.RegionMode[] | ListEnumRegionModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RegionMode[] | ListEnumRegionModeFieldRefInput<$PrismaModel>
    not?: NestedEnumRegionModeWithAggregatesFilter<$PrismaModel> | $Enums.RegionMode
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRegionModeFilter<$PrismaModel>
    _max?: NestedEnumRegionModeFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type ContentItemCreateWithoutRegionManualInput = {
    id?: string
    kind: $Enums.ContentKind
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    topic: TopicCreateNestedOneWithoutItemsInput
    regionEffective?: RegionCreateNestedOneWithoutEffectiveItemsInput
    answerOptions?: AnswerOptionCreateNestedManyWithoutItemInput
    tags?: ItemTagCreateNestedManyWithoutItemInput
  }

  export type ContentItemUncheckedCreateWithoutRegionManualInput = {
    id?: string
    kind: $Enums.ContentKind
    topicId: string
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionEffectiveId?: string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    answerOptions?: AnswerOptionUncheckedCreateNestedManyWithoutItemInput
    tags?: ItemTagUncheckedCreateNestedManyWithoutItemInput
  }

  export type ContentItemCreateOrConnectWithoutRegionManualInput = {
    where: ContentItemWhereUniqueInput
    create: XOR<ContentItemCreateWithoutRegionManualInput, ContentItemUncheckedCreateWithoutRegionManualInput>
  }

  export type ContentItemCreateManyRegionManualInputEnvelope = {
    data: ContentItemCreateManyRegionManualInput | ContentItemCreateManyRegionManualInput[]
    skipDuplicates?: boolean
  }

  export type ContentItemCreateWithoutRegionEffectiveInput = {
    id?: string
    kind: $Enums.ContentKind
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    topic: TopicCreateNestedOneWithoutItemsInput
    regionManual?: RegionCreateNestedOneWithoutManualItemsInput
    answerOptions?: AnswerOptionCreateNestedManyWithoutItemInput
    tags?: ItemTagCreateNestedManyWithoutItemInput
  }

  export type ContentItemUncheckedCreateWithoutRegionEffectiveInput = {
    id?: string
    kind: $Enums.ContentKind
    topicId: string
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionManualId?: string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    answerOptions?: AnswerOptionUncheckedCreateNestedManyWithoutItemInput
    tags?: ItemTagUncheckedCreateNestedManyWithoutItemInput
  }

  export type ContentItemCreateOrConnectWithoutRegionEffectiveInput = {
    where: ContentItemWhereUniqueInput
    create: XOR<ContentItemCreateWithoutRegionEffectiveInput, ContentItemUncheckedCreateWithoutRegionEffectiveInput>
  }

  export type ContentItemCreateManyRegionEffectiveInputEnvelope = {
    data: ContentItemCreateManyRegionEffectiveInput | ContentItemCreateManyRegionEffectiveInput[]
    skipDuplicates?: boolean
  }

  export type ContentItemUpsertWithWhereUniqueWithoutRegionManualInput = {
    where: ContentItemWhereUniqueInput
    update: XOR<ContentItemUpdateWithoutRegionManualInput, ContentItemUncheckedUpdateWithoutRegionManualInput>
    create: XOR<ContentItemCreateWithoutRegionManualInput, ContentItemUncheckedCreateWithoutRegionManualInput>
  }

  export type ContentItemUpdateWithWhereUniqueWithoutRegionManualInput = {
    where: ContentItemWhereUniqueInput
    data: XOR<ContentItemUpdateWithoutRegionManualInput, ContentItemUncheckedUpdateWithoutRegionManualInput>
  }

  export type ContentItemUpdateManyWithWhereWithoutRegionManualInput = {
    where: ContentItemScalarWhereInput
    data: XOR<ContentItemUpdateManyMutationInput, ContentItemUncheckedUpdateManyWithoutRegionManualInput>
  }

  export type ContentItemScalarWhereInput = {
    AND?: ContentItemScalarWhereInput | ContentItemScalarWhereInput[]
    OR?: ContentItemScalarWhereInput[]
    NOT?: ContentItemScalarWhereInput | ContentItemScalarWhereInput[]
    id?: StringFilter<"ContentItem"> | string
    kind?: EnumContentKindFilter<"ContentItem"> | $Enums.ContentKind
    topicId?: StringFilter<"ContentItem"> | string
    locale?: EnumLocaleFilter<"ContentItem"> | $Enums.Locale
    title?: StringNullableFilter<"ContentItem"> | string | null
    text?: StringFilter<"ContentItem"> | string
    richText?: StringNullableFilter<"ContentItem"> | string | null
    sortOrder?: IntFilter<"ContentItem"> | number
    status?: EnumPublishStatusFilter<"ContentItem"> | $Enums.PublishStatus
    authorName?: StringNullableFilter<"ContentItem"> | string | null
    createdAt?: DateTimeFilter<"ContentItem"> | Date | string
    updatedAt?: DateTimeFilter<"ContentItem"> | Date | string
    publishAt?: DateTimeNullableFilter<"ContentItem"> | Date | string | null
    expireAt?: DateTimeNullableFilter<"ContentItem"> | Date | string | null
    regionMode?: EnumRegionModeFilter<"ContentItem"> | $Enums.RegionMode
    regionManualId?: StringNullableFilter<"ContentItem"> | string | null
    regionEffectiveId?: StringNullableFilter<"ContentItem"> | string | null
    regionAuto?: JsonNullableFilter<"ContentItem">
    validation?: JsonNullableFilter<"ContentItem">
    meta?: JsonNullableFilter<"ContentItem">
  }

  export type ContentItemUpsertWithWhereUniqueWithoutRegionEffectiveInput = {
    where: ContentItemWhereUniqueInput
    update: XOR<ContentItemUpdateWithoutRegionEffectiveInput, ContentItemUncheckedUpdateWithoutRegionEffectiveInput>
    create: XOR<ContentItemCreateWithoutRegionEffectiveInput, ContentItemUncheckedCreateWithoutRegionEffectiveInput>
  }

  export type ContentItemUpdateWithWhereUniqueWithoutRegionEffectiveInput = {
    where: ContentItemWhereUniqueInput
    data: XOR<ContentItemUpdateWithoutRegionEffectiveInput, ContentItemUncheckedUpdateWithoutRegionEffectiveInput>
  }

  export type ContentItemUpdateManyWithWhereWithoutRegionEffectiveInput = {
    where: ContentItemScalarWhereInput
    data: XOR<ContentItemUpdateManyMutationInput, ContentItemUncheckedUpdateManyWithoutRegionEffectiveInput>
  }

  export type ContentItemCreateWithoutTopicInput = {
    id?: string
    kind: $Enums.ContentKind
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    regionManual?: RegionCreateNestedOneWithoutManualItemsInput
    regionEffective?: RegionCreateNestedOneWithoutEffectiveItemsInput
    answerOptions?: AnswerOptionCreateNestedManyWithoutItemInput
    tags?: ItemTagCreateNestedManyWithoutItemInput
  }

  export type ContentItemUncheckedCreateWithoutTopicInput = {
    id?: string
    kind: $Enums.ContentKind
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionManualId?: string | null
    regionEffectiveId?: string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    answerOptions?: AnswerOptionUncheckedCreateNestedManyWithoutItemInput
    tags?: ItemTagUncheckedCreateNestedManyWithoutItemInput
  }

  export type ContentItemCreateOrConnectWithoutTopicInput = {
    where: ContentItemWhereUniqueInput
    create: XOR<ContentItemCreateWithoutTopicInput, ContentItemUncheckedCreateWithoutTopicInput>
  }

  export type ContentItemCreateManyTopicInputEnvelope = {
    data: ContentItemCreateManyTopicInput | ContentItemCreateManyTopicInput[]
    skipDuplicates?: boolean
  }

  export type TopicTagCreateWithoutTopicInput = {
    id?: string
    tag: TagCreateNestedOneWithoutTopicsInput
  }

  export type TopicTagUncheckedCreateWithoutTopicInput = {
    id?: string
    tagId: string
  }

  export type TopicTagCreateOrConnectWithoutTopicInput = {
    where: TopicTagWhereUniqueInput
    create: XOR<TopicTagCreateWithoutTopicInput, TopicTagUncheckedCreateWithoutTopicInput>
  }

  export type TopicTagCreateManyTopicInputEnvelope = {
    data: TopicTagCreateManyTopicInput | TopicTagCreateManyTopicInput[]
    skipDuplicates?: boolean
  }

  export type ContentItemUpsertWithWhereUniqueWithoutTopicInput = {
    where: ContentItemWhereUniqueInput
    update: XOR<ContentItemUpdateWithoutTopicInput, ContentItemUncheckedUpdateWithoutTopicInput>
    create: XOR<ContentItemCreateWithoutTopicInput, ContentItemUncheckedCreateWithoutTopicInput>
  }

  export type ContentItemUpdateWithWhereUniqueWithoutTopicInput = {
    where: ContentItemWhereUniqueInput
    data: XOR<ContentItemUpdateWithoutTopicInput, ContentItemUncheckedUpdateWithoutTopicInput>
  }

  export type ContentItemUpdateManyWithWhereWithoutTopicInput = {
    where: ContentItemScalarWhereInput
    data: XOR<ContentItemUpdateManyMutationInput, ContentItemUncheckedUpdateManyWithoutTopicInput>
  }

  export type TopicTagUpsertWithWhereUniqueWithoutTopicInput = {
    where: TopicTagWhereUniqueInput
    update: XOR<TopicTagUpdateWithoutTopicInput, TopicTagUncheckedUpdateWithoutTopicInput>
    create: XOR<TopicTagCreateWithoutTopicInput, TopicTagUncheckedCreateWithoutTopicInput>
  }

  export type TopicTagUpdateWithWhereUniqueWithoutTopicInput = {
    where: TopicTagWhereUniqueInput
    data: XOR<TopicTagUpdateWithoutTopicInput, TopicTagUncheckedUpdateWithoutTopicInput>
  }

  export type TopicTagUpdateManyWithWhereWithoutTopicInput = {
    where: TopicTagScalarWhereInput
    data: XOR<TopicTagUpdateManyMutationInput, TopicTagUncheckedUpdateManyWithoutTopicInput>
  }

  export type TopicTagScalarWhereInput = {
    AND?: TopicTagScalarWhereInput | TopicTagScalarWhereInput[]
    OR?: TopicTagScalarWhereInput[]
    NOT?: TopicTagScalarWhereInput | TopicTagScalarWhereInput[]
    id?: StringFilter<"TopicTag"> | string
    topicId?: StringFilter<"TopicTag"> | string
    tagId?: StringFilter<"TopicTag"> | string
  }

  export type TopicTagCreateWithoutTagInput = {
    id?: string
    topic: TopicCreateNestedOneWithoutTagsInput
  }

  export type TopicTagUncheckedCreateWithoutTagInput = {
    id?: string
    topicId: string
  }

  export type TopicTagCreateOrConnectWithoutTagInput = {
    where: TopicTagWhereUniqueInput
    create: XOR<TopicTagCreateWithoutTagInput, TopicTagUncheckedCreateWithoutTagInput>
  }

  export type TopicTagCreateManyTagInputEnvelope = {
    data: TopicTagCreateManyTagInput | TopicTagCreateManyTagInput[]
    skipDuplicates?: boolean
  }

  export type ItemTagCreateWithoutTagInput = {
    id?: string
    item: ContentItemCreateNestedOneWithoutTagsInput
  }

  export type ItemTagUncheckedCreateWithoutTagInput = {
    id?: string
    itemId: string
  }

  export type ItemTagCreateOrConnectWithoutTagInput = {
    where: ItemTagWhereUniqueInput
    create: XOR<ItemTagCreateWithoutTagInput, ItemTagUncheckedCreateWithoutTagInput>
  }

  export type ItemTagCreateManyTagInputEnvelope = {
    data: ItemTagCreateManyTagInput | ItemTagCreateManyTagInput[]
    skipDuplicates?: boolean
  }

  export type TopicTagUpsertWithWhereUniqueWithoutTagInput = {
    where: TopicTagWhereUniqueInput
    update: XOR<TopicTagUpdateWithoutTagInput, TopicTagUncheckedUpdateWithoutTagInput>
    create: XOR<TopicTagCreateWithoutTagInput, TopicTagUncheckedCreateWithoutTagInput>
  }

  export type TopicTagUpdateWithWhereUniqueWithoutTagInput = {
    where: TopicTagWhereUniqueInput
    data: XOR<TopicTagUpdateWithoutTagInput, TopicTagUncheckedUpdateWithoutTagInput>
  }

  export type TopicTagUpdateManyWithWhereWithoutTagInput = {
    where: TopicTagScalarWhereInput
    data: XOR<TopicTagUpdateManyMutationInput, TopicTagUncheckedUpdateManyWithoutTagInput>
  }

  export type ItemTagUpsertWithWhereUniqueWithoutTagInput = {
    where: ItemTagWhereUniqueInput
    update: XOR<ItemTagUpdateWithoutTagInput, ItemTagUncheckedUpdateWithoutTagInput>
    create: XOR<ItemTagCreateWithoutTagInput, ItemTagUncheckedCreateWithoutTagInput>
  }

  export type ItemTagUpdateWithWhereUniqueWithoutTagInput = {
    where: ItemTagWhereUniqueInput
    data: XOR<ItemTagUpdateWithoutTagInput, ItemTagUncheckedUpdateWithoutTagInput>
  }

  export type ItemTagUpdateManyWithWhereWithoutTagInput = {
    where: ItemTagScalarWhereInput
    data: XOR<ItemTagUpdateManyMutationInput, ItemTagUncheckedUpdateManyWithoutTagInput>
  }

  export type ItemTagScalarWhereInput = {
    AND?: ItemTagScalarWhereInput | ItemTagScalarWhereInput[]
    OR?: ItemTagScalarWhereInput[]
    NOT?: ItemTagScalarWhereInput | ItemTagScalarWhereInput[]
    id?: StringFilter<"ItemTag"> | string
    itemId?: StringFilter<"ItemTag"> | string
    tagId?: StringFilter<"ItemTag"> | string
  }

  export type TopicCreateWithoutTagsInput = {
    id?: string
    slug: string
    title: string
    description?: string | null
    locale?: $Enums.Locale
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: ContentItemCreateNestedManyWithoutTopicInput
  }

  export type TopicUncheckedCreateWithoutTagsInput = {
    id?: string
    slug: string
    title: string
    description?: string | null
    locale?: $Enums.Locale
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: ContentItemUncheckedCreateNestedManyWithoutTopicInput
  }

  export type TopicCreateOrConnectWithoutTagsInput = {
    where: TopicWhereUniqueInput
    create: XOR<TopicCreateWithoutTagsInput, TopicUncheckedCreateWithoutTagsInput>
  }

  export type TagCreateWithoutTopicsInput = {
    id?: string
    slug: string
    label: string
    items?: ItemTagCreateNestedManyWithoutTagInput
  }

  export type TagUncheckedCreateWithoutTopicsInput = {
    id?: string
    slug: string
    label: string
    items?: ItemTagUncheckedCreateNestedManyWithoutTagInput
  }

  export type TagCreateOrConnectWithoutTopicsInput = {
    where: TagWhereUniqueInput
    create: XOR<TagCreateWithoutTopicsInput, TagUncheckedCreateWithoutTopicsInput>
  }

  export type TopicUpsertWithoutTagsInput = {
    update: XOR<TopicUpdateWithoutTagsInput, TopicUncheckedUpdateWithoutTagsInput>
    create: XOR<TopicCreateWithoutTagsInput, TopicUncheckedCreateWithoutTagsInput>
    where?: TopicWhereInput
  }

  export type TopicUpdateToOneWithWhereWithoutTagsInput = {
    where?: TopicWhereInput
    data: XOR<TopicUpdateWithoutTagsInput, TopicUncheckedUpdateWithoutTagsInput>
  }

  export type TopicUpdateWithoutTagsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: ContentItemUpdateManyWithoutTopicNestedInput
  }

  export type TopicUncheckedUpdateWithoutTagsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: ContentItemUncheckedUpdateManyWithoutTopicNestedInput
  }

  export type TagUpsertWithoutTopicsInput = {
    update: XOR<TagUpdateWithoutTopicsInput, TagUncheckedUpdateWithoutTopicsInput>
    create: XOR<TagCreateWithoutTopicsInput, TagUncheckedCreateWithoutTopicsInput>
    where?: TagWhereInput
  }

  export type TagUpdateToOneWithWhereWithoutTopicsInput = {
    where?: TagWhereInput
    data: XOR<TagUpdateWithoutTopicsInput, TagUncheckedUpdateWithoutTopicsInput>
  }

  export type TagUpdateWithoutTopicsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    items?: ItemTagUpdateManyWithoutTagNestedInput
  }

  export type TagUncheckedUpdateWithoutTopicsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    items?: ItemTagUncheckedUpdateManyWithoutTagNestedInput
  }

  export type ContentItemCreateWithoutTagsInput = {
    id?: string
    kind: $Enums.ContentKind
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    topic: TopicCreateNestedOneWithoutItemsInput
    regionManual?: RegionCreateNestedOneWithoutManualItemsInput
    regionEffective?: RegionCreateNestedOneWithoutEffectiveItemsInput
    answerOptions?: AnswerOptionCreateNestedManyWithoutItemInput
  }

  export type ContentItemUncheckedCreateWithoutTagsInput = {
    id?: string
    kind: $Enums.ContentKind
    topicId: string
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionManualId?: string | null
    regionEffectiveId?: string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    answerOptions?: AnswerOptionUncheckedCreateNestedManyWithoutItemInput
  }

  export type ContentItemCreateOrConnectWithoutTagsInput = {
    where: ContentItemWhereUniqueInput
    create: XOR<ContentItemCreateWithoutTagsInput, ContentItemUncheckedCreateWithoutTagsInput>
  }

  export type TagCreateWithoutItemsInput = {
    id?: string
    slug: string
    label: string
    topics?: TopicTagCreateNestedManyWithoutTagInput
  }

  export type TagUncheckedCreateWithoutItemsInput = {
    id?: string
    slug: string
    label: string
    topics?: TopicTagUncheckedCreateNestedManyWithoutTagInput
  }

  export type TagCreateOrConnectWithoutItemsInput = {
    where: TagWhereUniqueInput
    create: XOR<TagCreateWithoutItemsInput, TagUncheckedCreateWithoutItemsInput>
  }

  export type ContentItemUpsertWithoutTagsInput = {
    update: XOR<ContentItemUpdateWithoutTagsInput, ContentItemUncheckedUpdateWithoutTagsInput>
    create: XOR<ContentItemCreateWithoutTagsInput, ContentItemUncheckedCreateWithoutTagsInput>
    where?: ContentItemWhereInput
  }

  export type ContentItemUpdateToOneWithWhereWithoutTagsInput = {
    where?: ContentItemWhereInput
    data: XOR<ContentItemUpdateWithoutTagsInput, ContentItemUncheckedUpdateWithoutTagsInput>
  }

  export type ContentItemUpdateWithoutTagsInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    topic?: TopicUpdateOneRequiredWithoutItemsNestedInput
    regionManual?: RegionUpdateOneWithoutManualItemsNestedInput
    regionEffective?: RegionUpdateOneWithoutEffectiveItemsNestedInput
    answerOptions?: AnswerOptionUpdateManyWithoutItemNestedInput
  }

  export type ContentItemUncheckedUpdateWithoutTagsInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    topicId?: StringFieldUpdateOperationsInput | string
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionManualId?: NullableStringFieldUpdateOperationsInput | string | null
    regionEffectiveId?: NullableStringFieldUpdateOperationsInput | string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    answerOptions?: AnswerOptionUncheckedUpdateManyWithoutItemNestedInput
  }

  export type TagUpsertWithoutItemsInput = {
    update: XOR<TagUpdateWithoutItemsInput, TagUncheckedUpdateWithoutItemsInput>
    create: XOR<TagCreateWithoutItemsInput, TagUncheckedCreateWithoutItemsInput>
    where?: TagWhereInput
  }

  export type TagUpdateToOneWithWhereWithoutItemsInput = {
    where?: TagWhereInput
    data: XOR<TagUpdateWithoutItemsInput, TagUncheckedUpdateWithoutItemsInput>
  }

  export type TagUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    topics?: TopicTagUpdateManyWithoutTagNestedInput
  }

  export type TagUncheckedUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    topics?: TopicTagUncheckedUpdateManyWithoutTagNestedInput
  }

  export type TopicCreateWithoutItemsInput = {
    id?: string
    slug: string
    title: string
    description?: string | null
    locale?: $Enums.Locale
    createdAt?: Date | string
    updatedAt?: Date | string
    tags?: TopicTagCreateNestedManyWithoutTopicInput
  }

  export type TopicUncheckedCreateWithoutItemsInput = {
    id?: string
    slug: string
    title: string
    description?: string | null
    locale?: $Enums.Locale
    createdAt?: Date | string
    updatedAt?: Date | string
    tags?: TopicTagUncheckedCreateNestedManyWithoutTopicInput
  }

  export type TopicCreateOrConnectWithoutItemsInput = {
    where: TopicWhereUniqueInput
    create: XOR<TopicCreateWithoutItemsInput, TopicUncheckedCreateWithoutItemsInput>
  }

  export type RegionCreateWithoutManualItemsInput = {
    id?: string
    code: string
    name: string
    level: number
    effectiveItems?: ContentItemCreateNestedManyWithoutRegionEffectiveInput
  }

  export type RegionUncheckedCreateWithoutManualItemsInput = {
    id?: string
    code: string
    name: string
    level: number
    effectiveItems?: ContentItemUncheckedCreateNestedManyWithoutRegionEffectiveInput
  }

  export type RegionCreateOrConnectWithoutManualItemsInput = {
    where: RegionWhereUniqueInput
    create: XOR<RegionCreateWithoutManualItemsInput, RegionUncheckedCreateWithoutManualItemsInput>
  }

  export type RegionCreateWithoutEffectiveItemsInput = {
    id?: string
    code: string
    name: string
    level: number
    manualItems?: ContentItemCreateNestedManyWithoutRegionManualInput
  }

  export type RegionUncheckedCreateWithoutEffectiveItemsInput = {
    id?: string
    code: string
    name: string
    level: number
    manualItems?: ContentItemUncheckedCreateNestedManyWithoutRegionManualInput
  }

  export type RegionCreateOrConnectWithoutEffectiveItemsInput = {
    where: RegionWhereUniqueInput
    create: XOR<RegionCreateWithoutEffectiveItemsInput, RegionUncheckedCreateWithoutEffectiveItemsInput>
  }

  export type AnswerOptionCreateWithoutItemInput = {
    id?: string
    label: string
    value: string
    sortOrder?: number
    exclusive?: boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AnswerOptionUncheckedCreateWithoutItemInput = {
    id?: string
    label: string
    value: string
    sortOrder?: number
    exclusive?: boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AnswerOptionCreateOrConnectWithoutItemInput = {
    where: AnswerOptionWhereUniqueInput
    create: XOR<AnswerOptionCreateWithoutItemInput, AnswerOptionUncheckedCreateWithoutItemInput>
  }

  export type AnswerOptionCreateManyItemInputEnvelope = {
    data: AnswerOptionCreateManyItemInput | AnswerOptionCreateManyItemInput[]
    skipDuplicates?: boolean
  }

  export type ItemTagCreateWithoutItemInput = {
    id?: string
    tag: TagCreateNestedOneWithoutItemsInput
  }

  export type ItemTagUncheckedCreateWithoutItemInput = {
    id?: string
    tagId: string
  }

  export type ItemTagCreateOrConnectWithoutItemInput = {
    where: ItemTagWhereUniqueInput
    create: XOR<ItemTagCreateWithoutItemInput, ItemTagUncheckedCreateWithoutItemInput>
  }

  export type ItemTagCreateManyItemInputEnvelope = {
    data: ItemTagCreateManyItemInput | ItemTagCreateManyItemInput[]
    skipDuplicates?: boolean
  }

  export type TopicUpsertWithoutItemsInput = {
    update: XOR<TopicUpdateWithoutItemsInput, TopicUncheckedUpdateWithoutItemsInput>
    create: XOR<TopicCreateWithoutItemsInput, TopicUncheckedCreateWithoutItemsInput>
    where?: TopicWhereInput
  }

  export type TopicUpdateToOneWithWhereWithoutItemsInput = {
    where?: TopicWhereInput
    data: XOR<TopicUpdateWithoutItemsInput, TopicUncheckedUpdateWithoutItemsInput>
  }

  export type TopicUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tags?: TopicTagUpdateManyWithoutTopicNestedInput
  }

  export type TopicUncheckedUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tags?: TopicTagUncheckedUpdateManyWithoutTopicNestedInput
  }

  export type RegionUpsertWithoutManualItemsInput = {
    update: XOR<RegionUpdateWithoutManualItemsInput, RegionUncheckedUpdateWithoutManualItemsInput>
    create: XOR<RegionCreateWithoutManualItemsInput, RegionUncheckedCreateWithoutManualItemsInput>
    where?: RegionWhereInput
  }

  export type RegionUpdateToOneWithWhereWithoutManualItemsInput = {
    where?: RegionWhereInput
    data: XOR<RegionUpdateWithoutManualItemsInput, RegionUncheckedUpdateWithoutManualItemsInput>
  }

  export type RegionUpdateWithoutManualItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    level?: IntFieldUpdateOperationsInput | number
    effectiveItems?: ContentItemUpdateManyWithoutRegionEffectiveNestedInput
  }

  export type RegionUncheckedUpdateWithoutManualItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    level?: IntFieldUpdateOperationsInput | number
    effectiveItems?: ContentItemUncheckedUpdateManyWithoutRegionEffectiveNestedInput
  }

  export type RegionUpsertWithoutEffectiveItemsInput = {
    update: XOR<RegionUpdateWithoutEffectiveItemsInput, RegionUncheckedUpdateWithoutEffectiveItemsInput>
    create: XOR<RegionCreateWithoutEffectiveItemsInput, RegionUncheckedCreateWithoutEffectiveItemsInput>
    where?: RegionWhereInput
  }

  export type RegionUpdateToOneWithWhereWithoutEffectiveItemsInput = {
    where?: RegionWhereInput
    data: XOR<RegionUpdateWithoutEffectiveItemsInput, RegionUncheckedUpdateWithoutEffectiveItemsInput>
  }

  export type RegionUpdateWithoutEffectiveItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    level?: IntFieldUpdateOperationsInput | number
    manualItems?: ContentItemUpdateManyWithoutRegionManualNestedInput
  }

  export type RegionUncheckedUpdateWithoutEffectiveItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    level?: IntFieldUpdateOperationsInput | number
    manualItems?: ContentItemUncheckedUpdateManyWithoutRegionManualNestedInput
  }

  export type AnswerOptionUpsertWithWhereUniqueWithoutItemInput = {
    where: AnswerOptionWhereUniqueInput
    update: XOR<AnswerOptionUpdateWithoutItemInput, AnswerOptionUncheckedUpdateWithoutItemInput>
    create: XOR<AnswerOptionCreateWithoutItemInput, AnswerOptionUncheckedCreateWithoutItemInput>
  }

  export type AnswerOptionUpdateWithWhereUniqueWithoutItemInput = {
    where: AnswerOptionWhereUniqueInput
    data: XOR<AnswerOptionUpdateWithoutItemInput, AnswerOptionUncheckedUpdateWithoutItemInput>
  }

  export type AnswerOptionUpdateManyWithWhereWithoutItemInput = {
    where: AnswerOptionScalarWhereInput
    data: XOR<AnswerOptionUpdateManyMutationInput, AnswerOptionUncheckedUpdateManyWithoutItemInput>
  }

  export type AnswerOptionScalarWhereInput = {
    AND?: AnswerOptionScalarWhereInput | AnswerOptionScalarWhereInput[]
    OR?: AnswerOptionScalarWhereInput[]
    NOT?: AnswerOptionScalarWhereInput | AnswerOptionScalarWhereInput[]
    id?: StringFilter<"AnswerOption"> | string
    itemId?: StringFilter<"AnswerOption"> | string
    label?: StringFilter<"AnswerOption"> | string
    value?: StringFilter<"AnswerOption"> | string
    sortOrder?: IntFilter<"AnswerOption"> | number
    exclusive?: BoolFilter<"AnswerOption"> | boolean
    meta?: JsonNullableFilter<"AnswerOption">
  }

  export type ItemTagUpsertWithWhereUniqueWithoutItemInput = {
    where: ItemTagWhereUniqueInput
    update: XOR<ItemTagUpdateWithoutItemInput, ItemTagUncheckedUpdateWithoutItemInput>
    create: XOR<ItemTagCreateWithoutItemInput, ItemTagUncheckedCreateWithoutItemInput>
  }

  export type ItemTagUpdateWithWhereUniqueWithoutItemInput = {
    where: ItemTagWhereUniqueInput
    data: XOR<ItemTagUpdateWithoutItemInput, ItemTagUncheckedUpdateWithoutItemInput>
  }

  export type ItemTagUpdateManyWithWhereWithoutItemInput = {
    where: ItemTagScalarWhereInput
    data: XOR<ItemTagUpdateManyMutationInput, ItemTagUncheckedUpdateManyWithoutItemInput>
  }

  export type ContentItemCreateWithoutAnswerOptionsInput = {
    id?: string
    kind: $Enums.ContentKind
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    topic: TopicCreateNestedOneWithoutItemsInput
    regionManual?: RegionCreateNestedOneWithoutManualItemsInput
    regionEffective?: RegionCreateNestedOneWithoutEffectiveItemsInput
    tags?: ItemTagCreateNestedManyWithoutItemInput
  }

  export type ContentItemUncheckedCreateWithoutAnswerOptionsInput = {
    id?: string
    kind: $Enums.ContentKind
    topicId: string
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionManualId?: string | null
    regionEffectiveId?: string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    tags?: ItemTagUncheckedCreateNestedManyWithoutItemInput
  }

  export type ContentItemCreateOrConnectWithoutAnswerOptionsInput = {
    where: ContentItemWhereUniqueInput
    create: XOR<ContentItemCreateWithoutAnswerOptionsInput, ContentItemUncheckedCreateWithoutAnswerOptionsInput>
  }

  export type ContentItemUpsertWithoutAnswerOptionsInput = {
    update: XOR<ContentItemUpdateWithoutAnswerOptionsInput, ContentItemUncheckedUpdateWithoutAnswerOptionsInput>
    create: XOR<ContentItemCreateWithoutAnswerOptionsInput, ContentItemUncheckedCreateWithoutAnswerOptionsInput>
    where?: ContentItemWhereInput
  }

  export type ContentItemUpdateToOneWithWhereWithoutAnswerOptionsInput = {
    where?: ContentItemWhereInput
    data: XOR<ContentItemUpdateWithoutAnswerOptionsInput, ContentItemUncheckedUpdateWithoutAnswerOptionsInput>
  }

  export type ContentItemUpdateWithoutAnswerOptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    topic?: TopicUpdateOneRequiredWithoutItemsNestedInput
    regionManual?: RegionUpdateOneWithoutManualItemsNestedInput
    regionEffective?: RegionUpdateOneWithoutEffectiveItemsNestedInput
    tags?: ItemTagUpdateManyWithoutItemNestedInput
  }

  export type ContentItemUncheckedUpdateWithoutAnswerOptionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    topicId?: StringFieldUpdateOperationsInput | string
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionManualId?: NullableStringFieldUpdateOperationsInput | string | null
    regionEffectiveId?: NullableStringFieldUpdateOperationsInput | string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    tags?: ItemTagUncheckedUpdateManyWithoutItemNestedInput
  }

  export type ContentItemCreateManyRegionManualInput = {
    id?: string
    kind: $Enums.ContentKind
    topicId: string
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionEffectiveId?: string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ContentItemCreateManyRegionEffectiveInput = {
    id?: string
    kind: $Enums.ContentKind
    topicId: string
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionManualId?: string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ContentItemUpdateWithoutRegionManualInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    topic?: TopicUpdateOneRequiredWithoutItemsNestedInput
    regionEffective?: RegionUpdateOneWithoutEffectiveItemsNestedInput
    answerOptions?: AnswerOptionUpdateManyWithoutItemNestedInput
    tags?: ItemTagUpdateManyWithoutItemNestedInput
  }

  export type ContentItemUncheckedUpdateWithoutRegionManualInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    topicId?: StringFieldUpdateOperationsInput | string
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionEffectiveId?: NullableStringFieldUpdateOperationsInput | string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    answerOptions?: AnswerOptionUncheckedUpdateManyWithoutItemNestedInput
    tags?: ItemTagUncheckedUpdateManyWithoutItemNestedInput
  }

  export type ContentItemUncheckedUpdateManyWithoutRegionManualInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    topicId?: StringFieldUpdateOperationsInput | string
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionEffectiveId?: NullableStringFieldUpdateOperationsInput | string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ContentItemUpdateWithoutRegionEffectiveInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    topic?: TopicUpdateOneRequiredWithoutItemsNestedInput
    regionManual?: RegionUpdateOneWithoutManualItemsNestedInput
    answerOptions?: AnswerOptionUpdateManyWithoutItemNestedInput
    tags?: ItemTagUpdateManyWithoutItemNestedInput
  }

  export type ContentItemUncheckedUpdateWithoutRegionEffectiveInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    topicId?: StringFieldUpdateOperationsInput | string
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionManualId?: NullableStringFieldUpdateOperationsInput | string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    answerOptions?: AnswerOptionUncheckedUpdateManyWithoutItemNestedInput
    tags?: ItemTagUncheckedUpdateManyWithoutItemNestedInput
  }

  export type ContentItemUncheckedUpdateManyWithoutRegionEffectiveInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    topicId?: StringFieldUpdateOperationsInput | string
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionManualId?: NullableStringFieldUpdateOperationsInput | string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ContentItemCreateManyTopicInput = {
    id?: string
    kind: $Enums.ContentKind
    locale?: $Enums.Locale
    title?: string | null
    text: string
    richText?: string | null
    sortOrder?: number
    status?: $Enums.PublishStatus
    authorName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    publishAt?: Date | string | null
    expireAt?: Date | string | null
    regionMode?: $Enums.RegionMode
    regionManualId?: string | null
    regionEffectiveId?: string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type TopicTagCreateManyTopicInput = {
    id?: string
    tagId: string
  }

  export type ContentItemUpdateWithoutTopicInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    regionManual?: RegionUpdateOneWithoutManualItemsNestedInput
    regionEffective?: RegionUpdateOneWithoutEffectiveItemsNestedInput
    answerOptions?: AnswerOptionUpdateManyWithoutItemNestedInput
    tags?: ItemTagUpdateManyWithoutItemNestedInput
  }

  export type ContentItemUncheckedUpdateWithoutTopicInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionManualId?: NullableStringFieldUpdateOperationsInput | string | null
    regionEffectiveId?: NullableStringFieldUpdateOperationsInput | string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
    answerOptions?: AnswerOptionUncheckedUpdateManyWithoutItemNestedInput
    tags?: ItemTagUncheckedUpdateManyWithoutItemNestedInput
  }

  export type ContentItemUncheckedUpdateManyWithoutTopicInput = {
    id?: StringFieldUpdateOperationsInput | string
    kind?: EnumContentKindFieldUpdateOperationsInput | $Enums.ContentKind
    locale?: EnumLocaleFieldUpdateOperationsInput | $Enums.Locale
    title?: NullableStringFieldUpdateOperationsInput | string | null
    text?: StringFieldUpdateOperationsInput | string
    richText?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    status?: EnumPublishStatusFieldUpdateOperationsInput | $Enums.PublishStatus
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    publishAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expireAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    regionMode?: EnumRegionModeFieldUpdateOperationsInput | $Enums.RegionMode
    regionManualId?: NullableStringFieldUpdateOperationsInput | string | null
    regionEffectiveId?: NullableStringFieldUpdateOperationsInput | string | null
    regionAuto?: NullableJsonNullValueInput | InputJsonValue
    validation?: NullableJsonNullValueInput | InputJsonValue
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type TopicTagUpdateWithoutTopicInput = {
    id?: StringFieldUpdateOperationsInput | string
    tag?: TagUpdateOneRequiredWithoutTopicsNestedInput
  }

  export type TopicTagUncheckedUpdateWithoutTopicInput = {
    id?: StringFieldUpdateOperationsInput | string
    tagId?: StringFieldUpdateOperationsInput | string
  }

  export type TopicTagUncheckedUpdateManyWithoutTopicInput = {
    id?: StringFieldUpdateOperationsInput | string
    tagId?: StringFieldUpdateOperationsInput | string
  }

  export type TopicTagCreateManyTagInput = {
    id?: string
    topicId: string
  }

  export type ItemTagCreateManyTagInput = {
    id?: string
    itemId: string
  }

  export type TopicTagUpdateWithoutTagInput = {
    id?: StringFieldUpdateOperationsInput | string
    topic?: TopicUpdateOneRequiredWithoutTagsNestedInput
  }

  export type TopicTagUncheckedUpdateWithoutTagInput = {
    id?: StringFieldUpdateOperationsInput | string
    topicId?: StringFieldUpdateOperationsInput | string
  }

  export type TopicTagUncheckedUpdateManyWithoutTagInput = {
    id?: StringFieldUpdateOperationsInput | string
    topicId?: StringFieldUpdateOperationsInput | string
  }

  export type ItemTagUpdateWithoutTagInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: ContentItemUpdateOneRequiredWithoutTagsNestedInput
  }

  export type ItemTagUncheckedUpdateWithoutTagInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
  }

  export type ItemTagUncheckedUpdateManyWithoutTagInput = {
    id?: StringFieldUpdateOperationsInput | string
    itemId?: StringFieldUpdateOperationsInput | string
  }

  export type AnswerOptionCreateManyItemInput = {
    id?: string
    label: string
    value: string
    sortOrder?: number
    exclusive?: boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ItemTagCreateManyItemInput = {
    id?: string
    tagId: string
  }

  export type AnswerOptionUpdateWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    exclusive?: BoolFieldUpdateOperationsInput | boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AnswerOptionUncheckedUpdateWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    exclusive?: BoolFieldUpdateOperationsInput | boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AnswerOptionUncheckedUpdateManyWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    label?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    sortOrder?: IntFieldUpdateOperationsInput | number
    exclusive?: BoolFieldUpdateOperationsInput | boolean
    meta?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ItemTagUpdateWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    tag?: TagUpdateOneRequiredWithoutItemsNestedInput
  }

  export type ItemTagUncheckedUpdateWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    tagId?: StringFieldUpdateOperationsInput | string
  }

  export type ItemTagUncheckedUpdateManyWithoutItemInput = {
    id?: StringFieldUpdateOperationsInput | string
    tagId?: StringFieldUpdateOperationsInput | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}