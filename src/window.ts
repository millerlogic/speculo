// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as surface from './surface';
import * as display from './display';
import * as workspace from './workspace';
import * as util from "./util";
import * as base from "./base";
import * as drawing from "./drawing";


export enum WindowStyleFlags {
    CloseButton = 0x1,
    MinButton = 0x2,
    MaxButton = 0x4,
    Resizable = 0x8,
    ResizeGrip = 0x10,

    // These are other changes for WindowStyle.onWindowStyleChanged,
    // do not set these as style flags:
    BorderWidth = 0x10000,
    CaptionHeight = 0x20000,
    WindowText = 0x40000,
    WindowBounds = 0x80000,
    WindowState = 0x100000,
    ContainerResized = 0x200000,
    WindowCreate = 0x400000,
    WindowDestroy = 0x800000
}


export interface IWindowStyle {
    getBorderWidth(): number
    getCaptionHeight(): number
    getWindowStyleFlags(): WindowStyleFlags
    sizeFromClient(csz: util.Size, w: base.IWindow): util.Size
}


// Note: a WindowStyle is reusable, so it shouldn't have any surface-specific state.
export class WindowStyle implements IWindowStyle {
    private minw: number
    private minh: number

    constructor(private borderWidth: number,
        private captionHeight: number,
        private windowStyleFlags: WindowStyleFlags) {

        this.minw = (captionHeight ? 174 : 0) + borderWidth * 2;
        this.minh = captionHeight + borderWidth * 2;
    }

    getBorderWidth(): number {
        return this.borderWidth;
    }

    getCaptionHeight(): number {
        return this.captionHeight;
    }

    getWindowStyleFlags(): WindowStyleFlags {
        return this.windowStyleFlags;
    }

    // Calculate window size from the provided client dimensions.
    sizeFromClient(csz: util.Size, w: base.IWindow): util.Size {
        if (!this.borderWidth && !this.captionHeight)
            return csz;
        return new util.Size(
            csz.width + this.borderWidth * 2,
            csz.height + this.borderWidth * 2 + this.captionHeight
        );
    }

    protected getCaption(sf: base.IWindow): HTMLElement | null {
        return sf instanceof Window ? Window.getCaption(sf) : null;
    }

    protected getMinimizedBounds(sf: base.IWindow): util.Bounds {
        return new util.Bounds(0, 0, this.minw, this.minh);
    }

    protected getMaximizedBounds(sf: base.IWindow): util.Bounds {
        let sfp = sf.getParent();
        if (sfp) {
            let bw = this.getBorderWidth();
            return util.getClientBounds(sfp).add(-bw, -bw, bw * 2, bw * 2);
        }
        return sf.getBounds();
    }

    private _chgd(sf: base.IWindow, which: WindowStyleFlags, creating: boolean): void {
        let caption = this.getCaption(sf);
        if (!caption)
            return;
        let etext = caption.querySelector(".text") as HTMLElement | null;
        if ((which & WindowStyleFlags.WindowText) && etext) {
            etext.innerText = sf.getText();
        }
        if (which & WindowStyleFlags.WindowBounds) {
            let b = sf.getBounds();
            let cm = sf.getPadding();
            let carea = util.getClientBounds(sf);
            caption.style.top = "" + this.borderWidth + "px";
            caption.style.left = "" + this.borderWidth + "px";
            caption.style.width = "" + (b.width - this.borderWidth * 2) + "px";
            // buttons:
            let ebtns = caption.querySelectorAll(".btn");
            let r = 4;
            for (let i = ebtns.length - 1; i >= 0; i--) {
                var e = ebtns[i] as HTMLElement;
                e.style.right = "" + r + "px";
                e.style.width = "16px";
                r += 16 + 10;
            }
            if (etext) {
                etext.style.width = "" + (carea.width - r) + "px";
            }
        }
        if (which & (WindowStyleFlags.WindowState | WindowStyleFlags.ContainerResized | WindowStyleFlags.WindowCreate)) {
            let state = sf.getWindowState();
            if (state == base.WindowState.Minimized) {
                sf.setBounds(this.getMinimizedBounds(sf));
            } else if (state == base.WindowState.Maximized) {
                sf.setBounds(this.getMaximizedBounds(sf));
            }
        }
    }

