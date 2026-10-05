declare module "y-leveldb" {
  import * as Y from "yjs";
  export class LeveldbPersistence {
    constructor(location: string);
    getYDoc(docName: string): Promise<Y.Doc>;
    storeUpdate(docName: string, update: Uint8Array): Promise<number>;
    clearDocument(docName: string): Promise<void>;
  }
}
