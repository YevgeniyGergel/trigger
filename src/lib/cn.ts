/** Склеює класи, відкидаючи falsy-значення. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
