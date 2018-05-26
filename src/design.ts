// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as util from "./util";
import * as base from "./base";
import * as surface from "./surface";


export enum Selection {
    Select = 0x1,
    Deselect = 0x2,
    Toggle = Select | Deselect,
    Clear = 0x4,
}

// Any surface parameters indicate either the designing surface or one of its discendents in design mode.
export interface IDesigning {
    update(sf: base.ISurface | null): void // Call this when any of the designing properties or bounds changed.
    stop(): void // Stop designing, this object will no longer be valid.
    setSelection(sf: base.ISurface | null, sel: Selection): void
    isSelected(sf: base.ISurface): boolean
    eachSelected(fn: { (this: IDesigning, sf: base.ISurface): void }): void // Get each currently selected surface.
    getSurface(): base.ISurface; // Get the designed surface.
    onselection: { (this: IDesigning): void } // Set this to be notified of selection changes.
    onresize: { (this: IDesigning, sf: base.ISurface): void } // Set this to be notified of designer resize changes.
    onmove: { (this: IDesigning, sf: base.ISurface): void } // Set this to be notified of designer move changes.
}


// Call this on the top-level object itself being designed; any descendants in design mode will be handled.
// Do not do the following to this surface while designing:
// * change the parent.
// * destroy it.
// * make it invisible.
// * turn design mode off.
// See IDesigning for more info.
export function designSurface(sf: surface.Surface): IDesigning {
    let sfp = sf.getParent();
    if (!sfp || !sf.getVisible() || !sf.getDesignMode() || !sf.isCreated())
        throw new base.DisplayError("Cannot design surface due to invalid state");
    let d = new Designing(sf);
    return d;
}


class Designing implements IDesigning {
    onselection = function (): void { }
    onresize = function (sf: base.ISurface): void { }
    onmove = function (sf: base.ISurface): void { }

    private _sel: [HTMLElement, base.ISurface][] = []; // [eoutline, sf][]
    private _resze: HTMLElement // Resizer for single _sel item.
    private _mdh: any // mousedown
    private _mmh: any // mousemove
    private _muh: any // mouseup
    private _sch: any // scroll
    private _grid = 8;

