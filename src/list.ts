// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as util from './util';


export interface IListCtrl {
    readonly items: util.IList<any>
    getItemString(obj: any): string
    getSelectedIndex(): number // First one, if multiple.
    setSelectedIndex(index: number): void
    getEList(): HTMLElement
    createEItem(): HTMLElement
    onSelectedIndexChanged(): void
}


export class ListItems implements util.IList<any> {
    private x: {
        [index: number]: any
    } | undefined
    private xNewID = 0;
    private e: HTMLElement

    constructor(private lc: IListCtrl) {
        this.e = lc.getEList();
    }

    fromElement(e: HTMLElement): any {
        let sxid = e.getAttribute("data-item");
        if (sxid) {
            let xid = parseInt(sxid, 10);
            let obj = this.x && this.x[xid];
            if (obj !== undefined)
                return obj;
        }
        return e.innerText;
    }

    get(index: number): any {
        let ce = this.e.children[index] as HTMLElement;
        if (!ce)
            return undefined;
        return this.fromElement(ce);
    }

    len(): number {
        return this.e.children.length;
    }

    add(obj: any): void {
        this.insert(this.e.children.length, obj);
    }

    private _update(ce: HTMLElement, obj: any): void {
        if (obj === undefined)
            throw new TypeError("Invalid value");
        let sxid = ce.getAttribute("data-item");
        let xid = sxid ? parseInt(sxid, 10) : NaN;
        if (typeof obj == "string" || obj instanceof String) {
            ce.innerText = obj.toString();
            if (!isNaN(xid) && this.x)
                delete this.x[xid];
        } else {
            ce.innerText = this.lc.getItemString(obj);
            if (isNaN(xid))
                xid = ++this.xNewID;
            if (!this.x)
                this.x = {};
            this.x[xid] = obj;
            ce.setAttribute("data-item", "" + xid);
        }
    }

    insert(index: number, obj: any): void {
        if (typeof index != "number" || index != Math.floor(index) || index < 0)
            throw new RangeError("Invalid index");
        let ce = this.lc.createEItem();
        this._update(ce, obj);
        var selidx = this.lc.getSelectedIndex();
        this.e.insertBefore(ce, this.e.children[index] || null);
        if (index <= selidx || selidx == -1)
            this.lc.onSelectedIndexChanged();
    }

    remove(index: number): void {
        let ce = this.e.children[index] as HTMLElement;
        if (!ce)
            return;
        let sxid = ce.getAttribute("data-item");
        if (sxid && this.x) {
            let xid = parseInt(sxid, 10);
            delete this.x[xid];
        }
        this.e.removeChild(ce);
    }

    replace(index: number, obj: any): void {
        let ce = this.e.children[index] as HTMLElement;
        if (!ce)
            throw new TypeError("Invalid index");
        this._update(ce, obj);
    }

}
