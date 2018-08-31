// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as util from "./util";
import * as base from "./base";
import * as surface from "./surface";


export class EventDispatcher {
    _disp: base.IDisplay | null = null
    _desk: surface.Surface | null = null
    _evhdlrs: { [k: string]: any } = []
    _szevh: any

    // Events are setup when this function returns.
    start(disp: base.IDisplay): void {
        if (this._disp)
            throw new base.DisplayError("Already dispatching events");
        if (!disp)
            return;
        let desk = disp.getDesktop();
        if (!desk)
            throw new base.DisplayError("Desktop not found");
        if (!(desk instanceof surface.Surface))
            throw new base.DisplayError("Invalid desktop surface");
        this._desk = desk;
        this._disp = disp;
        try {
            this._edsetup();
        } catch (e) {
            this.stop();
            throw e;
        }
    }

    stop(): void {
        if (!this._desk)
            return;
        let desk = this._desk;
        let deske = surface.Surface.getElement(desk);
        let evhdlrs = this._evhdlrs;
        for (var k in evhdlrs) {
            if (evhdlrs.hasOwnProperty(k)) {
                deske.removeEventListener(k, evhdlrs[k]);
            }
        }
        this._evhdlrs = [];
        if (this._szevh) {
            window.removeEventListener("resize", this._szevh);
            this._szevh = undefined;
        }
        this._disp = null;
        this._desk = null;
    }

    private _edsetup(): void {
        if (!this._desk || !this._disp)
            throw new base.DisplayError("Cannot dispatch events");
        // https://developer.mozilla.org/en-US/docs/Web/Events
        let disp = this._disp;
        let desk = this._desk;
        let deske = surface.Surface.getElement(desk);
        // The root desktop dimensions might change with the browser window.
        // TODO: consider ResizeObserver.
        this._szevh = () => {
            var styles = surface.getAllCSS(deske);
            let newb = new util.Bounds(
                parseFloat(styles.left || "0"),
                parseFloat(styles.top || "0"),
                parseFloat(styles.width || "0"),
                parseFloat(styles.height || "0")
            );
            if (!desk.getBounds().equals(newb))
                desk.setBounds(newb);
        };
        window.addEventListener("resize", this._szevh);
        this._szevh(); // Initial size info.
        let sfev = (ev: Event): surface.Surface | null => {
            let sf = surface.Surface.fromElement(ev.target as Element, disp);
            if (sf instanceof surface.Surface) {
                if (!sf.getEnabled() || sf.getDesignMode()) {
                    ev.preventDefault();
                    return null;
                }
                return sf;
            }
            return null;
        };
        let deskev = <K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any) => {
            deske.addEventListener(type, listener);
            this._evhdlrs[type] = listener;
        };
        deskev("click", (ev) => {
            let sf = sfev(ev);
            if (sf)
                sf['onClick'](sf['_toSPE'](ev));
        });
        deskev("mousedown", (ev) => {
            let sf = sfev(ev);
            if (sf)
                sf['onPointerDown'](sf['_toSPE'](ev));
        });
        deskev("mouseup", (ev) => {
            let sf = sfev(ev);
            if (sf)
                sf['onPointerUp'](sf['_toSPE'](ev));
        });
        /*
        deskev("touchstart", (ev) => {
            //ev.preventDefault();
            let sf = sfev(ev);
            if (sf)
                sf['onPointerDown'](sf['_toSPE'](ev));
        });
        deskev("touchend", (ev) => {
            //ev.preventDefault(); // blocks click...
            let sf = sfev(ev);
            if (sf)
                sf['onPointerUp'](sf['_toSPE'](ev));
        });
        */
        deskev("contextmenu", (ev) => {
            let sf = sfev(ev);
            if (sf)
                sf['onContextMenu'](sf['_toSPE'](ev));
        });
        // https://github.com/Microsoft/TypeScript/issues/21822
        deskev("focusin" as any, (ev) => {
            let sf = sfev(ev);
            if (sf)
                sf['onGotFocus'](ev as FocusEvent);
        });
        deskev("focusout" as any, (ev) => {
            let sf = sfev(ev);
            if (sf)
                sf['onLostFocus'](ev as FocusEvent);
        });
        deskev("keydown", (ev) => {
            let sf = sfev(ev);
            if (sf)
                sf['onKeyDown'](ev);
        });
        deskev("keyup", (ev) => {
            let sf = sfev(ev);
            if (sf)
                sf['onKeyUp'](ev);
        });
    }

}