    constructor(private sf: surface.Surface) {
        let e = surface.Surface.getClientElement(sf);
        let sfp = sf.getParent();
        if (!sfp)
            throw new Error("panic");
        let ep = surface.Surface.getClientElement(sfp);
        // Resizer:
        this._resze = document.createElement("div");
        surface.addClassCSS(this._resze, "ns");
        surface.addClassCSS(this._resze, "design-resize");
        surface.setCSS(this._resze, "display", "none");
        ep.appendChild(this._resze);
        // Events:
        let downq = 0; // 0=nothing, 1=move, 2=resize, 3=try move/select.
        let downx = 0;
        let downy = 0;
        let downsf: base.ISurface | null = null;
        let mouseup = (ev: MouseEvent) => {
            if (downq) {
                if (downq == 3) {
                    this.setSelection(downsf, ev.ctrlKey ? Selection.Toggle : (Selection.Select | Selection.Clear));
                }
                downq = 0;
                downsf = null;
            }
        };
        // mousedown:
        this._mdh = (ev: MouseEvent) => {
            if (!sfp || !sfp.getEnabled()) // If the parent is disabled, ignore stuff.
                return;
            if (ev.target instanceof Element) {
                if (ev.target == this._resze) {
                    let sf = this._sel[0][1];
                    downx = ev.pageX;
                    downy = ev.pageY;
                    downsf = sf;
                    downq = 2;
                    Designing._activ(sf);
                } else {
                    let sf = surface.Surface.fromElement(ev.target, this.sf.getDisplay());
                    if (sf && sf != sfp && sf.getDesignMode()) {
                        ev.stopPropagation();
                        ev.preventDefault();
                        Designing._activ(sf);
                        //console.log("mousedown design", ev);
                        // TODO: shift selects all in between as well.
                        if (this.isSelected(sf) && sf !== this.sf) {
                            // They clicked on something already selected, so maybe they want to drag all selected.
                            downx = ev.pageX;
                            downy = ev.pageY;
                            downsf = sf;
                            downq = 3;
                        } else {
                            this.setSelection(sf, ev.ctrlKey ? Selection.Toggle : (Selection.Select | Selection.Clear));
                            if (sf !== this.sf) { // Can't move the top level designed surface.
                                downx = ev.pageX;
                                downy = ev.pageY;
                                downsf = sf;
                                downq = 1;
                            }
                        }
                    }
                }
            }
        };
        ep.addEventListener("mousedown", this._mdh, true);
        // mousemove:
        this._mmh = (ev: MouseEvent) => {
            if (downq && downsf) {
                if (!ev.which && !ev.buttons) {
                    mouseup(ev);
                    return;
                }
                if (downq == 3)
                    downq = 1;
                let b = downsf.getBounds();
                if (downq == 1) { // move:
                    let diffx = ev.pageX - downx;
                    let diffy = ev.pageY - downy;
                    downx = ev.pageX;
                    downy = ev.pageY;
                    let x = b.x + diffx;
                    let y = b.y + diffy;
                    if (!ev.ctrlKey) {
                        // Snap to grid...
                        let xd = x % this._grid;
                        let yd = y % this._grid;
                        if (xd > this._grid / 2) // Try to round up...
                            xd = -(this._grid - xd);
                        if (yd > this._grid / 2)
                            yd = -(this._grid - yd);
                        x -= xd;
                        y -= yd;
                        downx -= xd;
                        downy -= yd;
                    }
                    let newb = new util.Bounds(x, y, b.width, b.height);
                    if (!b.equals(newb)) {
                        downsf.setBounds(newb);
                        this.update(downsf);
                        this.onmove(downsf);
                        // Move anything else selected:
                        if (this._sel.length > 0) {
                            let movex = x - b.x;
                            let movey = y - b.y;
                            for (let i = 0; i < this._sel.length; i++) {
                                let sf = this._sel[i][1];
                                if (sf != downsf) {
                                    let b = sf.getBounds();
                                    sf.setBounds(sf.getBounds().add(movex, movey, 0, 0));
                                    this.update(sf);
                                    this.onmove(sf);
                                }
                            }
                        }
                    }
                } else if (downq == 2) { // resize:
                    let diffx = ev.pageX - downx;
                    let diffy = ev.pageY - downy;
                    downx = ev.pageX;
                    downy = ev.pageY;
                    let w = b.width + diffx;
                    let h = b.height + diffy;
                    if (!ev.ctrlKey) {
                        // Snap to grid...
                        let wd1 = w % this._grid;
                        let hd1 = h % this._grid;
                        let wd2 = wd1;
                        let hd2 = hd1;
                        // If a container, also try to snap to client bounds.
                        if (downsf.getStyle() & base.StyleFlags.Container) {
                            let ib = util.getClientBounds(downsf);
                            let iw = ib.width + diffx;
                            let ih = ib.height + diffy;
                            wd2 = iw % this._grid;
                            hd2 = ih % this._grid;
                        }
                        let dx = (wd1 - wd2) - (hd1 - hd2); // Pick the closer one.
                        let wd = dx < 0 ? wd1 : wd2;
                        let hd = dx < 0 ? hd1 : hd2;
                        if (wd > this._grid / 2) // Try to round up...
                            wd = -(this._grid - wd);
                        if (hd > this._grid / 2)
                            hd = -(this._grid - hd);
                        w -= wd;
                        h -= hd;
                        downx -= wd;
                        downy -= hd;
                    }
                    let newb = new util.Bounds(b.x, b.y, w, h);
                    if (!b.equals(newb)) {
                        downsf.setBounds(newb);
                        this.update(downsf);
                        this.onresize(downsf);
                    }
                }
            }
        };
        ep.addEventListener("mousemove", this._mmh, true);
        // mouseup:
        this._muh = mouseup;
        ep.addEventListener("mouseup", this._muh, true);
        // scroll:
        this._sch = (ev: UIEvent) => {
            if (ev.target instanceof Element) {
                let sf = surface.Surface.fromElement(ev.target, this.sf.getDisplay());
                if (sf && sf.getDesignMode()) {
                    for (let i = 0; i < this._sel.length; i++) {
                        Designing._outline(this._sel[i][0], this._outlineBounds(this._sel[i][1]));
                    }
                }
            }
        };
        e.addEventListener("scroll", this._sch, true);
        // Select something!
        this.setSelection(sf, Selection.Select | Selection.Clear);
    }

    getSurface(): base.ISurface {
        return this.sf;
    }

    private static _activ(sf: base.ISurface): void {
        if (sf.getStyle() & base.StyleFlags.Window) {
            (sf as base.IWindow).activate();
        } else {
            let pw = surface.Surface.findParentWindow(sf);
            if (pw)
                pw.activate(sf);
        }
    }

    private _outlineBounds(sf: base.ISurface): util.Bounds {
        if (!(sf instanceof surface.Surface))
            throw new base.DisplayError("Invalid surface");
        let b = sf.getBounds();
        let bx: util.Bounds
        if (sf === this.sf) {
            bx = b;
        } else {
            let xp = this.sf.getParent();
            if (!xp)
                throw new base.DisplayError("Design surface has no parent");
            let sfp = sf.getParent();
            if (!sfp)
                throw new base.DisplayError("No parent");
            let bm = sfp.mapPoint(b, xp);
            let so = this.sf.getScrollOffset();
            bx = new util.Bounds(bm.x - so.x, bm.y - so.y, b.width, b.height);
        }
        return bx;
    }

