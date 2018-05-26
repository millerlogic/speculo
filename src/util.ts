// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

export interface IPoint {
    readonly x: number
    readonly y: number
    _point(): void
}

export class Point implements IPoint {
    constructor(public readonly x: number,
        public readonly y: number) {
        if (!isFinite(x) || !isFinite(y))
            throw new RangeError("Point out of range");
    }

    _point() { }

    static readonly zero = new Point(0, 0);
}

export interface ISize {
    readonly width: number
    readonly height: number
    _size(): void
}

export class Size implements ISize {
    constructor(public readonly width: number,
        public readonly height: number) {
        if (!isFinite(width) || !isFinite(width))
            throw new RangeError("Size out of range");
    }

    _size() { }

    static readonly zero = new Size(0, 0);
}

export class Bounds implements IPoint, ISize {
    constructor(public readonly x: number,
        public readonly y: number,
        public readonly width: number,
        public readonly height: number) {
        if (!isFinite(x) || !isFinite(y) || !isFinite(width) || !isFinite(width))
            throw new RangeError("Bounds out of range");
    }

    add(x: number, y: number, width: number, height: number) {
        return new Bounds(this.x + x, this.y + y,
            this.width + width, this.height + height);
    }

    equals(b: Bounds): boolean {
        return this.x === b.x && this.y === b.y && this.width == b.width && this.height == b.height;
    }

    getRight(): number {
        return this.x + this.width;
    }

    getBottom(): number {
        return this.y + this.height;
    }

    _point() { }
    _size() { }

    static readonly zero = new Bounds(0, 0, 0, 0);
}


// The values are relative to the respective edge.
// e.g. if all values are 1, there's a 1px gap around all edges.
export class Padding {
    constructor(public readonly left: number,
        public readonly top: number,
        public readonly right: number,
        public readonly bottom: number) { }

    add(left: number, top: number, right: number, bottom: number): Padding {
        return new Padding(this.left + left, this.top + top,
            this.right + right, this.bottom + bottom);
    }

    static fixed(n: number): Padding {
        return new Padding(n, n, n, n);
    }

    static readonly zero = Padding.fixed(0);
}


// Helper function to get the client bounds, based on the bounds and padding.
// x and y are always 0; width and height exclude all padding.
export function getClientBounds(obj: {
    getBounds(): Bounds
    getPadding(): Padding
}): Bounds {
    let b = obj.getBounds();
    let c = obj.getPadding();
    return new Bounds(0, 0, b.width - (c.left + c.right), b.height - (c.top + c.bottom));
}


export enum Scroll {
    None = 0,
    Horizontal = 0x1,
    Vertical = 0x2,
    Both = 0x3,
}

export interface IScrollable {
    getScrollable(): Scroll
    setScrollable(scroll: Scroll): void
}


export enum Align {
    Start = 0,
    End = 1,
    Center = 2,
}


export interface IAction {
    performAction(sender: any): void
}


export interface IMap<Key, Value> {
    get(key: Key): Value | undefined
    len(): number
    insert(key: Key, value: Value): void
    remove(key: Key): void
    replace(key: Key, value: Value): void // replace on non-existent key may or may not fail.
}

export enum MapAction {
    Insert,
    Remove,
    Replace,
}

export interface IMapChange<Key, Value> {
    // inserting is undefined when removing.
    // If applicable by action: vOld is the removing value, vNew is the inserting, or both for replace.
    // Return false to prevent the insertion or removal.
    (key: Key, action: MapAction, vOld?: Value, vNew?: Value): boolean | void
}

export function allowChange<K>(key: K, action: MapAction): void { }
export function denyChange<K>(key: K, action: MapAction): boolean {
    return false;
}

export class NumberMap<Value> implements IMap<number, Value> {
    private _b4: IMapChange<number, Value>;
    private _af: IMapChange<number, Value>;

