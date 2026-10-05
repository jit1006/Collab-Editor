/**
 * Shared language registry.
 *
 * Each entry maps our internal language id to:
 *  - the Monaco language id used for syntax highlighting (client side),
 *  - the Piston runtime language + version used for execution,
 *  - the file extension used for downloads,
 *  - a "Hello World" starter template loaded into empty documents.
 *
 * The client keeps a mirror of this file (client/src/lib/languages.ts). Keep the two
 * in sync. Piston versions are pinned to commonly-available runtimes; the execute proxy
 * will fall back to the latest version Piston reports if a pinned version is missing.
 */

export interface LanguageDef {
  /** Internal id, used in URLs/room config, e.g. "cpp". */
  id: string;
  /** Human label for the dropdown, e.g. "C++". */
  label: string;
  /** Monaco editor language id for highlighting. */
  monaco: string;
  /** Judge0 language ID for execution. */
  judge0Id: number;
  /** Piston language id for execution (fallback / self-hosted). */
  piston: string;
  /** Piston runtime version. */
  version: string;
  /** File extension (including dot) for downloads. */
  ext: string;
  /** Starter template loaded only when the document is empty. */
  template: string;
}

export const LANGUAGES: LanguageDef[] = [
  {
    id: "cpp",
    label: "C++",
    monaco: "cpp",
    judge0Id: 105,
    piston: "c++",
    version: "10.2.0",
    ext: ".cpp",
    template: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
  },
  {
    id: "c",
    label: "C",
    monaco: "c",
    judge0Id: 103,
    piston: "c",
    version: "10.2.0",
    ext: ".c",
    template: `#include <stdio.h>\n\nint main(void) {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
  },
  {
    id: "python",
    label: "Python",
    monaco: "python",
    judge0Id: 100,
    piston: "python",
    version: "3.10.0",
    ext: ".py",
    template: `print("Hello, World!")\n`,
  },
  {
    id: "java",
    label: "Java",
    monaco: "java",
    judge0Id: 91,
    piston: "java",
    version: "15.0.2",
    ext: ".java",
    template: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
  },
  {
    id: "javascript",
    label: "JavaScript",
    monaco: "javascript",
    judge0Id: 97,
    piston: "javascript",
    version: "18.15.0",
    ext: ".js",
    template: `console.log("Hello, World!");\n`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    monaco: "typescript",
    judge0Id: 101,
    piston: "typescript",
    version: "5.0.3",
    ext: ".ts",
    template: `const message: string = "Hello, World!";\nconsole.log(message);\n`,
  },
  {
    id: "go",
    label: "Go",
    monaco: "go",
    judge0Id: 106,
    piston: "go",
    version: "1.16.2",
    ext: ".go",
    template: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n`,
  },
  {
    id: "rust",
    label: "Rust",
    monaco: "rust",
    judge0Id: 108,
    piston: "rust",
    version: "1.68.2",
    ext: ".rs",
    template: `fn main() {\n    println!("Hello, World!");\n}\n`,
  },
  {
    id: "csharp",
    label: "C#",
    monaco: "csharp",
    judge0Id: 51,
    piston: "csharp",
    version: "6.12.0",
    ext: ".cs",
    template: `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}\n`,
  },
  {
    id: "php",
    label: "PHP",
    monaco: "php",
    judge0Id: 98,
    piston: "php",
    version: "8.2.3",
    ext: ".php",
    template: `<?php\necho "Hello, World!\\n";\n`,
  },
  {
    id: "ruby",
    label: "Ruby",
    monaco: "ruby",
    judge0Id: 72,
    piston: "ruby",
    version: "3.0.1",
    ext: ".rb",
    template: `puts "Hello, World!"\n`,
  },
  {
    id: "kotlin",
    label: "Kotlin",
    monaco: "kotlin",
    judge0Id: 111,
    piston: "kotlin",
    version: "1.8.20",
    ext: ".kt",
    template: `fun main() {\n    println("Hello, World!")\n}\n`,
  },
  {
    id: "sql",
    label: "SQL",
    monaco: "sql",
    judge0Id: 82,
    piston: "sqlite3",
    version: "3.36.0",
    ext: ".sql",
    template: `SELECT 'Hello, World!' AS greeting;\n`,
  },
];

/** Fast lookup by internal id. */
export const LANGUAGE_BY_ID: Record<string, LanguageDef> = Object.fromEntries(
  LANGUAGES.map((l) => [l.id, l]),
);

/** Default language used for new rooms. */
export const DEFAULT_LANGUAGE_ID = "javascript";

/** Resolve a language definition by id, falling back to the default. */
export function getLanguage(id: string | undefined | null): LanguageDef {
  return (id && LANGUAGE_BY_ID[id]) || LANGUAGE_BY_ID[DEFAULT_LANGUAGE_ID];
}
