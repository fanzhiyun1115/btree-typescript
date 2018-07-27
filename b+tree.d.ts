export declare type EditRangeResult<V, R = number> = {
    value?: V;
    break?: R;
    delete?: boolean;
};
declare type index = number;
/** Read-only map interface (i.e. a source of key-value pairs).
 *  It is not desirable to demand a Symbol polyfill, so [Symbol.iterator] is left out. */
export interface IMapSource<K = any, V = any> {
    /** Returns the number of key/value pairs in the map object. */
    size: number;
    /** Returns the value associated to the key, or undefined if there is none. */
    get(key: K): V | undefined;
    /** Returns a boolean asserting whether the key exists in the map object or not. */
    has(key: K): boolean;
    /** Calls callbackFn once for each key-value pair present in the map object.
     *  The ES6 Map class sends the value to the callback before the key, so
     *  this interface must do likewise. */
    forEach(callbackFn: (v: V, k: K) => void): void;
    entries(): IterableIterator<[K, V]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
}
/** Write-only map interface (i.e. a drain into which key-value pairs can be "sunk") */
export interface IMapSink<K = any, V = any> {
    /** Returns true if an element in the map object existed and has been
     *  removed, or false if the element did not exist. */
    delete(key: K): boolean;
    /** Sets the value for the key in the map object (the return value is
     *  boolean in BTree but Map returns the Map itself.) */
    set(key: K, value: V): void;
    /** Removes all key/value pairs from the IMap object. */
    clear(): void;
}
/** An interface compatible with ES6 Map and BTree. This interface does not
 *  describe the complete interface of either class, but merely the common
 *  interface shared by both. */
export interface IMap<K = any, V = any> extends IMapSource<K, V>, IMapSink<K, V> {
}
/** Compares two numbers, strings, arrays of numbers/strings, Dates,
 *  or objects that have a valueOf() method returning a number or string.
 *  Optimized for numbers. Returns 1 if a>b, -1 if a<b, and 0 if a===b.
 */
export declare function defaultComparator(a: any, b: any): number;
/**
 * A reasonably fast collection of key-value pairs with a powerful API.
 * Largely compatible with the standard Map. BTree is a B+ tree data structure,
 * so the collection is sorted by key.
 *
 * B+ trees tend to use memory more efficiently than hashtables such as the
 * standard Map, especially when the collection contains a large number of
 * items. However, maintaining the sort order makes them modestly slower:
 * O(log size) rather than O(1). This B+ tree implementation supports O(1)
 * fast cloning. It also supports freeze(), which can be used to ensure that
 * a BTree is not changed accidentally.
 *
 * Confusingly, the ES6 Map.forEach(c) method calls c(value,key) instead of
 * c(key,value), in contrast to other methods such as set() and entries()
 * which put the key first. I can only assume that the order was reversed on
 * the theory that users would usually want to examine values and ignore keys.
 * BTree's forEach() therefore works the same way, but a second method
 * `.forEachPair((key,value)=>{...})` is provided which sends you the key
 * first and the value second; this method is slightly faster because it is
 * the "native" for-each method for this class.
 *
 * Out of the box, BTree supports keys that are numbers, strings, arrays of
 * numbers/strings, Date, and objects that have a valueOf() method returning a
 * number or string. Other data types, such as arrays of Date or custom
 * objects, require a custom comparator, which you must pass as the second
 * argument to the constructor (the first argument is an optional list of
 * initial items). Symbols cannot be used as keys because they are unordered
 * (one Symbol is never "greater" or "less" than another).
 *
 * @example
 * Given a {name: string, age: number} object, you can create a tree sorted by
 * name and then by age like this:
 *
 *     var tree = new BTree(undefined, (a, b) => {
 *       if (a.name > b.name)
 *         return 1; // Return a number >0 when a > b
 *       else if (a.name < b.name)
 *         return -1; // Return a number <0 when a < b
 *       else // names are equal (or incomparable)
 *         return a.age - b.age; // Return >0 when a.age > b.age
 *     });
 *
 *     tree.set({name:"Bill", age:17}, "happy");
 *     tree.set({name:"Fran", age:40}, "busy & stressed");
 *     tree.set({name:"Bill", age:55}, "recently laid off");
 *     tree.forEachPair((k, v) => {
 *       console.log(`Name: ${k.name} Age: ${k.age} Status: ${v}`);
 *     });
 *
 * @description
 * The "range" methods (`forEach, forRange, editRange`) will return the number
 * of elements that were scanned. In addition, the callback can return {break:R}
 * to stop early and return R from the outer function.
 *
 * - TODO: Test performance of preallocating values array at max size
 * - TODO: Add fast initialization when a sorted array is provided to constructor
 *
 * For more documentation see https://github.com/qwertie/btree-typescript
 *
 * Are you a C# developer? You might like the similar data structures I made for C#:
 * BDictionary, BList, etc. See http://core.loyc.net/collections/
 *
 * @author David Piepgrass
 */