    // Return a caption, or null.
    init(sf: base.IWindow): HTMLElement | null {
        const rgrip = WindowStyleFlags.Resizable | WindowStyleFlags.ResizeGrip;
        if ((this.windowStyleFlags & rgrip) == rgrip) {
            if (sf instanceof surface.Surface)
                surface.addClassCSS(surface.Surface.getElement(sf), "resize-grip");
        }
        if (!this.captionHeight)
            return null;
        let caption = document.createElement("div");
        surface.addClassCSS(caption, "dragable");
        let etext = document.createElement("label");
        surface.addClassCSS(etext, "text");
        caption.appendChild(etext);
        if (this.windowStyleFlags & WindowStyleFlags.MinButton) {
            let ebtn = document.createElement("span");
            ebtn.setAttribute("title", "Minimize");
            surface.addClassCSS(ebtn, "btn");
            surface.addClassCSS(ebtn, "min");
            surface.addClassCSS(ebtn, "icon-minus");
            caption.appendChild(ebtn);
            ebtn.onclick = function (ev) {
                ev.stopPropagation();
                if (!sf.getEnabled() || sf.getDesignMode())
                    return;
                if (sf.getWindowState() == base.WindowState.Minimized) {
                    //sf.setWindowState(base.WindowState.Normal);
                    sf.restore();
                    sf.activate();
                } else {
                    sf.setWindowState(base.WindowState.Minimized);
                    sf.deactivate();
                }
            }
            ebtn.onmousedown = function (ev) {
                ev.stopPropagation();
            }
        }
        if (this.windowStyleFlags & WindowStyleFlags.MaxButton) {
            let ebtn = document.createElement("span");
            ebtn.setAttribute("title", "Maximize");
            surface.addClassCSS(ebtn, "btn");
            surface.addClassCSS(ebtn, "max");
            surface.addClassCSS(ebtn, "icon-maximize");
            caption.appendChild(ebtn);
            ebtn.onclick = function (ev) {
                ev.stopPropagation();
                if (!sf.getEnabled() || sf.getDesignMode())
                    return;
                if (sf.getWindowState() == base.WindowState.Maximized) {
                    sf.setWindowState(base.WindowState.Normal);
                    sf.activate();
                } else {
                    sf.setWindowState(base.WindowState.Maximized);
                    sf.activate();
                }
            }
            ebtn.onmousedown = function (ev) {
                ev.stopPropagation();
            }
        }
        if (this.windowStyleFlags & WindowStyleFlags.CloseButton) {
            let ebtn = document.createElement("span");
            ebtn.setAttribute("title", "Close");
            surface.addClassCSS(ebtn, "btn");
            surface.addClassCSS(ebtn, "close");
            surface.addClassCSS(ebtn, "icon-x");
            caption.appendChild(ebtn);
            ebtn.onclick = function (ev) {
                ev.stopPropagation();
                if (!sf.getEnabled() || sf.getDesignMode())
                    return;
                sf.close();
            }
            ebtn.onmousedown = function (ev) {
                ev.stopPropagation();
            }
        }
        this._chgd(sf, ~0, true);
        return caption;
    }

    onWindowStyleChanging(sf: base.IWindow, which: WindowStyleFlags, value: any): any {
        if (which & WindowStyleFlags.WindowBounds) {
            // Min size:
            let b = value as util.Bounds;
            if (b.width < this.minw || b.height < this.minh) {
                return new util.Bounds(b.x, b.y,
                    b.width < this.minw ? this.minw : b.width,
                    b.height < this.minh ? this.minh : b.height);
            }
        }
        return value;
    }

