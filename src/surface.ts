// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as display from './display';
import * as util from './util';
import * as base from './base';
import * as drawing from './drawing';


export interface ISurfaceClass {
    SurfaceClassName: string
}

function isSurfaceClass(sfc: any): ISurfaceClass | null {
    if (typeof sfc.SurfaceClassName == "string") {
        return sfc as ISurfaceClass;
    }
    return null;
}

export function getSurfaceClass(sf: Surface): ISurfaceClass | null {
    return isSurfaceClass(Object.getPrototypeOf(sf).constructor);
}

export function getSurfaceClassParent(sfc: ISurfaceClass): ISurfaceClass | null {
    for (let x = sfc; ;) {
        x = Object.getPrototypeOf(x);
        if (!x || !x.SurfaceClassName)
            return null;
        if (x.SurfaceClassName != sfc.SurfaceClassName)
            return x;
    }
}


function _frompx(x: string | null): number {
    return parseFloat(x || "0");
}

function _topx(x: number | null): string {
    return "" + (x || 0) + "px";
}

export function addClassCSS(e: Element, name: string): void {
    e.classList.add(name);
}

export function removeClassCSS(e: Element, name: string): void {
    e.classList.remove(name);
}

export function getAllCSS(e: HTMLElement): CSSStyleDeclaration {
    return window.getComputedStyle(e);
}

export function setCSS(e: HTMLElement, style: string, value: any): void {
    (e.style as any)[style] = value;
}

export function getCSS(e: HTMLElement, style: string): any {
    return (getAllCSS(e) as any)[style];
}

if (!Element.prototype.matches) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/matches
    Element.prototype.matches = Element.prototype.msMatchesSelector;
}


export class _Elem {

    constructor(protected e: HTMLElement) {
    }

    protected addClassCSS(name: string): void {
        addClassCSS(this.e, name);
    }

    protected removeClassCSS(name: string): void {
        removeClassCSS(this.e, name);
    }

    protected matches(selector: string): boolean {
        return this.e.matches(selector);
    }

}


export interface SurfaceMouseEvent extends MouseEvent {
    readonly surfacePoint: util.IPoint // Coordinates relative to the surface client area.
}


export class Surface extends _Elem implements base.ISurface {
    static SurfaceClassName = "Surface";
    protected eclient: HTMLElement
    protected style: base.StyleFlags = 0
    private _disp: base.IDisplay
    private _bounds: util.Bounds = util.Bounds.zero
    private _cpad: util.Padding = util.Padding.zero // Content area padding.
    private _parent: Surface | null = null
    private _id: number
    private _state = 0 // 0=new, 1=created, 2=destroyed.

    constructor(disp: base.IDisplay, surface_id: number, e?: HTMLElement) {
        super(e ? e : document.createElement("div"));
        this._disp = disp;
        this._id = surface_id;
        this.eclient = this.e;
        this.setup();
    }

    protected setup(): void {
        var s = this._disp.getName() + "-" + this._id;
        this.e.setAttribute("data-surface", s);
        this.addClassCSS(s);
        this.addClassCSS("ns");
        this._disp.surfaces.add(this);
        for (let sfc = getSurfaceClass(this); sfc; sfc = getSurfaceClassParent(sfc)) {
            this.addClassCSS("ns-" + sfc.SurfaceClassName);
        }
    }

    private _sfcreate(): void {
        if (this.getStyle() & base.StyleFlags.Selectable)
            this.eclient.tabIndex = 0; // Allow tabbing from browser controls.
        if (this.getStyle() & base.StyleFlags.Container)
            this.addClassCSS("container");
        this._state = 1;
    }

    // It is safe to call this at any time to ensure the surface is in the created state.
    // If this is not called explicitly, this is implicitly called when the parent is set.
    create(): void {
        if (!this.isCreated()) {
            this._sfcreate();
        }
    }

    isCreated(): boolean {
        return this._state == 1;
    }

