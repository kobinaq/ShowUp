const replacements: Array<[RegExp, string]> = [
  [/Reported absent in ATU demo data\./gi, "Lecturer was reported absent for this session."],
  [/Reported late in ATU demo data\./gi, "Lecturer was reported late for this session."],
  [/atu\.demo_seed\.completed/gi, "Sample data loaded"],
  [/showup\.internal/gi, "course reporter account"],
  [/showup\.demo/gi, "institution account"],
  [/reporter_ATU_[\w-]*/gi, "Course reporter"],
  [/atu_[\w-]*/gi, "institution record"],
  [/\bseed\b/gi, "setup"]
];

export function displayText(value: string | null | undefined) {
  if (!value) return "";
  const cleaned = replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
  if (/^[A-Z0-9_]+$/.test(cleaned)) {
    return cleaned
      .toLowerCase()
      .split("_")
      .map((part, index) => index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part)
      .join(" ");
  }
  return cleaned;
}
