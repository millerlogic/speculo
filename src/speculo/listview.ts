// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from './util';
import * as surface from './surface';
import * as drawing from './drawing';
import * as display from './display';
import * as list from './list';


export class ListView extends surface.Surface implements util.IScrollable {
    static SurfaceClassName = "ListView";

    readonly items: util.IList<any>
    readonly selectedItems: util.IList<any>
    readonly selectedIndices: util.IList<number>
    private _selidxa: Array<number>

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id);
        this.style |= base.StyleFlags.Selectable;
        surface.addClassCSS(this.eclient, "vscroll"); // vscroll by default.
        let items = new list.ListItems(this as any as list.IListCtrl);
        this.items = items;
        this.selectedItems = new util.ToList<Element, any>([], function (e: Element): any {
            return items.fromElement(e as HTMLElement);
        });
        this._selidxa = [];
        this.selectedIndices = new util.ToList<number, number>(this._selidxa, function (n: number): number {
            return n;
        });
    }

    getScrollable(): util.Scroll {
        let scroll = util.Scroll.None;
        if (this.eclient.matches(".hscroll"))
            scroll |= util.Scroll.Horizontal;
        if (this.eclient.matches(".vscroll"))
            scroll |= util.Scroll.Vertical;
        return scroll;
    }

    setScrollable(scroll: util.Scroll): void {
        if (scroll & util.Scroll.Horizontal)
            surface.addClassCSS(this.eclient, "hscroll");
        else
            surface.removeClassCSS(this.eclient, "hscroll");
        if (scroll & util.Scroll.Vertical)
            surface.addClassCSS(this.eclient, "vscroll");
        else
            surface.removeClassCSS(this.eclient, "vscroll");
    }

    // Get first selected index, or -1 for none.
    getSelectedIndex(): number {
        /*
        let esel = this.e.querySelector(".item.selected");
        if (!esel)
            return -1;
        for (let i = 0, ex = this.e.firstElementChild; ex; ex = ex.nextElementSibling, i++) {
            if (ex == esel)
                return i;
        }
        return -1;
        */
        let i = this._selidxa[0];
        return i === undefined ? -1 : i;
    }

    private _unselAll(): void {
        let esels = this.e.querySelectorAll(".item.selected");
        for (let i = 0; i < esels.length; i++) {
            surface.removeClassCSS(esels[i], "selected");
        }
    }

    // Set first selected index, or -1 for none.
    // keepSelection=true means add to the selection, don't clear previous selections (multi-select only)
    setSelectedIndex(index: number, keepSelection?: boolean): void {
        // Remove:
        if (!keepSelection || !this.getMultiple())
            this._unselAll();
        // Set:
        if (index !== -1) {
            let esel = this.e.children[index] as HTMLElement;
            if (esel) {
                surface.addClassCSS(esel, "selected");
                this.e.scrollTop = esel.offsetTop;
            }
        }
        this._selchg();
    }

    getMultiple(): boolean {
        return this.e.matches(".multiple");
    }

    setMultiple(x: boolean): void {
        if (x)
            surface.addClassCSS(this.e, "multiple");
        else
            surface.removeClassCSS(this.e, "multiple");
    }

    getText(): string {
        let item = this.items.get(this.getSelectedIndex());
        return item === undefined ? "" : this.getItemString(item);
    }

    setText(text: string): void {
        let newsel = -1;
        for (let i = 0; i < this.items.len(); i++) {
            if (this.getItemString(this.items.get(i)) == text) {
                newsel = i;
                break;
            }
        }
        this.setSelectedIndex(newsel);
    }

    private getEList(): HTMLElement {
        return this.e;
    }

    protected getItemString(obj: any): string {
        if (obj === null)
            return "null";
        return obj.toString();
    }

    protected createEItem(): HTMLElement {
        let e = document.createElement("div");
        surface.addClassCSS(e, "item");
        return e;
    }

    private _md(ea: surface.SurfaceMouseEvent): void {
        let target: HTMLElement | null = ea.target as HTMLElement | null;
        if (target && target.matches(".item")) {
            if (ea.ctrlKey) {
                if (target.matches(".selected")) {
                    surface.removeClassCSS(target, "selected");
                } else {
                    if (!this.getMultiple())
                        this._unselAll();
                    surface.addClassCSS(target, "selected");
                }
            } else { // TODO: handle shift to select range.
                this._unselAll();
                surface.addClassCSS(target, "selected");
            }
            this._selchg();
            this.onUserInput(ea);
        }

    }

    private _mdh = false;

    onMouseDown(ea: surface.SurfaceMouseEvent): void {
        this._md(ea);
        this._mdh = true;
    }

    onClick(ea: surface.SurfaceMouseEvent): void {
        if (!this._mdh)
            this._md(ea);
        this._mdh = false;
    }

    isInputKey(key: base.IKey): boolean {
        if (key.keyCode == 37 || key.keyCode == 38 || key.keyCode == 39 || key.keyCode == 40)
            return true; // Arrows.
        return super.isInputKey(key);
    }

    // The user is making selection changes.
    onUserInput(ev: Event): void { }

    onSelectedIndexChanged(): void { }

    private _selchg() {
        let sela = this.e.querySelectorAll(".item.selected");
        (this.selectedItems as util.ToList<Element, any>)['from'] = sela;
        let isela = 0;
        if (sela.length) {
            for (let i = 0, ex = this.e.firstElementChild; ex; ex = ex.nextElementSibling, i++) {
                if (ex == sela[isela]) {
                    this._selidxa[isela++] = i;
                }
            }
            if (isela != sela.length)
                console.log("invalid selectedIndices");
        }
        this._selidxa.splice(isela);
        this.onSelectedIndexChanged();
    }

}