    getID(): number {
        return this._id
    }

    getDesignMode(): boolean {
        return this.e.matches(".design");
    }

    setDesignMode(x: boolean): void {
        if (x)
            this.addClassCSS("design");
        else
            this.removeClassCSS("design");
    }

    getFont(): drawing.Font {
        return drawing.Font.fromElement(this.eclient);
    }

    // null for default.
    setFont(f: drawing.Font | null): void {
        // Font applies to the client only, so we don't interfere with nonclient stuff (e.g. window caption).
        setCSS(this.eclient, "font", f ? f.toCSS() : "");
    }

    getTextDecoration(): drawing.TextDecoration {
        return drawing.TextDecoration.fromElement(this.eclient);
    }

    // null for default.
    setTextDecoration(td: drawing.TextDecoration | null): void {
        // Font applies to the client only, so we don't interfere with nonclient stuff (e.g. window caption).
        setCSS(this.eclient, "text-decoration", td ? td.toCSS() : "");
    }

    getForeColor(): drawing.Color {
        return drawing.parseColorCSS(window.getComputedStyle(this.e).color || "");
    }

    // NaN for default.
    setForeColor(c: drawing.Color): void {
        setCSS(this.e, "color", isNaN(c) ? "" : drawing.toColorString(c));
    }

    getBackColor(): drawing.Color {
        return drawing.parseColorCSS(window.getComputedStyle(this.e).backgroundColor || "");
    }

    // NaN for default.
    setBackColor(c: drawing.Color): void {
        setCSS(this.e, "backgroundColor", isNaN(c) ? "" : drawing.toColorString(c));
    }

    // from 0 (transparent) to 1 (opaque).
    getOpacity(): number {
        return parseFloat(getCSS(this.e, "opacity"));
    }

    // NaN for default.
    setOpacity(n: number): void {
        setCSS(this.e, "opacity", isNaN(n) ? "" : n.toString());
    }

    getBounds(): util.Bounds {
        return this._bounds;
    }

    setBounds(b: util.Bounds): void {
        //console.log("set bounds", this._id, b, "- old:", this._bounds);
        this._bounds = b;
        this._applyBounds(this._parent);
    }

    getPadding(): util.Padding {
        return this._cpad;
    }

    setPadding(m: util.Padding): void {
        let oldm = this._cpad;
        this._cpad = m;
        if (this.e === this.eclient && (m.left != oldm.left || m.top != oldm.top)) {
            // There's no separate client to move, so...
            // Move all the children to be relative to the new client top left.
            // We can just tell them to apply their bounds.
            for (let csf = this.firstChild(); csf; csf = csf.nextSibling()) {
                if (csf instanceof Surface)
                    csf._applyBounds(this);
                else
                    csf.setBounds(csf.getBounds());
            }
        }
        this._applyPadding();
    }

    getScrollOffset(): util.Point {
        if (!this.isCreated())
            return util.Point.zero;
        return new util.Point(
            this.eclient.scrollLeft,
            this.eclient.scrollTop
        );
    }

    setScrollOffset(pt: util.Point): void {
        if (!this.isCreated())
            return;
        this.eclient.scrollLeft = pt.x;
        this.eclient.scrollTop = pt.y;
    }

    // Content area as if scrolling were enabled.
    getContentBounds(): util.Bounds {
        // There's no concept of scrolling if not created...
        let cw = this.isCreated() ? this.eclient.scrollWidth : this._bounds.width;
        let ch = this.isCreated() ? this.eclient.scrollHeight : this._bounds.height;
        if (this.e === this.eclient) {
            let c = this.getPadding();
            return new util.Bounds(0, 0, cw - (c.left + c.right), ch - (c.top + c.bottom));
        }
        return new util.Bounds(0, 0, cw, ch);
    }

    getParent(): Surface | null {
        return this._parent;
    }

    private _removeFromParent(): void {
        if (this._parent) {
            this._parent.eclient.removeChild(this.e);
        }
        this._parent = null;
    }

