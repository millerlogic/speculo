// Copyright (C) 2018 Christopher E. Miller
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

import * as base from "./base";
import * as util from './util';
import * as surface from './surface';


export class Table extends surface.Surface {
    static SurfaceClassName = "Table";

    readonly columns: util.IList<any>
    readonly rows: util.IList<any>

    constructor(disp: base.IDisplay, surface_id: number, e?: HTMLElement) {
        if (!e) {
            let t = document.createElement("table");
            t.createTBody();
            e = t;
        }
        super(disp, surface_id, e);
        this.style |= base.StyleFlags.Selectable;
        surface.addClassCSS(this.eclient, "vscroll");
        surface.addClassCSS(this.eclient, "hscroll");
        this.setPadding(util.Padding.fixed(1));
        this.columns = util.ArrayList.create(util.allowChange, (a, b, c, d) => this.columnChanged(a, b, c, d));
        this.rows = util.ArrayList.create(util.allowChange, (a, b, c, d) => this.rowChanged(a, b, c, d));
    }

    protected getRowCells(row: any): util.IList<any> {
        if (row instanceof util.ArrayList) {
            return row;
        } else if (util.isIList(row)) {
            return row;
        } else if (row instanceof Array) {
            let cells = util.ArrayList.create();
            for (let i = 0; i < row.length; i++) {
                cells.add(row[i]);
            }
            return cells;
        } else {
            let cells = util.ArrayList.create();
            if (row !== undefined)
                cells.add(row);
            return cells;
        }
    }

    // Also called on the columns to get the header text.
    protected getCellString(cell: any): string {
        if (cell === null)
            return "null";
        return cell.toString();
    }

    private _updateRow(erow: HTMLTableRowElement, cells: util.IList<any>) {
        let clen = cells.len();
        for (let i = 0; i < clen; i++) {
            let ec = (i < erow.cells.length) ? erow.cells[i] : erow.insertCell();
            ec.innerText = this.getCellString(cells.get(i));
        }
        while (erow.cells.length > clen)
            erow.deleteCell();
    }

    protected columnChanged(index: number, action: util.MapAction, vOld?: any, vNew?: any): void {
        let t = this.eclient as HTMLTableElement;
        if (action === util.MapAction.Insert) {
            let th = t.tHead ? t.tHead : t.createTHead();
            let thr = th.rows.length ? th.rows[0] : th.insertRow();
            this._updateRow(thr, this.columns);
        } else if (action === util.MapAction.Replace) {
            let th = t.tHead ? t.tHead : t.createTHead();
            let thr = th.rows.length ? th.rows[0] : th.insertRow();
            this._updateRow(thr, this.columns);
        } else if (action === util.MapAction.Remove) {
            if (this.columns.len() == 0)
                t.deleteTHead();
            else if (t.tHead && t.tHead.rows.length)
                t.tHead.rows[0].deleteCell(index);
        }
    }

    protected rowChanged(index: number, action: util.MapAction, vOld?: any, vNew?: any): void {
        let t = this.eclient as HTMLTableElement;
        let tb = t.tBodies[0];
        if (action === util.MapAction.Insert) {
            let erow = tb.insertRow(index);
            let cells = this.getRowCells(vNew);
            this._updateRow(erow, cells);
        } else if (action === util.MapAction.Replace) {
            let erow = tb.rows[index];
            let cells = this.getRowCells(vNew);
            this._updateRow(erow, cells);
        } else if (action === util.MapAction.Remove) {
            tb.deleteRow(index);
        }
    }

}
