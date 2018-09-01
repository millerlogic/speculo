// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from "./util";
import * as surface from "./surface";
import * as scrollable from "./scrollable"


class _Input extends surface.Surface {

    constructor(disp: base.IDisplay, surface_id: number) {
        super(disp, surface_id, document.createElement("input"));
        this.style |= base.StyleFlags.Selectable | base.StyleFlags.AutoSelect;
    }

    getText(): string {
        return (this.e as any).value;
    }

    setText(text: string): void {
        let ml = this.getMaxLength();
        //if (ml != -1 && text.length > ml)
        //    text = text.substring(0, ml);
        (this.e as any).value = text;
    }

    // -1 if no limit.
    getMaxLength(): number {
        return (this.e as any).maxLength;
    }

    setMaxLength(n: number): void {
        if (n >= 0)
            (this.e as any).maxLength = n;
        else
            this.e.removeAttribute("maxLength");
    }

    getPlaceholder(): string {
        return this.e.getAttribute("placeholder") || "";
    }

    setPlaceholder(s: string): void {
        this.e.setAttribute("placeholder", s);
    }

    getReadonly(): boolean {
        return this.e.hasAttribute("readonly");
    }

    // Note: this may not work for some input types, such as color.
    setReadonly(x: boolean): void {
        if (x)
            this.e.setAttribute("readonly", "readonly");
        else
            this.e.removeAttribute("readonly");
    }

    isInputKey(key: base.IKey): boolean {
        if (key.keyCode == 37 || key.keyCode == 38 || key.keyCode == 39 || key.keyCode == 40)
            return true; // Arrows.
        return super.isInputKey(key);
    }

    onContextMenu(ev: surface.SurfacePointerEvent): void {
        // Allow.
    }

    onUserInput(ev: Event): void { }

    protected recreate(e: HTMLElement, eclient: HTMLElement): void {
        let maxlen = (this.e as any).maxLength;
        if (maxlen >= 0)
            (e as any).maxLength = maxlen;
        e.setAttribute("placeholder", this.e.getAttribute("placeholder") || "");
        if (this.getReadonly())
            e.setAttribute("readonly", "readonly");
        super.recreate(e, eclient);
    }

    create(): void {
        if (this.isCreated())
            return;
        super.create();
        this.e.setAttribute("autocomplete", "off");
        let gotinput = false;
        this.e.addEventListener("input", (ev) => {
            gotinput = true;
            this.onUserInput(ev);
        });
        this.e.addEventListener("change", (ev) => {
            if (!gotinput)
                this.onUserInput(ev);
        });
    }

}


export class TextBox extends _Input implements util.IScrollable {
    static SurfaceClassName = "TextBox";

    setMultiline(x: boolean) {
        if (x == this.getMultiline())
            return;
        var e = document.createElement(x ? "textarea" : "input");
        this.recreate(e, e);
    }

    getMultiline(): boolean {
        return this.matches("textarea");
    }

    protected recreate(e: HTMLElement, eclient: HTMLElement): void {
        if (!this.getWrap())
            e.setAttribute("wrap", "off");
        super.recreate(e, eclient);
    }

    create(): void {
        if (!this.isCreated()) {
            super.create();
            this.selectAll();
        }
    }

    selectAll(yes = true): void {
        if (yes) {
            this.setSelection(0, this.getText().length);
        } else {
            let x = this.getSelectionStart();
            this.setSelection(x, x);
        }
    }

    getSelectionStart(): number {
        return (this.e as any).selectionStart;
    }

    getSelectionEnd(): number {
        return (this.e as any).selectionEnd;
    }

    getSelectedText(): string {
        return this.getText().substring(
            this.getSelectionStart(),
            this.getSelectionEnd())
    }

    setSelection(start?: number, end?: number) {
        if (start !== undefined)
            (this.e as any).selectionStart = start;
        if (end !== undefined)
            (this.e as any).selectionEnd = end;
    }

    setSelectedText(s: string) {
        let start = this.getSelectionStart();
        let end = this.getSelectionEnd();
        let text = this.getText();
        let scrollX = this.e.scrollLeft;
        let scrollY = this.e.scrollTop;
        text = text.substring(0, start) + s + text.substring(end);
        this.setText(text);
        let newsel = start + s.length;
        this.setSelection(newsel, newsel);
        this.e.scrollLeft = scrollX;
        this.e.scrollTop = scrollY;
    }

    // Select end of input and insert text.
    appendText(s: string) {
        let n = this.getText().length;
        this.setSelection(n, n);
        this.setSelectedText(s);
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

    getWrap(): boolean {
        return this.e.getAttribute("wrap") != "off";
    }

    setWrap(x: boolean): void {
        if (x)
            this.e.removeAttribute("wrap");
        else
            this.e.setAttribute("wrap", "off");
    }

    isInputKey(key: base.IKey): boolean {
        if (key.keyCode == 9)
            return this.getWantTab();
        if (key.keyCode == 13 && this.getMultiline()) {
            return key.ctrlKey || this.getWantReturn();
        }
        return super.isInputKey(key);
    }

    getWantReturn(): boolean {
        return this.e.matches(".want-return");
    }

    setWantReturn(x: boolean): void {
        if (x)
            surface.addClassCSS(this.e, "want-return");
        else
            surface.removeClassCSS(this.e, "want-return");
    }

    getWantTab(): boolean {
        return this.e.matches(".want-tab");
    }

    setWantTab(x: boolean): void {
        if (x)
            surface.addClassCSS(this.e, "want-tab");
        else
            surface.removeClassCSS(this.e, "want-tab");
    }

    onKeyDown(ev: KeyboardEvent): void {
        if (ev.keyCode == 9) {
            ev.preventDefault();
            this.setSelectedText("\t");
        }
    }

}


// Known input types: "color" | "date" | "datetime-local" | "email" | "file" | "month" |
//    "number" | "password" | "search" | "tel" | "time" | "url" | "week";

export class InputBox extends _Input {
    static SurfaceClassName = "InputBox";

    constructor(disp: base.IDisplay, surface_id: number, type: string) {
        let ph = type;
        switch (type) {
            case "button":
            case "checkbox":
            case "hidden":
            case "image":
            case "radio":
            case "range":
            case "reset":
            case "submit":
                type += "_";
        }
        super(disp, surface_id);
        this.e.setAttribute("placeholder", ph);
        this.e.setAttribute("type", type);
    }

    get input(): HTMLInputElement {
        return this.e as HTMLInputElement;
    }


}