    onWindowStyleChanged(sf: base.IWindow, which: WindowStyleFlags): void {
        this._chgd(sf, which, false);
    }
}

export const plainWindow: WindowStyle = new WindowStyle(0, 0, 0);


const _windefcxl = new class implements util.IAction {
    performAction(sender: any): void {
        if (sender instanceof Window && (sender.getWindowStyle().getWindowStyleFlags() & WindowStyleFlags.CloseButton))
            sender.close();
    }
}

export class Window extends workspace.Workspace implements base.IWindow {
    static SurfaceClassName = "Window";
    private winstyle: WindowStyle
    private _rbounds: util.Bounds | null = null
    private caption: HTMLElement | null
    private _defact: util.IAction | null = null;
    private _cxlact: util.IAction | null = _windefcxl;

    constructor(disp: base.IDisplay, surface_id: number, winstyle: WindowStyle = plainWindow) {
        super(disp, surface_id);
        this.style |= base.StyleFlags.Window;
        this.eclient.tabIndex = 0; // Allow focus, important with activation.
        winstyle.init(this);
        this.winstyle = winstyle;
        this.caption = winstyle.init(this);
        if (this.caption) {
            surface.addClassCSS(this.caption, "ns");
            surface.addClassCSS(this.caption, "caption");
            this.e.appendChild(this.caption);
        }
        this._winBorderChanged();
    }

    getNormalBounds(): util.Bounds {
        if (this._rbounds)
            return this._rbounds;
        return super.getBounds();
    }

    getRestoredState(): base.WindowState {
        let st = this.getWindowState();
        if (st == base.WindowState.Minimized && this.matches(".was-maximized"))
            return base.WindowState.Maximized;
        return base.WindowState.Normal;
    }

    // Restores the window (to the last known state) if it is minimized or maximized. Does not activate.
    restore(): void {
        this.setWindowState(this.getRestoredState());
    }

    static getCaption(w: Window): HTMLElement | null {
        return w.caption;
    }

    getBackColor(): drawing.Color {
        return drawing.parseColorCSS(window.getComputedStyle(this.eclient).backgroundColor || "");
    }

    // NaN for default.
    setBackColor(c: drawing.Color): void {
        // Remove alpha channel, it doesn't make sense for a window background.
        c = drawing.newColor(drawing.getRed(c), drawing.getGreen(c), drawing.getBlue(c));
        surface.setCSS(this.eclient, "backgroundColor", isNaN(c) ? "" : drawing.toColorString(c));
    }

    setText(text: string): void {
        text = this.winstyle.onWindowStyleChanging(this, WindowStyleFlags.WindowText, text);
        super.setText(text);
        this.winstyle.onWindowStyleChanged(this, WindowStyleFlags.WindowText);
    }

    setBounds(b: util.Bounds): void {
        b = this.winstyle.onWindowStyleChanging(this, WindowStyleFlags.WindowBounds, b);
        super.setBounds(b);
        this.winstyle.onWindowStyleChanged(this, WindowStyleFlags.WindowBounds);
    }

    private _winBorderChanged(): void {
        let borderw = this.winstyle.getBorderWidth();
        let captionh = this.winstyle.getCaptionHeight();
        let m = this.getPadding();
        let newm = m.add(borderw, borderw + captionh, borderw, borderw);
        super.setPadding(newm); // Super!
        ////Wthis.setCSS("border-width", "" + borderw + "px");
    }

    setPadding(m: util.Padding): void {
        // Don't do anything, it interferes with the window styles.
    }

    getWindowStyle(): IWindowStyle {
        return this.winstyle;
    }

    getWindowState(): base.WindowState {
        if (this.e.matches(".minimized"))
            return base.WindowState.Minimized;
        if (this.e.matches(".maximized"))
            return base.WindowState.Maximized;
        return base.WindowState.Normal;
    }

