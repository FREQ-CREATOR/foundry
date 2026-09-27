"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./SearchBar.module.scss";

const BUNGIE_ORIGIN = "https://www.bungie.net";

type SearchResult = {
  hash: number;
  name: string;
  icon: string;
  type: string;
  section: "weapons" | "armor";
};

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results ?? []);
          setOpen(true);
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <input
        className={styles.input}
        type="text"
        placeholder="Search weapons & armor..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((r) => (
            <Link
              key={`${r.section}-${r.hash}`}
              href={`/${r.section}/${r.hash}`}
              className={styles.result}
              onClick={() => setOpen(false)}
            >
              <Image
                src={`${BUNGIE_ORIGIN}${r.icon}`}
                alt={r.name}
                width={28}
                height={28}
                unoptimized
                className={styles.resultIcon}
              />
              <div className={styles.resultInfo}>
                <span className={styles.resultName}>{r.name}</span>
                <span className={styles.resultType}>{r.type}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
