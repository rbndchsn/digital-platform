/** Editable per-gas rows with the GWP shown and tCO2e computed live (PRD FR-40, FR-49). */
import { Plus, Trash2 } from 'lucide-react'
import type { Gas, GwpSet } from '@/domain/enums'
import { GASES, GAS_LABELS } from '@/domain/enums'
import type { GasEntry } from '@/domain/schemas'
import { GWP, gwpFor } from '@/domain/units'
import { Button } from '@/components/ui/button'
import { Input, NativeSelect } from '@/components/ui/input'
import { fmtNumber } from '@/lib/format'

const DETAILS: Partial<Record<Gas, string[]>> = {
  CH4: ['CH4', 'CH4-fossil'],
  HFC: ['HFC-134a', 'HFC-23', 'HFC-32', 'HFC-125', 'HFC-143a', 'HFC-152a', 'HFC-227ea'],
  PFC: ['PFC-14', 'PFC-116'],
}

function safeGwp(set: GwpSet, g: GasEntry): number | null {
  try {
    return gwpFor(set, g.gas, g.gas_detail, g.custom_gwp)
  } catch {
    return null
  }
}

export function gasTco2e(set: GwpSet, g: GasEntry): number | null {
  const gwp = safeGwp(set, g)
  return gwp == null ? null : g.tonnes_gas * gwp
}

export function GasEditor({ set, gases, onChange, readOnly }: { set: GwpSet; gases: GasEntry[]; onChange: (g: GasEntry[]) => void; readOnly?: boolean }) {
  const update = (i: number, patch: Partial<GasEntry>) => onChange(gases.map((g, j) => (j === i ? { ...g, ...patch } : g)))
  const total = gases.reduce((a, g) => a + (gasTco2e(set, g) ?? 0), 0)
  return (
    <div className="border-border rounded-md border">
      <table className="w-full text-sm">
        <thead className="text-fg-subtle text-[10px] font-semibold uppercase tracking-wide">
          <tr>
            <th className="px-2 py-1.5 text-left">Gas</th>
            <th className="px-2 py-1.5 text-left">Species / variant</th>
            <th className="px-2 py-1.5 text-right">Tonnes of gas</th>
            <th className="px-2 py-1.5 text-right">GWP ({set})</th>
            <th className="px-2 py-1.5 text-right">tCO2e</th>
            {!readOnly ? <th /> : null}
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {gases.map((g, i) => {
            const options = DETAILS[g.gas]
            const gwp = safeGwp(set, g)
            const t = gasTco2e(set, g)
            return (
              <tr key={i}>
                <td className="px-2 py-1">
                  {readOnly ? (
                    <span>{GAS_LABELS[g.gas]}</span>
                  ) : (
                    <NativeSelect value={g.gas} onChange={(e) => update(i, { gas: e.target.value as Gas, gas_detail: null, custom_gwp: null })} className="h-8 w-44">
                      {GASES.map((x) => (
                        <option key={x} value={x}>
                          {GAS_LABELS[x]}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </td>
                <td className="px-2 py-1">
                  {readOnly ? (
                    <span className="text-fg-muted text-xs">{g.gas_detail ?? '—'}</span>
                  ) : g.gas === 'other' ? (
                    <div className="flex gap-1">
                      <Input className="h-8 w-28" placeholder="Name" value={g.gas_detail ?? ''} onChange={(e) => update(i, { gas_detail: e.target.value || null })} />
                      <Input className="h-8 w-20" type="number" placeholder="GWP" value={g.custom_gwp ?? ''} onChange={(e) => update(i, { custom_gwp: e.target.value === '' ? null : Number(e.target.value) })} />
                    </div>
                  ) : options ? (
                    <NativeSelect value={g.gas_detail ?? options[0]} onChange={(e) => update(i, { gas_detail: e.target.value })} className="h-8 w-36">
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <span className="text-fg-subtle text-xs">—</span>
                  )}
                </td>
                <td className="px-2 py-1 text-right">{readOnly ? <span className="tabular-nums">{fmtNumber(g.tonnes_gas, 3)}</span> : <Input className="h-8 w-32 text-right tabular-nums" type="number" min={0} step="any" value={g.tonnes_gas} onChange={(e) => update(i, { tonnes_gas: Number(e.target.value) })} />}</td>
                <td className="text-fg-muted px-2 py-1 text-right tabular-nums">{gwp == null ? <span className="text-danger text-xs">GWP?</span> : fmtNumber(gwp, gwp < 10 ? 1 : 0)}</td>
                <td className="text-fg px-2 py-1 text-right font-semibold tabular-nums">{t == null ? '—' : fmtNumber(t, 2)}</td>
                {!readOnly ? (
                  <td className="px-1 py-1 text-right">
                    <Button size="icon" variant="ghost" aria-label="Remove gas" onClick={() => onChange(gases.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </Button>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-border border-t">
            <td colSpan={4} className="text-fg-muted px-2 py-1.5 text-right text-xs">
              {!readOnly ? (
                <Button size="sm" variant="ghost" onClick={() => onChange([...gases, { gas: 'CO2', gas_detail: null, tonnes_gas: 0, custom_gwp: null }])}>
                  <Plus /> Add gas
                </Button>
              ) : null}
              <span className="ml-3">Gross total</span>
            </td>
            <td className="text-fg px-2 py-1.5 text-right font-bold tabular-nums">{fmtNumber(total, 2)}</td>
            {!readOnly ? <td /> : null}
          </tr>
        </tfoot>
      </table>
      <p className="text-fg-subtle px-2 pb-1.5 text-[11px]">
        GWP values are IPCC 100-year ({set}); CH4 {GWP[set].CH4}, N2O {GWP[set].N2O}. Biogenic CO2 and removals are entered separately and never netted into the gross total.
      </p>
    </div>
  )
}