    // Does not activate.
    setWindowState(state: base.WindowState): void {
        let oldstate = this.getWindowState();
        if (oldstate == state)
            return;
        state = this.winstyle.onWindowStyleChanging(this, WindowStyleFlags.WindowState, state);
        if (oldstate == state)
            return;
        // Unset old:
        if (oldstate == base.WindowState.Minimized) {
            this.removeClassCSS("minimized");
            this.removeClassCSS("was-maximized");
        } else if (oldstate == base.WindowState.Maximized) {
            this.removeClassCSS("maximized");
        }
        // Set new:
        if (state == base.WindowState.Minimized) {
            if (!this._rbounds)
                this._rbounds = super.getBounds();
            this.addClassCSS("minimized");
            if (oldstate == base.WindowState.Maximized)
                this.addClassCSS("was-maximized");
        } else if (state == base.WindowState.Maximized) {
            if (!this._rbounds)
                this._rbounds = super.getBounds();
            this.addClassCSS("maximized");
        } else {
            let b = this._rbounds;
            this._rbounds = null;
            if (b)
                this.setBounds(b);
        }
        this.winstyle.onWindowStyleChanged(this, WindowStyleFlags.WindowState);
    }

    onContainerResized(area: util.Bounds): void {
        this.winstyle.onWindowStyleChanged(this, WindowStyleFlags.ContainerResized);
    }

    private static _windrag?: Window;
    private static _windragwhat = 0; // 0=no, 1=move, 2=resize.
    private static _windragbtn?= -1;
    private static _windragx = 0;
    private static _windragy = 0;
    private static _windragw = 0;
    private static _windragh = 0;

    private static _windragfn(ev: {
        pageX: number
        pageY: number
        preventDefault(): void
        stopPropagation(): void
    }): void {
        if (!Window._windrag)
            return;
        let b = Window._windrag.getBounds();
        let x = ev.pageX - b.x;
        let y = ev.pageY - b.y;
        let distx = x - Window._windragx;
        let disty = y - Window._windragy;
        if (Window._windragwhat == 1) { // Move:
            Window._windrag.setBounds(new util.Bounds(
                b.x + distx, b.y + disty, b.width, b.height));
        } else if (Window._windragwhat == 2) { // Resize:
            Window._windrag.setBounds(new util.Bounds(
                b.x, b.y, Window._windragw + distx, Window._windragh + disty));
        }
        ev.preventDefault();
        ev.stopPropagation();
    }

    private static _windragmm(ev: MouseEvent | TouchEvent): void {
        if (!Window._windrag || (ev as any).buttons === 0) {
            // ev.buttons isn't supported on Safari? so don't rely on it.
            window.removeEventListener("mousemove", Window._windragmm);
            window.removeEventListener("touchmove", Window._windragmm);
            Window._windrag = undefined;
            Window._windragbtn = -1;
            return;
        }
        Window._windragfn(Window._windrag['_toSPE'](ev));
    }

    private _windragstart(what: number, ev: surface.SurfacePointerEvent): void {
        //console.log("_windragstart", what, ev);
        let b = this.getBounds();
        Window._windragx = ev.pageX - b.x;
        Window._windragy = ev.pageY - b.y;
        Window._windragw = b.width;
        Window._windragh = b.height;
        Window._windragbtn = ev.button;
        Window._windragwhat = what;
        Window._windrag = this;
        window.addEventListener("mousemove", Window._windragmm);
        window.addEventListener("touchmove", Window._windragmm);
    }

    private _isOuterPoint(pt: util.IPoint): boolean {
        if (pt.x < 0 || pt.y < 0)
            return false;
        let b = this.getBounds();
        let cm = this.getPadding();
        if (pt.x > b.width - cm.left - cm.right)
            return false;
        if (pt.y > b.height - cm.top - cm.bottom)
            return false;
        return true;
    }

