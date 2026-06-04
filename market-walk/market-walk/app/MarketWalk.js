'use client'
import { useState, useRef } from 'react'

const MODULES_TABLE = 'tblgwN3er0hTXsG6o'
const LINE_ITEMS_TABLE = 'tblOEDxmgz34NvWO8'
const MARKET_WALK_TYPE_ID = 'selR36ASvtNWGZlcz'

const F = {
  MOD_NAME: 'fldr9Rb9SzSEXvNZ1',
  MOD_HERO: 'flda85td6oEOub7pZ',
  MOD_SHOWROOM: 'fldzwGi5kV7BbCrkq',
  MOD_CALLOUTS: 'fldFu0XPUchW0071u',
  MOD_STATUS: 'fldnCQjJHnGrIAhsU',
  MOD_MARKET_INTRO: 'fldDeDWorYHYGlclb',
  MOD_LINE_ITEMS: 'fldoMYCaQBosXxiFg',
  MOD_TYPE: 'fldBLKDRwepLq8RfD',
  LI_SKU: 'fld8F9FRk21PAERpH',
  LI_ITEM_NAME: 'fldjhwoVmllpATSPG',
  LI_DIMS: 'fldEXlcTWsW5hKqL0',
  LI_REGULAR: 'fldGTuKnYHnYf9KVI',
  LI_WC: 'fldDilJzFAIDJbwMa',
  LI_W335: 'fldNOD1XhblyKfiCo',
  LI_KO_URL: 'fldu2IRPsipko7yTT',
  LI_STATUS: 'fldF0nidkLjKbfqdH',
  LI_KIT: 'fldMuSzqfibyPOI2A',
  LI_SORT: 'fldAjRtWSLLccVIrs',
}

const SPOT_LABELS = { 9: 'CKTL/PK', 10: 'END', 12: 'M. RUG', 13: 'L. RUG', 15: 'LAMP', 17: 'A. CHAIR' }
const ACC_SPOTS = [9, 10, 12, 13, 15, 17]
const GROUPS = [
  { label: 'Main Group', min: 1, max: 8 },
  { label: 'Occasional Tables', min: 9, max: 11 },
  { label: 'Rugs', min: 12, max: 14 },
  { label: 'Lamps', min: 15, max: 16 },
  { label: 'Accent Chair / Cabinet', min: 17, max: 18 },
  { label: 'Remaining Accents', min: 19, max: 29 },
  { label: 'Series Components', min: 30, max: 40 },
]

const C = {
  navy: '#1a2234', accent: '#e87c3a', border: '#e2e5ea',
  muted: '#6b7280', light: '#9ca3af', surf2: '#f8f9fb', surf3: '#f1f3f6',
}

// ── Helpers ───────────────────────────────────────────────────
function lv(d, fb = '') {
  if (d == null) return fb
  if (typeof d === 'string' || typeof d === 'number') return d
  if (Array.isArray(d)) {
    if (!d.length) return fb
    const f = d[0]
    return typeof f === 'string' || typeof f === 'number' ? f : f?.name ?? fb
  }
  if (d.valuesByLinkedRecordId) {
    const vs = Object.values(d.valuesByLinkedRecordId)
    if (vs.length) {
      const v = vs[0]
      if (Array.isArray(v) && v.length) {
        const i = v[0]
        return typeof i === 'string' || typeof i === 'number' ? i : i?.name ?? fb
      }
    }
  }
  return d.name ?? fb
}

function alv(d) {
  if (!d) return []
  if (Array.isArray(d)) return d.map(x => typeof x === 'string' ? x : x?.name).filter(Boolean)
  if (d.valuesByLinkedRecordId) return Object.values(d.valuesByLinkedRecordId).flat().map(v => typeof v === 'string' ? v : v?.name).filter(Boolean)
  return []
}

function fmt(val) {
  const n = parseFloat(val)
  return isNaN(n) || n === 0 ? '—' : '$' + Math.round(n).toLocaleString()
}

// ── API ───────────────────────────────────────────────────────
async function apiFetch(table, params = {}) {
  const qs = new URLSearchParams({ table, ...params })
  const resp = await fetch(`/api/airtable?${qs.toString()}`)
  const data = await resp.json()
  if (data.error) throw new Error(data.error)
  return data
}

async function apiFetchPath(path) {
  const resp = await fetch(`/api/airtable?path=${encodeURIComponent(path)}`)
  const data = await resp.json()
  if (data.error) throw new Error(data.error)
  return data
}

