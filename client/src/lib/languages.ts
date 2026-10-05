/**
 * Client mirror of the server language registry. Keep in sync with
 * server/src/languages.ts. Adds client-only helpers for Monaco + downloads.
 */

export interface LanguageDef {
  id: string;
  label: string;
  monaco: string;
  judge0Id: number;
  piston: string;
  version: string;
  ext: string;
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

export const LANGUAGE_BY_ID: Record<string, LanguageDef> = Object.fromEntries(
  LANGUAGES.map((l) => [l.id, l]),
);

export const DEFAULT_LANGUAGE_ID = "javascript";

export function getLanguage(id: string | undefined | null): LanguageDef {
  return (id && LANGUAGE_BY_ID[id]) || LANGUAGE_BY_ID[DEFAULT_LANGUAGE_ID];
}

export function monacoLanguage(id: string): string {
  return getLanguage(id).monaco;
}

export function extensionFor(id: string): string {
  return getLanguage(id).ext;
}

export function templateFor(id: string): string {
  return getLanguage(id).template;
}