    onPointerDown(ev: surface.SurfacePointerEvent): void {
        if (!this._isOuterPoint(ev.surfacePoint)) {
            ev.stopPropagation();
            if (this.getWindowState() != base.WindowState.Normal)
                return;
            // Handle outer edge window clicks.
            if (!(this.winstyle.getWindowStyleFlags() & WindowStyleFlags.Resizable) || ev.surfacePoint.y < 0) {
                this._windragstart(1, ev); // Move the window.
            } else {
                // Resize the window.
                //console.log("RESIZE");
            }
            return;
        }
        const rgrip = WindowStyleFlags.Resizable | WindowStyleFlags.ResizeGrip;
        if ((this.winstyle.getWindowStyleFlags() & rgrip) == rgrip) {
            if (this.getWindowState() == base.WindowState.Normal) {
                let cb = util.getClientBounds(this);
                if (ev.surfacePoint.x >= cb.width - 16 && ev.surfacePoint.y >= cb.height - 16) {
                    this._windragstart(2, ev); // Resize.
                    return;
                }
            }
        }
        super.onPointerDown(ev);
    }

    onPointerUp(ev: surface.SurfacePointerEvent): void {
        if (Window._windrag && ev.button == Window._windragbtn) {
            Window._windrag = undefined;
            ev.stopPropagation();
            return;
        }
        super.onPointerUp(ev);
    }

    nextWindow(): Window | null {
        for (let sfs = this.nextSibling(); sfs; sfs = sfs.nextSibling()) {
            if (sfs instanceof Window) {
                return sfs;
            }
        }
        return null;
    }

    previousWindow(): Window | null {
        for (let sfs = this.previousSibling(); sfs; sfs = sfs.previousSibling()) {
            if (sfs instanceof Window) {
                return sfs;
            }
        }
        return null;
    }

    private _iswchild(sf: base.ISurface): boolean {
        return Window.findParentWindow(sf) === this;
    }

    private _sfsel: base.ISurface | null = null;

    // Returns null if there are no selectable children.
    // If the window isn't active, the return is the last known selected surface.
    getSelected(): base.ISurface | null {
        if (this._sfsel) {
            if (this._iswchild(this._sfsel))
                return this._sfsel;
            this._sfsel = null;
        }
        return this.getNextSelection(null, true, true);
    }

    setSelected(sf: base.ISurface): boolean {
        if (!this._iswchild(sf))
            return false;
        if (!(sf.getStyle() & base.StyleFlags.Selectable))
            return false;
        if (this.isActive() && !sf.hasFocus())
            sf.focus();
        //console.log("set selected", sf.getID(), sf.toString());
        this._sfsel = sf;
        return true;
    }

    private _looksel(sfp: base.ISurface, sfstop: base.ISurface | null, forward: boolean, autosel: any): base.ISurface | null {
        // Look in the children, stop at sfstop.
        for (let sf = forward ? sfp.firstChild() : sfp.lastChild(); sf; sf = forward ? sf.nextSibling() : sf.previousSibling()) {
            if (sf == sfstop)
                return null;
            let st = sf.getStyle();
            if (sf.canSelect() && (!autosel || (st & base.StyleFlags.AutoSelect)))
                return sf;
            if (st & base.StyleFlags.Container) {
                let nsel = this._looksel(sf, sfstop, forward, autosel);
                if (nsel)
                    return nsel;
            }
        }
        return null;
    }

