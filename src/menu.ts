// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as util from "./util";
import * as base from "./base";
import * as surface from "./surface";
import * as display from "./display";


export class MenuItem extends surface._Elem implements base.IMenuItem, util.IAction {
    private etext: HTMLElement
    private _sub: SubMenu | null = null
    private _owner: _Menu | undefined

    constructor() {
        super(document.createElement("div")); // the item entry label.
        surface.addClassCSS(this.e, "nmi");
        surface.addClassCSS(this.e, "sep");
        this.etext = document.createElement("label");
        surface.addClassCSS(this.etext, "text");
        this.e.appendChild(this.etext);
        this.e.addEventListener("click", (ev) => {
            if (!this.getEnabled())
                return;
            let d = this._owner ? this._owner['_disp'].getDesktop() : undefined;
            if (d instanceof surface.Surface)
                this.onClick(d['_toSME'](ev));
        });
    }

    getText(): string {
        return this.etext.innerText;
    }

    setText(text: string): void {
        this.etext.innerText = text;
        if (text)
            surface.removeClassCSS(this.e, "sep");
        else
            surface.addClassCSS(this.e, "sep");
    }

    getSubMenu(): SubMenu | null {
        return this._sub;
    }

    setSubMenu(sub: base.IMenu | null): void {
        if (sub && !(sub instanceof SubMenu))
            throw new base.DisplayError("SubMenu expected");
        this._sub = sub;
        if (sub) {
            surface.addClassCSS(this.e, "sub");
            this.e.setAttribute("title", "Click to expand"); // TODO: improve.
        }
        else {
            surface.removeClassCSS(this.e, "sub");
            this.e.removeAttribute("title"); // TODO: improve.
        }
    }

    getEnabled(): boolean {
        return !this.e.matches(".disabled");
    }

    setEnabled(x: boolean): void {
        if (x)
            surface.removeClassCSS(this.e, "disabled");
        else
            surface.addClassCSS(this.e, "disabled");
    }

    showSubMenu(pt: util.IPoint): void {
        // TODO: improve.
        let disp = this._owner ? this._owner['_disp'] : undefined;
        console.log("TODO: do submenus better");
        if (this._sub && disp instanceof display.Display)
            this._sub['_mshow'](disp, pt);
    }

    // Called on click if no sub menu.
    performAction(sender: any): void {
        //
    }

    // The SurfaceMouseEvent.surfacePoint is relative to the desktop.
    onClick(ev: surface.SurfaceMouseEvent): void {
        let disp = this._owner ? this._owner['_disp'] : undefined;
        if (this._sub) {
            this.showSubMenu(ev.surfacePoint);
        } else {
            surface.addClassCSS(this.e, "sel");
            setTimeout(() => {
                surface.removeClassCSS(this.e, "sel");
                if (disp instanceof display.Display)
                    dismissAll(disp);
            }, 80);
            this.performAction(this);
        }
    }

}


var prevzindex = 1000;

export function dismissAll(disp: display.Display): void {
    prevzindex = 1000;
    let d = disp.getDesktop();
    if (d instanceof surface.Surface) {
        let ed = surface.Surface.getElement(d);
        let xlist = ed.querySelectorAll(".ns.nm-Menu");
        for (var i = 0; i < xlist.length; i++) {
            (xlist[i] as HTMLElement).style.display = 'none';
        }
    }
}

export function anyMenusOpen(): boolean {
    return prevzindex > 1000;
}

// Returns true if the element is a menu or is part of a menu.
export function isMenu(e: HTMLElement): boolean {
    return e.matches(".ns.nm-Menu, .ns.nm-Menu *");
}

/*
export function fromElement(e: HTMLElement, disp: base.IDisplay): base.IMenu {
    // ...
}
*/


// Although the other classes share this code, it's not a public contract.
class _Menu extends surface._Elem implements base.IMenu {
    readonly items: util.IList<MenuItem>;

    private _disp: base.IDisplay
    private _id: number

    constructor(disp: base.IDisplay, menu_id: number) {
        super(document.createElement("div")); // The popup menu.
        this._disp = disp;
        this._id = menu_id;
        this.items = util.ArrayList.create<MenuItem>(util.allowChange, (a, b, c, d) => this._ichgd(a, b, c, d));
        this.e.style.display = 'none';
        var s = disp.getName() + "-m" + menu_id;
        this.e.setAttribute("data-menu", s);
        this.addClassCSS(s);
        this.addClassCSS("ns");
        this.addClassCSS("nm-Menu");
        disp.menus.add(this);
    }

    getID(): number {
        return this._id;
    }

    destroy(): void {
        this._disp.menus.remove(this._id);
    }

    private _ichgd(index: number, action: util.MapAction, vOld?: MenuItem, vNew?: MenuItem): void {
        //console.log("_ichg", index, inserting);
        if (action === util.MapAction.Insert) {
            if (!(vNew instanceof MenuItem))
                throw new TypeError("Item expected");
            if (vNew['_owner'])
                throw new base.DisplayError("Menu item in use");
            this.e.insertBefore(vNew['e'], this.e.children[index] || null);
            vNew['_owner'] = this;
        } else if (action === util.MapAction.Replace) {
            if (!(vNew instanceof MenuItem))
                throw new TypeError("Item expected");
            if (vNew == vOld)
                return;
            if (vNew['_owner'])
                throw new base.DisplayError("Menu item in use");
            this.e.removeChild(this.e.children[index]);
            if (vOld)
                vOld['_owner'] = undefined;
            this.e.insertBefore(vNew['e'], this.e.children[index] || null);
            vNew['_owner'] = this;
        } else if (action === util.MapAction.Remove) {
            this.e.removeChild(this.e.children[index]);
            if (vOld)
                vOld['_owner'] = undefined;
        }
    }

    // pt is in desktop points.
    private _mshow(disp: display.Display, pt: util.IPoint): void {
        let d = disp.getDesktop();
        if (!(d instanceof surface.Surface))
            throw new base.DisplayError("Cannot use this display");
        this.e.style.display = 'none';
        this.e.style.left = "" + pt.x + "px";
        this.e.style.top = "" + pt.y + "px";
        d['e'].appendChild(this.e);
        // TODO: Make sure it fits in the desktop...
        this.e.style.zIndex = "" + ++prevzindex;
        this.e.style.display = '';
        setTimeout(() => this.e.focus());
    }

    private _mhide(): void {
        this.e.style.display = 'none';
    }

}


export class SubMenu extends _Menu implements base.IMenu {

    constructor(disp: base.IDisplay, menu_id: number) {
        super(disp, menu_id);
        surface.addClassCSS(this.e, "nm-SubMenu");
    }

}


export class MainMenu extends _Menu implements base.IMenu {

    constructor(disp: base.IDisplay, menu_id: number) {
        super(disp, menu_id);
        surface.addClassCSS(this.e, "nm-MainMenu");
    }

}


export class ContextMenu extends _Menu implements base.IMenu {

    constructor(disp: base.IDisplay, menu_id: number) {
        super(disp, menu_id);
        surface.addClassCSS(this.e, "nm-ContextMenu");
    }

    // pt is in desktop points.
    show(disp: display.Display, pt: util.IPoint): void {
        this['_mshow'](disp, pt);
    }

}
