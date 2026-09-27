"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { WeaponCalcSummary, CalculatorData, StatDisplay } from "./types";
import styles from "./DamageCalculator.module.scss";

const BUNGIE_ORIGIN = "https://www.bungie.net";

type Engine = typeof import("@foundry/oracle-engine");

let enginePromise: Promise<Engine> | null = null;
function loadEngine(): Promise<Engine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const mod = await import("@foundry/oracle-engine");
      await mod.default("/wasm/oracle_engine_bg.wasm");
      mod.start();
      return mod;
    })();
  }
  return enginePromise;
}

type Results = {
  firing: any;
  handling: any;
  reload: any;
  range: any;
  ammo: any;
  ttk: any[];
} | null;

export function DamageCalculator({
  weapon,
  data,
  stats,
}: {
  weapon: WeaponCalcSummary;
  data: CalculatorData;
  stats: StatDisplay[];
}) {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const col of data.columns) {
      const hasDefault = col.options.some((o) => o.hash === col.defaultHash);
      initial[col.socketIndex] = hasDefault ? col.defaultHash : col.options[0]?.hash;
    }
    return initial;
  });
  const [pvp, setPvp] = useState(false);
  const [dynamicTraits, setDynamicTraits] = useState(true);
  const [results, setResults] = useState<Results>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadEngine()
      .then((mod) => {
        if (!cancelled) setEngine(mod);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoadError("Could not load the calculation engine.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const optionByHash = useMemo(() => {
    const map = new Map<
      number,
      { hash: number; investmentStats: { statTypeHash: number; value: number }[] }
    >();
    for (const col of data.columns) {
      for (const opt of col.options) map.set(opt.hash, opt);
    }
    return map;
  }, [data.columns]);

  useEffect(() => {
    if (!engine || data.intrinsicHash == null) {
      if (engine && data.intrinsicHash == null) setUnsupported(true);
      return;
    }

    try {
      engine.setWeapon(
        weapon.hash,
        weapon.weaponTypeId,
        data.intrinsicHash,
        weapon.ammoTypeId,
        weapon.damageTypeId
      );
      const statsMap = new Map<number, number>(
        Object.entries(weapon.stats).map(([k, v]) => [Number(k), v])
      );
      engine.setStats(statsMap as any);
      engine.resetTraits();
      for (const hash of Object.values(selected)) {
        const opt = optionByHash.get(hash);
        const statBuffs = new Map<number, number>();
        for (const s of opt?.investmentStats ?? []) {
          statBuffs.set(s.statTypeHash, s.value);
        }
        engine.addTrait(statBuffs as any, 1, hash);
      }

      const firing = engine.getWeaponFiringData(dynamicTraits, pvp, false);
      const handling = engine.getWeaponHandlingTimes(dynamicTraits, pvp);
      const reload = engine.getWeaponReloadTimes(dynamicTraits, pvp);
      const range = engine.getWeaponRangeFalloff(dynamicTraits, pvp);
      const ammo = engine.getWeaponAmmoSizes(dynamicTraits, pvp);
      const ttkRaw = engine.getWeaponTtk(0);
      const ttk = Array.isArray(ttkRaw) ? ttkRaw : [];

      if (!firing || !firing.rpm) {
        setUnsupported(true);
        setResults(null);
        return;
      }

      setUnsupported(false);
      setResults({ firing, handling, reload, range, ammo, ttk });
    } catch (err) {
      console.error(err);
      setUnsupported(true);
      setResults(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, selected, pvp, dynamicTraits, data.intrinsicHash]);

  const perkColumns = data.columns.filter((c) => c.kind === "perk");
  const masterworkColumn = data.columns.find((c) => c.kind === "masterwork");
  const modColumns = data.columns.filter((c) => c.kind === "mod");

  return (
    <div className={styles.layout}>
      <div className={styles.statsCol}>
        <div className={styles.toggles}>
          <button
            className={`${styles.toggle} ${!pvp ? styles.toggleActive : ""}`}
            onClick={() => setPvp(false)}
          >
            PvE
          </button>
          <button
            className={`${styles.toggle} ${pvp ? styles.toggleActive : ""}`}
            onClick={() => setPvp(true)}
          >
            PvP
          </button>
        </div>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={dynamicTraits}
            onChange={(e) => setDynamicTraits(e.target.checked)}
          />
          Apply perks to range/handling/reload
        </label>

        {loadError && <p className={styles.note}>{loadError}</p>}
        {!engine && !loadError && <p className={styles.note}>Loading calculator…</p>}
        {engine && unsupported && (
          <p className={styles.note}>
            This weapon isn&apos;t supported by the calculator engine yet.
          </p>
        )}

        {results && (
          <div className={styles.computedList}>
            <StatRow
              label="Impact"
              value={Math.round(pvp ? results.firing.pvpImpactDamage : results.firing.pveImpactDamage)}
            />
            <StatRow
              label="Crit Multiplier"
              value={(pvp ? results.firing.pvpCritMult : results.firing.pveCritMult).toFixed(2)}
            />
            <StatRow label="RPM" value={Math.round(results.firing.rpm)} />
            {results.range.hipFalloffEnd < 200 && (
              <StatRow
                label="Range"
                value={`${results.range.hipFalloffStart.toFixed(1)}m hip / ${results.range.adsFalloffStart.toFixed(1)}m ADS`}
              />
            )}
            <StatRow label="Magazine" value={Math.round(results.ammo.magSize)} />
            <StatRow label="Reserves" value={Math.round(results.ammo.reserveSize)} />
            <StatRow label="Reload" value={`${results.reload.reloadTime.toFixed(2)}s`} />
            <StatRow label="Ready" value={`${results.handling.readyTime.toFixed(2)}s`} />
            <StatRow label="Stow" value={`${results.handling.stowTime.toFixed(2)}s`} />
            <StatRow label="ADS" value={`${results.handling.adsTime.toFixed(2)}s`} />
          </div>
        )}

        <div className={styles.statList}>
          {stats.map((s) => (
            <div key={s.hash} className={styles.statRow}>
              <span className={styles.statName}>{s.name}</span>
              <div className={styles.statBarTrack}>
                <div className={styles.statBarFill} style={{ width: `${Math.min(100, s.value)}%` }} />
              </div>
              <span className={styles.statValue}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.perksCol}>
        <h3 className={styles.colTitle}>Perks</h3>
        <div className={styles.perksGrid}>
          {perkColumns.map((col) => (
            <div key={col.socketIndex} className={styles.perkColumn}>
              {col.options.map((opt) => (
                <button
                  key={opt.hash}
                  className={`${styles.perkCircle} ${
                    selected[col.socketIndex] === opt.hash ? styles.perkCircleActive : ""
                  }`}
                  title={`${opt.name} — ${opt.description}`}
                  onClick={() => setSelected((prev) => ({ ...prev, [col.socketIndex]: opt.hash }))}
                >
                  <Image
                    src={`${BUNGIE_ORIGIN}${opt.icon}`}
                    alt={opt.name}
                    width={36}
                    height={36}
                    unoptimized
                    className={styles.perkCircleIcon}
                  />
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.selectedPerkList}>
          {perkColumns.map((col) => {
            const opt = col.options.find((o) => o.hash === selected[col.socketIndex]);
            if (!opt) return null;
            return (
              <div key={col.socketIndex} className={styles.selectedPerkRow}>
                <span className={styles.selectedPerkName}>{opt.name}</span>
                <span className={styles.selectedPerkDesc}>{opt.description}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.mwCol}>
        {masterworkColumn && (
          <>
            <h3 className={styles.colTitle}>Masterwork</h3>
            <div className={styles.mwList}>
              {masterworkColumn.options.map((opt) => (
                <button
                  key={opt.hash}
                  className={`${styles.mwOption} ${
                    selected[masterworkColumn.socketIndex] === opt.hash ? styles.mwOptionActive : ""
                  }`}
                  onClick={() =>
                    setSelected((prev) => ({ ...prev, [masterworkColumn.socketIndex]: opt.hash }))
                  }
                >
                  <Image
                    src={`${BUNGIE_ORIGIN}${opt.icon}`}
                    alt={opt.name}
                    width={24}
                    height={24}
                    unoptimized
                    className={styles.mwIcon}
                  />
                  <span>{opt.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {modColumns.length > 0 && (
          <>
            <h3 className={styles.colTitle}>Weapon Mods</h3>
            <div className={styles.perksGrid}>
              {modColumns.map((col) => (
                <div key={col.socketIndex} className={styles.perkColumn}>
                  {col.options.map((opt) => (
                    <button
                      key={opt.hash}
                      className={`${styles.perkCircle} ${
                        selected[col.socketIndex] === opt.hash ? styles.perkCircleActive : ""
                      }`}
                      title={`${opt.name} — ${opt.description}`}
                      onClick={() =>
                        setSelected((prev) => ({ ...prev, [col.socketIndex]: opt.hash }))
                      }
                    >
                      <Image
                        src={`${BUNGIE_ORIGIN}${opt.icon}`}
                        alt={opt.name}
                        width={36}
                        height={36}
                        unoptimized
                        className={styles.perkCircleIcon}
                      />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {results && results.ttk.length > 0 && (
          <>
            <h3 className={styles.colTitle}>Time to Kill</h3>
            <table className={styles.ttkTable}>
              <thead>
                <tr>
                  <th>Res</th>
                  <th>Crit</th>
                  <th>Body</th>
                </tr>
              </thead>
              <tbody>
                {results.ttk.map((row: any) => (
                  <tr key={row.resillienceValue}>
                    <td>{row.resillienceValue}</td>
                    <td>
                      {row.optimalTtk.headshots}c/{row.optimalTtk.bodyshots}b {row.optimalTtk.timeTaken.toFixed(2)}s
                    </td>
                    <td>
                      {row.bodyTtk.bodyshots}b {row.bodyTtk.timeTaken.toFixed(2)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.computedRow}>
      <span className={styles.computedLabel}>{label}</span>
      <span className={styles.computedValue}>{value}</span>
    </div>
  );
}
