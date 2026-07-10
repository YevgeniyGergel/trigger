const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie",
  ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
  ю: "iu", я: "ia", ы: "y", э: "e", ъ: "",
};

function transliterate(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
}

export function slugify(input: string): string {
  return (
    transliterate(input) // Cyrillic -> Latin (e.g. "Олена" -> "olena")
      .trim()
      .normalize("NFKD") // decompose accented Latin letters (e.g. "José" -> "José")
      .replace(/[̀-ͯ]/g, "") // drop the combining diacritics left by NFKD
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}
