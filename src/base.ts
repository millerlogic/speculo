// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as util from "./util";


export class DisplayError extends Error {
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes
    __proto__: Error;
    constructor(message?: string) {
        super(message);
        this.__proto__ = DisplayError.prototype;
    }
}


export interface IIDMap<T extends { getID(): number }> extends util.IMap<number, T> {
    add(value: T): void // insert(value.getID(), value)
}

export interface IDisplay {
    getName(): string
    getDesktop(): ISurface | null
    readonly surfaces: IIDMap<ISurface>
    readonly menus: IIDMap<IMenu>
}


export enum StyleFlags {
    Selectable = 0x1,
    Container = 0x2,
    Window = 0x4, // Must implement IWindow.
    Desktop = 0x8, // Must implement IDesktop.
    AutoSelect = 0x10,
}

export interface IKey {
    readonly keyCode: number
    readonly ctrlKey: boolean
    readonly shiftKey: boolean
    readonly altKey: boolean
    readonly metaKey: boolean // win/cmd
}

export interface ISurface {
    getID(): number
    getBounds(): util.Bounds
    setBounds(b: util.Bounds): void
    getPadding(): util.Padding
    setPadding(m: util.Padding): void
    getParent(): ISurface | null
    setParent(p: ISurface | null): void // setParent(null) to remove.
    nextSibling(): ISurface | null
    previousSibling(): ISurface | null
    firstChild(): ISurface | null
    lastChild(): ISurface | null
    getDisplay(): IDisplay
    getText(): string
    setText(text: string): void
    create(): void
    isCreated(): boolean
    destroy(): void
    getVisible(): boolean
    setVisible(x: boolean): void
    getEnabled(): boolean
    setEnabled(x: boolean): void
    focus(): void
    canFocus(): boolean
    hasFocus(): boolean
    canSelect(): boolean
    getStyle(): StyleFlags
    isInputKey(key: IKey): boolean
    getScrollOffset(): util.Point
    setScrollOffset(pt: util.Point): void
    getContentBounds(): util.Bounds
    getDesignMode(): boolean // Query only, not all support it.
}


export enum WindowState {
    Normal = 0,
    Maximized = 1,
    Minimized = 2,
}

export interface IWindow extends ISurface {
    getWindowState(): WindowState
    setWindowState(state: WindowState): void
    getNormalBounds(): util.Bounds
    getRestoredState(): WindowState
    restore(): void;
    activate(sf?: ISurface): void
    deactivate(): void
    isActive(): boolean
    getTopmost(): boolean
    setTopmost(x: boolean): void
    getSelected(): ISurface | null
    setSelected(sf: ISurface): boolean
    getNextSelection(start: ISurface | null, forward: boolean, autoSelectOnly?: boolean): ISurface | null
    close(): void
    getOwner(): IWindow | null
    setOwner(w: IWindow | null): void
    nextWindow(): IWindow | null
    previousWindow(): IWindow | null
}


export interface IDesktop extends ISurface {
    firstWindow(): IWindow | null
    lastWindow(): IWindow | null
}


export interface IMenu {
    getID(): number
    destroy(): void
    readonly items: util.IList<IMenuItem>;
}

export interface IMenuItem {
    getText(): string
    setText(text: string): void
    getSubMenu(): IMenu | null
    setSubMenu(sub: IMenu | null): void
    getEnabled(): boolean
    setEnabled(x: boolean): void
}
