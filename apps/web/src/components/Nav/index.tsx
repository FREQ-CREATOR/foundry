import Link from "next/link";
import { SearchBar } from "../SearchBar";
import { Flex } from "@foundry/ui/components";
import styles from "./Nav.module.scss";

export function Nav() {
  return (
    <nav className={styles.Nav}>
      <Flex align="baseline" justify="between" gap="2">
        <Link href="/">Foundry</Link>
        <Flex gap="2">
          <Link href="/weapons">Weapons</Link>
          <Link href="/armor">Armor</Link>
          <Link href="/perks">Perks</Link>
        </Flex>
        <SearchBar />
      </Flex>
    </nav>
  );
}
