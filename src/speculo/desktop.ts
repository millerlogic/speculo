// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as surface from "./surface";
import * as display from "./display";
import * as workspace from "./workspace";
import * as win from "./window";
import * as menu from "./menu";
import * as util from "./util";


export class Desktop extends workspace.Workspace implements base.IDesktop {
    static SurfaceClassName = "Desktop";

    constructor(disp: base.IDisplay, surface_id: number, e?: HTMLElement | string) {
        super(disp, surface_id, (typeof e === "string" || e instanceof String) ? Desktop._find(e.toString()) : e);
        this.style |= base.StyleFlags.Desktop;
        this.eclient.tabIndex = 0; // Allow focus, let the user click the desktop.
        surface.addClassCSS(this.e, "nosel");
    }

    firstWindow(): win.Window | null {
        for (let sf = this.firstChild(); sf; sf = sf.nextSibling()) {
            if (sf instanceof win.Window)
                return sf;
        }
        return null;
    }

    lastWindow(): win.Window | null {
        for (let sf = this.lastChild(); sf; sf = sf.previousSibling()) {
            if (sf instanceof win.Window)
                return sf;
        }
        return null;
    }

    protected switcherPreview(w: win.Window, on: boolean): void { }

    protected setupSwitcher(): void {
        let sfnext: win.Window | null = null;
        let sfcur: win.Window | null = null;
        this.e.addEventListener("keydown", (ev: KeyboardEvent) => {
            //console.log("keydown", ev);
            if (ev.keyCode == 192 && ev.altKey) {
                // Alt+tilde to switch windows.
                if (sfcur)
                    this.switcherPreview(sfcur, false);
                sfcur = null;
                if (sfnext) {
                    sfcur = sfnext;
                } else {
                    let w1 = this.lastWindow();
                    if (w1)
                        sfcur = w1.previousWindow();
                }
                if (sfcur) {
                    sfnext = sfcur.previousWindow() || this.lastWindow();
                    this.switcherPreview(sfcur, true);
                }
                ev.preventDefault();
            }
        });
        this.e.addEventListener("keyup", (ev: KeyboardEvent) => {
            if (ev.keyCode == 18) { // Alt key up.
                if (sfcur) {
                    let w = sfcur;
                    setTimeout(() => {
                        // Use slight delay so activation isn't interrupted by the key event.
                        try {
                            if (w.getWindowState() == base.WindowState.Minimized)
                                w.setWindowState(base.WindowState.Normal);
                            w.activate();
                        } finally {
                            // Doing this last looks cleaner.
                            this.switcherPreview(w, false);
                        }
                    });
                }
                sfcur = null;
                sfnext = null;
            }
        });
    }

    protected setup(): void {
        super.setup();
        this.e.addEventListener("mousedown", (ev) => {
            if (menu.anyMenusOpen()) {
                let disp = this.getDisplay();
                if (disp instanceof display.Display) {
                    if (ev.target instanceof HTMLElement && !menu.isMenu(ev.target))
                        menu.dismissAll(disp);
                }
            }
        });
        /*this.e.addEventListener("drop", (ev) => {
            ev.preventDefault();
        });
        this.e.addEventListener("dragover", (ev) => {
            ev.preventDefault();
        });*/
        this.setupSwitcher();
    }

    setPadding(m: util.Padding): void {
        // Silently ignore setting padding, it messes with positioning.
        // A working area should use a concept of screens.
    }

    private static _find(sel: string): HTMLElement {
        let e = document.querySelector(sel);
        if (!(e instanceof HTMLElement))
            throw new base.DisplayError("Desktop not found");
        return e;
    }

}
