declare module "@flightradar24/fr24sdk" {
  type LightFlight = {
    fr24_id?: unknown;
    hex?: unknown;
    lat?: unknown;
    lon?: unknown;
    track?: unknown;
    alt?: unknown;
    gspeed?: unknown;
    vspeed?: unknown;
    squawk?: unknown;
    timestamp?: unknown;
    callsign?: unknown;
  };

  class Client {
    constructor(options?: { apiToken?: string; apiVersion?: string });
    live: {
      getLight(params: { bounds?: string; limit?: number }): Promise<LightFlight[]>;
    };
    close(): void;
  }

  const sdk: { Client: typeof Client };
  export default sdk;
}
