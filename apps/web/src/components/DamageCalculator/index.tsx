"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { WeaponCalcSummary, CalculatorData } from "./types";
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
}: {
  weapon: WeaponCalcSummary;
  data: CalculatorData;
}) {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const col of data.columns) initial[col.socketIndex] = col.defaultHash;
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
    const map = new Map<number, { hash: number; investmentStats: { statTypeHash: number; value: number }[] }>();
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

  if (loadError) {
    return <p className={styles.note}>{loadError}</p>;
  }

  if (!engine) {
    return <p className={styles.note}>Loading calculator…</p>;
  }

  if (unsupported) {
    return (
      <p className={styles.note}>
        This weapon isn&apos;t supported by the calculator engine yet (no formula data for its
        archetype).
      </p>
    );
  }

  return (
    <div className={styles.container}>
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
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={dynamicTraits}
            onChange={(e) => setDynamicTraits(e.target.checked)}
          />
          Apply perks to range/handling/reload
        </label>
      </div>

      {data.columns.length > 0 && (
        <div className={styles.columns}>
          {data.columns.map((col) => (
            <div key={col.socketIndex} className={styles.column}>
              {col.options.map((opt) => (
                <button
                  key={opt.hash}
                  className={`${styles.perkOption} ${
                    selected[col.socketIndex] === opt.hash ? styles.perkOptionActive : ""
                  }`}
                  title={opt.description}
                  onClick={() =>
                    setSelected((prev) => ({ ...prev, [col.socketIndex]: opt.hash }))
                  }
                >
                  <Image
                    src={`${BUNGIE_ORIGIN}${opt.icon}`}
                    alt={opt.name}
                    width={32}
                    height={32}
                    unoptimized
                    className={styles.perkIcon}
                  />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {results && (
        <>
          <div className={styles.statGrid}>
            <Stat label="RPM" value={Math.round(results.firing.rpm)} />
            <Stat
              label="Impact"
              value={Math.round(pvp ? results.firing.pvpImpactDamage : results.firing.pveImpactDamage)}
            />
            <Stat
              label="Crit Multiplier"
              value={(pvp ? results.firing.pvpCritMult : results.firing.pveCritMult).toFixed(2)}
            />
            <Stat label="Magazine" value={Math.round(results.ammo.magSize)} />
            <Stat label="Reserves" value={Math.round(results.ammo.reserveSize)} />
            <Stat label="Reload Time" value={`${results.reload.reloadTime.toFixed(2)}s`} />
            <Stat label="Ready Time" value={`${results.handling.readyTime.toFixed(2)}s`} />
            <Stat label="Stow Time" value={`${results.handling.stowTime.toFixed(2)}s`} />
            <Stat label="ADS Time" value={`${results.handling.adsTime.toFixed(2)}s`} />
            <Stat
              label="Hip Falloff"
              value={`${results.range.hipFalloffStart.toFixed(1)}m - ${results.range.hipFalloffEnd.toFixed(1)}m`}
            />
            <Stat
              label="ADS Falloff"
              value={`${results.range.adsFalloffStart.toFixed(1)}m - ${results.range.adsFalloffEnd.toFixed(1)}m`}
            />
          </div>

          {results.ttk.length > 0 && (
            <div className={styles.ttkSection}>
              <h3 className={styles.ttkTitle}>Time to Kill by Resilience</h3>
              <table className={styles.ttkTable}>
                <thead>
                  <tr>
                    <th>Resilience</th>
                    <th>Optimal (crits)</th>
                    <th>Body shots</th>
                  </tr>
                </thead>
                <tbody>
                  {results.ttk.map((row: any) => (
                    <tr key={row.resillienceValue}>
                      <td>{row.resillienceValue}</td>
                      <td>
                        {row.optimalTtk.headshots}c / {row.optimalTtk.bodyshots}b —{" "}
                        {row.optimalTtk.timeTaken.toFixed(2)}s
                      </td>
                      <td>
                        {row.bodyTtk.bodyshots}b — {row.bodyTtk.timeTaken.toFixed(2)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
