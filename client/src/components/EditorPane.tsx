import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import type * as Y from "yjs";
import type { WebsocketProvider } from "y-websocket";
import { monacoLanguage, templateFor } from "../lib/languages";
import { monacoTheme } from "../lib/theme";
import type { ThemeMode } from "../types";

export interface EditorPaneHandle {
  /** Scroll + place cursor at a position (used by follow mode). */
  revealPosition: (lineNumber: number, column: number) => void;
  /** Download/copy helpers read the latest value from here. */
  getValue: () => string;
  format: () => void;
}

interface EditorPaneProps {
  yText: Y.Text;
  provider: WebsocketProvider | null;
  language: string;
  theme: ThemeMode;
  readOnly: boolean;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  onRun: () => void;
  onDownload: () => void;
  /** Report local typing state up for awareness. */
  onTyping: (typing: boolean) => void;
  /** Report local cursor position for awareness/follow. */
  onCursor: (pos: { lineNumber: number; column: number }) => void;
}

/**
 * The Monaco editor bound to the shared Y.Text via y-monaco. Handles:
 *  - CRDT text binding + remote cursors/selections (via awareness),
 *  - loading the Hello-World template only when the doc is empty,
 *  - language/theme/read-only/settings reactivity,
 *  - typing + cursor awareness reporting, and keyboard shortcuts.
 */
export const EditorPane = forwardRef<EditorPaneHandle, EditorPaneProps>(
  function EditorPane(props, ref) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);
    const typingTimer = useRef<number | null>(null);
    // Keep latest callbacks without re-running the mount effect.
    const propsRef = useRef(props);
    propsRef.current = props;

    useImperativeHandle(ref, () => ({
      revealPosition(lineNumber, column) {
        const ed = editorRef.current;
        if (!ed) return;
        ed.revealPositionInCenter({ lineNumber, column });
        ed.setPosition({ lineNumber, column });
        ed.focus();
      },
      getValue() {
        return editorRef.current?.getValue() ?? "";
      },
      format() {
        editorRef.current?.getAction("editor.action.formatDocument")?.run();
      },
    }));

    const [mounted, setMounted] = useState(false);

    const handleMount: OnMount = (ed, monaco) => {
      editorRef.current = ed;
      monacoRef.current = monaco;

      // Keyboard shortcuts: Ctrl/Cmd+Enter → run, Ctrl/Cmd+S → download.
      ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
        propsRef.current.onRun(),
      );
      ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
        propsRef.current.onDownload(),
      );

      // Report cursor position for follow mode + awareness.
      ed.onDidChangeCursorPosition((e) => {
        propsRef.current.onCursor({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      });

      // Debounced typing indicator.
      ed.onDidChangeModelContent(() => {
        propsRef.current.onTyping(true);
        if (typingTimer.current) window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(
          () => propsRef.current.onTyping(false),
          900,
        );
      });

      setMounted(true);
    };

    // Create the Yjs <-> Monaco binding once BOTH the editor is mounted and the provider
    // is available. Passing awareness enables remote cursors/selections in user colors.
    //
    // The Hello-World template is seeded only AFTER the provider reports it has synced
    // with the server, so we know the document is genuinely empty (and not merely
    // not-yet-synced). This avoids clobbering existing collaborative content or inserting
    // a duplicate template that would then conflict with incoming updates.
    useEffect(() => {
      const ed = editorRef.current;
      const model = ed?.getModel();
      if (!mounted || !ed || !model || !props.provider) return;
      if (bindingRef.current) return;

      const provider = props.provider;
      bindingRef.current = new MonacoBinding(
        props.yText,
        model,
        new Set([ed]),
        provider.awareness,
      );

      const seedIfEmpty = () => {
        if (props.yText.toString().trim().length === 0) {
          props.yText.insert(0, templateFor(propsRef.current.language));
        }
      };
      if (provider.synced) seedIfEmpty();
      else {
        const onSync = (isSynced: boolean) => {
          if (isSynced) {
            seedIfEmpty();
            provider.off("sync", onSync);
          }
        };
        provider.on("sync", onSync);
      }
    }, [mounted, props.provider, props.yText]);

    // React to language changes: update the model language for highlighting, and (only
    // when the document is empty) load that language's starter template.
    useEffect(() => {
      const ed = editorRef.current;
      const monaco = monacoRef.current;
      const model = ed?.getModel();
      if (model && monaco) {
        monaco.editor.setModelLanguage(model, monacoLanguage(props.language));
      }
      // Only seed on language change once we're synced and the doc is empty.
      if (
        props.provider?.synced &&
        props.yText.toString().trim().length === 0
      ) {
        props.yText.insert(0, templateFor(props.language));
      }
    }, [props.language, props.yText, props.provider]);

    // Cleanup the Yjs binding on unmount.
    useEffect(() => {
      return () => {
        bindingRef.current?.destroy();
        bindingRef.current = null;
        if (typingTimer.current) window.clearTimeout(typingTimer.current);
      };
    }, []);

    return (
      <div className="h-full w-full">
        <Editor
          height="100%"
          theme={monacoTheme(props.theme)}
          defaultLanguage={monacoLanguage(props.language)}
          onMount={handleMount}
          options={{
            readOnly: props.readOnly,
            fontSize: props.fontSize,
            tabSize: props.tabSize,
            wordWrap: props.wordWrap ? "on" : "off",
            minimap: { enabled: props.minimap },
            automaticLayout: true,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            scrollBeyondLastLine: false,
            padding: { top: 12 },
          }}
        />
      </div>
    );
  },
);