    private _applyPadding(): void {
        let e = this.e;
        if (e !== this.eclient) {
            // Offset my client element...
            let bounds = this.getBounds();
            let styles = getAllCSS(this.e);
            let eclient = this.eclient;
            let cpad = this.getPadding();
            eclient.style.left = _topx(cpad.left - _frompx(styles.borderLeftWidth));
            eclient.style.top = _topx(cpad.top - _frompx(styles.borderTopWidth));
            eclient.style.width = _topx(bounds.width - cpad.left - cpad.right);
            eclient.style.height = _topx(bounds.height - cpad.top - cpad.bottom);
            e.style.left = _topx(bounds.x);
            e.style.top = _topx(bounds.y);
        }
    }

    private _applyBounds(p: Surface | null): void {
        // Set the real position in the browser based on the parent's client area.
        this._applyPadding(); // In case height/width changed.
        if (!p)
            return;
        let bounds = this.getBounds();
        let e = this.e;
        if (p.e === p.eclient) {
            let pcpad = p.getPadding();
            let pstyles = getAllCSS(p.e);
            let offsetX = pcpad.left - _frompx(pstyles.borderLeftWidth);
            let offsetY = pcpad.top - _frompx(pstyles.borderTopWidth);
            e.style.left = _topx(offsetX + bounds.x);
            e.style.top = _topx(offsetY + bounds.y);
        } else {
            e.style.left = _topx(bounds.x);
            e.style.top = _topx(bounds.y);
        }
        e.style.width = _topx(bounds.width);
        e.style.height = _topx(bounds.height);
    }

    private _addToParent(p: Surface): void {
        this._applyBounds(p);
        // insertChild could have already inserted it, so check.
        if (this.e.parentElement !== p.eclient)
            p.eclient.appendChild(this.e);
        this._parent = p;
    }

    setParent(p: base.ISurface | null): void {
        if (p == this._parent)
            return;
        //let oldParent = this._parent;
        if (p == null) {
            this._removeFromParent();
            //this.onParentChanged(oldParent);
        } else if (p instanceof Surface) {
            if (this._disp !== p.getDisplay())
                throw new base.DisplayError("Wrong display");
            if (p === this)
                throw new base.DisplayError("Invalid parent");
            if (this._parent) {
                this._removeFromParent();
            }
            this._addToParent(p);
            if (!this.isCreated())
                this.create();
            //this.onParentChanged(oldParent);
        } else {
            throw new base.DisplayError("Parent must be a Surface");
        }
    }

    private static _frome(e: Element, disp: base.IDisplay): base.ISurface | undefined {
        let eid = e.getAttribute("data-surface");
        if (eid) {
            let did = disp.getName();
            if (eid.substr(0, did.length) == did && eid.charAt(did.length) == '-') {
                var surface_id = parseInt(eid.substr(did.length + 1), 10);
                return disp.surfaces.get(surface_id);
            }
        }
        return undefined;
    }

    static fromElement(e: Element, disp: base.IDisplay): base.ISurface | undefined {
        for (let ex: Element | null = e; ex; ex = ex.parentElement) {
            let sf = Surface._frome(ex, disp);
            if (sf)
                return sf;
        }
        return undefined;
    }

    static getElement(sf: Surface): HTMLElement {
        return sf.e;
    }

    static getClientElement(sf: Surface): HTMLElement {
        return sf.eclient;
    }

    nextSibling(): base.ISurface | null {
        for (let e = this.e.nextElementSibling as HTMLElement; e;) {
            let sf = Surface._frome(e, this._disp);
            if (sf)
                return sf;
            // Keep looking for a sibling surface...
            e = e.nextElementSibling as HTMLElement
        }
        return null;
    }

    previousSibling(): base.ISurface | null {
        for (let e = this.e.previousElementSibling as HTMLElement; e;) {
            let sf = Surface._frome(e, this._disp);
            if (sf)
                return sf;
            // Keep looking for a sibling surface...
            e = e.previousElementSibling as HTMLElement
        }
        return null;
    }