    setSelection(sf: base.ISurface | null, sel: Selection): void {
        if (!sf || sf === this.sf || ((sel & (Selection.Clear | Selection.Deselect)) == (Selection.Clear | Selection.Deselect))) {
            sf = this.sf;
            sel = Selection.Select | Selection.Clear;
        }
        if ((sel & Selection.Toggle) == Selection.Toggle) {
            if (this.isSelected(sf)) {
                sel &= ~Selection.Select;
            } else {
                sel &= ~Selection.Deselect;
            }
        }
        if (!(sel & Selection.Clear) && (sel & Selection.Select)) {
            if (this._sel.length >= 1) {
                // Make sure they have the same parent.
                if (sf.getParent() != this._sel[0][1].getParent())
                    sel |= Selection.Clear;
            }
        }
        if (this._sel.length == 1)
            surface.setCSS(this._resze, "display", "none");
        let bx = this._outlineBounds(sf);
        if (sel & Selection.Clear) {
            if (this._sel.length >= 1) {
                for (let i = 1; i < this._sel.length; i++) {
                    this._unsel(this._sel[i][0]);
                }
                this._sel.splice(1);
                this._sel[0][1] = sf;
                Designing._outline(this._sel[0][0], bx);
            } else {
                this._sel.push([this.newOutline(bx), sf]);
            }
        } else if (sel & Selection.Select) {
            if (!this.isSelected(sf))
                this._sel.push([this.newOutline(bx), sf]);
        } else if (sel & Selection.Deselect) {
            for (let i = 0; i < this._sel.length; i++) {
                if (this._sel[i][1] === sf) {
                    this._unsel(this._sel[i][0]);
                    this._sel.splice(i, 1);
                    break;
                }
            }
        }
        this._updateresz();
        this.onselection();
    }

    isSelected(sf: base.ISurface): boolean {
        for (let i = 0; i < this._sel.length; i++) {
            if (this._sel[i][1] === sf)
                return true;
        }
        return false;
    }

    eachSelected(fn: { (this: IDesigning, sf: base.ISurface): void }): void {
        let len = this._sel.length;
        for (let i = 0; i < Math.min(len, this._sel.length);) {
            let x = this._sel[i][1];
            fn.call(this, x);
            // Account for the current selection being removed:
            if (x == this._sel[i][1])
                i++;
            else
                len--;
        }
    }

    private _updateresz(): void {
        if (this._sel.length == 1) {
            let ob = this._outlineBounds(this._sel[0][1]);
            this._resze.style.left = "" + (ob.x + ob.width) + "px";
            this._resze.style.top = "" + (ob.y + ob.height) + "px";
            this._resze.style.width = "8px";
            this._resze.style.height = "8px";
            surface.setCSS(this._resze, "display", "");
        }
    }

    private static _outline(e: HTMLElement, b: util.Bounds): void {
        // The outline is 2px wide, 1px outside and 1px inside.
        // Overlapping on both sides increases the likelihood of being able to see and use it.
        e.style.left = "" + (b.x - 1) + "px";
        e.style.top = "" + (b.y - 1) + "px";
        e.style.width = "" + (b.width + 2) + "px";
        e.style.height = "" + (b.height + 2) + "px";
    }

    private newOutline(b: util.Bounds): HTMLElement {
        let e = document.createElement("div");
        surface.addClassCSS(e, "ns");
        surface.addClassCSS(e, "design-outline");
        e.style.pointerEvents = "none";
        let sfp = this.sf.getParent();
        if (sfp)
            surface.Surface.getClientElement(sfp).appendChild(e);
        Designing._outline(e, b);
        return e;
    }

    update(sf: base.ISurface | null): void {
        for (let i = 0; i < this._sel.length; i++) {
            let sfx = this._sel[i][1];
            if (!sf || sfx === sf) {
                if (!sfx.isCreated()) {
                    if (this._sel.length == 1) {
                        // Last selected surface, so switch selection to the parent.
                        if (sfx == this.sf)
                            throw new base.DisplayError("Destroyed designed surface");
                        this.setSelection(sfx.getParent(), Selection.Select | Selection.Clear);
                    } else {
                        this.setSelection(sfx, Selection.Deselect);
                    }
                } else {
                    Designing._outline(this._sel[i][0], this._outlineBounds(sfx));
                }
                break;
            }
        }
        this._updateresz();
    }

    private _unsel(eoutline: HTMLElement): void {
        if (eoutline.parentNode)
            eoutline.parentNode.removeChild(eoutline);
    }

    stop(): void {
        let sfp = this.sf.getParent();
        if (sfp) {
            let ep = surface.Surface.getClientElement(sfp);
            ep.removeEventListener("mousedown", this._mdh);
            ep.removeEventListener("mousemove", this._mmh);
            ep.removeEventListener("mouseup", this._muh);
            ep.removeEventListener("scroll", this._sch);
        }
        for (let i = 0; i < this._sel.length; i++) {
            this._unsel(this._sel[i][0]);
        }
    }

}

