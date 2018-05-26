// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as util from "./util";
import * as base from "./base";


export class Display implements base.IDisplay {
    readonly surfaces: base.IIDMap<base.ISurface> // get(-1) always returns getDesktop()
    readonly menus: base.IIDMap<base.IMenu>

    private _name: string
    private _desktop: base.ISurface | null = null;

    constructor(name: string) {
        if (!name || name.indexOf(" ") != -1)
            throw new TypeError("Invalid display name");
        this._name = name;
        let disp = this;
        this.surfaces = new class extends util.NumberMap<base.ISurface>{
            add(value: base.ISurface): void {
                this.insert(value.getID(), value);
            }
            get(key: number): base.ISurface | undefined {
                if (key === -1)
                    return disp.getDesktop() || undefined;
                return super.get(key);
            }
        }((a, b, c, d) => this._sfchg(a, b, c, d));
        this.menus = new class extends util.NumberMap<base.IMenu>{
            add(value: base.IMenu): void {
                this.insert(value.getID(), value);
            }
        }((a, b, c, d) => this._mchg(a, b, c, d));
    }

    getName(): string {
        return this._name;
    }

    getDesktop(): base.ISurface | null {
        return this._desktop;
    }

    // create is called on the surface to ensure it is created and usable.
    setDesktop(sf: base.ISurface | null) {
        if (this._desktop)
            throw new base.DisplayError("Cannot change display desktop");
        if (sf)
            sf.create();
        this._desktop = sf;
    }

    private _sfchg(id: number, action: util.MapAction, vOld?: base.ISurface, vNew?: base.ISurface) {
        if (vNew) {
            // Insert.
            if (id !== vNew.getID())
                throw new base.DisplayError("Surface ID mismatch");
            if (this.surfaces.get(id))
                throw new base.DisplayError("Surface ID in use");
            // The desktop can have id -1 but nothing else should.
            if (!isFinite(id) ||
                id == 0 || id < -1 ||
                (id == -1 && this._desktop) ||
                id != Math.floor(id)) {
                console.log("surface_id", id);
                throw new base.DisplayError("Surface ID is invalid");
            }
        }
    }

    private _mchg(id: number, action: util.MapAction, vOld?: base.IMenu, vNew?: base.IMenu) {
        if (vNew) {
            if (id !== vNew.getID())
                throw new base.DisplayError("Menu ID mismatch");
            if (this.menus.get(id))
                throw new base.DisplayError("Menu ID in use");
            if (!isFinite(id) ||
                id == 0 || id < -1 ||
                id != Math.floor(id)) {
                console.log("menu_id", id);
                throw new base.DisplayError("Menu ID is invalid");
            }
        }
    }

}