export default class BTree<K = any, V = any> implements IMap<K, V> {
    private _root;
    _size: number;
    _maxNodeSize: number;
    _compare: (a: K, b: K) => number;
    /**
     * Initializes an empty B+ tree.
     * @param compare Custom function to compare pairs of elements in the tree.
     *   This is not required for numbers, strings and arrays of numbers/strings.
     * @param entries A set of key-value pairs to initialize the tree
     * @param maxNodeSize Branching factor (maximum items or children per node)
     *   Must be in range 4..256. If undefined or <4 then default is used; if >256 then 256.
     */
    constructor(entries?: [K, V][], compare?: (a: K, b: K) => number, maxNodeSize?: number);
    /** Gets the number of key-value pairs in the tree. */
    readonly size: number;
    readonly length: number;
    /** Releases the tree so that its size is 0. */
    clear(): void;
    /** Runs a function for each key-value pair, in order from smallest to
     *  largest key. For compatibility with ES6 Map, the argument order to
     *  the callback is backwards: value first, then key. Call forEachPair
     *  instead to receive the key as the first argument.
     * @param thisArg If provided, this parameter is assigned as the `this`
     *        value for each callback.
     * @returns the number of values that were sent to the callback,
     *        or the R value if the callback returned {break:R}. */
    forEach<R = number, Any = any>(callback: (v: V, k: K, tree: BTree<K, V>) => {
        break?: R;
    } | void, thisArg?: Any): R | number;
    /** Runs a function for each key-value pair, in order from smallest to
     *  largest key. The callback can return {break:R} (where R is any value
     *  except undefined) to stop immediately and return R from forEachPair.
     * @param onFound A function that is called for each key-value pair. This
     *        function can return {break:R} to stop early with result R.
     *        The reason that you must return {break:R} instead of simply R
     *        itself is for consistency with editRange(), which allows
     *        multiple actions, not just breaking.
     * @param initialCounter This is the value of the third argument of
     *        `onFound` the first time it is called. The counter increases
     *        by one each time `onFound` is called. Default value: 0
     * @returns the number of pairs sent to the callback (plus initialCounter,
     *        if you provided one). If the callback returned {break:R} then
     *        the R value is returned instead. */
    forEachPair<R = number>(callback: (k: K, v: V, counter: number) => {
        break?: R;
    } | void, initialCounter?: number): R | number;
    /**
     * Finds a pair in the tree and returns the associated value.
     * @param defaultValue a value to return if the key was not found.
     * @returns the value, or defaultValue if the key was not found.
     * @description Computational complexity: O(log size)
     */
    get(key: K, defaultValue?: V): V | undefined;
    /**
     * Adds or overwrites a key-value pair in the B+ tree.
     * @param key the key is used to determine the sort order of
     *        data in the tree.
     * @param value data to associate with the key (optional)
     * @param overwrite Whether to overwrite an existing key-value pair
     *        (default: true). If this is false and there is an existing
     *        key-value pair then this method has no effect.
     * @returns true if a new key-value pair was added.
     * @description Computational complexity: O(log size)
     * Note: when overwriting a previous entry, the key is updated
     * as well as the value. This has no effect unless the new key
     * has data that does not affect its sort order.
     */
    set(key: K, value: V, overwrite?: boolean): boolean;
    /**
     * Returns true if the key exists in the B+ tree, false if not.
     * Use get() for best performance; use has() if you need to
     * distinguish between "undefined value" and "key not present".
     * @param key Key to detect
     * @description Computational complexity: O(log size)
     */
    has(key: K): boolean;
    /**
     * Removes a single key-value pair from the B+ tree.
     * @param key Key to find
     * @returns true if a pair was found and removed, false otherwise.
     * @description Computational complexity: O(log size)
     */
    delete(key: K): boolean;
    /** Returns an iterator that provides items in order (ascending order if
     *  the collection's comparator uses ascending order, as is the default.)
     *  @param lowestKey First key to be iterated, or undefined to start at
     *         minKey(). If the specified key doesn't exist then iteration
     *         starts at the next higher key (according to the comparator).
     *  @param reusedArray Optional array used repeatedly to store key-value
     *         pairs, to avoid creating a new array on every iteration.
     */
    entries(lowestKey?: K, reusedArray?: [K, V]): IterableIterator<[K, V]>;
    /** Returns an iterator that provides items in reversed order.
     *  @param highestKey Key at which to start iterating, or undefined to
     *         start at minKey(). If the specified key doesn't exist then iteration
     *         starts at the next lower key (according to the comparator).
     *  @param reusedArray Optional array used repeatedly to store key-value
     *         pairs, to avoid creating a new array on every iteration.
     *  @param skipHighest Iff this flag is true and the highestKey exists in the
     *         collection, the pair matching highestKey is skipped, not iterated.
     */
    entriesReversed(highestKey?: K, reusedArray?: [K, V], skipHighest?: boolean): IterableIterator<[K, V]>;
    protected findPath(key?: K): {
        nodequeue: BNode<K, V>[][];
        nodeindex: number[];
        leaf: BNode<K, V>;
    } | undefined;
    /** Returns a new iterator for iterating the keys of each pair in ascending order. */
    keys(firstKey?: K): IterableIterator<K>;
    /** Returns a new iterator for iterating the values of each pair in order by key. */
    values(firstKey?: K): IterableIterator<V>;
    /** Returns the maximum number of children/values before nodes will split. */
    readonly maxNodeSize: number;
    /** Gets the lowest key in the tree. Complexity: O(log size) */
    minKey(): K | undefined;
    /** Gets the highest key in the tree. Complexity: O(1) */
    maxKey(): K | undefined;
    /** Quickly clones the tree by marking the root node as shared.
     *  Both copies remain editable. When you modify either copy, any
     *  nodes that are shared (or potentially shared) between the two
     *  copies are cloned so that the changes do not affect other copies.
     *  This is known as copy-on-write behavior, or "lazy copying". */
    clone(): BTree<K, V>;
    /** Gets an array filled with the contents of the tree, sorted by key */
    toArray(maxLength?: number): [K, V][];
    /** Gets an array of all keys, sorted */
    keysArray(): K[];
    /** Gets an array of all values, sorted by key */
    valuesArray(): V[];
    /** Gets a string representing the tree's data based on toArray(). */
    toString(): string;
    /** Stores a key-value pair only if the key doesn't already exist in the tree.
     * @returns true if a new key was added
    */
    setIfNotPresent(key: K, value: V): boolean;
    /** Returns the next key larger than the specified key */
    /** Edits the value associated with a key in the tree, if it already exists.
     * @returns true if the key existed, false if not.
    */
    changeIfPresent(key: K, value: V): boolean;
    /**
     * Builds an array of pairs from the specified range of keys, sorted by key.
     * Each returned pair is also an array: pair[0] is the key, pair[1] is the value.
     * @param low The first key in the array will be greater than or equal to `low`.
     * @param high This method returns when a key larger than this is reached.
     * @param includeHigh If the `high` key is present, its pair will be included
     *        in the output if and only if this parameter is true. Note: if the
     *        `low` key is present, it is always included in the output.
     * @param maxLength Length limit. getRange will stop scanning the tree when
     *                  the array reaches this size.
     * @description Computational complexity: O(result.length + log size)
     */
    getRange(low: K, high: K, includeHigh?: boolean, maxLength?: number): [K, V][];
    /** Adds all pairs from a list of key-value pairs.
     * @param pairs Pairs to add to this tree. If there are duplicate keys,
     * later pairs currently overwrite earlier ones (e.g. [[0,1],[0,7]]
     * associates 0 with 7.)
     * @description Computational complexity: O(pairs.length * log(size + pairs.length))
     */
    setRange(pairs: [K, V][]): this;
    /**
     * Scans the specified range of keys, in ascending order by key.
     * Note: the callback `onFound` must not insert or remove items in the
     * collection. Doing so may cause incorrect data to be sent to the
     * callback afterward.
     * @param low The first key scanned will be greater than or equal to `low`.
     * @param high Scanning stops when a key larger than this is reached.
     * @param includeHigh If the `high` key is present, `onFound` is called for
     *        that final pair if and only if this parameter is true.
     * @param onFound A function that is called for each key-value pair. This
     *        function can return {break:R} to stop early with result R.
     * @param initialCounter Initial third argument of onFound. This value
     *        increases by one each time `onFound` is called. Default: 0
     * @returns The number of values found, or R if the callback returned
     *        `{break:R}` to stop early.
     * @description Computational complexity: O(number of items scanned + log size)
     */
    forRange<R = number>(low: K, high: K, includeHigh: boolean, onFound?: (k: K, v: V, counter: number) => {
        break?: R;
    } | void, initialCounter?: number): R | number;
    /**
     * Scans and potentially modifies values for a subsequence of keys.
     * Note: the callback `onFound` should ideally be a pure function.
     *   Specfically, it must not insert items, call clone(), or change
     *   the collection except via return value; out-of-band editing may
     *   cause an exception or may cause incorrect data to be sent to
     *   the callback (duplicate or missed items). It must not cause a
     *   clone() of the collection, otherwise the clone could be modified
     *   by changes requested by the callback.
     * @param low The first key scanned will be greater than or equal to `low`.
     * @param high Scanning stops when a key larger than this is reached.
     * @param includeHigh If the `high` key is present, `onFound` is called for
     *        that final pair if and only if this parameter is true.
     * @param onFound A function that is called for each key-value pair. This
     *        function can return `{value:v}` to change the value associated
     *        with the current key, `{delete:true}` to delete the current pair,
     *        `{break:R}` to stop early with result R, or it can return nothing
     *        (undefined or {}) to cause no effect and continue iterating.
     *        `{break:R}` can be combined with one of the other two commands.
     *        The third argument `counter` is the number of items iterated
     *        previously; it equals 0 when `onFound` is called the first time.
     * @returns The number of values scanned, or R if the callback returned
     *        `{break:R}` to stop early.
     * @description
     *   Computational complexity: O(number of items scanned + log size)
     *   Note: if the tree has been cloned with clone(), any shared
     *   nodes are copied before `onFound` is called. This takes O(n) time
     *   where n is proportional to the amount of shared data scanned.
     */
    editRange<R = V>(low: K, high: K, includeHigh: boolean, onFound: (k: K, v: V, counter: number) => EditRangeResult<V, R> | void, initialCounter?: number): R | number;
    /**
     * Removes a range of key-value pairs from the B+ tree.
     * @param low The first key scanned will be greater than or equal to `low`.
     * @param high Scanning stops when a key larger than this is reached.
     * @param includeHigh Specifies whether the `high` key, if present, is deleted.
     * @returns The number of key-value pairs that were deleted.
     * @description Computational complexity: O(log size + number of items deleted)
     */
    deleteRange(low: K, high: K, includeHigh: boolean): number;
    /** Gets the height of the tree: the number of internal nodes between the
     *  BTree object and its leaf nodes (zero if there are no internal nodes). */
    readonly height: number;
    /** Makes the object read-only to ensure it is not accidentally modified.
     *  Freezing does not have to be permanent; unfreeze() reverses the effect.
     *  This is accomplished by replacing mutator functions with a function
     *  that throws an Error. Compared to using a property (e.g. this.isFrozen)
     *  this implementation gives better performance in non-frozen BTrees.
     */
    freeze(): void;
    /** Ensures mutations are allowed, reversing the effect of freeze(). */
    unfreeze(): void;
    /** Scans the tree for signs of serious bugs (e.g. this.size doesn't match
     *  number of elements, internal nodes not caching max element properly...)
     *  Computational complexity: O(number of nodes), i.e. O(size). This method
     *  skips the most expensive test - whether all keys are sorted - but it
     *  does check that maxKey() of the children of internal nodes are sorted. */
    checkValid(): void;
}
/** Leaf node / base class. **************************************************/
declare class BNode<K, V> {
    keys: K[];
    values: V[];
    isShared: true | undefined;
    readonly isLeaf: boolean;
    constructor(keys?: K[], values?: V[]);
    maxKey(): K;
    indexOf(key: K, failXor: number, cmp: (a: K, b: K) => number): index;
    minKey(): K;
    clone(): BNode<K, V>;
    get(key: K, defaultValue: V | undefined, tree: BTree<K, V>): V | undefined;
    checkValid(depth: number, tree: BTree<K, V>): number;
    set(key: K, value: V, overwrite: boolean | undefined, tree: BTree<K, V>): boolean | BNode<K, V>;
    reifyValues(): V[];
    insertInLeaf(i: index, key: K, value: V, tree: BTree<K, V>): boolean;
    takeFromRight(rhs: BNode<K, V>): void;
    takeFromLeft(lhs: BNode<K, V>): void;
    splitOffRightSide(): BNode<K, V>;
    forRange<R>(low: K, high: K, includeHigh: boolean | undefined, editMode: boolean, tree: BTree<K, V>, count: number, onFound?: (k: K, v: V, counter: number) => EditRangeResult<V, R> | void): EditRangeResult<V, R> | number;
    /** Adds entire contents of right-hand sibling (rhs is left unchanged) */
    mergeSibling(rhs: BNode<K, V>, _: number): void;
}
export {};