// ── Small components ──────────────────────────────────────────
function Spinner({ size = 20, color = C.accent }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2.5px solid #e2e5ea`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0
    }} />
  )
}

function Badge({ label, type = 'current' }) {
  const colors = {
    new: { bg: '#dbeafe', color: '#1d4ed8' },
    current: { bg: '#dcfce7', color: '#166534' },
  }
  const c = colors[type] || colors.current
  return (
    <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: c.bg, color: c.color, textTransform: 'uppercase', flexShrink: 0 }}>
      {label}
    </span>
  )
}

// ── Slot Card ─────────────────────────────────────────────────
function SlotCard({ module: m, lineItems, idx, priceMode, onViewMore }) {
  const f = m.cellValuesByFieldId
  const name = lv(f[F.MOD_NAME], '').replace(' - Market Walk', '')
  const hero = lv(f[F.MOD_HERO], '')
  const showroom = lv(f[F.MOD_SHOWROOM], '')
  const callouts = alv(f[F.MOD_CALLOUTS])
  const status = alv(f[F.MOD_STATUS])[0] || ''
  const mi = lv(f[F.MOD_MARKET_INTRO], '')

  const sm = {}
  for (const li of lineItems) {
    const s = li.cellValuesByFieldId[F.LI_SORT]
    if (s) sm[s] = li
  }

  function price(li) {
    if (!li) return '—'
    const field = priceMode === 'regular' ? F.LI_REGULAR : priceMode === 'wc' ? F.LI_WC : F.LI_W335
    return fmt(lv(li.cellValuesByFieldId[field], 0))
  }

  return (
    <div style={{ background: 'white', borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ width: 20, height: 20, background: C.navy, color: 'white', borderRadius: 4, fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{name}</span>
            {status === 'New' && <Badge label="New" type="new" />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {callouts.map(c => (
              <span key={c} style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: '#eff6ff', color: '#1e40af', textTransform: 'uppercase' }}>{c}</span>
            ))}
            {showroom && <span style={{ fontSize: 10, color: C.muted }}>{showroom}</span>}
            {mi && <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 3, background: '#fef3c7', color: '#92400e' }}>★ {mi}</span>}
          </div>
        </div>
        <button onClick={onViewMore} style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: C.accent, background: 'none', border: `1px solid ${C.accent}`, borderRadius: 5, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          View More →
        </button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex' }}>
        {/* Hero + Notes */}
        <div style={{ width: 210, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          {hero
            ? <img src={hero} alt={name} style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block', background: C.surf3 }} onError={e => { e.target.style.display = 'none' }} />
            : <div style={{ width: '100%', height: 150, background: C.surf3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🛋</div>
          }
          <div
            contentEditable suppressContentEditableWarning
            data-placeholder="Notes..."
            style={{ flex: 1, minHeight: 48, padding: '7px 9px', background: '#fffef5', fontSize: 11, color: C.muted, outline: 'none', borderTop: `1px solid ${C.border}` }}
          />
        </div>

        {/* Spots 1-3 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {[1, 2, 3].map(spot => {
            const li = sm[spot]
            const sku = li ? lv(li.cellValuesByFieldId[F.LI_SKU], '') : ''
            const iname = li ? lv(li.cellValuesByFieldId[F.LI_ITEM_NAME], '') : ''
            const dims = li ? lv(li.cellValuesByFieldId[F.LI_DIMS], '') : ''
            const lst = li ? lv(li.cellValuesByFieldId[F.LI_STATUS], '') : ''
            const p = price(li)
            return (
              <div key={spot} style={{ display: 'flex', alignItems: 'flex-start', padding: '9px 12px', gap: 9, borderBottom: spot < 3 ? `1px solid ${C.surf3}` : 'none' }}>
                <div style={{ width: 18, height: 18, borderRadius: 3, background: C.surf3, color: C.muted, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{spot}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {li ? <>
                    <div style={{ fontSize: 9, color: C.muted, fontFamily: 'monospace', marginBottom: 1 }}>{sku}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {iname}
                      {lst === 'New' && <Badge label="New" type="new" />}
                    </div>
                    <div style={{ fontSize: 10, color: C.light, marginTop: 1 }}>{dims}</div>
                  </> : <div style={{ fontSize: 11, color: C.light, fontStyle: 'italic' }}>—</div>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, flexShrink: 0, minWidth: 44, textAlign: 'right' }}>{p}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Accessory strip */}
      <div style={{ display: 'flex', borderTop: `1px solid ${C.border}` }}>
        {ACC_SPOTS.map((spot, si) => {
          const li = sm[spot]
          const koUrl = li ? lv(li.cellValuesByFieldId[F.LI_KO_URL], '') : ''
          const sku = li ? lv(li.cellValuesByFieldId[F.LI_SKU], '') : ''
          const p = price(li)
          return (
            <div key={spot} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '7px 3px', borderRight: si < 5 ? `1px solid ${C.border}` : 'none', textAlign: 'center', minWidth: 0 }}>
              {koUrl
                ? <img src={koUrl} alt={SPOT_LABELS[spot]} style={{ width: 28, height: 28, objectFit: 'contain', marginBottom: 2 }} onError={e => { e.target.style.display = 'none' }} />
                : <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginBottom: 2 }}>
                    {['🛋', '🪑', '🪴', '🪴', '💡', '🪑'][si]}
                  </div>
              }
              <div style={{ fontSize: 8, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 2 }}>{SPOT_LABELS[spot]}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: li ? C.navy : C.light }}>{p}</div>
              <div style={{ fontSize: 8, color: C.light, fontFamily: 'monospace', marginTop: 1 }}>{sku}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Product Table ─────────────────────────────────────────────
function ProductTable({ module: m, lineItems, idx, priceMode }) {
  const f = m.cellValuesByFieldId
  const name = lv(f[F.MOD_NAME], '').replace(' - Market Walk', '')
  const showroom = lv(f[F.MOD_SHOWROOM], '')
  const callouts = alv(f[F.MOD_CALLOUTS])

  function price(li) {
    const field = priceMode === 'regular' ? F.LI_REGULAR : priceMode === 'wc' ? F.LI_WC : F.LI_W335
    return fmt(lv(li.cellValuesByFieldId[field], 0))
  }

  const sorted = [...lineItems].sort((a, b) =>
    (a.cellValuesByFieldId[F.LI_SORT] || 999) - (b.cellValuesByFieldId[F.LI_SORT] || 999)
  )

  return (
    <div id={`ps-${idx}`} style={{ background: 'white', borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 20, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: C.navy, color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 24, height: 24, borderRadius: 5, background: 'rgba(255,255,255,0.12)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{name}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{showroom}{callouts.length ? ' · ' + callouts.join(', ') : ''}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: C.surf3 }}>
            {['#', '', 'SKU', 'Item', 'Dimensions', 'Price'].map(h => (
              <th key={h} style={{ padding: '6px 12px', fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: `1px solid ${C.border}`, textAlign: h === 'Price' ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GROUPS.flatMap(grp => {
            const items = sorted.filter(li => {
              const s = li.cellValuesByFieldId[F.LI_SORT]
              return s >= grp.min && s <= grp.max
            })
            if (!items.length) return []
            return [
              <tr key={grp.label}>
                <td colSpan={6} style={{ padding: '5px 12px', background: C.surf3, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.6px', borderBottom: `1px solid ${C.border}` }}>{grp.label}</td>
              </tr>,
              ...items.map(li => {
                const lf = li.cellValuesByFieldId
                const spot = lf[F.LI_SORT] || '—'
                const sku = lv(lf[F.LI_SKU], '')
                const iname = lv(lf[F.LI_ITEM_NAME], '')
                const dims = lv(lf[F.LI_DIMS], '')
                const p = price(li)
                const ko = lv(lf[F.LI_KO_URL], '')
                const kit = lv(lf[F.LI_KIT], '')
                const lst = lv(lf[F.LI_STATUS], '')
                return (
                  <tr key={li.id} style={{ borderBottom: `1px solid ${C.surf3}` }}>
                    <td style={{ padding: '7px 12px', width: 28 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 3, background: C.surf3, color: C.muted, fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{spot}</span>
                    </td>
                    <td style={{ padding: '7px 4px', width: 38 }}>
                      {ko && <img src={ko} alt={sku} style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 5, border: `1px solid ${C.border}`, background: C.surf3 }} />}
                    </td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 10, color: C.muted }}>{sku}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.navy }}>{iname}</span>
                        {lst === 'New' && <Badge label="New" type="new" />}
                        {lst === 'Current' && <Badge label="Current" type="current" />}
                      </div>
                      {kit && <div style={{ fontSize: 10, color: C.light, marginTop: 1 }}>{kit}</div>}
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 10, color: C.muted }}>{dims}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: C.navy }}>{p}</td>
                  </tr>
                )
              })
            ]
          })}
          {!sorted.length && (
            <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: C.light, fontSize: 12 }}>No line items loaded yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────
export default function MarketWalk() {
  const [modules, setModules] = useState([])
  const [slots, setSlots] = useState([])
  const [liCache, setLiCache] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadingLI, setLoadingLI] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState('walk')
  const [priceMode, setPriceMode] = useState('regular')
  const [search, setSearch] = useState('')
  const [dragSrc, setDragSrc] = useState(null)

  async function loadModules() {
    setLoading(true)
    setError('')
    try {
      const fields = [F.MOD_NAME, F.MOD_HERO, F.MOD_SHOWROOM, F.MOD_CALLOUTS, F.MOD_STATUS, F.MOD_MARKET_INTRO, F.MOD_LINE_ITEMS, F.MOD_TYPE]
      const params = {}
      fields.forEach((f, i) => { params[`fields[${i}]`] = f })
      params['pageSize'] = '100'
      const data = await apiFetch(MODULES_TABLE, params)
      if (!data.records) throw new Error('No records returned — check AIRTABLE_PAT environment variable')
      const filtered = data.records.filter(m => {
        const t = m.cellValuesByFieldId[F.MOD_TYPE]
        if (!t) return false
        const tn = typeof t === 'string' ? t : t?.name || ''
        return tn === 'Market Walk' || t?.id === MARKET_WALK_TYPE_ID
      })
      setModules(filtered)
      setReady(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Load modules on mount
  useState(() => { loadModules() }, [])

  async function fetchLI(mod) {
    if (liCache[mod.id]) return liCache[mod.id]
    const refs = mod.cellValuesByFieldId[F.MOD_LINE_ITEMS]
    if (!refs || !Array.isArray(refs) || !refs.length) return []
    const ids = refs.map(r => r.id || r)
    const liFields = [F.LI_SKU, F.LI_ITEM_NAME, F.LI_DIMS, F.LI_REGULAR, F.LI_WC, F.LI_W335, F.LI_KO_URL, F.LI_STATUS, F.LI_KIT, F.LI_SORT]
    const params = {}
    liFields.forEach((f, i) => { params[`fields[${i}]`] = f })
    ids.forEach((id, i) => { params[`records[${i}]`] = id })
    const data = await apiFetch(LINE_ITEMS_TABLE, params)
    const items = data.records || []
    setLiCache(prev => ({ ...prev, [mod.id]: items }))
    return items
  }

  async function addSlot(id) {
    if (slots.length >= 100) return
    const mod = modules.find(m => m.id === id)
    if (!mod || slots.some(s => s.id === id)) return
    setSlots(prev => [...prev, mod])
    setLoadingLI(true)
    try { await fetchLI(mod) } catch (e) { }
    setLoadingLI(false)
  }

  function removeSlot(i) { setSlots(prev => prev.filter((_, idx) => idx !== i)) }

  function dropSlot(ti) {
    if (dragSrc === null || dragSrc === ti) return
    setSlots(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragSrc, 1)
      next.splice(ti, 0, moved)
      return next
    })
    setDragSrc(null)
  }

  function scrollTo(idx) {
    setTab('products')
    setTimeout(() => document.getElementById(`ps-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const filtered = modules.filter(m =>
    !search || lv(m.cellValuesByFieldId[F.MOD_NAME], '').toLowerCase().includes(search.toLowerCase())
  )

  // Loading / error state
  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ background: 'white', borderRadius: 14, padding: 36, textAlign: 'center', width: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, background: C.accent, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 12 }}>MW</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.navy }}>Market Walk Builder</span>
          </div>
          {loading ? (
            <>
              <Spinner size={28} />
              <p style={{ marginTop: 14, color: C.muted, fontSize: 13 }}>Loading modules...</p>
            </>
          ) : error ? (
            <>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#991b1b', fontSize: 13, marginBottom: 14, textAlign: 'left' }}>{error}</div>
              <button onClick={loadModules} style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
            </>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; } [contenteditable]:empty:before { content: attr(data-placeholder); color: #9ca3af; font-style: italic; pointer-events: none; } @media print { .no-print { display: none !important; } }`}</style>

      {/* Header */}
      <div className="no-print" style={{ background: C.navy, color: 'white', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: C.accent, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 12 }}>MW</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Market Walk Builder</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Ashley Furniture · Las Vegas</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadModules} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>↻ Refresh</button>
          <button onClick={() => window.print()} style={{ background: C.accent, color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>⎙ Print / PDF</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        <div className="no-print" style={{ width: 270, flexShrink: 0, background: '#111827', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 12px 6px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.8px' }}>
            Modules ({modules.length})
          </div>
          <div style={{ padding: '0 8px 8px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 9px', color: 'white', fontSize: 11, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 6px' }}>
            {filtered.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>No modules</div>}
            {filtered.map(m => {
              const name = lv(m.cellValuesByFieldId[F.MOD_NAME], '').replace(' - Market Walk', '')
              const showroom = lv(m.cellValuesByFieldId[F.MOD_SHOWROOM], '')
              const status = alv(m.cellValuesByFieldId[F.MOD_STATUS])[0] || ''
              const isAdded = slots.some(s => s.id === m.id)
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 6px', borderRadius: 7, marginBottom: 2, opacity: isAdded ? 0.4 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{showroom}</div>
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 600, padding: '2px 5px', borderRadius: 3, background: status === 'New' ? 'rgba(3,105,161,0.3)' : 'rgba(21,128,61,0.25)', color: status === 'New' ? '#7dd3fc' : '#86efac', textTransform: 'uppercase', flexShrink: 0 }}>{status || '—'}</span>
                  <button onClick={() => !isAdded && addSlot(m.id)} disabled={isAdded} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: isAdded ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)', cursor: isAdded ? 'default' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isAdded ? '✓' : '+'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Walk slot list */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.8px' }}>Walk Slots</span>
              <span style={{ background: C.accent, color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>{slots.length}</span>
            </div>
            <div style={{ padding: '0 6px 10px', maxHeight: 220, overflowY: 'auto' }}>
              {slots.length === 0 && <div style={{ padding: '10px 6px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, lineHeight: 1.7 }}>Add modules above</div>}
              {slots.map((m, i) => {
                const name = lv(m.cellValuesByFieldId[F.MOD_NAME], '').replace(' - Market Walk', '')
                return (
                  <div key={m.id} draggable onDragStart={() => setDragSrc(i)} onDragOver={e => e.preventDefault()} onDrop={() => dropSlot(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 7px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.04)', marginBottom: 3, cursor: 'grab' }}>
                    <span style={{ width: 18, height: 18, borderRadius: 3, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</span>
                    <button onClick={() => removeSlot(i)} style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 11, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflowY: 'auto', background: C.surf2 }}>
          {/* Tab bar */}
          <div className="no-print" style={{ background: 'white', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 14px', position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
            {['walk', 'products'].map(t => (
              <div key={t} onClick={() => setTab(t)} style={{ padding: '11px 14px', fontSize: 12, fontWeight: tab === t ? 600 : 500, cursor: 'pointer', borderBottom: `2px solid ${tab === t ? C.accent : 'transparent'}`, color: tab === t ? C.navy : C.muted, marginBottom: -1, whiteSpace: 'nowrap' }}>
                {t === 'walk' ? 'Main Walk' : 'Product Tables'}
              </div>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', background: C.surf3, borderRadius: 6, padding: 3, gap: 2 }}>
              {[['regular', 'Regular'], ['wc', 'WC Cost'], ['w335', 'W335']].map(([m, l]) => (
                <button key={m} onClick={() => setPriceMode(m)} style={{ padding: '3px 9px', borderRadius: 4, border: 'none', background: priceMode === m ? 'white' : 'transparent', fontSize: 11, fontWeight: priceMode === m ? 600 : 400, color: priceMode === m ? C.navy : C.muted, cursor: 'pointer' }}>{l}</button>
              ))}
            </div>
          </div>

          {loadingLI && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: 11, color: '#92400e', flexShrink: 0 }}>
              <Spinner size={14} color="#d97706" /> Fetching product data...
            </div>
          )}

          <div style={{ padding: 14 }}>
            {slots.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 360, color: C.light, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: .25 }}>🗺</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: C.muted, marginBottom: 6 }}>Walk is empty</div>
                <div style={{ fontSize: 12, maxWidth: 240, lineHeight: 1.6 }}>Add modules from the left panel to get started.</div>
              </div>
            ) : tab === 'walk' ? (
              slots.map((m, i) => (
                <SlotCard key={m.id} module={m} lineItems={liCache[m.id] || []} idx={i} priceMode={priceMode} onViewMore={() => scrollTo(i)} />
              ))
            ) : (
              slots.map((m, i) => (
                <ProductTable key={m.id} module={m} lineItems={liCache[m.id] || []} idx={i} priceMode={priceMode} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
