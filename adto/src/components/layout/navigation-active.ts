import type { NavItem } from "@/constants/navigation";

function hrefPath(href: string) {
  return href.split("?")[0]?.split("#")[0] ?? href;
}

export function isNavigationItemActive(item: NavItem, items: NavItem[], pathname: string, search: string) {
  const currentHref = search ? `${pathname}?${search}` : pathname;

  if (item.href === currentHref) {
    return true;
  }

  const scopedMatchExists = search ? items.some((candidate) => candidate.href === currentHref) : false;

  return !scopedMatchExists && !item.href.includes("?") && !item.href.includes("#") && hrefPath(item.href) === pathname;
}