    getNextSelection(start: base.ISurface | null, forward: boolean, autoSelectOnly?: boolean): base.ISurface | null {
        if (!start) // Find first/last:
            return this._looksel(this, null, forward, autoSelectOnly);
        // Check my siblings:
        for (let sf = forward ? start.nextSibling() : start.previousSibling(); sf; sf = forward ? sf.nextSibling() : sf.previousSibling()) {
            let st = sf.getStyle();
            if (sf.canSelect() && (!autoSelectOnly || (st & base.StyleFlags.AutoSelect)))
                return sf;
            if (st & base.StyleFlags.Container) {
                let nsel = this._looksel(sf, start, forward, autoSelectOnly);
                if (nsel)
                    return nsel;
            }
        }
        // Wrap around, look from the window:
        return this._looksel(this, start, forward, autoSelectOnly) || start;
    }

    getFont(): drawing.Font {
        return drawing.Font.fromElement(this.eclient);
    }

    // By default calls destroy, but you can override to change the behavior.
    // The close button in the caption calls this.
    close(): void {
        this.destroy();
    }

    destroy(): void {
        this.winstyle.onWindowStyleChanging(this, WindowStyleFlags.WindowDestroy, undefined);
        this.deactivate();
        if (this.isActive()) {
            this.onActivation(false, null, undefined);
            let dsk = this.getDisplay().getDesktop();
            if (dsk)
                dsk.focus();
        }
        super.destroy();
        this.winstyle.onWindowStyleChanged(this, WindowStyleFlags.WindowDestroy);
    }

    setDefaultAction(action: util.IAction | null): void {
        this._defact = action;
    }

    // The default cancel action calls close if the window style includes a close button. Can be set to null to do nothing.
    setCancelAction(action: util.IAction | null): void {
        this._cxlact = action;
    }

    private _wactive(thisActive: boolean, delayRaise?: boolean): void {
        let xlist = this._eowned();
        let fn = () => {
            for (let i = 0; i < xlist.length; i++) {
                let e = xlist[i];
                if (thisActive)
                    surface.addClassCSS(e, "owned-raise");
                else
                    surface.removeClassCSS(e, "owned-raise");
            }
        };
        if (delayRaise)
            setTimeout(fn, 111);
        else
            fn();
        if (thisActive)
            this.addClassCSS("active");
        else
            this.removeClassCSS("active");
    }

    // sf is the surface causing the activation or undefined.
    onActivation(thisActive: boolean, other: base.IWindow | null, sf: base.ISurface | undefined): void {
        if (thisActive) {
            //console.log("activate", this.getID(), this.toString());
            if (this.getDesignMode())
                this.focus();
            else
                (sf || this.getSelected() || this).focus();
        }
    }

    // Activate this window, which brings it to the top, and selects a surface if applicable.
    // sf is the surface which is causing the activation, or undefined if none.
    // Prefer to use setSelected() to select a specific discendent surface.
    activate(sf?: base.ISurface): void {
        if (this.getWindowState() == base.WindowState.Minimized) {
            return;
        }
        let donow = sf === this || !(sf && (sf.getStyle() & base.StyleFlags.Selectable));
        if (this.isActive()) {
            // Make sure it's in front,
            // a new non-activated window can incorrectly overlap otherwise.
            let parent = this.getParent();
            if (parent && this === parent.lastChild()) {
                if (sf)
                    this.setSelected(sf);
            } else if (!donow) {
                setTimeout(() => {
                    if (this.isActive()) {
                        this.bringToFront();
                        if (sf)
                            this.setSelected(sf);
                    }
                }, 111);
            } else {
                this.bringToFront();
                if (sf)
                    this.setSelected(sf);
            }
            return;
        }
        if (!this.canFocus())
            return;
        let oldact: base.IWindow | null = null;
        let inact = (sfs: Window) => {
            if (sfs.isActive()) {
                sfs._wactive(false, !donow);
                sfs.onActivation(false, this, sf);
                oldact = sfs;
            }
        };
        for (let sfs = this.previousWindow(); sfs; sfs = sfs.previousWindow()) {
            inact(sfs);
        }
        for (let sfs = this.nextWindow(); sfs; sfs = sfs.nextWindow()) {
            inact(sfs);
        }
        this._wactive(true);
        if (donow)
            this.bringToFront(); // Can interrupt click events.
        setTimeout(() => {
            // Give it a slight delay so you can finish setting up stuff.
            if (this.isActive()) { // Only if it's still active; stuff could have changed.
                if (!donow)
                    this.bringToFront();
                if (sf)
                    this.setSelected(sf);
                this.onActivation(true, oldact, undefined);
            }
        }, donow ? 0 : 111);
    }

