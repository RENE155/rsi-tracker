declare namespace Hammer {
  type Recognizer = any;
  type RecognizerOptions = Record<string, any>;
  type EventTypes = string;

  interface Manager {
    add(recognizer: Recognizer): Manager;
    get(name: string): Recognizer | undefined;
    off(events: EventTypes, handler?: (ev: any) => void): void;
    on(events: EventTypes, handler: (ev: any) => void): void;
    set(options: Record<string, any>): Manager;
    stop(force?: boolean): void;
    destroy(): void;
  }

  interface Static {
    new (element: Element, options?: Record<string, any>): Manager;
    Manager: new (element: Element, options?: Record<string, any>) => Manager;
    Input: any;
    Recognizer: any;
    defaults: Record<string, any>;
  }
}

declare const Hammer: Hammer.Static;

export = Hammer;
export as namespace Hammer;
