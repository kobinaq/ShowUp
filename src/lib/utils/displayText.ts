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
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}
