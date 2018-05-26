// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as surface from "./surface";
import * as util from "./util";


export class Label extends surface.Surface {
    static SurfaceClassName = "Label";
    private etext: HTMLElement

    constructor(disp: base.IDisplay, surface_id: number, e?: HTMLElement) {
        super(disp, surface_id, e ? e : document.createElement("label"));
        this.etext = document.createElement("span");
        surface.addClassCSS(this.etext, "text");
        this.e.appendChild(this.etext);
    }

    getText(): string {
        return this.etext.innerText;
    }

    setText(text: string): void {
        this.etext.innerText = text;
    }

    setEllipsis(x: boolean): void {
        if (x) {
            surface.addClassCSS(this.etext, "ellipsis");
        } else {
            surface.removeClassCSS(this.etext, "ellipsis");
        }
    }

    getEllipsis(): boolean {
        return this.etext.matches(".ellipsis");
    }

    setAlign(a: util.Align): void {
        var x = "";
        if (a == util.Align.End)
            x = "right";
        else if (a == util.Align.Center)
            x = "center";
        surface.setCSS(this.etext, "text-align", x);
    }

    getAlign(): util.Align {
        let x = surface.getCSS(this.etext, "text-align");
        if (x == "right")
            return util.Align.End;
        if (x == "center")
            return util.Align.Center
        return util.Align.Start;
    }

    setVAlign(a: util.Align): void {
        var x = "";
        if (a == util.Align.End)
            x = "bottom";
        else if (a == util.Align.Center)
            x = "middle";
        surface.setCSS(this.etext, "vertical-align", x);
    }

    getVAlign(): util.Align {
        let x = surface.getCSS(this.etext, "vertical-align");
        if (x == "bottom")
            return util.Align.End;
        if (x == "middle")
            return util.Align.Center
        return util.Align.Start;
    }

}


export class Link extends Label implements util.IAction {
    static SurfaceClassName = "Link";

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id, document.createElement("a"));
        this.style |= base.StyleFlags.Selectable;
        this.addClassCSS("autovisit");
        this.e.setAttribute("target", "_blank");
        this.setURI("##"); // Unique URL, don't show as visited.
    }

    getURI(): string {
        let href = this.e.getAttribute("href") || "";
        return href == "##" ? "" : href;
    }

    setURI(uri: string): void {
        this.e.setAttribute("href", uri || "##");
    }

    getVisited(): boolean {
        return this.e.matches(".visited, .autovisit:visited");
    }

    // null for default.
    setVisited(x: boolean | null): void {
        if (x === null) {
            this.removeClassCSS("visited");
            this.removeClassCSS("notvisited");
            this.addClassCSS("autovisit");
        } else if (x) {
            this.addClassCSS("visited");
            this.removeClassCSS("notvisited");
            this.removeClassCSS("autovisit");
        }
        else {
            this.addClassCSS("notvisited");
            this.removeClassCSS("visited");
            this.removeClassCSS("autovisit");
        }
    }

    performAction(sender: any): void {
        let uri = this.getURI();
        if (uri != "#" && uri != "##") {
            //this.e.click();
            let e = this.e.cloneNode(false) as HTMLElement;
            e.click();
        }
    }

    onClick(ev: surface.SurfaceMouseEvent): void {
        ev.preventDefault(); // Don't follow the link.
        this.performAction(this);
    }

    isInputKey(key: base.IKey): boolean {
        if (key.keyCode == 13 || key.keyCode == 32)
            return true; // I want enter and space.
        return super.isInputKey(key);
    }

    onKeyDown(ev: KeyboardEvent): void {
        if (ev.keyCode == 13 || ev.keyCode == 32) {
            ev.preventDefault();
            this.performAction(this);
        }
    }

}