    firstChild(): base.ISurface | null {
        for (let e = this.eclient.firstElementChild as HTMLElement; e;) {
            let sf = Surface._frome(e, this._disp);
            if (sf)
                return sf;
            // If the first child isn't a surface, check its siblings...
            e = e.nextElementSibling as HTMLElement;
        }
        return null;
    }

    lastChild(): base.ISurface | null {
        for (let e = this.eclient.lastElementChild as HTMLElement; e;) {
            let sf = Surface._frome(e, this._disp);
            if (sf)
                return sf;
            // If the last child isn't a surface, check its siblings...
            e = e.previousElementSibling as HTMLElement;
        }
        return null;
    }

    // Map the point to the specified ancestor, or to this surface's root desktop if null or undefined.
    // Throws an exception if the surface is not: an ancestor, itself, null or undefined.
    mapPoint(pt: util.IPoint, toAncestor: Surface | null | undefined): util.Point {
        let x = pt.x, y = pt.y;
        for (let sf: Surface | null = this; ; sf = sf.getParent()) {
            if (sf == toAncestor) // Also if null==undefined.
                break;
            if (!sf)
                throw new base.DisplayError("Not an ancestor");
            let b = sf.getBounds();
            let p = sf.getPadding();
            let styles = getAllCSS(sf.e);
            x += b.x + p.left + _frompx(styles.borderLeftWidth);
            y += b.y + p.top + _frompx(styles.borderTopWidth);
        }
        return new util.Point(x, y);
    }

    getDisplay(): base.IDisplay {
        return this._disp;
    }

    getText(): string {
        return this.e.getAttribute("data-text") || "";
    }

    setText(text: string): void {
        this.e.setAttribute("data-text", text || "");
    }

    toString(): string {
        return this.getText();
    }

    // Not all surface classes support being recreated, and not all properties might be preserved.
    // This is not a general-purpose feature, it's meant to facilitate recreating when it is necessary.
    protected recreate(e: HTMLElement, eclient: HTMLElement): void {
        if (this._state == 2)
            throw new base.DisplayError("Surface was destroyed");
        let text = this.getText();
        let f = this.hasFocus();
        let cnext = this.nextSibling();
        // Move child surfaces only, not other elements:
        let sfprev: base.ISurface | null = null;
        for (let sf = this.firstChild(); sf; sf = sf.nextSibling()) {
            if (sfprev && sfprev instanceof Surface)
                eclient.appendChild(sfprev.e);
            sfprev = sf;
        }
        if (sfprev && sfprev instanceof Surface)
            eclient.appendChild(sfprev.e);
        e.className = this.e.className;
        e.setAttribute("data-surface", this.e.getAttribute("data-surface") || "");
        if (this._parent) {
            this._parent.eclient.removeChild(this.e);
            this._parent.eclient.insertBefore(e, cnext instanceof Surface ? cnext.e : null);
        }
        this.e = e;
        this.eclient = eclient;
        this._sfcreate();
        this._applyBounds(this._parent);
        this.setText(text);
        if (f)
            this.focus();
    }

    // Note: a destroyed surface is removed from its siblings and its parent's children,
    // but getParent continues to return the same parent.
    destroy(): void {
        if (this._state == 2)
            return;
        // Destroy previous child so we can iterate siblings properly.
        let sfprev: base.ISurface | null = null;
        for (let sf = this.firstChild(); sf; sf = sf.nextSibling()) {
            if (sfprev)
                sfprev.destroy();
            sfprev = sf;
        }
        if (sfprev)
            sfprev.destroy();
        if (this._parent)
            this._parent.eclient.removeChild(this.e);
        this._disp.surfaces.remove(this._id);
        this._state = 2;
    }

    getVisible(): boolean {
        //return !this.e.matches(".hidden");
        return !this.e.matches(".hidden, .ns.hidden .ns");
    }

