// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from "./util";
import * as surface from "./surface";
import * as list from "./list";


export class Choice extends surface.Surface {
    static SurfaceClassName = "Choice";
    protected select: HTMLSelectElement

    readonly items: util.IList<any>;

    constructor(disp: base.IDisplay, surface_id: number) {
        let select = document.createElement("select");
        select.setAttribute("size", "1");
        super(disp, surface_id, select);
        this.select = select;
        this.style |= base.StyleFlags.Selectable;
        this.items = new list.ListItems(this as any as list.IListCtrl);
    }

    // -1 for none.
    getSelectedIndex(): number {
        return this.select.selectedIndex;
    }

    setSelectedIndex(index: number): void {
        //if (index != this.getSelectedIndex()) {
        this.select.selectedIndex = index;
        this.itemsChanged();
        //}
    }

    protected getItemString(obj: any): string {
        if (obj === null)
            return "null";
        return obj.toString();
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

    protected getEList(): HTMLElement {
        return this.select;
    }

    protected createEItem(): HTMLElement {
        return document.createElement("option")
    }

    isInputKey(key: base.IKey): boolean {
        if (key.keyCode == 37 || key.keyCode == 38 || key.keyCode == 39 || key.keyCode == 40)
            return true; // Arrows.
        return super.isInputKey(key);
    }

    // The user is making selection changes.
    onUserInput(ev: Event): void { }

    onSelectedIndexChanged(): void { }

    private itemsChanged() {
        this.onSelectedIndexChanged();
    }

    create(): void {
        if (this.isCreated())
            return;
        super.create();
        let gotinput = false;
        this.e.addEventListener("input", (ev) => {
            gotinput = true;
            this.itemsChanged();
            this.onUserInput(ev);
        });
        this.e.addEventListener("change", (ev) => {
            if (!gotinput) {
                this.itemsChanged();
                this.onUserInput(ev);
            }
        });
    }

}