    deactivate(): void {
        if (!this.isActive())
            return;
        let ow = this.getOwner();
        if (ow) {
            // Prefer owner.
            if (ow.canFocus()) {
                ow.activate();
                return;
            }
        }
        for (let xw = this.previousWindow(); xw; xw = xw.previousWindow()) {
            if (xw.canFocus()) {
                xw.activate();
                return;
            }
        }
        // Currently no such thing as deactivating the last window.
        // Consider deactivating the window, activate the desktop?
    }

    isActive(): boolean {
        return this.e.matches(".active");
    }

    getTopmost(): boolean {
        return this.e.matches(".topmost");
    }

    setTopmost(x: boolean): void {
        if (x)
            surface.addClassCSS(this.e, "topmost");
        else
            surface.removeClassCSS(this.e, "topmost");
    }

    setVisible(x: boolean): void {
        super.setVisible(x);
        let p = this.getParent();
        if (p) {
            if (this.getVisible()) {
                if (this === p.lastChild())
                    this.activate();
            } else {
                this.deactivate();
            }
        }
    }

    setEnabled(x: boolean): void {
        super.setEnabled(x);
        let p = this.getParent();
        if (p) {
            if (this.getEnabled()) {
                if (this === p.lastChild())
                    this.activate();
            } else {
                this.deactivate();
            }
        }
    }

    getOwner(): Window | null {
        let so = this.e.getAttribute("data-owner");
        if (so) {
            let ld = so.lastIndexOf('-');
            if (ld != -1) {
                let w = this.getDisplay().surfaces.get(parseInt(so.substring(ld + 1), 10));
                if (w instanceof Window)
                    return w;
            }
        }
        return null;
    }

    setOwner(w: base.IWindow | null): void {
        if (w) {
            if (this.getDisplay() !== w.getDisplay())
                throw new base.DisplayError("Wrong display");
            if (!(w instanceof Window))
                throw new base.DisplayError("Owner must be a Window");
            if (w === this)
                throw new base.DisplayError("Invalid owner");
        }
        let oldo = this.getOwner();
        if (oldo === w)
            return;
        if (oldo) {
            this.e.removeAttribute("data-owner");
            this.removeClassCSS("owned-" + this.getDisplay().getName() + "-" + oldo.getID());
            //this.removeClassCSS("owned");
        }
        surface.removeClassCSS(this.e, "owned-raise");
        if (w) {
            let so = this.getDisplay().getName() + "-" + w.getID();
            this.e.setAttribute("data-owner", so);
            this.addClassCSS("owned-" + so);
            //this.addClassCSS("owned");
            if (w.isActive()) // && w instanceof Window // already checked earlier.
                surface.addClassCSS(this.e, "owned-raise");
        }
    }

    private _eowned(): NodeListOf<Element> {
        return document.querySelectorAll(".ns-Window.owned-" + this.getDisplay().getName() + "-" + this.getID());
    }

    findOwned(): util.IList<Window> {
        let xlist = this._eowned();
        let disp = this.getDisplay();
        return new util.ToList<Element, Window>(xlist, function (x: Element): Window {
            return surface.Surface.fromElement(x, disp) as Window;
        });
    }

    setParent(p: base.ISurface | null): void {
        super.setParent(p);
        p = this.getParent();
        if (p && this.canFocus() && this.getWindowState() != base.WindowState.Minimized) {
            if (this === p.lastChild()) {
                //this.activate();
                // Let's slightly delay this in case different windows are flying up.
                setTimeout(() => {
                    if (p && this === p.lastChild()) // If still in the front...
                        this.activate();
                });
            }
        } else {
            // Fix the z-ordering.
            this.deactivate();
        }
    }