    setVisible(x: boolean): void {
        if (x)
            this.removeClassCSS("hidden");
        else
            this.addClassCSS("hidden");
    }

    getEnabled(): boolean {
        //return !this.e.matches(".disabled");
        return !this.e.matches(".disabled, .ns.disabled .ns");
    }

    setEnabled(x: boolean): void {
        if (x)
            this.removeClassCSS("disabled");
        else
            this.addClassCSS("disabled");
    }

    focus(): void {
        if (!this.canFocus())
            return;
        let pwsf = Surface.findParentWindow(this);
        let wsf = (this.getStyle() & base.StyleFlags.Window) ? (this as any as base.IWindow) : undefined;
        if ((!pwsf && wsf && wsf.isActive()) || (pwsf && pwsf.isActive())) {
            //console.log("set focus", this.getID(), this.toString());
            this.eclient.focus();
        } else {
            console.log("not focusing", this.getID(), "in inactive window");
        }
    }

    canFocus(): boolean {
        return this.isCreated() && this.getEnabled() && this.getVisible();
    }

    hasFocus(): boolean {
        return this.eclient == document.activeElement;
    }

    // Get the surface's parent window.
    // If the surface is a window, it returns undefined unless it is nested in another window.
    static findParentWindow(sf: base.ISurface): base.IWindow | undefined {
        for (let x = sf.getParent(); x; x = x.getParent()) {
            if (x.getStyle() & base.StyleFlags.Window)
                return x as base.IWindow;
        }
        return undefined;
    }

    canSelect(): boolean {
        return (this.getStyle() & base.StyleFlags.Selectable) != 0 && this.canFocus();
    }

    getStyle(): base.StyleFlags {
        return this.style;
    }

    // before can be null to insert at the end.
    insertChild(child: Surface, before: Surface | null): void {
        if (before)
            this.eclient.insertBefore(child.e, before.e);
        else
            this.eclient.appendChild(child.e);
        if (child._parent !== this) {
            try {
                child.setParent(this);
            } finally {
                // If it didn't get set, remove it.
                if (child._parent !== this)
                    this.eclient.removeChild(child.e);
            }
            // If it didn't get set and we're here, complain.
            if (child._parent !== this)
                throw new base.DisplayError("Unable to insert surface");
        }
    }

    bringToFront(): void {
        if (this._parent && this !== this._parent.lastChild()) {
            // Note: this can cause focus to change, so do extra things.
            let f = document.activeElement;
            this._parent.insertChild(this, null);
            if (f instanceof HTMLElement)
                f.focus();
        }
    }

    isInputKey(key: base.IKey): boolean {
        if (key.keyCode == 9)
            return false;
        if (key.keyCode == 13)
            return false;
        if (key.keyCode == 27)
            return false; // Esc.
        if (key.keyCode == 37 || key.keyCode == 38 || key.keyCode == 39 || key.keyCode == 40)
            return false; // Arrows.
        return true;
    }

    onClick(ev: SurfaceMouseEvent): void {
        //console.log("surfacePoint", this, ev.surfacePoint, ev);
    }
    onMouseDown(ev: SurfaceMouseEvent): void { }
    onMouseUp(ev: SurfaceMouseEvent): void { }
    onContextMenu(ev: SurfaceMouseEvent): void {
        ev.preventDefault();
    }
    onGotFocus(ev: FocusEvent): void { }
    onLostFocus(ev: FocusEvent): void { }
    onKeyDown(ev: KeyboardEvent): void { }
    onKeyUp(ev: KeyboardEvent): void { }

    private _toSME(ev: MouseEvent): SurfaceMouseEvent {
        let aev = ev as any;
        let eb = this.eclient.getBoundingClientRect();
        aev.surfacePoint = new util.Point(
            ev.pageX - eb.left - window.scrollX, ev.pageY - eb.top - window.scrollY
        );
        return aev;
    }

}