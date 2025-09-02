declare module 'telegraf' {
  export class Telegraf<TContext = any> {
    constructor(token: string);
    use(middleware: (ctx: TContext, next: () => Promise<void>) => Promise<void> | void): void;
    start(handler: (ctx: TContext) => Promise<void> | void): void;
    help(handler: (ctx: TContext) => Promise<void> | void): void;
    on(event: string, handler: (ctx: TContext) => Promise<void> | void): void;
    catch(handler: (err: any, ctx: TContext) => void): void;
    launch(): Promise<void>;
    stop(reason?: string): void;
    startWebhook(path: string, tlsOptions?: any, port?: number): void;
    telegram: {
      setWebhook(url: string): Promise<void>;
      deleteWebhook(): Promise<void>;
    };
  }
}