    private fiframe: HTMLIFrameElement | undefined // Focused iframe.

    create(): void {
        if (this.isCreated())
            return;
        this.winstyle.onWindowStyleChanging(this, WindowStyleFlags.WindowCreate, undefined);
        super.create();
        this.winstyle.onWindowStyleChanged(this, WindowStyleFlags.WindowCreate);
        // Events:
        this.e.addEventListener("mousedown", (ev: MouseEvent) => {
            let sf = surface.Surface.fromElement(ev.target as HTMLElement, this.getDisplay());
            this.activate(sf === this || !sf ? undefined : sf);
        });
        this.e.addEventListener("keydown", (ev: KeyboardEvent) => {
            if (!this.getEnabled() || this.getDesignMode()) {
                ev.preventDefault();
                return;
            }
            //let sf = this.getSelected();
            let sf = surface.Surface.fromElement(ev.target as HTMLElement, this.getDisplay()) || null;
            if (ev.keyCode == 9) {
                ev.preventDefault(); // Don't do browser tabbing.
                let sfnext = this.getNextSelection(sf, !ev.shiftKey);
                if (sfnext && (!sf || !sf.isInputKey(ev))) {
                    ev.stopPropagation();
                    this.setSelected(sfnext);
                }
            } else if (ev.keyCode == 37 || ev.keyCode == 38 || ev.keyCode == 39 || ev.keyCode == 40) {
                // Arrow keys.
                let sfnext = this.getNextSelection(sf, ev.keyCode == 39 || ev.keyCode == 40);
                if (sfnext && (!sf || !sf.isInputKey(ev))) {
                    ev.stopPropagation();
                    this.setSelected(sfnext);
                }
            } else if (ev.keyCode == 13) {
                if (this._defact && (!sf || !sf.isInputKey(ev))) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    this._defact.performAction(this);
                }
            } else if (ev.keyCode == 27) { // Esc
                if (this._cxlact && (!sf || !sf.isInputKey(ev))) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    this._cxlact.performAction(this);
                }
            }
        }, true); // useCapture=true
        this.e.addEventListener("focusin", (ev) => {
            if (this.fiframe) {
                // iframe blur...
                let sif = surface.Surface.fromElement(this.fiframe, this.getDisplay());
                //console.log("iframe blur", this.fiframe, sif);
                if (sif && (sif as any).onLostFocus)
                    (sif as any).onLostFocus(ev); // TODO: fix event?
                this.fiframe = undefined;
            }
            // Normal focus stuff:
            let sf = surface.Surface.fromElement(ev.target as HTMLElement, this.getDisplay());
            if (sf) {
                if (sf.getStyle() & base.StyleFlags.Selectable) {
                    //console.log("focusin select", sf.getID(), sf.toString());
                    this.setSelected(sf);
                }
            }
        });
        this.e.addEventListener("focusout", (ev) => {
            //console.log("focusout");
            setTimeout(() => {
                if (document.activeElement instanceof HTMLIFrameElement) {
                    // iframe focus...
                    this.fiframe = document.activeElement;
                    let sif = surface.Surface.fromElement(this.fiframe, this.getDisplay());
                    //console.log("iframe focus", this.fiframe, sif);
                    if (sif && (sif as any).onGotFocus)
                        (sif as any).onGotFocus(ev); // TODO: fix event?
                    if (sif) {
                        let w = Window.findParentWindow(sif);
                        if (w)
                            w.activate();
                        if (sif.getStyle() & base.StyleFlags.Selectable) {
                            //console.log("focusin select", sf.getID(), sf.toString());
                            this.setSelected(sif);
                        }
                    }
                }
            });
        });
    }

}