    constructor(beforeChange: IMapChange<number, Value> = allowChange,
        afterChange: IMapChange<number, Value> = allowChange) {
        this._b4 = beforeChange;
        this._af = afterChange;
    }

    get(key: number): Value | undefined {
        return (this as any)[key];
    }

    len(): number {
        return Object.keys(this).length - 2;
    }

    insert(key: number, obj: Value): void {
        if (obj === undefined)
            throw new TypeError("Invalid value");
        if (this._b4(key, MapAction.Insert, undefined, obj) !== false) {
            (this as any)[key] = obj;
            this._af(key, MapAction.Insert, undefined, obj);
        }
    }

    remove(key: number): void {
        if (this._b4(key, MapAction.Remove) !== false) {
            delete (this as any)[key];
            this._af(key, MapAction.Remove);
        }
    }

    replace(key: number, obj: Value): void {
        let old = (this as any)[key];
        if (old === undefined)
            this.insert(key, obj);
        if (obj === undefined)
            throw new TypeError("Invalid value");
        if (this._b4(key, MapAction.Replace, old, obj) !== false) {
            delete (this as any)[key];
            this._af(key, MapAction.Replace, old, obj);
        }
    }

}

export interface IList<T> extends IMap<number, T> {
    get(index: number): T | undefined // Returns undefined if not an index.
    len(): number
    add(obj: T): void
    insert(index: number, obj: T): void
    remove(index: number): void
}

export interface IListChange<T> extends IMapChange<number, T> {
}

// The change functions are only called for insert (including add) and remove; not for array methods.
// Do not extend this class.
// https://blog.simontest.net/extend-array-with-typescript-965cc1134b3
export class ArrayList<T> extends Array<T> implements IList<T> {
    private _b4: IListChange<T>;
    private _af: IListChange<T>;

    private constructor() {
        super();
    }

    static create<T>(beforeChange: IListChange<T> = allowChange,
        afterChange: IListChange<T> = allowChange): ArrayList<T> {
        let x = Object.create(ArrayList.prototype);
        x._b4 = beforeChange;
        x._af = afterChange;
        return x;
    }

    get(index: number): T | undefined {
        return this[index];
    }

    len(): number {
        return this.length;
    }

    // add calls insert
    add(obj: T): void {
        this.insert(this.len(), obj);
    }

    insert(index: number, obj: T): void {
        if (obj === undefined)
            throw new TypeError("Invalid value");
        if (this._b4(index, MapAction.Insert, undefined, obj) !== false) {
            this.splice(index, 0, obj);
            this._af(index, MapAction.Insert, undefined, obj);
        }
    }

    remove(index: number): void {
        if (this._b4(index, MapAction.Remove) !== false) {
            this.splice(index, 1);
            this._af(index, MapAction.Remove);
        }
    }

    replace(index: number, obj: T): void {
        let old = (this as any)[index];
        if (old === undefined)
            throw new TypeError("Invalid index");
        if (obj === undefined)
            throw new TypeError("Invalid value");
        if (this._b4(index, MapAction.Replace, old, obj) !== false) {
            delete (this as any)[index];
            this._af(index, MapAction.Replace, old, obj);
        }
    }
}


// This is one-directional mapping From->To which makes it readonly.
export class ToList<From, To> implements IList<To> {

    constructor(protected from: {
        readonly length: number;
        [index: number]: From;
    },
        protected map: {
            (x: From): To
        }) { }

    get(index: number): To | undefined {
        let x = this.from[index];
        if (x === undefined)
            return undefined;
        return this.map(x);
    }

    len(): number {
        return this.from.length;
    }

    private _ro(): void {
        throw new RangeError("readonly");
    }

    add(obj: To): void {
        this.insert(this.len(), obj);
    }

    insert(index: number, obj: To): void {
        this._ro();
    }

    remove(index: number): void {
        this._ro();
    }

    replace(index: number, obj: To): void {
        this._ro();
    }

}
