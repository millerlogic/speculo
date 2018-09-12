// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from './util';
import * as surface from './surface';
import * as workspace from './workspace';


export class TabControl extends surface.Surface {
    static SurfaceClassName = "TabControl";
    readonly tabs: util.IList<Tab>;
    private _etabs: HTMLElement
    private _seltab = -1;
    private _lheight = 0;

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id);
        this._etabs = document.createElement("div");
        surface.addClassCSS(this._etabs, "tabs");
        this.eclient.appendChild(this._etabs);
        this.style |= base.StyleFlags.Selectable | base.StyleFlags.Container;
        this.tabs = util.ArrayList.create<Tab>(util.allowChange, (a, b, c, d) => this._tchgd(a, b, c, d));
    }

    create(): void {
        if (this.isCreated())
            return;
        super.create();
        if (!this._lheight) {
            let fh = parseFloat(surface.getCSS(this.eclient, "font-size") || "0");
            this._lheight = Math.ceil(fh + 12 + 2);
            this.setPadding(this.getPadding().add(0, this._lheight, 0, 0));
        }
    }

    setBounds(b: util.Bounds): void {
        super.setBounds(b);
        let tab = this.tabs.get(this._seltab);
        if (tab)
            tab.setBounds(util.getClientBounds(this));
    }

    // -1 if no tabs.
    getSelectedIndex(): number {
        return this._seltab;
    }

    setSelectedIndex(index: number): void {
        if (!isFinite(index) || (index | 0) != index)
            throw new TypeError("Invalid index");
        if (this._seltab == index)
            return;
        if (index < 0 || index > this.tabs.len())
            //throw new RangeError("Out of range");
            return;
        if (this._seltab == index)
            return;
        let oldtab = this.tabs.get(this._seltab);
        this._seltab = index;
        let newtab = this.tabs.get(index);
        if (newtab) {
            newtab.setBounds(util.getClientBounds(this));
            newtab.setVisible(true);
        }
        if (oldtab) {
            oldtab.setVisible(false);
        }
        this.onSelectedIndexChanged();
    }

    isInputKey(key: base.IKey): boolean {
        if ((key.keyCode == 37 || key.keyCode == 38) && this.getSelectedIndex() > 0)
            return true; // Left, up arrows.
        if ((key.keyCode == 39 || key.keyCode == 40) && this.getSelectedIndex() + 1 < this.tabs.len())
            return true; // Right, down arrows.
        return super.isInputKey(key);
    }

    onKeyDown(ev: KeyboardEvent): void {
        if (ev.keyCode == 37 || ev.keyCode == 38) {
            if (this.getSelectedIndex() > 0)
                this.setSelectedIndex(this.getSelectedIndex() - 1);
        } else if (ev.keyCode == 39 || ev.keyCode == 40) {
            if (this.getSelectedIndex() + 1 < this.tabs.len())
                this.setSelectedIndex(this.getSelectedIndex() + 1);
        } else {
            super.onKeyDown(ev);
        }
    }

    // The user is selecting a tab. Return true to allow.
    onUserSelecting(index: number): boolean {
        //console.log("onUserSelecting", index);
        return true;
    }

    // This can happen by various means:
    // * Tab selection changed by user, after onUserSelecting returned true.
    // * The very first tab was inserted into this.tabs and thus is selected.
    // * The current tab was removed from this.tabs.
    // * setSelectedIndex was called with a different, valid index.
    // * When all tabs are removed, the selected index is -1
    onSelectedIndexChanged(): void {
        //console.log("onSelectedIndexChanged", this.getSelectedIndex());
    }

    onClick(ev: surface.SurfacePointerEvent): void {
        if (ev.target !== this.e && ev.target !== this.eclient && ev.target !== this._etabs) {
            let selidx = this.getSelectedIndex();
            if (selidx != -1) {
                for (let i = 0; i < this._etabs.children.length; i++) {
                    let etab = this._etabs.children[i];
                    if (ev.target === etab) {
                        if (i != selidx) {
                            if (this.onUserSelecting(i) === true)
                                this.setSelectedIndex(i);
                        }
                        break;
                    }
                }
            }
        }
    }

    private _tchgd(index: number, action: util.MapAction, vOld?: Tab, vNew?: Tab): void {
        //console.log("_tchg", index, inserting);
        if (action === util.MapAction.Insert) {
            if (!(vNew instanceof Tab))
                throw new TypeError("Tab expected");
            if (vNew.getParent())
                throw new TypeError("Tab already in use");
            vNew.setVisible(false);
            vNew.setParent(this);
            this._etabs.insertBefore(vNew['label'], this._etabs.children[index] || null);
            if (index <= this._seltab) {
                this._seltab++;
                // The index changed, but the tab didn't...
                this.onSelectedIndexChanged();
            } else if (this._seltab == -1) {
                this._seltab = 0;
                vNew.setBounds(util.getClientBounds(this));
                vNew.setVisible(true);
                this.onSelectedIndexChanged();
            }
        } else if (action === util.MapAction.Replace) {
            if (!(vNew instanceof Tab))
                throw new TypeError("Tab expected");
            if (vNew == vOld)
                return;
            if (vNew.getParent())
                throw new TypeError("Tab already in use");
            if (vOld instanceof Tab) {
                vOld.setParent(null);
                this._etabs.removeChild(vOld['label']);
            }
            vNew.setVisible(false);
            vNew.setParent(this);
            this._etabs.insertBefore(vNew['label'], this._etabs.children[index] || null);
            if (index === this._seltab) {
                vNew.setBounds(util.getClientBounds(this));
                vNew.setVisible(true);
                this.onSelectedIndexChanged(); // It's a different tab now, so...
            }
        } else if (action === util.MapAction.Remove) {
            let old = this.tabs.get(index);
            if (old) {
                old.setParent(null);
                this._etabs.removeChild(old['label']);
            }
            let newlen = this.tabs.len() - 1;
            if (this._seltab >= newlen)
                this._seltab = newlen - 1;
            if (index == this._seltab) {
                // TODO: show the new tab that shifted into index this._seltab.
                let newt = this.tabs.get(index + 1);
                if (newt) {
                    newt.setBounds(util.getClientBounds(this));
                    newt.setVisible(true);
                }
                this.onSelectedIndexChanged();
            }
        }
    }

}

export class Tab extends workspace.Workspace {
    static SurfaceClassName = "Tab";
    private label: HTMLLabelElement

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id);
        this.label = document.createElement("label");
    }

    // -1 if not part of a tab control.
    getTabIndex(): number {
        let tc = this.getParent();
        if (!(tc instanceof TabControl))
            return -1;
        for (let i = 0; i < tc.tabs.len(); i++) {
            if (tc.tabs.get(i) === this)
                return i;
        }
        return -1;
    }

    getText(): string {
        return this.label.innerText;
    }

    setText(text: string): void {
        this.label.innerText = text;
    }

    setVisible(x: boolean): void {
        let tc = this.getParent();
        let tidx = this.getTabIndex();
        let selidx = (tc instanceof TabControl) ? tc.getSelectedIndex() : -1;
        if (x && tidx != -1 && selidx != tidx)
            return; // Don't allow setting visible if it's not the selected tab.
        super.setVisible(x);
        if (x) {
            surface.addClassCSS(this.label, "selected");
            if (tc instanceof TabControl) // Scroll the tab label into view:
                tc['_etabs'].scrollLeft = this.label.offsetLeft - tc.getBounds().width / 4;
        } else {
            surface.removeClassCSS(this.label, "selected");
        }
    }

}